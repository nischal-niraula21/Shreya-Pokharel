import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '../server/models.mjs';
import { createApp } from '../server/app.mjs';
import { passwordHash } from '../server/domain.mjs';
import { createEmailWorker } from '../server/email.mjs';
import { imageFile } from '../server/images.mjs';
let mongo, connection, models, app, worker, image;
const config = { origin: 'http://localhost:5173', secureCookie: false, trustProxy: 0,
  clientDist: '/not-present', emailMode: 'off', resendKey: '', emailFrom: '', adminEmail: '', replyTo: '' };
const password = 'local-test-password-only';
let sends = 0, uploadCount = 0, downloadCount = 0;
const cloudAssets = new Map();
const screenshots = {
  ready: true,
  async upload(image) {
    uploadCount++;
    const publicId = `test-proofs/${randomUUID()}`; cloudAssets.set(publicId, image.data);
    return { storage: 'cloudinary', publicId, assetId: randomUUID(), format: 'png', mime: 'image/png', bytes: image.data.length };
  },
  async download(proof) { downloadCount++; return cloudAssets.get(proof.publicId); },
  async remove(proof) { cloudAssets.delete(proof.publicId); },
};
const fields = (overrides = {}) => ({ name: 'Sample Reader', email: 'reader@example.test', phone: '+977 9800000000', address: 'Sample address, Jhapa, Nepal', quantity: '2', note: 'Unicode नमस्ते & <tag>', payment: 'cod', requestKey: randomUUID(), ...overrides });
function order(data, file) {
  let call = request(app).post('/api/orders').set('Origin', config.origin);
  for (const [key, value] of Object.entries(data)) call = call.field(key, String(value));
  if (file) call = call.attach('proof', file, { filename: 'proof.png', contentType: 'image/png' });
  return call;
}
async function login() {
  const agent = request.agent(app);
  const response = await agent.post('/api/admin/login').set('Origin', config.origin).send({ password }).expect(200);
  return { agent, csrf: response.body.csrf };
}
async function addQR(agent, csrf) {
  const response = await agent.post('/api/admin/qr').set('Origin', config.origin).set('X-CSRF-Token', csrf)
    .field('label', 'Test bank QR').field('accountName', 'Test owner').field('accountDetails', 'Test details')
    .attach('qr', image, { filename: 'test.png', contentType: 'image/png' }).expect(200);
  return response.body.qr;
}
before(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.24' }, instance: { args: ['--nounixsocket', '--setParameter', 'diagnosticDataCollectionEnabled=false', '--wiredTigerCacheSizeGB', '0.25'] } });
  connection = await mongoose.createConnection(mongo.getUri()).asPromise();
  models = createModels(connection);
  await Promise.all(Object.values(models).map(model => model.init()));
  await models.Admin.create({ _id: 'owner', password: passwordHash(password) });
  ({ app, worker } = createApp(models, config, { screenshots, fetcher: async () => { sends++; return { ok: true, json: async () => ({ id: 'test' }) }; } }));
  image = await readFile(new URL('../client/public/assets/favicon.png', import.meta.url));
}, { timeout: 180000 });
beforeEach(async () => { await models.RateLimit.deleteMany({}); });
after(async () => { await connection?.close(); await mongo?.stop(); });

