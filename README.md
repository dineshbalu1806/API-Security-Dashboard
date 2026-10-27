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

   Set `MONGO_URI`, a unique `JWT_SECRET`, and Redis settings in `server/.env`.
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

## Deploy the frontend on Vercel

Vercel hosts the Vite frontend. The Express API, MongoDB, Redis, and BullMQ scan
worker must be deployed separately on services that support a persistent Node
process, Redis, and Socket.IO (for example, the API and worker services in
`render.yaml`). Vercel Functions are not a replacement for this worker/runtime.

1. Import this repository into Vercel and set **Root Directory** to `client`.
2. Use the Vite defaults: build command `npm run build` and output directory
   `dist`. `client/vercel.json` provides the SPA fallback for direct visits to
   routes such as `/dashboard` and `/scan/<id>`.
3. Add the Vercel environment variable `VITE_API_URL` with the public HTTPS
   origin of the deployed API, such as `https://your-api.example.com` (or its
   `/api` URL). Set it for Production and Preview as appropriate, then
   redeploy. This value is embedded in the client build and must not contain
   secrets.
4. On the API service, set `CLIENT_URL` to the exact deployed Vercel origin
   (for example, `https://your-app.vercel.app`) so both API CORS and
   Socket.IO accept the frontend. If using a custom domain, set that origin
   instead. The backend still needs `MONGO_URI`, `JWT_SECRET`,
   `PROJECT_CREDENTIALS_KEY`, and `REDIS_URL`; the separate worker needs the
   same database, Redis, and encryption/JWT settings.
5. Confirm `https://your-api.example.com/api/health` responds successfully,
   then test sign-in and scan progress from the deployed frontend.

For local Vercel builds, copy `client/.env.example` to `client/.env.local` and
set `VITE_API_URL` to your running API.

## Important scope

The scanner only runs against targets explicitly added by a signed-in user and
requires an authorization confirmation. It sends read-only GET requests; it
does not submit write operations or alter target data. In production, target
DNS must resolve only to public IP addresses. Runtime gateway-log ingestion
and threat-intelligence feeds are not configured: connect those only after
selecting the gateway and feed providers you use.

See [server/README.md](server/README.md) for the API and scan details.
