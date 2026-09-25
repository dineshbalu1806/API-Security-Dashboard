# API Security Testing Dashboard — Backend (Session 1)

This backend provides schemas, authentication, project CRUD, an asynchronous
OWASP API scan engine, AI remediation recommendations, and PDF compliance
reports. Real-time progress is built in a later session (see prompts at the end
of this file).

## Setup

```bash
cd server
npm install
cp .env.example .env   # then fill in MONGO_URI and JWT_SECRET at minimum
npm run dev             # API server
# In a second terminal, with Redis running:
npm run worker
```

Requires running MongoDB and Redis instances. Configure `REDIS_HOST`,
`REDIS_PORT`, and optionally `REDIS_PASSWORD` in `.env`. To enable AI
recommendations, also set `ANTHROPIC_API_KEY`; `ANTHROPIC_MODEL` is optional.

## Folder Structure

```
server/
├── config/db.js              # MongoDB connection
├── models/                   # Mongoose schemas: User, Project, Scan, Finding
├── controllers/               # Route handler logic
├── routes/                    # Express route definitions
├── middleware/
│   ├── authMiddleware.js      # JWT verification (protect)
│   ├── roleMiddleware.js      # Role-based access (restrictTo)
│   └── errorHandler.js        # Centralized error responses + asyncHandler wrapper
├── utils/generateToken.js     # JWT signing helper
├── services/scanModules/      # independently testable OWASP test modules
├── services/prompts/           # editable LLM prompts
├── services/templates/         # editable PDF HTML template
├── queue/                     # BullMQ queue and scan worker
├── seed/                      # (empty — Session 4)
└── server.js                  # App entry point
```

## API Routes (implemented so far)

All responses follow: `{ success: true/false, ...data or message }`

### Auth — `/api/auth`

| Method | Route | Access | Body | Response |
|---|---|---|---|---|
| POST | `/signup` | Public | `{ name, email, password }` | `{ success, token, user }` |
| POST | `/login` | Public | `{ email, password }` | `{ success, token, user }` |
| GET | `/me` | Private | — (Bearer token) | `{ success, user }` |

`user` object shape: `{ id, name, email, role, createdAt }`

### Projects — `/api/projects` (all routes require `Authorization: Bearer <token>`)

| Method | Route | Body | Response |
|---|---|---|---|
| POST | `/` | `{ name, apiBaseUrl, openApiSpec?, manualEndpoints?, description? }` | `{ success, project }` |
| GET | `/` | — | `{ success, count, projects }` |
| GET | `/:id` | — | `{ success, project }` |
| DELETE | `/:id` | — | `{ success, message }` |

Projects are scoped to the logged-in user (`userId` filter on every query).

### Scans — `/api/scans` (all routes require `Authorization: Bearer <token>`)

| Method | Route | Body/query | Response |
|---|---|---|---|
| POST | `/` | `{ projectId }` | `{ success, scanId, scan }` with status `queued` |
| GET | `/` | `?projectId=<id>` optional | `{ success, count, scans }` |
| GET | `/:id` | — | `{ success, scan }` including persisted findings |

`POST /api/scans` returns immediately. The separate `npm run worker` process
consumes the BullMQ job, safely probes the project's endpoints with GET
requests, runs the seven scan modules, stores findings, and calculates a
severity-weighted score from 0 to 100.

### Recommendations and reports — `/api/scans` (private)

| Method | Route | Response |
|---|---|---|
| POST | `/:id/generate-recommendations` | Generates and saves recommendations for all findings, with bounded concurrency |
| GET | `/:id/report` | Downloads a styled PDF compliance report for a completed scan |

Recommendations use the Anthropic API and provide a risk explanation plus
three to five Node/Express remediation steps. Report generation includes the
project name, scan date, score, OWASP Top 10 summary, and findings grouped by
severity.

## Data Models

- **User**: `name, email, passwordHash (hidden), role (admin/member)`
- **Project**: `userId, name, apiBaseUrl, openApiSpec (mixed), manualEndpoints[], description`
- **Scan**: `projectId, userId, status (queued/running/completed/failed), moduleProgress[], overallScore, startedAt, completedAt`
- **Finding**: `scanId, projectId, owaspCategory, severity (Critical/High/Medium/Low), endpoint, method, description, aiRecommendation, status`

Scan and Finding schemas are already defined so Session 2's scan engine can
use them directly without any migration.

## What's NOT built yet (intentionally, for later sessions)

- Socket.io / polling for live scan progress
- Frontend (client/) — currently empty, Stitch export goes here
- Seed script for demo data

## Quick test with curl

```bash
# Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo User","email":"demo@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'

# Create a project (replace TOKEN)
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"My API","apiBaseUrl":"https://api.example.com"}'
```