test('public checkout has server-owned prices and no QR until setup', async () => {
  const response = await request(app).get('/api/config').expect(200);
  assert.equal(response.body.book.price, 435); assert.equal(response.body.book.delivery, 150); assert.equal(response.body.qr, null);
  await request(app).get('/api/admin/orders').expect(401);
  await request(app).get('/api/orders').expect(404);
});
test('admin authentication, CSRF, cross-origin restrictions and logout', async () => {
  await request(app).post('/api/admin/login').send({ password: 'wrong' }).expect(401);
  const { agent, csrf } = await login();
  await agent.get('/api/admin/orders').expect(200);
  await agent.delete('/api/admin/qr').expect(403);
  await agent.delete('/api/admin/qr').set('X-CSRF-Token', csrf).set('Origin', 'https://other.example').expect(403);
  await agent.post('/api/admin/logout').set('X-CSRF-Token', csrf).expect(200);
  await agent.get('/api/admin/orders').expect(401);
});
test('COD is persisted atomically with truthful totals and one email job, even with tampered prices', async () => {
  const data = fields({ total: '1', delivery: '0' });
  const response = await order(data).expect(201);
  assert.equal(response.body.message, 'Your order has been received.');
  const saved = await models.Order.findById(response.body.id).lean();
  assert.equal(saved.subtotal, 870); assert.equal(saved.delivery, 150); assert.equal(saved.total, 1020);
  assert.equal(saved.emails.length, 1); assert.equal(saved.emails[0].kind, 'admin'); assert.equal(saved.emails[0].state, 'pending');
  assert.equal(saved.proof, null);
  const duplicate = await order(data).expect(200); assert.equal(duplicate.body.id, response.body.id);
  assert.equal(await models.Order.countDocuments({ _id: response.body.id }), 1);
  await order({ ...data, quantity: '3' }).expect(409);
  await worker.run(); assert.equal(sends, 0);
});
test('development accepts both loopback hosts for login and checkout while rejecting other origins', async () => {
  const origin = 'http://127.0.0.1:5173';
  await request(app).post('/api/admin/login').set('Origin', origin).send({ password }).expect(200);
  const response = await request(app).post('/api/orders').set('Origin', origin).send(fields()).expect(201);
  assert.equal(response.body.message, 'Your order has been received.');
  for (const foreign of ['http://127.0.0.1:5174', 'https://localhost:5173', 'http://localhost.evil.test:5173']) {
    await request(app).post('/api/admin/login').set('Origin', foreign).send({ password }).expect(403);
  }
});
test('production and nonlocal development origins never gain loopback aliases', async () => {
  for (const settings of [{ ...config, production: true }, { ...config, origin: 'https://books.example.test' }]) {
    const { app: strictApp } = createApp(models, settings, { screenshots });
    await request(strictApp).post('/api/admin/login').set('Origin', 'http://127.0.0.1:5173').send({ password }).expect(403);
    await request(strictApp).post('/api/admin/login').set('Origin', settings.origin).send({ password }).expect(200);
  }
});
test('invalid inputs, honeypot, quantities and missing QR proof are rejected', async () => {
  for (const invalid of [{ quantity: '0' }, { quantity: '1.5' }, { quantity: '1000' }, { name: ' ' }, { email: 'not-email' }, { phone: 'hello' }, { website: 'spam' }, { payment: 'gateway' }, { requestKey: 'bad' }]) {
    await order(fields(invalid)).expect(400);
  }
  await order(fields({ payment: 'qr', qrId: randomUUID() })).expect(400);
  await request(app).post('/api/orders').set('Origin', 'https://other.example').send({}).expect(403);
});
test('QR configuration and screenshot validation; images remain private to admins', async () => {
  const { agent, csrf } = await login(); const qr = await addQR(agent, csrf);
  const config = await request(app).get('/api/config').expect(200); assert.equal(config.body.qr.accountName, 'Test owner');
  const qrImage = await request(app).get(qr.imageUrl).expect(200); assert.equal(qrImage.headers['content-type'], 'image/png');
  const normalized = await imageFile({ buffer: image, mimetype: 'image/png' });
  assert.deepEqual(qrImage.body, normalized.data, 'QR endpoint must return the complete stored PNG');
  await order(fields({ payment: 'qr', qrId: qr.id })).expect(400);
  await order(fields({ payment: 'qr', qrId: qr.id }), Buffer.from('<svg onload="alert(1)"></svg>')).expect(400);
  const qrData = fields({ payment: 'qr', qrId: qr.id });
  const beforeUpload = uploadCount;
  const response = await order(qrData, image).expect(201);
  await order(qrData, image).expect(200);
  assert.equal(uploadCount, beforeUpload + 1, 'a duplicate retry must not upload again');
  const document = await models.Order.findById(response.body.id).select('+proof.publicId +proof.data').lean();
  assert.equal(document.proof.storage, 'cloudinary');
  assert.ok(document.proof.publicId.startsWith('test-proofs/'));
  assert.equal(document.proof.data, undefined);
  assert.ok(!JSON.stringify(response.body).includes('test-proofs/'));
  const path = `/api/admin/orders/${response.body.id}/proof`;
  const beforeDownload = downloadCount;
  await request(app).get(path).expect(401);
  assert.equal(downloadCount, beforeDownload, 'unauthorized requests must not contact storage');
  const proof = await agent.get(path).expect(200); assert.equal(proof.headers['content-type'], 'image/png');
  await agent.post(`/api/admin/orders/${response.body.id}/status`).set('X-CSRF-Token', csrf).send({ status: 'confirmed' }).expect(400);
  await agent.post(`/api/admin/orders/${response.body.id}/status`).set('X-CSRF-Token', csrf).send({ status: 'confirmed', paymentVerified: true }).expect(200);
  const saved = await models.Order.findById(response.body.id).lean(); assert.equal(saved.emails.filter(job => job.kind === 'confirmed').length, 1);
});
test('confirmation is idempotent, rejection needs a reason, and filters work', async () => {
  const { agent, csrf } = await login(); const response = await order(fields()).expect(201); const path = `/api/admin/orders/${response.body.id}/status`;
  await agent.post(path).set('X-CSRF-Token', csrf).send({ status: 'confirmed' }).expect(200);
  await agent.post(path).set('X-CSRF-Token', csrf).send({ status: 'confirmed' }).expect(200);
  const saved = await models.Order.findById(response.body.id).lean(); assert.equal(saved.emails.length, 2);
  await agent.post(path).set('X-CSRF-Token', csrf).send({ status: 'rejected', reason: 'Not available' }).expect(409);
  const another = await order(fields()).expect(201);
  const rejection = `/api/admin/orders/${another.body.id}/status`;
  await agent.post(rejection).set('X-CSRF-Token', csrf).send({ status: 'rejected' }).expect(400);
  await agent.post(rejection).set('X-CSRF-Token', csrf).send({ status: 'rejected', reason: 'Unavailable' }).expect(200);
  const list = await agent.get('/api/admin/orders?status=confirmed&payment=cod').expect(200);
  assert.ok(list.body.orders.every(item => item.status === 'confirmed' && item.payment === 'cod'));
  await agent.post(`/api/admin/orders/${saved._id}/emails/confirmed/retry`).set('X-CSRF-Token', csrf).expect(503);
});
test('concurrent duplicate orders and reviews create one order and one confirmation job', async () => {
  const data = fields(); const responses = await Promise.all([order(data), order(data)]);
  assert.ok(responses.every(response => [200, 201].includes(response.status)));
  assert.equal(responses[0].body.id, responses[1].body.id);
  const { agent, csrf } = await login(); const path = `/api/admin/orders/${responses[0].body.id}/status`;
  const results = await Promise.all([agent.post(path).set('X-CSRF-Token', csrf).send({ status: 'confirmed' }), agent.post(path).set('X-CSRF-Token', csrf).send({ status: 'confirmed' })]);
  assert.ok(results.every(response => [200, 409].includes(response.status)));
  const saved = await models.Order.findById(responses[0].body.id).lean(); assert.equal(saved.emails.length, 2);
});
test('email worker sends via a mock provider only, freezes retry payload and never re-sends accepted jobs', async () => {
  await models.Order.deleteMany({}); const { agent, csrf } = await login();
  const created = await order(fields()).expect(201);
  await agent.post(`/api/admin/orders/${created.body.id}/status`).set('X-CSRF-Token', csrf).send({ status: 'confirmed' }).expect(200);
  const requests = [];
  const enabled = { ...config, emailMode: 'resend', resendKey: 'test-key-not-real', emailFrom: 'Bookshop <orders@example.test>', adminEmail: 'owner@example.test', replyTo: 'owner@example.test' };
  let failures = true;
  const fetcher = async (url, options) => { requests.push(options); if (failures) return { ok: false, status: 503 }; return { ok: true, json: async () => ({ id: `mock-${requests.length}` }) }; };
  const sending = createEmailWorker(models, enabled, fetcher);
  await sending.run(); assert.equal(requests.length, 2);
  let saved = await models.Order.findById(created.body.id).lean(); assert.ok(saved.emails.every(job => job.state === 'pending'));
  const first = requests[0]; failures = false;
  await models.Order.updateOne({ _id: created.body.id }, { $set: { 'emails.$[].nextAttempt': new Date(0) } });
  await sending.run(); assert.equal(requests.length, 4); assert.equal(requests[2].body, first.body); assert.equal(requests[2].headers['Idempotency-Key'], first.headers['Idempotency-Key']);
  saved = await models.Order.findById(created.body.id).lean(); assert.ok(saved.emails.every(job => job.state === 'sent'));
  const confirmation = JSON.parse(requests[3].body); assert.deepEqual(confirmation.to, ['reader@example.test']); assert.ok(confirmation.text.includes('NPR 1,020')); assert.ok(confirmation.text.includes('नमस्ते & <tag>'));
  await sending.run(); assert.equal(requests.length, 4);
});
test('login attempts are rate limited', async () => {
  for (let i = 0; i < 8; i++) await request(app).post('/api/admin/login').send({ password: 'wrong' }).expect(401);
  await request(app).post('/api/admin/login').send({ password: 'wrong' }).expect(429);
});


