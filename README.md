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

### AI features (Groq or Gemini, free tiers)

- **AI hints and code review** on the practice page. Hints come in three levels (Nudge → Approach → Plan) and never give away the full solution. The review covers correctness, complexity, code quality and a score.
- **Interviewer tools (private to the host):**
  - Role requirements (role, level, skills) set when creating a session
  - Live **notes and a 5-part star scorecard** inside the call, plus an AI look at the candidate's current code
  - **Timed interviews** (15–90 min) with a countdown and warnings
  - **Recording**: the host can record the call, and the recording plays back on the report page
  - When the host ends the session, the candidate's final code is saved and an **AI interview report** is generated. It covers summary, strengths, gaps, code assessment, fit for the role, a recommendation and an AI score, shown on a **performance card**.
  - An **"Interviews you conducted" dashboard** with candidates, scores, recommendations and report links
  - The candidate never sees any of this. It lives in a separate collection behind host-only endpoints, and tests check that it doesn't leak.
- **AI mock interviews with Ava:**
  - Upload your resume (PDF/TXT, parsed in the browser) and pick a role, level, interview type (technical, behavioral or mixed) and number of questions.
  - Ava asks one tailored question at a time, follows up on vague answers, and wraps up when the questions are done.
  - Answer by **voice** (speech-to-text) or typing; Ava can **speak** her questions aloud.
  - **Your personal report**: overall score, a 5-dimension performance card, strengths, **where you lacked** (with what a strong answer would include), a question-by-question table, an improvement plan, resume tips, and the full transcript. You can save it as a PDF.
- **Progress is saved to your account**, so solved problems follow you across devices.

### Code execution

The public Piston API became whitelist-only in February 2026, so code now runs like this:

| Language   | Where it runs                                                       |
| ---------- | ------------------------------------------------------------------- |
| JavaScript | Sandboxed Web Worker in the browser (instant, no server load)        |
| Python     | Pyodide (CPython compiled to WebAssembly) in a browser Web Worker    |
| Java       | Backend proxy `POST /api/code/execute` → your self-hosted Piston (`PISTON_API_URL`) |

Every run has a time limit, so an infinite loop can't freeze the tab.

#### Self-hosting Piston (to run Java)

Run Piston anywhere Docker runs (a small VM, Railway, Fly.io; Render's free tier can't run privileged containers):

```bash
docker run -d --name piston --privileged -p 2000:2000 ghcr.io/engineer-man/piston
# install the runtimes the app uses
curl -X POST localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"java","version":"15.0.2"}'
```

Then set `PISTON_API_URL=http://<host>:2000/api/v2` on the backend. JavaScript and Python never need it.

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

**AI setup (free):** create a key at [console.groq.com](https://console.groq.com) (recommended, very fast) or [aistudio.google.com](https://aistudio.google.com), and set `GROQ_API_KEY` or `GEMINI_API_KEY` in `backend/.env`. Groq is used when both are set. You can override the models with `GROQ_MODEL` (default `openai/gpt-oss-120b`) or `GEMINI_MODEL` (default `gemini-3.8-flash`). Without a key, everything else works and the AI buttons show a "not configured" message.

Users are created in MongoDB by the Inngest function when Clerk fires `user.created`. Locally, run `npx inngest-cli@latest dev` and point the Clerk webhook at it.

## Tests

```bash
npm test              # runs both suites
```

- **Backend (55 tests):** real in-memory MongoDB with Clerk, Stream and the AI providers mocked. Covers auth, create/join/end rules, the concurrent-join race, Stream failure rollback, validation and payload limits. It also covers the AI streaming paths for both Groq and Gemini (including split chunks, 429s, network failures and safety blocks), the privacy of interviewer data, the AI report prompt, and the full mock interview flow (turns, retry after failure, finishing early, score parsing).
- **Frontend (67 tests):** judge/normalisation, storage, the SSE client, Markdown safety (no raw HTML), the performance card, and components. Every problem's expected output is checked by running reference solutions in **JavaScript and Python**, and the untouched starter code is confirmed to fail.

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
| POST   | `/api/ai/hint`, `/api/ai/review` | Stream an AI hint (levels 1–3) or code review (SSE) |
| GET/PATCH | `/api/sessions/:id/evaluation` | Host only: requirements, notes, scores, recommendation |
| POST   | `/api/sessions/:id/report` | Host only: stream and save the AI interview report |
| GET    | `/api/sessions/:id/recordings` | Host only: call recordings                   |
| GET    | `/api/sessions/hosted`     | Host only: interviews you conducted, with score summary |
| GET/POST | `/api/users/me/progress` | Solved problems synced to your account          |
| GET/POST | `/api/mock-interviews`   | List or start AI mock interviews                |
| POST   | `/api/mock-interviews/:id/turn` | Send an answer, stream Ava's next question  |
| POST   | `/api/mock-interviews/:id/finish`, `/report` | End early; stream your personal report |
