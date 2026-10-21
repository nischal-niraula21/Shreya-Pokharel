import sharp from 'sharp';
import { validateImage, fail } from './domain.mjs';
export async function imageFile(file) {
  const image = validateImage(file);
  try {
    const data = await sharp(image.data, { limitInputPixels: 16000000, animated: false })
      .rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    if (data.length > 5 * 1024 * 1024) fail(400, 'Please use a smaller image.');
    return { mime: 'image/png', data };
  } catch { fail(400, 'This image could not be opened. Please choose a JPG, PNG or WebP image.'); }
}
