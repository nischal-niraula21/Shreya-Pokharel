import { imageFile } from './images.mjs';
export async function migrateLegacyProofs({ Order }, storage) {
  if (!storage.ready) throw new Error('Configure Cloudinary before migrating screenshots.');
  let migrated = 0;
  const cursor = Order.find({ 'proof.data': { $exists: true }, 'proof.storage': { $ne: 'cloudinary' } })
    .select('+proof.data').cursor({ batchSize: 1 });
  for await (const order of cursor) {
    const normalized = await imageFile({ buffer: Buffer.from(order.proof.data), mimetype: order.proof.mime });
    const proof = await storage.upload(normalized);
    // Replace the legacy bytes only after the authenticated upload succeeds.
    // If an uncertain DB error occurs, keep the Cloudinary copy for safe recovery.
    const result = await Order.updateOne({ _id: order._id, 'proof.data': { $exists: true }, 'proof.storage': { $ne: 'cloudinary' } }, { $set: { proof } });
    if (result.modifiedCount) migrated++;
    else await storage.remove(proof);
  }
  return migrated;
}
