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

- Day 6: Room ID parsed from URL (/room/<id>), auto-generated and redirected if absent. Each room maps to its own Yjs doc via the WebsocketProvider room name. Verified: text syncs within a room, doesn't leak across rooms. Fixed bug where the online-users list stayed empty until the first awareness change (renderPresence wasn't called on startup).


- Day 7: Skipped persistence for now (see limitations below).


- Day 8: Deployed. Frontend on Vercel (VITE_WS_URL baked in at build time), backend on Render. Found and fixed: server had no HTTP handler so plain requests hung; verified sync between laptop and phone over mobile data.

---

## Scope & Limitations
* **Persistence:** Yjs document snapshots are stored in PostgreSQL. Configure `DATABASE_URL` (and `DATABASE_SSL=true` when required by your provider) before starting the backend. The server restores each room before accepting its first WebSocket connection.
* **Authentication:** Minimal room-link based access without mandatory user authentication.

## Architecture
_Fill in on Day 10 — why Yjs over OT, why Monaco, what's deliberately not implemented (auth, full persistence) and why._

## PostgreSQL persistence (Day 7)

The backend creates a `cosync_documents` table automatically on startup. Each room has one row containing a binary Yjs state snapshot; Yjs remains responsible for real-time conflict-free synchronization, while PostgreSQL preserves the document across server restarts.

1. Create a PostgreSQL database with your preferred provider.
2. In `collab-editor-server`, copy `.env.example` to `.env` and set `DATABASE_URL`. Set `DATABASE_SSL=true` if your provider requires TLS. Do not commit `.env`.
3. Install dependencies and start the server. The backend exits with an error if `DATABASE_URL` is missing or the database cannot initialize.
4. Open a room, type some text, stop/restart the backend, and reopen the same room URL to verify that the text is restored.

For Render, add `DATABASE_URL` and (if required by the database provider) `DATABASE_SSL=true` under the backend service's Environment settings. Use the database provider's connection string and keep it private.

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
## Live demo
- App: [https://collab-editor-liart.vercel.app](https://collab-editor-liart.vercel.app)
- Open the app, copy the room link, and open it on a second device to edit together.
- Backend runs on Render's free tier, so the first connection after ~15 idle minutes can take up to a minute while it wakes up.
- Rooms are unauthenticated: anyone with the link can edit.

## Architecture
Browser (React + Monaco) <-> WebSocket <-> Node relay (y-websocket) <-> other browsers

- Each room is one Yjs document (a Y.Text), named by the room ID in the URL (/room/<id>).
- The server only relays updates and holds a copy of each document. It does not resolve conflicts.
- CRDT (Yjs) instead of Operational Transform: CRDT updates commute, so every client converges
  to the same text regardless of arrival order, including edits made offline.
  Verified: edited on a phone in airplane mode and on a laptop, reconnected, and both merged.
- The Monaco <-> Yjs binding is hand-written. The y-monaco library failed to resolve
  Monaco's import path under Vite, so local edits are pushed into Y.Text via
  onDidChangeModelContent, and remote changes are applied via ytext.observe, with a flag
  to prevent echo loops.
- Presence (online list, remote cursors) uses the Yjs Awareness protocol.

## Known limitations
- Documents live in server memory only. Tested: after ~20 minutes with no connected users,
  a room's text was gone (consistent with the free Render tier spinning down when idle).
  Text does survive everyone leaving while the server is awake.
- Rooms have no authentication: anyone with the link can edit.
- Remote edits are applied by replacing the full document in the editor. No cursor jumping
  was observed in testing, but applying Yjs deltas incrementally would be more robust.