import { useRef, useEffect } from 'react'
import * as monaco from 'monaco-editor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

function App() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const editor = monaco.editor.create(containerRef.current, {
      value: '',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
    })

    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider('ws://localhost:1234', 'demo-room', ydoc)
    const ytext = ydoc.getText('monaco')

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

    provider.on('status', (event) => {
      console.log('WebSocket status:', event.status)
    })

    return () => {
      ytext.unobserve(updateEditor)
      provider.destroy()
      ydoc.destroy()
      editor.dispose()
    }
  }, [])

  return <div ref={containerRef} style={{ height: '100vh', width: '100vw' }} />
}

export default App