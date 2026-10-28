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

The frontend and API are deployed as two Vercel projects from this repository.
MongoDB Atlas remains the database. The Vercel API uses serverless functions
and does not need Redis, BullMQ, or a separately deployed worker. Scan progress
is read from MongoDB by polling; Socket.IO is not available in this setup.

1. Import the repository into Vercel for the API project and set **Root
   Directory** to `server`. Vercel detects `server/api/[...path].js` as the API
   function. Set these server environment variables for Production (and
   Preview if needed):
   - `MONGO_URI`: the private Atlas connection string.
   - `JWT_SECRET`: a unique, strong secret.
   - `PROJECT_CREDENTIALS_KEY`: a stable, base64-encoded 32-byte key.
   - `CLIENT_URL`: the exact public origin of the frontend project, such as
     `https://api-security-dashboard.vercel.app`.
   - `ANTHROPIC_API_KEY`: optional, only for AI recommendations.
2. Deploy the API project and confirm
   `https://<api-project>.vercel.app/api/health` responds successfully.
3. In the frontend Vercel project, keep **Root Directory** set to `client`.
   Use build command `npm run build` and output directory `dist`.
   `client/vercel.json` handles direct visits to SPA routes.
4. Set these frontend environment variables in the frontend project:
   - `VITE_API_URL`: the public HTTPS origin of the API project, without
     `/api`, for example `https://<api-project>.vercel.app`.
   - `VITE_API_MODE=serverless`: disables the unsupported Socket.IO connection;
     scan status and module progress are polled from the API.
   Redeploy the frontend after setting these build-time values.
5. Create an account and verify sign-in, project creation, and a scan. Vercel
   runs scans as bounded background work in the API function; scans exceeding
   the configured time budget fail with an explanation, so reduce the endpoint
   count for larger APIs.

Keep all backend secrets in the API project's environment settings, never in
`VITE_` variables or the frontend project. The API function's maximum duration
is set to 300 seconds in `server/vercel.json`; the Vercel plan must permit this.
For local Vercel frontend builds, copy `client/.env.example` to
`client/.env.local` and set `VITE_API_URL` to the API origin.

## Important scope

The scanner only runs against targets explicitly added by a signed-in user and
requires an authorization confirmation. It sends read-only GET requests; it
does not submit write operations or alter target data. In production, target
DNS must resolve only to public IP addresses. Runtime gateway-log ingestion
and threat-intelligence feeds are not configured: connect those only after
selecting the gateway and feed providers you use.

See [server/README.md](server/README.md) for the API and scan details.
