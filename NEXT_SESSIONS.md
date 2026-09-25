# Remaining Build Sessions

Session 1 (backend foundation) is done and in this zip. Paste each prompt
below into a fresh Claude session (or an Antigravity agent) **with this
project folder uploaded/opened**, one session at a time, in order.

---

## Session 2 — Scan Engine

```
Here is my existing MERN project (server/ has models: User, Project, Scan,
Finding, plus auth and project CRUD already built — see server/README.md).

Build the OWASP API vulnerability scan engine on top of this, using the
existing Scan and Finding schemas as-is (do not modify them unless strictly
necessary).

Build:
1. POST /api/scans route: accepts a projectId, creates a Scan document with
   status "queued", adds a job to a BullMQ queue, returns the scan ID immediately
2. GET /api/scans/:id and GET /api/scans (list for a project) routes
3. A BullMQ worker (server/queue/scanWorker.js) that:
   - Picks up queued scan jobs
   - Parses the project's openApiSpec or manualEndpoints to get testable endpoints
   - Runs OWASP API Top 10 test modules against each endpoint: BOLA, Broken
     Authentication, Excessive Data Exposure, Lack of Rate Limiting, Mass
     Assignment, Security Misconfiguration, Injection
   - Creates Finding documents for anything detected
   - Calculates overallScore (0-100), updates the Scan, sets status "completed"
4. Structure each test module as a separate file in
   server/services/scanModules/ so they're independently testable
5. Update server/server.js to mount the new scan routes and initialize the
   BullMQ queue/Redis connection
6. Add REDIS_HOST/REDIS_PORT to .env.example if not already there
7. Update server/README.md with the new routes and setup steps (Redis required now)

Keep test modules safe — no destructive payloads. Package.json already lists
bullmq, ioredis, axios as dependencies.
```

---

## Session 3 — AI Recommendations + Compliance Report

```
Here is my existing MERN project (server/ has auth, project CRUD, and the
scan engine already built — see server/README.md). Finding schema already
has an aiRecommendation field.

Build:
1. server/services/aiRecommendation.js — calls the Anthropic API
   (ANTHROPIC_API_KEY env var, use @anthropic-ai/sdk which is already in
   package.json) for each Finding, generating a plain-language risk
   explanation + 3-5 concrete fix steps for a Node/Express context. Save
   into the Finding's aiRecommendation field.
2. POST /api/scans/:id/generate-recommendations — triggers this for all
   findings in a completed scan, with reasonable concurrency limits and
   graceful failure handling
3. server/services/reportGenerator.js — uses Puppeteer to generate a PDF:
   project name, scan date, overall score, OWASP Top 10 pass/fail summary
   table, full findings list grouped by severity with AI recommendations.
   Style the HTML template before converting (dark header, color-coded
   severity: Critical=red/High=orange/Medium=yellow/Low=green).
4. GET /api/scans/:id/report — generates and downloads the PDF
5. Update server/README.md with these new routes and the ANTHROPIC_API_KEY
   setup step

Keep the LLM prompt and PDF HTML template in separate files so they're easy
to edit later.
```

---

## Session 4 — Frontend Componentization

```
Here is my existing MERN project. I have a Stitch-exported UI (attach/paste
the exported files) for these screens: Login, Main Dashboard, Project/API
Upload, Scan in Progress, Vulnerability Findings, OWASP Compliance Report.

Set up client/ as a React + Vite + Tailwind app and:
1. Place the Stitch screens into client/src/pages/
2. Extract reusable components into client/src/components/: Sidebar, TopBar,
   StatCard, SeverityBadge (Critical=red/High=orange/Medium=yellow/Low=green),
   ScoreGauge (circular 0-100), FindingsTable, SeverityDonutChart,
   ScoreTrendLineChart (use Recharts)
3. Set up React Router (client/src/App.jsx): /login, /dashboard,
   /projects/new, /scan/:scanId, /findings/:scanId, /reports/:scanId
4. client/src/context/AuthContext.jsx — JWT + user state (localStorage + context)
5. client/src/services/api.js — axios instance, baseURL from env var, JWT
   interceptor
6. Keep every page visually IDENTICAL to the Stitch export — structural
   refactor only. Use mock/placeholder data via props for now.
7. Add loading and empty states to Dashboard and Findings pages

Do not connect to real backend endpoints yet.
```

---

## Session 5 — Real-Time Progress + Final Integration + Seed Data

```
Here is my existing MERN project — backend (auth, projects, scan engine, AI
recommendations, PDF reports) and frontend (componentized, routed, using mock
data) are both built separately. See server/README.md and the client/ folder.

Do all of the following:

1. Add Socket.io to server/server.js. In server/queue/scanWorker.js, emit
   progress events as each OWASP test module runs:
   { scanId, module, status: "running"|"completed"|"failed" }
2. Add client/src/hooks/useScanProgress.js — subscribes to a scan's progress
   channel, returns live module states for the Scan in Progress page
3. Wire every frontend page to real API calls via client/src/services/api.js,
   replacing all mock data:
   - Login -> POST /api/auth/login, store JWT, redirect to dashboard
   - Dashboard -> GET /api/projects, GET /api/scans (recent), real stats
   - Upload page -> POST /api/projects then POST /api/scans, redirect to scan progress
   - Scan Progress -> useScanProgress hook, redirect to Findings when completed
   - Findings -> GET /api/scans/:scanId (populated), wire filters to real data
   - Compliance Report -> GET /api/scans/:id/report, PDF download button
4. Add a protected route wrapper redirecting to /login if no valid JWT
5. Add error handling (toast/alert) and loading states throughout
6. Write server/seed/seed.js — creates demo user (demo@example.com /
   password123), one demo project, one completed scan with 12-15 realistic
   findings across all severities (with AI recommendations filled in)
7. Update the top-level README.md — mark all sessions complete, add full
   local run instructions (Mongo + Redis + both npm installs + seed + run)

Test the full flow end to end: signup -> login -> create project -> upload
spec -> run scan -> watch live progress -> view findings -> download report.
```

---

After Session 5, the project is feature-complete and demo-ready. From there,
polish items (not required, but good for portfolio): deploy to
Vercel/Render/Atlas/Upstash, record a demo video, add a project banner/screenshots
to the README.
