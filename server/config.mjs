import { resolve } from 'node:path';
import { isIP } from 'node:net';
export function readConfig(env = process.env) {
  const origin = env.APP_ORIGIN || 'http://localhost:5173';
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error('APP_ORIGIN must be an origin such as http://localhost:5173 (no trailing slash).');
  if (env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Production APP_ORIGIN must use HTTPS.');
  if (!env.MONGODB_URI) throw new Error('Set MONGODB_URI in .env before starting the API.');
  if (env.EMAIL_MODE && !['off', 'resend'].includes(env.EMAIL_MODE)) throw new Error('EMAIL_MODE must be off or resend.');
  const dnsServers = (env.MONGODB_DNS_SERVERS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (dnsServers.some(value => !isIP(value))) throw new Error('MONGODB_DNS_SERVERS must contain comma-separated DNS server IP addresses.');
  const cloudFolder = env.CLOUDINARY_FOLDER || 'shreya/payment-proofs';
  if (cloudFolder.length > 100 || !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(cloudFolder)) throw new Error('CLOUDINARY_FOLDER must contain simple folder names separated by /.');
  if (env.CLOUDINARY_CLOUD_NAME && !/^[A-Za-z0-9_-]+$/.test(env.CLOUDINARY_CLOUD_NAME)) throw new Error('Check CLOUDINARY_CLOUD_NAME.');
  return {
    dnsServers, origin, port: Number(env.PORT || 3000), mongoUri: env.MONGODB_URI,
    secureCookie: url.protocol === 'https:', production: env.NODE_ENV === 'production',
    trustProxy: Number(env.TRUST_PROXY || 0), clientDist: resolve('client/dist'),
    adminPassword: env.ADMIN_PASSWORD, emailMode: env.EMAIL_MODE || 'off',
    cloudName: env.CLOUDINARY_CLOUD_NAME || '', cloudApiKey: env.CLOUDINARY_API_KEY || '',
    cloudApiSecret: env.CLOUDINARY_API_SECRET || '', cloudFolder,
    resendKey: env.RESEND_API_KEY || '', emailFrom: env.EMAIL_FROM || '',
    adminEmail: env.ADMIN_EMAIL || '', replyTo: env.EMAIL_REPLY_TO || '',
  };
}
