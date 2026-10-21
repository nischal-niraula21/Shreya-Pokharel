import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { fail } from './domain.mjs';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function createScreenshotStorage(config, { client = cloudinary, fetcher = fetch } = {}) {
  const ready = Boolean(config.cloudName && config.cloudApiKey && config.cloudApiSecret);
  const credentials = {
    cloud_name: config.cloudName, api_key: config.cloudApiKey, api_secret: config.cloudApiSecret,
    secure: true, signature_algorithm: 'sha256',
  };
  const folder = config.cloudFolder || 'shreya/payment-proofs';
  const requireReady = () => { if (!ready) fail(503, 'Payment screenshot storage is not configured. Please contact Shreya before submitting a QR order.'); };
  async function remove(proof) {
    requireReady();
    await client.uploader.destroy(proof.publicId, {
      ...credentials, resource_type: 'image', type: ['upload', 'private'].includes(proof.deliveryType) ? proof.deliveryType : 'authenticated', invalidate: true, timeout: 15000,
    });
  }
  async function upload(image) {
    requireReady();
    const publicId = `${folder}/${randomUUID()}`;
    let result;
    try {
      result = await new Promise((resolve, reject) => {
        const stream = client.uploader.upload_stream({
          ...credentials, resource_type: 'image', type: 'authenticated',
          public_id: publicId, overwrite: false, format: 'png', timeout: 30000,
        }, (error, uploaded) => error ? reject(error) : resolve(uploaded));
        stream.on('error', reject);
        stream.end(image.data);
      });
      if (!result || result.public_id !== publicId || result.type !== 'authenticated' || result.resource_type !== 'image' || result.format !== 'png') throw new Error('Unexpected upload response');
    } catch {
      // The request may have reached Cloudinary even if its response was lost.
      await remove({ publicId, deliveryType: result?.public_id === publicId ? result.type : 'authenticated' }).catch(() => {});
      fail(503, 'Your screenshot could not be saved. Your form has been kept; please try again or contact Shreya.');
    }
    return {
      storage: 'cloudinary', mime: 'image/png', publicId, assetId: result.asset_id,
      format: 'png', bytes: result.bytes || image.data.length,
    };
  }
  async function download(proof) {
    requireReady();
    try {
      const url = client.utils.private_download_url(proof.publicId, 'png', {
        ...credentials, resource_type: 'image', type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 60, attachment: false,
      });
      // Only server-generated Cloudinary API URLs may be fetched. No redirect is exposed to the browser.
      if (new URL(url).origin !== 'https://api.cloudinary.com') throw new Error('Unexpected download origin');
      const response = await fetcher(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
      if (!response.ok || !response.body || Number(response.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) throw new Error('Download failed');
      const chunks = []; let length = 0;
      for await (const chunk of response.body) {
        length += chunk.length;
        if (length > MAX_IMAGE_BYTES) { await response.body.cancel?.().catch(() => {}); throw new Error('Image too large'); }
        chunks.push(Buffer.from(chunk));
      }
      const image = Buffer.concat(chunks);
      if (image.length < 8 || !image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Unexpected image format');
      return image;
    } catch { fail(502, 'The payment screenshot is temporarily unavailable. Please try again.'); }
  }
  return { ready, upload, download, remove };
}
