// Set BACKEND_URL in Vercel. This value is a public origin, never a secret.
const rawBackend = process.env.BACKEND_URL;
if (!rawBackend) {
  throw new Error('Set BACKEND_URL in Vercel to your Render HTTPS URL, without /api.');
}
let backend;
try { backend = new URL(rawBackend); }
catch { throw new Error('BACKEND_URL must be a valid Render HTTPS origin.'); }
if (backend.protocol !== 'https:' || backend.username || backend.password ||
    backend.pathname !== '/' || backend.search || backend.hash) {
  throw new Error('BACKEND_URL must be an HTTPS origin without credentials, /api, query or fragment.');
}

export const config = {
  framework: null,
  installCommand: 'npm ci --include=dev',
  buildCommand: 'npm run build',
  outputDirectory: 'client/dist',
  rewrites: [
    { source: '/api/:path*', destination: `${backend.origin}/api/:path*` },
    { source: '/(.*)', destination: '/index.html' },
  ],
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ],
    },
  ],
};
