# Collaborative Code Editor

Real-time collaborative code editor with live sync and presence, built with Yjs (CRDTs), Monaco, React, and Node/WebSockets.

## Status log
_Update this daily — one line is enough. This becomes your Day 10 documentation if you keep it current._

-# CoSync — Real-Time Collaborative Code Editor

A real-time collaborative code editor with live text synchronization and presence tracking, built using Yjs (CRDTs), Monaco Editor, React, and Node.js with WebSockets.

---

## Technical Overview
* **Frontend:** React, Monaco Editor
* **State Sync:** Yjs (Conflict-free Replicated Data Types)
* **Real-time Transport:** `y-websocket` provider, Node.js WebSocket backend
* **Presence:** Yjs Awareness Protocol (Cursor positions & live user badges)

---

## Status Log & Daily Progress

* **Day 1:** Project setup & initialization. Scaffolded React frontend and Node.js WebSocket server. Configured basic dependencies (`yjs`, `y-websocket`, `@monaco-editor/react`).

* **Day 2:** Integrated Monaco Editor into the React UI. Established local single-user editing state.

* **Day 3-4:** Implemented real-time bidirectional document synchronization using Yjs CRDTs over WebSockets. Resolved `y-monaco` library compatibility issues by creating a custom binding between Monaco Editor and Yjs `Y.Text`.

* **Day 5:** Added real-time user presence and awareness using Yjs's Awareness protocol. Implemented live remote cursor tracking and dynamic active user badges.

* **Day 6 (Upcoming):** Room-based session routing (`/room/:id`) to isolate document states per session link.

* **Day 7 (Upcoming):** Production deployment (Frontend to Vercel/Netlify, WebSocket server to Render/Railway) and edge-case testing.

* **Day 8 (Upcoming):** Code cleanup, final documentation refinement, and backup demo preparation.

---

## Scope & Limitations
* **In-Memory State:** Current scope relies on in-memory state relay via WebSocket connections; persistent database storage (Redis/SQL) is omitted by design for speed and simplicity.
* **Authentication:** Minimal room-link based access without mandatory user authentication.

## Architecture
_Fill in on Day 10 — why Yjs over OT, why Monaco, what's deliberately not implemented (auth, full persistence) and why._

## Running locally

**Backend:**
```
cd collab-editor-server
npm install
npm start
```

**Frontend:**
```
cd collab-editor-client
npm install
npm run dev
```
