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

For MongoDB Atlas, create a database user and allow your development machine's
IP address under Atlas Network Access. In **Connect → Drivers**, copy the
connection string and set `MONGO_URI` in `server/.env`, using a database name
such as `api_security_dashboard`:

```text
mongodb+srv://<database-user>:<url-encoded-password>@<cluster-host>/api_security_dashboard?retryWrites=true&w=majority
```

Replace the placeholders with your Atlas values and URL-encode special
characters in the password. Keep this URI in the server's ignored `.env` file;
never put it in frontend configuration or commit it. Restrict the Atlas
network allowlist rather than allowing access from anywhere. The local MongoDB
URI in `.env.example` is an alternative for a local database.

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

The API must be running with MongoDB connected. Local and Render deployments
also need the scan worker and Redis; the Vercel deployment uses bounded
function background work instead. `GET /api/health` returns HTTP 503 until
MongoDB is ready.

## Deployment

The repository root `render.yaml` provisions a Render API web service, a
background worker, a static frontend, and Redis Key Value. MongoDB Atlas must
be provisioned separately. Configure `MONGO_URI`, `JWT_SECRET`,
`PROJECT_CREDENTIALS_KEY`, and `CLIENT_URL` on both server services, using the
same `JWT_SECRET` and `PROJECT_CREDENTIALS_KEY` values for the API and worker.
Configure `VITE_API_URL` on the static site to the API service host. Set
Anthropic variables only if AI recommendations are needed.

### Vercel

The full application can run in one Vercel project. Set the project **Root
Directory** to the repository root so Vercel uses the root `vercel.json`,
builds the client workspace, and discovers the API function in `api/`. Set
`MONGO_URI`, `JWT_SECRET`, `PROJECT_CREDENTIALS_KEY`, and `CLIENT_URL` in the
Vercel project's private environment settings. Set the frontend build
variables `VITE_API_URL` to the project's HTTPS origin and
`VITE_API_MODE=serverless`.
The API CORS policy allows the configured `CLIENT_URL`, the production
`api-security-dashboard.vercel.app` domain, the active Vercel deployment
origin, and localhost for development.

Vercel does not provide this app's Socket.IO server or persistent BullMQ worker
model. In this deployment, scans run as bounded function background work and
the frontend polls MongoDB-backed progress. The root `vercel.json` configures a
300-second function limit, and scans stop with a failed status before that
limit when they have not completed. Larger scans may therefore need fewer
endpoints or a persistent worker deployment.

See the root README for instructions to deploy both the frontend and API
entirely on Vercel.

## Data models

- **User**: name, email, password hash (not returned), role
- **Project**: owner, API URL, optional encrypted API credential, authorization
  confirmation time, OpenAPI spec or manual endpoints
- **Scan**: project, owner, status, module progress, score, timestamps
- **Finding**: scan, project, OWASP category, severity, endpoint, evidence,
  recommendation, and status
