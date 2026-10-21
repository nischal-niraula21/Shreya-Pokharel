# Shreya Pokharel MERN bookshop

MongoDB + Express + React + Node.js. This version preserves the latest supplied
website’s book, journey, writing, photos, colors, contact link and cover favicon.
Ordering now stays on the website instead of opening WhatsApp.

## Run locally

Requirements: Node.js 22.12 or later in the 22.x release line, npm, and a running MongoDB database
(local MongoDB or your own MongoDB Atlas connection).

1. Run `npm ci` in this folder.
2. Copy `.env.example` to `.env` (`copy .env.example .env` on Windows).
3. Set `MONGODB_URI`, and choose an `ADMIN_PASSWORD` of at least 12 characters.
   Add the three Cloudinary credentials below to enable QR-payment screenshots.
   There is no shared or default admin password.
4. Keep `EMAIL_MODE=off`. Keep `APP_ORIGIN=http://localhost:5173` for development.
5. Run `npm run dev`.
6. Open `http://localhost:5173`. The private panel is at `/admin`.

The first API startup creates the owner password hash in MongoDB. Changing the
value in `.env` afterward does not silently replace the saved password.
To intentionally change/reset it, set the new `ADMIN_PASSWORD` and run
`npm run admin:password`. This signs out existing sessions. You can remove the
plain password from `.env` after initial setup; the database hash remains.

## Buyer flow

- Enter name, email, phone, address, quantity and an optional note.
- The initial form shows the book subtotal, as in the supplied recording.
- **Review order** reveals book subtotal, NPR 150 delivery, and the final total.
- Delivery is NPR 150 per order across Nepal, regardless of quantity.
- Choose cash on delivery or QR payment. QR payment appears as available after
  the owner has configured a real QR image in the admin panel and Cloudinary credentials on the server.
- QR buyers pay the shown total and attach a JPG, PNG or WebP screenshot (5 MB
  maximum). There is no transaction ID field.
- **Place order** saves the request, selected method and Cloudinary screenshot reference in MongoDB.
- Both methods show exactly **Your order has been received.** Buyers do not need
  an account and there is no customer tracking page or public order lookup.

The server calculates the total using NPR 435 per copy plus NPR 150 delivery;
it does not accept the browser’s price as authoritative. Quantity is limited
to 1–999 copies. A changed quantity requires a fresh review.

## Owner flow

Sign in at `/admin` with the password chosen during setup. The panel lets you:

- Filter and page through received, confirmed or rejected orders and COD/QR methods.
- Open buyer details, totals, notes and private payment screenshots.
- Confirm COD requests. Before confirming a QR order, explicitly check the box
  stating that the correct payment appeared in your actual account.
- Reject an order with a short explanation. QR refunds are arranged manually;
  rejecting an order does not issue a refund.
- See whether each notification or buyer email is queued, accepted by Resend,
  failed, or needs manual review.
- Upload/replace a real payment QR and account details, or disable QR payment.

Old QR records are retained so existing order details remain accurate. Checkout
sessions already opened with an older QR can still submit that QR’s payment.
No example QR, sample customer orders or admin credentials are shipped.

## Cloudinary payment screenshot storage

Set these **server-only** values in `.env` or your hosting environment:

```dotenv
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=shreya/payment-proofs
```

Use credentials from your Cloudinary product environment, then restart the API.
There is no unsigned upload preset or browser-side API secret. New screenshots
are validated and re-encoded on the server, then uploaded using Cloudinary’s
`authenticated` delivery type. MongoDB stores only the asset reference/metadata.
Originals and transformations are protected; screenshots are never public CDN
assets. Only signed-in admins can open them, through the existing API endpoint.
The server retrieves a short-lived signed Cloudinary API URL and returns the
image bytes; that URL is not exposed to the browser or included in emails.

Without all three credentials, COD remains available and QR checkout is disabled.
The admin payment setup screen reports whether storage is configured. It does
not independently verify account credentials; confirm a real upload/download in
your own Cloudinary account before accepting payments. Upload failures keep the
buyer’s form on screen and do not report the order as received.

Duplicate retries are checked before uploading. Concurrent duplicate submissions
clean up the extra uncommitted asset. A crash or uncertain database error between
uploading and saving may leave an unreferenced asset; retain it until the order
state is checked, then review it in Cloudinary. No screenshot is automatically
removed merely because an order is rejected.

Payment QR images and the website’s existing photos retain their current storage;
only buyer payment screenshots use Cloudinary in this update.

Screenshots from the previous version remain readable from MongoDB. To move those
existing images after connecting Cloudinary, back up MongoDB and run:

```bash
npm run migrate:proofs
```

This uploads each legacy image as authenticated, then atomically replaces its
stored bytes with a reference. It is safe to rerun, skips already migrated orders,
and does not send emails. It is not run automatically at startup.

