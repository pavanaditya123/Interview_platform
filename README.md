# InterviewHub: Collaborative Coding Interview Platform

A real-time platform for 1-on-1 coding interviews and pair programming: HD video, chat, a shared live code editor, and a practice problem set with an in-browser judge.

## Features

- **Live interview sessions**: the host picks a problem and opens a room; one candidate joins from the dashboard or an invite link.
  - HD video/audio calls with screen sharing (Stream Video)
  - Session chat (Stream Chat)
  - **Live code sync**: both people see each other's edits and language changes in real time
  - The host ends the session for everyone; ended sessions show under "Past Sessions" for both people
- **Practice mode**: 10 problems (Easy → Hard) in JavaScript, Python and Java
  - Per-test-case results, confetti when everything passes
  - **Auto-saved drafts** per problem and language, plus a reset-to-starter button
  - **Solved tracking** with a progress bar, solved badges, search, and difficulty filters
  - `Ctrl/Cmd + Enter` runs your code
- **Dashboard**: live sessions lobby (auto-refreshing), your stats, and past sessions with duration

### Code execution

The public Piston API became whitelist-only in February 2026, so code now runs like this:

| Language   | Where it runs                                                       |
| ---------- | ------------------------------------------------------------------- |
| JavaScript | Sandboxed Web Worker in the browser (instant, no server load)        |
| Python     | Pyodide (CPython compiled to WebAssembly) in a browser Web Worker    |
| Java       | Backend proxy `POST /api/code/execute` → your self-hosted Piston (`PISTON_API_URL`) |

Every run has a time limit, so an infinite loop can't freeze the tab.

## Tech stack

**Frontend:** React 19, Vite, Tailwind v4 + daisyUI, TanStack Query, Monaco Editor, Clerk, Stream Video and Chat SDKs
**Backend:** Node 22, Express 5, MongoDB/Mongoose, Clerk, Stream, Inngest (Clerk → DB user sync)

## Performance and scaling

- **Initial page load is about 120 KB gzipped.** Every page is lazy-loaded, and the 1.9 MB Stream SDK downloads only on the session page.
- The hero image is now WebP: 1.3 MB → 69 KB.
- Hashed assets are served with `Cache-Control: immutable` (1 year), and `index.html` with `no-cache`. Responses are gzip-compressed.
- MongoDB connection pooling, compound indexes for every hot query, and `.lean()` reads.
- Authenticated users are cached in memory for 60s, which saves a DB lookup on every request.
- Rate limits: 300 req/min per IP on `/api`, and 20 code runs/min per user.
- Session joins are atomic, so two candidates can't both claim the last seat (covered by a test).
- Graceful shutdown on `SIGTERM`, a `/health` endpoint for Render, and keep-alive timeouts tuned for load balancers.
- React Query caching (`staleTime`, no refetch-on-focus, no retries on 4xx); memoized editor and problem panels.
- Load test (`node backend/scripts/load-test.js`): 9,000 requests at 100 concurrent, 0 errors.

## Getting started

```bash
# 1. install
npm install --prefix backend
npm install --prefix frontend

# 2. configure
cp backend/.env.example backend/.env       # fill in Mongo, Clerk, Stream, Inngest keys
cp frontend/.env.example frontend/.env     # VITE_CLERK_PUBLISHABLE_KEY, VITE_STREAM_API_KEY

# 3. run (two terminals)
npm run dev --prefix backend               # API on :3000 (or: npm run dev:memory --prefix backend for a throwaway in-memory DB)
npm run dev --prefix frontend              # app on :5173, /api is proxied to :3000
```

Users are created in MongoDB by the Inngest function when Clerk fires `user.created`. Locally, run `npx inngest-cli@latest dev` and point the Clerk webhook at it.

## Tests

```bash
npm test              # runs both suites
```

- **Backend (22 tests):** real in-memory MongoDB with Clerk and Stream mocked. Covers auth, create/join/end rules, the concurrent-join race, Stream failure rollback, validation, and payload limits.
- **Frontend (59 tests):** judge/normalisation, storage, and components. Every problem's expected output is checked by running reference solutions in **JavaScript and Python**, and the untouched starter code is confirmed to fail.

CI (`.github/workflows/ci.yml`) runs lint, both test suites, and a production build on every PR.

## Deploying to Render

`render.yaml` is a Blueprint for a single web service. Build: `npm run build`. Start: `npm start`. Health check: `/health`. Set the secret env vars in the Render dashboard (see `.env.example`). The `VITE_*` vars are needed at **build** time.

## API

| Method | Path                       | Description                                     |
| ------ | -------------------------- | ----------------------------------------------- |
| GET    | `/health`                  | Liveness plus DB status                         |
| POST   | `/api/sessions`            | Create a session `{ problem, difficulty }`      |
| GET    | `/api/sessions/active`     | Active sessions (`?limit=`, max 50)              |
| GET    | `/api/sessions/my-recent`  | Your completed sessions                         |
| GET    | `/api/sessions/:id`        | Session details                                 |
| POST   | `/api/sessions/:id/join`   | Join as the participant                         |
| POST   | `/api/sessions/:id/end`    | End the session (host only)                     |
| GET    | `/api/chat/token`          | Stream token for video and chat                 |
| POST   | `/api/code/execute`        | Run code via Piston `{ language, code }`        |
