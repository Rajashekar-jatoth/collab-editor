const { setupWSConnection } = require('y-websocket/bin/utils')
const WebSocket = require('ws')
const http = require('http')

const server = http.createServer()
const wss = new WebSocket.Server({ server })

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req)
})

const PORT = process.env.PORT || 1234
server.listen(PORT, () => {
  console.log(`Yjs WebSocket server running on :${PORT}`)
})

// DAY 7 (optional, only if Days 3-4 didn't run long):
// Add interval-based persistence here — save ydoc state to a file or
// lightweight DB on a timer, so a server restart doesn't wipe active edits.
