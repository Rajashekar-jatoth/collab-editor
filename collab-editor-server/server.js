
require('dotenv').config()

const { setupWSConnection, getYDoc } = require('y-websocket/bin/utils')
const WebSocket = require('ws')
const http = require('http')
const Y = require('yjs')
const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL. Configure PostgreSQL before starting the server.')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Set DATABASE_SSL=true for hosted PostgreSQL providers that require TLS.
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
})

// A room is loaded once before any WebSocket connection is attached to it.
const roomLoads = new Map()
const persistenceListeners = new Set()
const persistChains = new Map()

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cosync_documents (
      room_name TEXT PRIMARY KEY,
      yjs_state BYTEA NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.log('PostgreSQL persistence table is ready')
}

function roomNameFromRequest(req) {
  const pathname = new URL(req.url, 'http://localhost').pathname
  return decodeURIComponent(pathname.replace(/^\/+|\/+$/g, ''))
}

async function loadRoom(roomName) {
  if (!roomName) throw new Error('Missing room name in WebSocket URL')

  // Prevent two clients from loading the same room concurrently.
  if (roomLoads.has(roomName)) return roomLoads.get(roomName)

  const loading = (async () => {
    const result = await pool.query(
      'SELECT yjs_state FROM cosync_documents WHERE room_name = $1',
      [roomName]
    )

    // getYDoc is called only after the saved state has been fetched, so the
    // first client cannot receive an empty document before restoration.
    const doc = getYDoc(roomName)
    if (result.rows.length > 0) {
      Y.applyUpdate(doc, result.rows[0].yjs_state)
      console.log(`Restored saved Yjs state for room: ${roomName}`)
    }

    if (!persistenceListeners.has(roomName)) {
      doc.on('update', () => {
        // Capture an immutable snapshot for this update. Serialize writes per
        // room so an older snapshot cannot overwrite a newer one.
        const snapshot = Buffer.from(Y.encodeStateAsUpdate(doc))
        const previous = persistChains.get(roomName) || Promise.resolve()
        const next = previous
          .catch((error) => console.error(`Previous save failed for ${roomName}:`, error))
          .then(() => pool.query(
            `INSERT INTO cosync_documents (room_name, yjs_state, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (room_name)
             DO UPDATE SET yjs_state = EXCLUDED.yjs_state, updated_at = NOW()`,
            [roomName, snapshot]
          ))
          .catch((error) => console.error(`Could not save room ${roomName}:`, error))
        persistChains.set(roomName, next)
      })
      persistenceListeners.add(roomName)
    }

    return doc
  })()

  roomLoads.set(roomName, loading)
  try {
    return await loading
  } catch (error) {
    roomLoads.delete(roomName)
    throw error
  }
}

// Plain HTTP response for health checks and browser visits.
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', persistence: 'postgresql' }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('collab-editor-server ok (PostgreSQL persistence enabled)')
})

const wss = new WebSocket.Server({ server })
wss.on('connection', async (conn, req) => {
  const roomName = roomNameFromRequest(req)
  try {
    await loadRoom(roomName)
    setupWSConnection(conn, req)
  } catch (error) {
    console.error(`Could not initialize room ${roomName || '(empty)'}`, error)
    conn.close(1011, 'Room persistence initialization failed')
  }
})

const PORT = process.env.PORT || 1234

initializeDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Yjs WebSocket server running on :${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Could not initialize PostgreSQL persistence:', error)
    process.exit(1)
  })

async function shutdown() {
  console.log('Shutting down CoSync server...')
  server.close()
  wss.close()
  try {
    await Promise.all([...persistChains.values()])
    await pool.end()
  } catch (error) {
    console.error('Error while shutting down:', error)
  }
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