test('COD works without Cloudinary, while new QR checkout is disabled and fails safely', async () => {
  const withoutCloud = createApp(models, config).app;
  const result = await request(withoutCloud).get('/api/config').expect(200);
  assert.equal(result.body.qr, null);
  const qr = await models.QR.findOne().lean();
  const count = await models.Order.countDocuments();
  let call = request(withoutCloud).post('/api/orders');
  for (const [key, value] of Object.entries(fields({ payment: 'qr', qrId: qr._id }))) call = call.field(key, value);
  await call.attach('proof', image, { filename: 'proof.png', contentType: 'image/png' }).expect(503);
  assert.equal(await models.Order.countDocuments(), count);
  await request(withoutCloud).post('/api/orders').send(fields()).expect(201);
});

test('concurrent QR retries leave one order and only its referenced Cloudinary asset', async () => {
  const qr = await models.QR.findOne().lean(), before = cloudAssets.size;
  const data = fields({ payment: 'qr', qrId: qr._id });
  const results = await Promise.all([order(data, image), order(data, image)]);
  assert.ok(results.every(item => [200, 201].includes(item.status)));
  assert.equal(results[0].body.id, results[1].body.id);
  assert.equal(cloudAssets.size, before + 1);
  const saved = await models.Order.findById(results[0].body.id).select('+proof.publicId').lean();
  assert.ok(cloudAssets.has(saved.proof.publicId));
});

