# Deploy on Render + Vercel

Upload the contents of this project folder to one GitHub repository. The repository
root must contain package.json, render.yaml and vercel.mjs, with client/ and server/
beside them. Do not upload node_modules or your private .env. No application code
needs changing to connect these hosts.

## 1. Create the Render backend

Render: New > Web Service > connect your repository. Alternatively use New >
Blueprint and select this repository; render.yaml fills in the service settings.
The included Blueprint uses the free plan; choose a paid instance when you want
an always-on backend.

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Root directory | Leave blank (repository root) |
| Build command | npm ci --omit=dev |
| Start command | npm start |
| Health check path | /api/health |
| Node version | 22 (provided by .node-version) |

Copy the variables in deployment/render.env.example into Render's Environment
settings, filling your actual values. Use raw values without surrounding quotes.
The important changes from local development are:

- NODE_ENV=production
- APP_ORIGIN=https://YOUR-PRODUCTION-FRONTEND.vercel.app
- TRUST_PROXY=1 for the Render ingress; keep login/order rate limiting enabled.
- EMAIL_MODE=off until you connect Resend.
- Leave PORT unset: Render supplies it.
- Leave MONGODB_DNS_SERVERS unset unless Render itself reports DNS lookup errors.
  Your local .env.example retains the resolver workaround for your Windows setup.

APP_ORIGIN must be the exact frontend origin, not the Render URL, without a trailing
slash or /admin. If the Vercel project does not exist yet, use your planned HTTPS
production address initially and correct it in step 3 before taking orders. Never
switch NODE_ENV back to development to bypass an origin error.

Use your existing Atlas database and admin password. A deployment does not reset
the admin account or delete existing orders/QR settings. ADMIN_PASSWORD initializes
an account only if none exists. MongoDB's password and the admin password are separate.

Add the outbound IP ranges listed for this Render service to MongoDB Atlas >
Network Access. If the first deploy cannot connect, add these ranges and redeploy.
Your laptop's allowed IP is not sufficient for Render.

Copy your Render service URL, such as https://book-api.onrender.com.
Visit https://YOUR-BACKEND.onrender.com/api/health: expect {"status":"ok"}.
The Render root URL may return 404: only the backend is built on Render.

## 2. Create the Vercel frontend

Import the same GitHub repository into Vercel.

| Setting | Value |
| --- | --- |
| Root directory | Repository root (not client) |
| Framework preset | Other |
| Node version | 22.x |
| Install command | npm ci --include=dev (provided by vercel.mjs) |
| Build command | npm run build (provided by vercel.mjs) |
| Output directory | client/dist (provided by vercel.mjs) |

Before deploying, add this one Vercel environment variable for Production:

BACKEND_URL=https://YOUR-BACKEND.onrender.com

Use your actual Render origin. Do not append /api. No VITE_API_URL is needed.
vercel.mjs generates the API rewrite from BACKEND_URL and handles React deep links.
If BACKEND_URL is missing/malformed, the deployment fails with a clear setup message.
After changing BACKEND_URL, redeploy Vercel so routing is rebuilt.

Only BACKEND_URL belongs on Vercel. Keep MongoDB, admin, Cloudinary and Resend
secrets on Render. Vercel builds only the public React assets; secrets are not
bundled into the frontend. Do not add a second vercel.json alongside vercel.mjs.

## 3. Match the frontend address and verify

After Vercel provides your stable Production domain, update Render APP_ORIGIN to
that exact HTTPS origin and redeploy Render. Use the production domain consistently,
not a different per-commit preview URL. Unconfigured preview domains are deliberately
blocked from login/checkout. Use a separate backend/database to test previews, or
use the production frontend for this launch check.

From the Vercel production website:

1. Open /api/health and /api/config: both should return JSON, not index.html.
2. Open /admin, log in, refresh, and confirm you remain signed in.
3. Check that the existing payment QR displays and its save link downloads an image.
4. Submit one test COD order: check subtotal, NPR 150 delivery, receipt and admin entry.
5. Submit a QR test using your own test proof, then open its private screenshot in
   admin. Verify Cloudinary upload/download with your real account before accepting
   buyer payments. Never approve a real payment from a screenshot alone.
6. Confirm a test order and check the buyer email job is queued while EMAIL_MODE=off.
7. Refresh /order, /journey, /writing and /admin directly; none should return 404.

Browser API/image requests remain under the Vercel origin (/api/...). Vercel proxies
them to Render, including login cookies and screenshot responses. This avoids a
third-party-cookie dependency. API responses use no-store. Keep the API rewrite
before the React fallback. Keep both services on HTTPS.

Rate-limit behavior through the actual Vercel/Render proxy chain must be checked
with multiple client connections after deployment. The included default trusts
Render's immediate ingress; do not blindly increase TRUST_PROXY or trust arbitrary
client-supplied forwarded headers. If all visitors share a limit, inspect forwarded
IP handling before launch.

Render's free web service sleeps after 15 idle minutes and may need about a minute
to wake. That can delay checkout/admin requests. The email worker also pauses while
the service sleeps; MongoDB retains pending jobs until it resumes. Use an always-on
instance for consistent order/email handling when launching publicly.

## Later: domain and email

When you attach your real domain to Vercel, set Render APP_ORIGIN to that canonical
HTTPS domain and redeploy Render. BACKEND_URL stays the Render URL unless you move
the backend. Then configure verified Resend sending details on Render as described
in README.md. Previously queued jobs are processed when email is enabled.

## What was prepared and what remains

This ZIP is deployment-configured, not already published. Actual services, generated
URLs, Atlas network access and hosted browser/provider behavior require your hosting
accounts. No deployment, live payment upload or email send was performed here.
The original private .env and installed dependencies have been excluded. Retain your
local .env privately; enter current credentials in Render's dashboard.

Official references:
- https://vercel.com/docs/project-configuration/vercel-ts
- https://vercel.com/docs/routing/rewrites
- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/health-checks
- https://render.com/docs/outbound-ip-addresses
- https://render.com/docs/free
