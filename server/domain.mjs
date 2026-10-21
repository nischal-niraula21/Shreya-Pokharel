import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export const BOOK = Object.freeze({ title: 'And They Say It’s Easy', price: 435, delivery: 150 });
export const hash = value => createHash('sha256').update(value).digest('hex');
export const money = value => `NPR ${value.toLocaleString('en-NP')}`;
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new HttpError(status, message); };
export function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function matchesPassword(password, stored) {
  const [salt, digest] = stored.split(':');
  const actual = scryptSync(password, salt, 64), expected = Buffer.from(digest, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw new Error('Set ADMIN_PASSWORD to a password of 12–256 characters.');
  }
}
function field(data, key, max, required = true) {
  const value = data[key];
  if (typeof value !== 'string') {
    if (!required && value == null) return '';
    fail(400, `Please provide ${key}.`);
  }
  const clean = value.trim();
  if ((required && !clean) || clean.length > max || /\x00/.test(clean)) fail(400, `Please check ${key}.`);
  return clean;
}
export function validateOrder(body) {
  const result = {
    name: field(body, 'name', 120), email: field(body, 'email', 254),
    phone: field(body, 'phone', 35), address: field(body, 'address', 600),
    note: field(body, 'note', 1000, false), payment: field(body, 'payment', 10),
    requestKey: field(body, 'requestKey', 36), qrId: field(body, 'qrId', 36, false),
    quantity: Number(body.quantity),
  };
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result.email)) fail(400, 'Please enter a valid email address.');
  if (!/^[+\d][\d\s().-]{6,34}$/.test(result.phone)) fail(400, 'Please enter a valid phone number.');
  if (!['cod', 'qr'].includes(result.payment)) fail(400, 'Choose a payment method.');
  if (!Number.isSafeInteger(result.quantity) || result.quantity < 1 || result.quantity > 999) fail(400, 'Choose a whole number of copies from 1 to 999.');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(result.requestKey)) fail(400, 'Refresh the checkout and try again.');
  if (result.payment === 'cod') result.qrId = '';
  result.subtotal = result.quantity * BOOK.price;
  result.delivery = BOOK.delivery;
  result.total = result.subtotal + BOOK.delivery;
  return result;
}
export function validateImage(file, required = true) {
  if (!file) { if (required) fail(400, 'Please upload a payment screenshot.'); return null; }
  const b = file.buffer;
  if (!b?.length || b.length > 5 * 1024 * 1024) fail(400, 'Choose an image smaller than 5 MB.');
  let mime;
  if (b.length > 24 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) mime = 'image/png';
  else if (b.length > 10 && b[0] === 255 && b[1] === 216 && b[2] === 255) mime = 'image/jpeg';
  else if (b.length > 16 && b.toString('ascii',0,4) === 'RIFF' && b.toString('ascii',8,12) === 'WEBP') mime = 'image/webp';
  if (!mime || file.mimetype !== mime) fail(400, 'Upload a JPG, PNG or WebP image.');
  return { mime, data: b };
}
export function publicOrder(order) {
  const { _id, status, createdAt, updatedAt, name, email, phone, address, quantity, note,
    payment, subtotal, delivery, total, rejectionReason, qrLabel, qrAccountName, qrAccountDetails, emails } = order;
  return { id: _id, status, createdAt, updatedAt, name, email, phone, address, quantity, note,
    payment, subtotal, delivery, total, rejectionReason, qrLabel, qrAccountName, qrAccountDetails,
    hasProof: payment === 'qr',
    emails: emails.map(({ kind, state, attempts, error, providerId }) => ({ kind, state, attempts, error, providerId })),
  };
}
