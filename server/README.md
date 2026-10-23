# API Security Testing Dashboard — Backend (Session 1)

This backend provides schemas, authentication, project CRUD, an asynchronous
OWASP API scan engine, AI remediation recommendations, and PDF compliance
reports. Real-time progress is built in a later session (see prompts at the end
of this file).

## Setup

```bash
cd server
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, and Redis settings
npm run dev             # API server
# In a second terminal, with Redis running:
npm run worker
# In a third terminal for demo data:
npm run seed
```

Requires running MongoDB and Redis instances. Set `MONGO_URI` in `.env` to your
MongoDB connection string (for a local instance:
`mongodb://127.0.0.1:27017/api_security_dashboard`). Configure `REDIS_HOST`,
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
├── realtime/                  # Socket.io scan progress relay
├── seed/                      # demo data seeding for local testing
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

## Run a local vulnerable API demo

To create a new scan with repeatable findings under your own account, start the
deliberately vulnerable sample API in a separate terminal:

```bash
cd server
npm run demo:vulnerable-api
```

It listens only on `127.0.0.1:5001` and returns fake demo data. Keep it local;
do not expose it to a network. In Sentinel, choose **Add an API to scan** and
enter:

- **Project name:** Vulnerable Demo API
- **Base URL:** `http://127.0.0.1:5001`
- **OpenAPI JSON:**

```json
{
  "openapi": "3.0.0",
  "info": { "title": "Vulnerable Demo API", "version": "1.0.0" },
  "paths": {
    "/api/user/42": { "get": { "responses": { "200": { "description": "Demo user" } } } },
    "/api/admin/audit": { "get": { "responses": { "200": { "description": "Demo audit data" } } } },
    "/api/orders": { "post": { "responses": { "200": { "description": "Demo order" } } } },
    "/api/search": { "get": { "responses": { "200": { "description": "Demo search" } } } }
  }
}
```

Choose **Create and scan**. The worker must be running and connected to Redis.
This local target is intentionally unsafe and returns predictable findings
such as missing authentication, exposed fake sensitive fields, missing security
headers, unrestricted requests, mass assignment risk, and an injection-like
error response. Each finding includes a built-in remediation suggestion; AI
recommendations can optionally be generated if `ANTHROPIC_API_KEY` is set.

## Data Models

- **User**: `name, email, passwordHash (hidden), role (admin/member)`
- **Project**: `userId, name, apiBaseUrl, openApiSpec (mixed), manualEndpoints[], description`
- **Scan**: `projectId, userId, status (queued/running/completed/failed), moduleProgress[], overallScore, startedAt, completedAt`
- **Finding**: `scanId, projectId, owaspCategory, severity (Critical/High/Medium/Low), endpoint, method, description, aiRecommendation, status`

Scan and Finding schemas are already defined so Session 2's scan engine can
use them directly without any migration.

## Included in the current build

- Socket.io live scan progress events for module-level updates
- Ready-to-run demo seed script for a demo user, project, and full scan
- Frontend integration points in the client app for the demo experience

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
