import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readConfig } from '../server/config.mjs';

const base = { MONGODB_URI: 'mongodb://127.0.0.1/test' };
test('DNS override is optional and validates each resolver address', () => {
  assert.deepEqual(readConfig(base).dnsServers, []);
  assert.deepEqual(readConfig({ ...base, MONGODB_DNS_SERVERS: '8.8.8.8, 8.8.4.4' }).dnsServers, ['8.8.8.8', '8.8.4.4']);
  assert.throws(() => readConfig({ ...base, MONGODB_DNS_SERVERS: 'https://dns.google' }), /DNS server IP/);
  assert.throws(() => readConfig({ ...base, NODE_ENV: 'production', APP_ORIGIN: 'http://localhost:5173' }), /HTTPS/);
});
function loadConfig(backend) {
  const env = { ...process.env };
  delete env.BACKEND_URL;
  if (backend !== undefined) env.BACKEND_URL = backend;
  return spawnSync(process.execPath, ['--input-type=module', '-e', "import {config} from './vercel.mjs'; process.stdout.write(JSON.stringify(config));"], { cwd: new URL('..', import.meta.url), env, encoding: 'utf8' });
}
test('Vercel routes API and image paths to Render before the SPA fallback', () => {
  const result = loadConfig('https://book-api.onrender.com/');
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.equal(config.framework, null);
  assert.equal(config.outputDirectory, 'client/dist');
  assert.equal(config.rewrites[0].source, '/api/:path*');
  assert.equal(config.rewrites[0].destination, 'https://book-api.onrender.com/api/:path*');
  assert.equal(config.rewrites[1].destination, '/index.html');
});
test('Vercel fails clearly on missing or malformed backend origins', () => {
  for (const backend of [undefined, 'http://localhost:3000', 'https://book-api.onrender.com/api', 'https://user:secret@example.test', 'https://example.test?token=secret']) {
    const result = loadConfig(backend);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /BACKEND_URL/);
  }
});
