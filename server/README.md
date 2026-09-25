# API Security Testing Dashboard — Backend (Session 1)

This is the **foundation layer** of the backend: schemas, auth, and project CRUD.
Scan engine, AI recommendations, report generation, and real-time progress are
built in later sessions (see prompts at the end of this file).

## Setup

```bash
cd server
npm install
cp .env.example .env   # then fill in MONGO_URI and JWT_SECRET at minimum
npm run dev             # requires nodemon (npm install -g nodemon), or npm start
```

Requires a running MongoDB instance (local or Atlas). Redis is only needed
once you add Session 2 (scan queue) — not required for this session.

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
├── services/scanModules/      # (empty — Session 2)
├── queue/                     # (empty — Session 2)
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

## Data Models

- **User**: `name, email, passwordHash (hidden), role (admin/member)`
- **Project**: `userId, name, apiBaseUrl, openApiSpec (mixed), manualEndpoints[], description`
- **Scan**: `projectId, userId, status (queued/running/completed/failed), moduleProgress[], overallScore, startedAt, completedAt`
- **Finding**: `scanId, projectId, owaspCategory, severity (Critical/High/Medium/Low), endpoint, method, description, aiRecommendation, status`

Scan and Finding schemas are already defined so Session 2's scan engine can
use them directly without any migration.

## What's NOT built yet (intentionally, for later sessions)

- Scan trigger route + BullMQ worker + OWASP test modules
- AI recommendation service (Anthropic API call per finding)
- PDF compliance report generation (Puppeteer)
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
