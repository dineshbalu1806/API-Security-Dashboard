# Intelligent API Security Testing Dashboard

MERN stack app that scans REST APIs for OWASP API Top 10 vulnerabilities,
generates AI-powered remediation recommendations, and produces compliance
reports.

## Build Progress

- [x] **Session 1** — Backend foundation: schemas (User, Project, Scan,
      Finding), JWT auth, project CRUD. See `server/README.md` for full route docs.
- [x] **Session 2** — Scan engine: BullMQ queue + OWASP test modules
- [x] **Session 3** — AI recommendations (Anthropic API) + PDF compliance reports
- [x] **Session 4** — Frontend: componentized dashboard, routing, mock-data workflow
- [x] **Session 5** — Real-time scan progress (Socket.io), demo seed data, and final app flow

The project is fully wired for local end-to-end demo use. See the local run instructions below.

## Stack

React + Tailwind (frontend) · Node.js + Express (backend) · MongoDB (data) ·
BullMQ + Redis (scan queue) · Anthropic Claude API (AI recommendations) ·
Puppeteer (PDF reports)

## Local Run Instructions

```bash
# 1) Install backend deps
cd server
npm install
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, and optionally REDIS_PASSWORD / ANTHROPIC_API_KEY

# 2) Start MongoDB and Redis locally
# Mongo: mongodb://localhost:27017
# Redis: redis-server or your local Redis instance

# 3) Start the API server in one terminal
npm run dev

# 4) Start the queue worker in a second terminal
npm run worker

# 5) Seed demo data in a third terminal
npm run seed

# 6) Start the frontend in a fourth terminal
cd ../client
npm install
npm run dev
```

The API boots on `http://localhost:5000`, the demo frontend is usually on
`http://localhost:5173`, and the seed script creates a demo user with
`demo@example.com / password123` plus a completed scan and realistic findings.
Set `VITE_API_URL` if the frontend should target a different backend URL.

## Frontend Routes

- `/login` — sign in or create an account
- `/dashboard` — posture overview, charts, and recent findings
- `/projects/new` — project and OpenAPI upload form
- `/scan/:scanId` — live scan progress view
- `/findings/:scanId` — filterable findings table and detail drawer
- `/reports/:scanId` — compliance report preview and download action

## Demo Credentials

- Email: `demo@example.com`
- Password: `password123`
