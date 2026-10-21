import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { v2 as sdk } from 'cloudinary';
import { createScreenshotStorage } from '../server/cloudinary.mjs';
import { readConfig } from '../server/config.mjs';
const image = { mime: 'image/png', data: Buffer.from([137,80,78,71,13,10,26,10,0]) };
const config = { cloudName: 'unit-test-cloud', cloudApiKey: 'unit-test-key', cloudApiSecret: 'unit-test-secret', cloudFolder: 'test/payment-proofs' };
function fakeClient({ badResponse = false, failUpload = false } = {}) {
  const uploads = [], deletions = [];
  return {
    uploads, deletions, utils: sdk.utils,
    uploader: {
      upload_stream(options, callback) {
        uploads.push(options);
        return new Writable({ write(chunk, encoding, done) { done(); }, final(done) {
          done();
          if (failUpload) callback(new Error('Provider rejected upload'));
          else callback(null, { public_id: options.public_id, type: badResponse ? 'upload' : 'authenticated', resource_type: 'image', format: 'png', bytes: image.data.length, asset_id: 'unit-asset' });
        } });
      },
      async destroy(id, options) { deletions.push({ id, options }); return { result: 'ok' }; },
    },
  };
}
test('uploads use authenticated delivery and return metadata without image bytes or URLs', async () => {
  const client = fakeClient(); const storage = createScreenshotStorage(config, { client });
  const proof = await storage.upload(image);
  assert.equal(proof.storage, 'cloudinary'); assert.equal(proof.data, undefined); assert.equal(proof.url, undefined);
  assert.ok(proof.publicId.startsWith('test/payment-proofs/')); assert.equal(client.uploads[0].type, 'authenticated');
  assert.equal(client.uploads[0].overwrite, false); assert.equal(client.uploads[0].signature_algorithm, 'sha256');
});
test('admin download uses a signed expiring API URL, proxies bytes, and follows no redirects', async () => {
  const client = fakeClient(); let requested;
  const storage = createScreenshotStorage(config, { client, fetcher: async (url, options) => {
    requested = { url: new URL(url), options }; return new Response(image.data, { headers: { 'Content-Type': 'image/png' } });
  } });
  const proof = await storage.upload(image), result = await storage.download(proof);
  assert.deepEqual(result, image.data); assert.equal(requested.url.origin, 'https://api.cloudinary.com');
  assert.equal(requested.url.searchParams.get('type'), 'authenticated');
  assert.equal(requested.url.searchParams.get('public_id'), proof.publicId);
  assert.ok(requested.url.searchParams.get('signature')); assert.ok(Number(requested.url.searchParams.get('expires_at')) <= Date.now() / 1000 + 61);
  assert.equal(requested.options.redirect, 'error');
});
test('missing credentials never trigger uploads and failed/unprotected uploads are cleaned up', async () => {
  const client = fakeClient(); const disabled = createScreenshotStorage({}, { client });
  assert.equal(disabled.ready, false); await assert.rejects(disabled.upload(image), { status: 503 }); assert.equal(client.uploads.length, 0);
  for (const options of [{ badResponse: true }, { failUpload: true }]) {
    const broken = fakeClient(options); await assert.rejects(createScreenshotStorage(config, { client: broken }).upload(image), { status: 503 });
    assert.equal(broken.deletions.length, 1); assert.equal(broken.deletions[0].options.type, options.badResponse ? 'upload' : 'authenticated');
    assert.equal(broken.deletions[0].id, broken.uploads[0].public_id);
  }
});
test('download failures are safe and secrets are not returned in error messages', async () => {
  const storage = createScreenshotStorage(config, { client: fakeClient(), fetcher: async () => { throw new Error(config.cloudApiSecret); } });
  await assert.rejects(storage.download({ publicId: 'test/reference' }), error => error.status === 502 && !error.message.includes(config.cloudApiSecret));
});
test('Cloudinary credentials are server configuration and folder names are validated', () => {
  const result = readConfig({ MONGODB_URI: 'mongodb://localhost/test', CLOUDINARY_CLOUD_NAME: 'unit-cloud', CLOUDINARY_API_KEY: 'key', CLOUDINARY_API_SECRET: 'secret' });
  assert.equal(result.cloudName, 'unit-cloud'); assert.equal(result.cloudApiKey, 'key'); assert.equal(result.cloudApiSecret, 'secret');
  assert.throws(() => readConfig({ MONGODB_URI: 'mongodb://localhost/test', CLOUDINARY_FOLDER: '../unsafe' }));
});
