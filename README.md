# CoSync — Real-Time Collaborative Code Editor

CoSync is a browser-based code editor where multiple people edit the same document at the same time, from different devices, and see each other's changes and cursors live. Edits made while offline merge after reconnecting, and every room is saved to PostgreSQL so it survives the server restarting.

- **Live demo:** https://collab-editor-liart.vercel.app
- **Backend health check:** https://collab-editor-91e2.onrender.com
- **Demo video:** https://youtu.be/MBMYt0B_vs8
- **Repository:** https://github.com/Rajashekar-jatoth/collab-editor

> The backend runs on free tiers. After about 15 idle minutes the server sleeps, and the first visit afterwards can take up to a minute while it wakes up. Open the backend health check first, then the app.

## Features

- **Real-time collaboration:** changes synchronize across multiple browsers and devices
- **Room-based editing:** every document lives at `/room/<id>`, and anyone with the link joins the same document
- **Live presence:** an online-users list and remote cursor markers
- **Conflict-free synchronization:** Yjs CRDTs make concurrent edits converge to identical text
- **Offline-edit merging:** edits made while disconnected merge after reconnecting
- **Persistent storage:** PostgreSQL stores each room's Yjs document state, so rooms survive the server sleeping or restarting
- **Cloud deployment:** frontend on Vercel, backend on Render, database on Neon

## Tech stack

| Component | Technology |
|---|---|
| Frontend | React, Vite |
| Code editor | Monaco Editor |
| Synchronization | Yjs (CRDT) |
| WebSocket provider | y-websocket |
| Presence | Yjs Awareness |
| Backend | Node.js, WebSockets |
| Database | PostgreSQL (Neon) |
| Hosting | Vercel (frontend), Render (backend) |

## Architecture

```
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

1. A user opens a room URL such as `/room/<room-id>`. Opening the site without a room creates a new one.
2. The frontend connects to the backend over a WebSocket.
3. Yjs synchronizes document changes between everyone in the room.
4. The Awareness protocol shares each user's name, color and cursor position.
5. The backend stores the room's Yjs state in PostgreSQL and restores it when the room is loaded.

### Key technical decisions

**Yjs (CRDT) instead of Operational Transform.** CRDT updates can be applied in any order and every client still ends up with the same text. That makes offline editing and reconnecting safe, and the server does not have to order and transform operations.

**A hand-written Monaco-to-Yjs binding.** The standard `y-monaco` library failed to build under Vite because it could not resolve Monaco's internal import path, and several workarounds did not hold. I removed the library and wrote the binding directly:
- Local edits are read from Monaco's `onDidChangeModelContent` event and applied to the shared `Y.Text`.
- Remote changes arrive through `ytext.observe` and are written into the editor.
- A flag stops a remote change from being echoed back as a local one.

**Why the other technologies**
- **Monaco Editor:** a familiar, full-featured code editor in the browser.
- **WebSockets:** low-latency, two-way communication.
- **PostgreSQL:** document state is kept outside the server's memory, so the free-tier server sleeping does not lose rooms.
- **React:** a component-based frontend for the room interface.

## PostgreSQL persistence

The backend creates a table named `cosync_documents` automatically at startup. Each room has one record containing its room ID, binary Yjs state and last-update time.

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
5. Set `DATABASE_SSL=true` if your provider requires it.

Never commit `.env` or expose database credentials in a public repository.

## Project structure

```
collab-editor/
├── collab-editor-client/        React + Vite frontend
│   ├── src/App.jsx              editor, Yjs binding, rooms, presence
│   ├── vercel.json              rewrites /room/<id> links to the app
│   └── package.json
├── collab-editor-server/        Node WebSocket server
│   ├── server.js                Yjs relay and PostgreSQL persistence
│   ├── .env.example             environment variables to copy
│   └── package.json
└── README.md
```

## Running locally

**Prerequisites:** Node.js and npm, Git, and a PostgreSQL database (a free Neon project works).

**1. Start the backend**
```bash
cd collab-editor-server
npm install
```
Create your `.env` file as described above, then:
```bash
npm start
```
The server listens on port 1234 unless the `PORT` environment variable is set.

**2. Start the frontend** in a second terminal
```bash
cd collab-editor-client
npm install
npm run dev
```
Open the address Vite prints, which redirects to a new room. Open the same room link in another tab or on another device to collaborate.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | server | PostgreSQL connection string |
| `DATABASE_SSL` | server | set to `true` if your provider requires TLS |
| `PORT` | server | optional locally; Render sets it automatically |
| `VITE_WS_URL` | client | backend WebSocket address. Defaults to `ws://localhost:1234`; in production use `wss://...` |

## Deployment

- **Database:** Neon PostgreSQL
- **Backend (Render):** Web Service with Root Directory `collab-editor-server`, Build Command `npm install`, Start Command `npm start`, and the `DATABASE_URL` environment variable (plus `DATABASE_SSL=true` if required)
- **Frontend (Vercel):** Root Directory `collab-editor-client`, Vite preset, and the environment variable `VITE_WS_URL=wss://collab-editor-91e2.onrender.com`

Vite applies environment variables at build time, so set `VITE_WS_URL` before the first deploy and redeploy the frontend after changing it.

## Testing and verification

There is no automated test suite yet. Behavior was verified manually on the deployed site:

- Two devices (a laptop and a phone) joined the same room, stayed in sync, and both appeared in the online list.
- Simultaneous typing on the same line converged to identical text on both devices.
- Edits made offline on one device merged correctly after reconnecting, with nothing lost.
- Different rooms stayed isolated from each other.
- **Persistence after the server slept:** after about 30 minutes with no users, reopening a room cold-started the free Render server, which logged `Restored saved Yjs state` for that room, and the text was intact.
- Before PostgreSQL was added, the same idle test lost the room's text, which confirmed the need for the database.
- A Neon SQL query returned a non-empty saved Yjs state for a live room.

## Known limitations

- **Cold starts:** the free Render server sleeps after about 15 idle minutes and the free Neon database sleeps after about 5, so the first load after a long break can take up to a minute.
- **No authentication or authorization:** anyone with a room link can join and edit that room. There are no private rooms or roles.
- **Basic persistence:** the backend stores the current Yjs state per room. Retention, backups and version history are not implemented.
- **Editor update strategy:** the custom binding applies remote changes by replacing the editor's text. No cursor jumping was observed in testing, but applying Yjs deltas incrementally would be more robust.
- **Random display names:** each session gets a random name and color.
- **Manual testing only:** there are no automated tests, rate limiting or monitoring.

## Future enhancements

- User authentication and private rooms
- Room ownership and permission controls
- Incremental editor updates from Yjs deltas
- Language selection and syntax modes
- Automated multi-client tests and monitoring
- Better connection and reconnection feedback

## Development log

- **Day 1:** React frontend and Node.js WebSocket backend running standalone
- **Day 2:** Monaco Editor running as a single-user editor
- **Days 3-4:** real-time synchronization with Yjs; replaced the failing `y-monaco` library with a hand-written Monaco-Yjs binding
- **Day 5:** user presence and awareness
- **Day 6:** room-based URLs with a separate document per room
- **Day 7:** PostgreSQL persistence with automatic table creation and restoration of saved Yjs state
- **Day 8:** deployment to Vercel and Render, tested across devices
- **Day 9:** conflict, offline-merge and idle-persistence testing

## Author

Rajashekar Jatoth — [github.com/Rajashekar-jatoth](https://github.com/Rajashekar-jatoth)

CoSync is a learning and portfolio project demonstrating real-time collaboration, CRDT-based synchronization, WebSocket communication and persistent storage.
