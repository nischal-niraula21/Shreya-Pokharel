# Validation notes

Built from the latest ZIP supplied on 21 October 2026 and the supplied checkout
recording. The design/content of the three informational pages is preserved,
including the two additional launch photos in the latest ZIP.

## Automated checks

- Render/Vercel preparation adds a database-readiness health endpoint, optional
  DNS configuration, explicit public port binding, frontend routing configuration
  and backend environment templates. Production origin/cookie behavior, QR image
  bytes, local origin aliases and malformed hosting configuration are covered.
- No hosting accounts were accessed and no live deployment was performed.
  Vercel/Render browser cookies, forwarded client IPs, Atlas access and live
  Cloudinary/Resend connectivity require the hosted checks in DEPLOYMENT.md.

- Production React build through Vite passed.
- 25 API/integration/storage/deployment tests and 7 React DOM tests passed (32 total).
- Full dependency audit, including development tools, reported zero known vulnerabilities when packaged.
- Real MongoDB integration tests through Express/Supertest: authoritative prices,
  atomic saving, duplicate requests, invalid input, manual QR verification,
  protected screenshots, authentication, CSRF, cross-origin checks, filtering,
  repeated/concurrent confirmation, email queue retries and login rate limits.
- React DOM tests: two-step subtotal/delivery review, COD receipt message, quantity
  changes, QR details/upload, absence of transaction-ID inputs, retry key reuse,
  original poem disclosures, and admin confirmation while email is disconnected.
- Cloudinary storage tests use a mocked provider: authenticated upload options,
  expiring signed download URLs, access control, duplicate/race cleanup, missing
  credentials, failure handling and rerunnable legacy migration. No real payment
  screenshot was uploaded during testing. Live Cloudinary access is not verified.
- Resend requests in tests use a mocked provider. No real email or payment was sent.
- Production dependency audit and ZIP/content checks.

## Remaining checks before public use

A local Chromium download failed and the cloud browser could not access the local
preview. A rendered phone/desktop visual pass was not completed. The DOM tests
exercise controls/state but cannot establish layout, image loading or behavior in
an actual browser. Verify these on a phone and desktop before publishing.

Set your real MongoDB connection, admin password and Cloudinary credentials;
upload your actual payment QR through `/admin`. Private credentials included in the uploaded archive were excluded from this deliverable and were not used. Resend remains off
until a verified sending domain and email settings are connected. Live email
sending/delivery and real payments have not been tested.

The original ZIP’s `.git` history, downloaded dependencies, temporary preview
server, database files, test data and secrets are excluded from the deliverable.
