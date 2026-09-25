# Intelligent API Security Testing Dashboard

MERN stack app that scans REST APIs for OWASP API Top 10 vulnerabilities,
generates AI-powered remediation recommendations, and produces compliance
reports.

## Build Progress

- [x] **Session 1** — Backend foundation: schemas (User, Project, Scan,
      Finding), JWT auth, project CRUD. See `server/README.md` for full route docs.
- [ ] **Session 2** — Scan engine: BullMQ queue + OWASP test modules
- [ ] **Session 3** — AI recommendations (Anthropic API) + PDF compliance reports
- [ ] **Session 4** — Frontend: componentize Stitch export, routing, wire to backend
- [ ] **Session 5** — Real-time scan progress (Socket.io) + seed data + final integration

Continuation prompts for each remaining session are in `NEXT_SESSIONS.md`.

## Stack

React + Tailwind (frontend) · Node.js + Express (backend) · MongoDB (data) ·
BullMQ + Redis (scan queue) · Anthropic Claude API (AI recommendations) ·
Puppeteer (PDF reports)

## Running What's Built So Far

```bash
cd server
npm install
cp .env.example .env    # fill in MONGO_URI and JWT_SECRET
npm run dev
```

Server boots on `http://localhost:5000`. Test with the curl examples in
`server/README.md`.
