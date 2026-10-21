import mongoose from 'mongoose';
import { readConfig } from '../server/config.mjs';
import { createModels } from '../server/models.mjs';
import { createScreenshotStorage } from '../server/cloudinary.mjs';
import { migrateLegacyProofs } from '../server/migrate-proofs.mjs';
try {
  const config = readConfig(), storage = createScreenshotStorage(config);
  if (!storage.ready) throw new Error('Set all three Cloudinary credentials before running this command.');
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  const count = await migrateLegacyProofs(createModels(mongoose.connection), storage);
  console.log(`Moved ${count} legacy payment screenshots to authenticated Cloudinary storage.`);
} catch {
  console.error('Migration stopped. Check your MongoDB/Cloudinary settings and image data. Existing saved proofs have not been intentionally discarded. You can rerun this command after resolving the issue.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
