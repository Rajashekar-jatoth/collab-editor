const { setupWSConnection } = require('y-websocket/bin/utils')
const WebSocket = require('ws')
const http = require('http')

// Plain HTTP responses so the host's health checks (and a browser visit) get an answer.
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('collab-editor-server ok')
})
const wss = new WebSocket.Server({ server })

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req)
})

const PORT = process.env.PORT || 1234
server.listen(PORT, () => {
  console.log(`Yjs WebSocket server running on :${PORT}`)
})