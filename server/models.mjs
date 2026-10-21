import mongoose from 'mongoose';
const { Schema } = mongoose;
const image = new Schema({ mime: String, data: { type: Buffer, select: false } }, { _id: false });
const email = new Schema({
  kind: { type: String, enum: ['admin', 'confirmed', 'rejected'], required: true },
  state: { type: String, enum: ['pending', 'sending', 'sent', 'failed', 'review'], default: 'pending' },
  attempts: { type: Number, default: 0 }, nextAttempt: { type: Date, default: Date.now },
  firstAttemptAt: Date, lockUntil: Date, payload: String, providerId: String,
  error: { type: String, default: '' },
}, { _id: false });
const proof = new Schema({
  storage: { type: String, enum: ['cloudinary'] }, mime: String,
  publicId: { type: String, select: false }, assetId: { type: String, select: false },
  format: String, bytes: Number,
  // Read-only support for screenshots saved by the previous MongoDB-only version.
  data: { type: Buffer, select: false },
}, { _id: false });
const order = new Schema({
  _id: String, requestKey: { type: String, required: true, unique: true, select: false },
  requestHash: { type: String, required: true, select: false },
  status: { type: String, enum: ['received', 'confirmed', 'rejected'], default: 'received' },
  name: String, email: String, phone: String, address: String, quantity: Number, note: String,
  payment: { type: String, enum: ['cod', 'qr'], required: true },
  subtotal: Number, delivery: Number, total: Number, qrId: String,
  qrLabel: String, qrAccountName: String, qrAccountDetails: String,
  proof, rejectionReason: { type: String, default: '' },
  emails: { type: [email], default: [] },
}, { timestamps: true, versionKey: false });
order.index({ createdAt: -1 });
order.index({ status: 1, createdAt: -1 });
order.index({ 'emails.state': 1, 'emails.nextAttempt': 1 });
export function createModels(connection) {
  const Admin = connection.model('Admin', new Schema({ _id: String, password: String }, { versionKey: false }));
  const Session = connection.model('Session', new Schema({
    _id: String, csrf: String, expiresAt: { type: Date, expires: 0 },
  }, { versionKey: false }));
  const RateLimit = connection.model('RateLimit', new Schema({
    _id: String, count: Number, expiresAt: { type: Date, expires: 0 },
  }, { versionKey: false }));
  const QR = connection.model('QR', new Schema({
    _id: String, label: String, accountName: String, accountDetails: String, image,
  }, { timestamps: true, versionKey: false }));
  const Setting = connection.model('Setting', new Schema({ _id: String, qrId: String }, { versionKey: false }));
  return { Admin, Session, RateLimit, QR, Setting, Order: connection.model('Order', order) };
}
