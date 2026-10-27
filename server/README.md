# API Security Dashboard — Server

The API stores users, projects, scans, and findings in MongoDB. BullMQ runs
scans in a separate worker process; Socket.IO publishes live scan progress.

## Local setup

Requires Node.js, MongoDB, and Redis.

```powershell
cd server
npm install
Copy-Item .env.example .env
# Set MONGO_URI, JWT_SECRET, Redis settings, and (optionally) AI settings.
npm run dev
```

Run the worker in a second terminal:

```powershell
cd server
npm run worker
```

Set `REDIS_URL` for managed Redis, including `rediss://` URLs. Otherwise use
`REDIS_HOST`, `REDIS_PORT`, and optionally `REDIS_PASSWORD`. Set a unique,
strong `JWT_SECRET`. `PROJECT_CREDENTIALS_KEY` is required when saving API
credentials; generate it with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

This must be a base64-encoded 32-byte key. Keep it stable and private; saved
credentials cannot be decrypted if it is lost or changed. `ANTHROPIC_API_KEY`
is optional and enables AI-generated recommendations.

## Real API scans

Create an account in the app, add an API base URL and OpenAPI JSON, and confirm
you are authorized to test the target. For protected APIs, provide an
authentication header name and value, such as `Authorization` and
`Bearer <token>`. The credential is encrypted with AES-256-GCM before it is
stored and is never returned by project endpoints.

The scan worker makes read-only GET requests only. It does not send POST, PUT,
PATCH, or DELETE requests. Supply concrete, non-destructive paths in
`manualEndpoints` for endpoints that require path parameters; the scanner does
not invent identifiers. In production, scan targets must resolve only to
public IP addresses. Findings and dashboard data are based on actual responses
and saved scan records. No sample user, sample project, or pre-populated
finding data is included.

## API routes

All responses use `{ success: true/false, ...data or message }`. Private routes
require `Authorization: Bearer <JWT>`.

### Authentication — `/api/auth`

| Method | Route | Access | Body |
| --- | --- | --- | --- |
| POST | `/signup` | Public | `{ name, email, password }` |
| POST | `/login` | Public | `{ email, password }` |
| GET | `/me` | Private | — |

### Projects — `/api/projects`

All project routes require a signed-in user. Project data is scoped by owner.

| Method | Route | Request |
| --- | --- | --- |
| POST | `/` | `{ name, apiBaseUrl, authorizationConfirmed: true, openApiSpec?, manualEndpoints?, description?, authHeaderName?, authHeaderValue? }` |
| GET | `/` | List the user's projects |
| GET | `/:id` | Read one owned project |
| DELETE | `/:id` | Delete one owned project |

Production project URLs must use HTTPS. Do not put credentials in the URL.
Authentication values are accepted only over the authenticated project API
and encrypted before database storage.

### Scans — `/api/scans`

All routes require a signed-in user and only return that user's scans.

| Method | Route | Request |
| --- | --- | --- |
| POST | `/` | `{ projectId }`; enqueues a scan and returns HTTP 202 |
| GET | `/` | List scans; optional `?projectId=<id>` |
| GET | `/:id` | Read scan and persisted findings |
| POST | `/:id/generate-recommendations` | Generate optional AI recommendations |
| GET | `/:id/report` | Download a completed scan's PDF report |

The API must be running with MongoDB connected, and the scan worker and Redis
must be available for scans to complete. `GET /api/health` returns HTTP 503
until MongoDB is ready.

## Deployment

The repository root `render.yaml` provisions a Render API web service, a
background worker, a static frontend, and Redis Key Value. MongoDB Atlas must
be provisioned separately. Configure `MONGO_URI`, `JWT_SECRET`,
`PROJECT_CREDENTIALS_KEY`, and `CLIENT_URL` on both server services, using the
same `JWT_SECRET` and `PROJECT_CREDENTIALS_KEY` values for the API and worker.
Configure `VITE_API_URL` on the static site to the API service host. Set
Anthropic variables only if AI recommendations are needed.

The frontend can instead be deployed to Vercel with the Vercel project root
set to `client`. Set its `VITE_API_URL` to the public HTTPS API origin and set
the API's `CLIENT_URL` to the exact Vercel site origin. Keep the API and scan
worker on persistent hosting: the worker consumes Redis jobs, and scan
progress uses Socket.IO, so a Vercel frontend deployment does not replace
those services. See the root README's Vercel instructions for setup details.

## Data models

- **User**: name, email, password hash (not returned), role
- **Project**: owner, API URL, optional encrypted API credential, authorization
  confirmation time, OpenAPI spec or manual endpoints
- **Scan**: project, owner, status, module progress, score, timestamps
- **Finding**: scan, project, OWASP category, severity, endpoint, evidence,
  recommendation, and status
