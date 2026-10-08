import { useRef, useEffect, useState } from 'react'
import * as monaco from 'monaco-editor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const COLORS = ['#f44336', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4']
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)]
const randomName = () => 'User-' + Math.floor(Math.random() * 1000)

function getOrCreateRoomId() {
  const path = window.location.pathname
  const match = path.match(/^\/room\/([a-zA-Z0-9-]+)$/)
  if (match) return match[1]

  const newId = Math.random().toString(36).slice(2, 10)
  window.history.replaceState({}, '', `/room/${newId}`)
  return newId
}

function App() {
  const containerRef = useRef(null)
  const [users, setUsers] = useState([])
  const [roomId, setRoomId] = useState(null)
  const decorationsRef = useRef([])

  useEffect(() => {
    const id = getOrCreateRoomId()
    setRoomId(id)
  }, [])

  useEffect(() => {
    if (!containerRef.current || !roomId) return

    const editor = monaco.editor.create(containerRef.current, {
      value: '',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
    })

    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider('ws://localhost:1234', roomId, ydoc)
    const ytext = ydoc.getText('monaco')

    const myColor = randomColor()
    const myName = randomName()
    provider.awareness.setLocalStateField('user', { name: myName, color: myColor })

    let isLocalChange = false

    const updateEditor = () => {
      if (isLocalChange) return
      const model = editor.getModel()
      const currentValue = model.getValue()
      const newValue = ytext.toString()
      if (currentValue !== newValue) {
        const fullRange = model.getFullModelRange()
        isLocalChange = true
        editor.executeEdits('yjs-sync', [{ range: fullRange, text: newValue }])
        isLocalChange = false
      }
    }
    ytext.observe(updateEditor)

    editor.onDidChangeModelContent((event) => {
      if (isLocalChange) return
      ydoc.transact(() => {
        event.changes
          .sort((a, b) => b.rangeOffset - a.rangeOffset)
          .forEach((change) => {
            ytext.delete(change.rangeOffset, change.rangeLength)
            ytext.insert(change.rangeOffset, change.text)
          })
      })
    })

    editor.onDidChangeCursorPosition((event) => {
      const offset = editor.getModel().getOffsetAt(event.position)
      provider.awareness.setLocalStateField('cursor', { offset })
    })

    const renderPresence = () => {
      const states = Array.from(provider.awareness.getStates().entries())
      const others = states.filter(([clientId]) => clientId !== provider.awareness.clientID)

      setUsers(
        states.map(([clientId, state]) => ({
          id: clientId,
          name: state.user?.name ?? 'Unknown',
          color: state.user?.color ?? '#888',
          isMe: clientId === provider.awareness.clientID,
        }))
      )

      const model = editor.getModel()
      const newDecorations = others
        .filter(([, state]) => state.cursor && state.user)
        .map(([, state]) => {
          const pos = model.getPositionAt(state.cursor.offset)
          return {
            range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column + 1),
            options: {
              className: 'remote-cursor',
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              inlineClassName: 'remote-cursor-inline',
            },
          }
        })

      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations)
    }

    provider.awareness.on('change', renderPresence)

    provider.on('status', (event) => {
      console.log('WebSocket status:', event.status)
    })

    return () => {
      ytext.unobserve(updateEditor)
      provider.awareness.off('change', renderPresence)
      provider.destroy()
      ydoc.destroy()
      editor.dispose()
    }
  }, [roomId])

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('Room link copied! Share it so others can join.')
  }

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '6px 12px', background: '#1e1e1e', borderBottom: '1px solid #333', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ color: '#aaa', fontSize: '13px' }}>Room: {roomId}</span>
        <button
          onClick={copyRoomLink}
          style={{ fontSize: '12px', padding: '2px 8px', cursor: 'pointer', background: '#333', color: '#eee', border: '1px solid #555', borderRadius: '4px' }}
        >
          Copy link
        </button>
        <span style={{ color: '#aaa', fontSize: '13px', marginLeft: '12px' }}>Online:</span>
        {users.map((u) => (
          <span key={u.id} style={{ color: u.color, fontSize: '13px', fontWeight: 'bold' }}>
            {u.name}{u.isMe ? ' (you)' : ''}
          </span>
        ))}
      </div>
      <div ref={containerRef} style={{ flex: 1 }} />
    </div>
  )
}

export default App