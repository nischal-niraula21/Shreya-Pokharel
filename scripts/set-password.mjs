import mongoose from 'mongoose';
import { readConfig } from '../server/config.mjs';
import { createModels } from '../server/models.mjs';
import { checkPassword, passwordHash } from '../server/domain.mjs';
try {
  const config = readConfig(); checkPassword(config.adminPassword);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  const { Admin, Session } = createModels(mongoose.connection);
  await Admin.findByIdAndUpdate('owner', { password: passwordHash(config.adminPassword) }, { upsert: true });
  await Session.deleteMany({});
  console.log('Admin password updated. All previous sessions have been signed out.');
} catch (error) { console.error(error.name === 'Error' ? error.message : 'Could not connect to MongoDB. Check .env.'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