test('legacy MongoDB payment screenshots remain readable only after admin sign-in', async () => {
  const data = fields({ payment: 'qr' });
  await models.Order.create({ ...data, _id: 'SP-LEGACY-TEST', requestHash: 'legacy',
    subtotal: 850, delivery: 150, total: 1000, proof: { mime: 'image/png', data: image } });
  const { agent } = await login();
  const response = await agent.get('/api/admin/orders/SP-LEGACY-TEST/proof').expect(200);
  assert.deepEqual(response.body, image, 'legacy endpoint must return the complete stored image');
  assert.equal(response.headers['content-type'], 'image/png');
  assert.equal(response.headers['cache-control'], 'no-store');
  await request(app).get('/api/admin/orders/SP-LEGACY-TEST/proof').expect(401);
});

test('legacy screenshot migration stores references only and is safe to rerun', async () => {
  const { migrateLegacyProofs } = await import('../server/migrate-proofs.mjs');
  const migrated = await migrateLegacyProofs(models, screenshots);
  assert.equal(migrated, 1);
  const saved = await models.Order.findById('SP-LEGACY-TEST').select('+proof.data +proof.publicId').lean();
  assert.equal(saved.proof.data, undefined); assert.equal(saved.proof.storage, 'cloudinary');
  assert.ok(cloudAssets.has(saved.proof.publicId));
  const previousUploads = uploadCount;
  assert.equal(await migrateLegacyProofs(models, screenshots), 0);
  assert.equal(uploadCount, previousUploads);
});


test('health check reports database readiness without exposing configuration', async () => {
  const response = await request(app).get('/api/health').expect(200);
  assert.deepEqual(response.body, { status: 'ok' });
  assert.equal(response.headers['cache-control'], 'no-store');
  const disconnectedApp = createApp({ ...models, Order: { db: { readyState: 0 } } }, config, { screenshots }).app;
  await request(disconnectedApp).get('/api/health').expect(503, { status: 'unavailable' });
});

test('production frontend origin can sign in with a secure cookie and place an order', async () => {
  const origin = 'https://bookshop.example.test';
  const production = createApp(models, { ...config, production: true, secureCookie: true, origin, trustProxy: 1 }, { screenshots }).app;
  const signedIn = await request(production).post('/api/admin/login').set('Origin', origin).send({ password }).expect(200);
  const cookie = signedIn.headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api/);
  await request(production).get('/api/admin/session').set('Cookie', cookie.split(';')[0]).expect(200);
  await request(production).post('/api/orders').set('Origin', origin).send(fields()).expect(201);
  await request(production).post('/api/admin/login').set('Origin', 'https://unrelated.vercel.app').send({ password }).expect(403);
});
