# CoSync — Real-Time Collaborative Code Editor

CoSync is a browser-based code editor that allows multiple users to edit the same document in real time. It uses Yjs for conflict-free synchronization, Monaco Editor for the coding interface, WebSockets for communication, and PostgreSQL to persist document state across server restarts.

**Live Demo:** https://collab-editor-liart.vercel.app  
**Backend:** https://collab-editor-91e2.onrender.com  
**Repository:** https://github.com/Rajashekar-jatoth/collab-editor

## Features

- **Real-time collaboration:** Changes synchronize across multiple browser sessions.
- **Room-based editing:** Each room has a unique URL that users can share.
- **Live presence:** Displays connected users and supports collaborative awareness features.
- **Monaco Editor:** Provides a code-editor interface in the browser.
- **Conflict-free synchronization:** Yjs CRDTs help concurrent edits converge across clients.
- **Offline-edit merging:** Yjs can merge supported offline edits after reconnection.
- **Persistent document storage:** PostgreSQL stores binary Yjs document state.
- **Cloud deployment:** Frontend hosted on Vercel and backend hosted on Render.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite |
| Code editor | Monaco Editor |
| Synchronization | Yjs CRDTs |
| WebSocket provider | `y-websocket` |
| Backend | Node.js, WebSockets |
| Database | PostgreSQL |
| Database provider | Neon |
| Frontend hosting | Vercel |
| Backend hosting | Render |

## Architecture

```text
User A (Browser)                 User B (Browser)
React + Monaco                   React + Monaco
       |                                |
       +----------- WebSocket ----------+
                       |
                 Node.js Backend
                   y-websocket
                       |
               Yjs Document / CRDT
                       |
                PostgreSQL (Neon)
              Persistent Yjs State
```

### How it works

1. A user opens a room URL, such as `/room/<room-id>`.
2. The frontend connects to the backend using a WebSocket provider.
3. Yjs synchronizes document changes between connected clients.
4. The Awareness protocol communicates presence information between users.
5. The backend stores Yjs document state in PostgreSQL and restores saved state when a room is loaded.

### Why these technologies?

- **Yjs instead of Operational Transformation (OT):** Yjs provides CRDT-based synchronization designed to merge concurrent changes.
- **Monaco Editor:** Provides a familiar code-editing interface in the browser.
- **WebSockets:** Allow low-latency, bidirectional communication.
- **PostgreSQL:** Keeps document state in persistent storage rather than relying solely on server memory.
- **React:** Supports a component-based frontend and room interface.

## Development Progress

- **Day 1:** Set up the React frontend and Node.js WebSocket backend.
- **Day 2:** Integrated Monaco Editor and implemented local editing.
- **Days 3–4:** Added bidirectional document synchronization using Yjs and WebSockets; implemented a custom Monaco–Yjs binding.
- **Day 5:** Added user presence and awareness features.
- **Day 6:** Implemented room-based URLs and verified that rooms maintain separate documents.
- **Day 7:** Implemented PostgreSQL persistence, automatic table initialization, document snapshots, and restoration of saved Yjs state.
- **Day 8:** Deployed the frontend and backend and tested cross-device synchronization.
- **Final validation:** Verified live collaboration across two browser sessions, confirmed content survived a browser refresh, and queried Neon to confirm a saved document-state record.

## PostgreSQL Persistence

The backend creates a table named `cosync_documents` automatically.

Each room has a database record containing its room ID, binary Yjs state, and last-update timestamp.

| Column | Purpose |
|---|---|
| `room_name` | Unique room identifier |
| `yjs_state` | Binary Yjs document state |
| `updated_at` | Last saved timestamp |

### Configure the backend

1. Create a PostgreSQL database with a provider such as Neon.
2. Open the `collab-editor-server` directory.
3. Copy `.env.example` to `.env`.
4. Set `DATABASE_URL` to your PostgreSQL connection string.
5. Set `DATABASE_SSL=true` if required by your database provider.
6. Install dependencies and start the backend.

**Never commit `.env` or expose database credentials in public repositories.**

## Running Locally

### Prerequisites

- Node.js and npm
- A PostgreSQL database
- Git

### 1. Start the backend

```bash
cd collab-editor-server
npm install
```

Configure your `.env` file, then run:

```bash
npm start
```

The backend uses the `PORT` environment variable when supplied by the hosting platform and initializes the PostgreSQL table at startup.

### 2. Start the frontend

Open a second terminal:

```bash
cd collab-editor-client
npm install
```

Configure the frontend environment variable:

```env
VITE_WS_URL=ws://localhost:1234
```

Then run:

```bash
npm run dev
```

Open the local URL printed by Vite. For local development, ensure the WebSocket URL matches the port on which the backend is running.

## Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Neon PostgreSQL

The deployed frontend uses the `VITE_WS_URL` environment variable to connect to the hosted backend. For production, configure it as:

```env
VITE_WS_URL=wss://collab-editor-91e2.onrender.com
```

Vite environment variables are applied at build time, so redeploy the frontend after changing them.

The backend requires `DATABASE_URL` and may require `DATABASE_SSL=true`, depending on the database provider.

## Testing and Verification

The following checks have been completed:

- Two browser sessions joined the same room.
- Text changes synchronized between the sessions.
- The online-user list displayed both connected users.
- Document contents remained after refreshing a browser.
- The Render backend initialized the PostgreSQL persistence table successfully.
- A Neon SQL query returned a non-empty saved Yjs state for a live room.

These tests validate the core collaborative editing and persistence workflow.

## Known Limitations

- **No authentication:** Anyone who obtains a room URL may be able to join and edit that room.
- **No authorization system:** The application does not currently provide role-based access or private-room permissions.
- **Basic document persistence:** The backend stores Yjs state snapshots. More advanced retention, backup, and recovery policies have not been implemented.
- **Free-tier hosting:** The Render service may sleep during periods of inactivity, increasing the initial connection time.
- **Editor update strategy:** The custom Monaco–Yjs binding applies remote changes by replacing document content. Incremental delta application could improve cursor stability and performance.
- **Production hardening:** Rate limiting, stronger access controls, monitoring, and automated integration tests are potential future improvements.

## Future Enhancements

- User authentication and private rooms
- Room ownership and permission controls
- Improved incremental editor updates
- Language selection and syntax configuration
- Automated tests and monitoring
- Better connection and reconnection feedback

## Author

**Rajashekar Jatoth**

GitHub: https://github.com/Rajashekar-jatoth

---

*CoSync is a learning and portfolio project demonstrating real-time collaboration, CRDT-based synchronization, WebSocket communication, and persistent storage.*
