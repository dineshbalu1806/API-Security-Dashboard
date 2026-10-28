# API Security Dashboard

A MERN application that stores scan results from APIs you own or are authorized
to test. The dashboard summarizes each signed-in user's configured projects,
saved scan history, completed-scan scores, and open findings persisted in
MongoDB; scan progress is streamed through Socket.IO. The app does not preload
sample accounts, projects, findings, or fabricated traffic.

## Stack

React + Vite · Node.js + Express · MongoDB · BullMQ + Redis · Socket.IO ·
Anthropic API (optional recommendations) · Puppeteer (PDF reports)

## Run locally

Prerequisites: Node.js, MongoDB, and Redis.

1. Configure the backend:

   ```powershell
   cd server
   npm install
   Copy-Item .env.example .env
   ```

   To connect to MongoDB Atlas, create a database user in Atlas, allow your
   development machine's IP address under Network Access, then choose
   **Connect → Drivers** to get the connection string. Replace its username,
   password, and cluster host as needed, and include a database name:

   ```text
   mongodb+srv://<database-user>:<url-encoded-password>@<cluster-host>/api_security_dashboard?retryWrites=true&w=majority
   ```

   Put the completed URI in `MONGO_URI` in `server/.env` (not in the frontend
   or source code). URL-encode special characters in the database user's
   password. Keep the network allowlist restricted; avoid allowing access from
   anywhere. The local MongoDB URI in `.env.example` can be used instead when
   running MongoDB locally.

   Set a unique `JWT_SECRET` and Redis settings in `server/.env`.
   Generate `PROJECT_CREDENTIALS_KEY` with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. Start the API and worker in separate terminals from `server`:

   ```powershell
   npm run dev
   npm run worker
   ```

3. Start the frontend in another terminal:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

4. Create an account, add an API you are authorized to test, provide its
   OpenAPI JSON and (if needed) an authentication header. The worker makes
   read-only `GET` probes and saves the actual responses and findings.

The frontend defaults to `http://localhost:5000`; set `VITE_API_URL` to the
backend origin when running it elsewhere. No seed command or demo credentials
are required.

## Deploy on Render

`render.yaml` defines the React static site, API web service, background scan
worker, and Redis Key Value service. Before deploying:

1. Push this repository to a Git provider connected to Render and create a
   Blueprint from `render.yaml`.
2. Create a MongoDB Atlas database and set `MONGO_URI` on both server services.
3. Set the same strong `JWT_SECRET` and `PROJECT_CREDENTIALS_KEY` on both
   server services. The credentials key must be base64-encoded 32-byte data and
   must remain unchanged to decrypt saved API credentials.
4. Set `CLIENT_URL` on the API and worker to the deployed static-site origin.
   Set optional `ANTHROPIC_API_KEY` if AI recommendations are required.
5. Set the static site `VITE_API_URL` to the API service host. Redeploy the
   static site after changing build-time environment variables.

The API health endpoint is `/api/health`. Use HTTPS for production API targets.
Keep MongoDB and Redis credentials private and restrict their network access.

## Deploy the full app on Vercel

The full app runs as one Vercel project with the frontend as static assets and
the Express API as Vercel Functions. MongoDB Atlas remains the database. This
deployment does not need Redis, BullMQ, or a separately deployed worker. Scan
progress is read from MongoDB by polling; Socket.IO is not available in this
setup.

1. Open the existing Vercel project for this repository and set **Root
   Directory** to the repository root (`.`). Vercel uses the root
   `vercel.json`, builds the client workspace, and routes `/api/*` to the
   serverless API function.
2. Set these environment variables in the Vercel project for Production (and
   Preview if needed):
   - `MONGO_URI`: the private Atlas connection string.
   - `JWT_SECRET`: a unique, strong secret.
   - `PROJECT_CREDENTIALS_KEY`: a stable, base64-encoded 32-byte key.
   - `CLIENT_URL`: the exact public origin of the Vercel project, such as
     `https://api-security-dashboard.vercel.app`.
   - `RESEND_API_KEY` and `RESEND_FROM_EMAIL`: required for password-reset
     emails. Verify the sender domain in Resend and use an address on that
     domain. Keep the API key private.
   - `ANTHROPIC_API_KEY`: optional, only for AI recommendations.
   - `VITE_API_URL`: the public HTTPS origin of the API project, without
     `/api`, for example `https://api-security-dashboard.vercel.app`.
   - `VITE_API_MODE=serverless`: disables the unsupported Socket.IO connection;
     scan status and module progress are polled from the API.
   The API also allows this production domain and the active Vercel deployment
   origin for browser requests.
   Password recovery is available from the sign-in screen. Reset links are
   single-use and expire after one hour.
3. Save the settings and redeploy. Confirm
   `https://api-security-dashboard.vercel.app/api/health` responds successfully.
   The root `vercel.json` also handles direct visits to SPA routes.
4. Create an account and verify sign-in, project creation, and a scan. Vercel
   runs scans as bounded background work in the API function; scans exceeding
   the configured time budget fail with an explanation, so reduce the endpoint
   count for larger APIs.

Keep backend secrets in project environment settings, never in `VITE_`
variables. The API function's maximum duration is set to 300 seconds in the
root `vercel.json`; the Vercel plan must permit this. For local development,
copy `client/.env.example` to `client/.env.local` and set `VITE_API_URL` to the
API origin.

## Important scope

The scanner only runs against targets explicitly added by a signed-in user and
requires an authorization confirmation. It sends read-only GET requests; it
does not submit write operations or alter target data. In production, target
DNS must resolve only to public IP addresses. Runtime gateway-log ingestion
and threat-intelligence feeds are not configured: connect those only after
selecting the gateway and feed providers you use.

See [server/README.md](server/README.md) for the API and scan details.