Cloudinary references: [access controls](https://cloudinary.com/documentation/control_access_to_media)
and [Node.js uploads](https://cloudinary.com/documentation/node_image_and_video_upload).

## Connect Resend later

No real email is sent while `EMAIL_MODE=off`; order saving and admin review work
without a sending domain or API key. New-order and confirmation jobs stay saved
inside their order records. The admin panel clearly labels email as disconnected.

Once your domain is approved and verified in Resend, set these server-only values:

```dotenv
EMAIL_MODE=resend
ADMIN_EMAIL=your-normal-gmail-address@gmail.com
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM="Shreya Pokharel <orders@your-verified-domain>"
EMAIL_REPLY_TO=your-normal-gmail-address@gmail.com
```

Restart the API. New-order notifications go to `ADMIN_EMAIL`; confirmation emails
go to the buyer only after an admin confirms the order. Rejections also queue an
email update. The worker checks the queue every 15 seconds and retries failures.
**Enabling sending also processes previously queued unsent jobs.** Review your
pending data before enabling it and use a separate database for test orders.

API acceptance is displayed as “Accepted by Resend,” not a guarantee of inbox
delivery. Repeated order submissions/confirmation clicks do not create duplicate
jobs. Retry requests reuse the saved payload and Resend idempotency key. Uncertain
sends older than 23 hours are paused for manual checking in Resend rather than
risking a duplicate after the provider’s idempotency window expires.

Never put the API key in React source or a `VITE_` variable.

Resend references: [domain verification](https://resend.com/docs/add-a-domain)
and [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Deploy on Render + Vercel

Follow [DEPLOYMENT.md](DEPLOYMENT.md). Hosting settings are included in
`render.yaml` and `vercel.mjs`. Set `BACKEND_URL` on Vercel and the real
frontend `APP_ORIGIN` on Render; keep all credentials on Render.
The MongoDB test binary is skipped during installation and downloads only when
the API tests actually run. No code changes are needed for your hosting URLs.

## Alternative: one-server production hosting

1. Configure a persistent MongoDB database and keep `.env` private.
2. Set `APP_ORIGIN` to the actual HTTPS website origin, without a trailing slash.
3. Set `NODE_ENV=production`. Set `TRUST_PROXY` to the exact trusted proxy count
   only if your host runs Express behind a reverse proxy.
4. Run `npm ci --include=dev`, then `npm run build`, then `npm start`.
   After building you may run `npm prune --omit=dev` if your host needs only runtime dependencies.

Express serves the built React app and API from one origin. Old `/index.html`,
`/journey.html`, `/writing.html`, `/order.html` and `/admin.html` links redirect
within React to the new routes. A static-only host cannot run the backend.
For a local production-build check, use `APP_ORIGIN=http://localhost:3000` and
keep `NODE_ENV=development`, then run `npm run build` and `npm start`.

Orders, screenshot references, QR records, password hashes and expiring sessions
are stored in MongoDB. New screenshot image files are stored in Cloudinary. Back
up MongoDB and manage Cloudinary asset retention according to your hosting setup;
no local uploads directory is needed. Maximum accepted image size is 5 MB; reverse proxies
should allow a little over 5 MB for multipart requests.

## Source map

- `client/src/pages/` — React home, journey, writing, checkout and admin screens.
- `client/src/components/` — shared navigation/footer, metadata and launch gallery.
- `client/src/styles.css` — existing design plus checkout/admin styles.
- `client/public/` — original images and favicon.
- `server/app.mjs` — Express routes, validation, admin sessions and access control.
- `server/models.mjs` — Mongoose schemas and database indexes.
- `server/domain.mjs` — pricing, validation and password helpers.
- `server/email.mjs` — email templates and the persistent send/retry worker.
- `server/cloudinary.mjs` — authenticated screenshot upload and admin-only retrieval.
- `server/images.mjs` — shared image decoding, validation and normalization.
- `scripts/migrate-proofs.mjs` — optional migration of legacy MongoDB screenshots.
- `tests/` — real MongoDB/API tests and React DOM interaction tests.

Order details, the screenshot reference and the notification job are stored
atomically in one MongoDB record after a successful Cloudinary upload; a replica set/transaction setup is not required for this small shop.
Admin authentication uses expiring HttpOnly/SameSite cookies, CSRF checks and
hashed passwords. Screenshots are served only after admin authentication.

## Checks

Run `npm test` and `npm run build`. API tests start a temporary MongoDB 7.0.24
instance; the first test run downloads the official MongoDB binary. No emails
are sent by tests: the provider is mocked. React tests use JSDOM, which does not
establish rendered layout. See `VALIDATION.md` for the exact checks and limits.
