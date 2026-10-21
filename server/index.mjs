import dns from 'node:dns/promises';
import mongoose from 'mongoose';
import { readConfig } from './config.mjs';
import { createModels } from './models.mjs';
import { passwordHash, checkPassword } from './domain.mjs';
import { createApp } from './app.mjs';

const config = readConfig();

// Keep the local DNS workaround out of production unless explicitly configured.
if (config.dnsServers.length) dns.setServers(config.dnsServers);

await mongoose.connect(config.mongoUri, {
  serverSelectionTimeoutMS: 10000,
});
const models = createModels(mongoose.connection);
await Promise.all(Object.values(models).map(model => model.init()));
if (!(await models.Admin.exists({ _id: 'owner' }))) {
  checkPassword(config.adminPassword);
  await models.Admin.create({ _id: 'owner', password: passwordHash(config.adminPassword) });
}
const { app, worker } = createApp(models, config);
const server = app.listen(config.port, '0.0.0.0', () => console.log(`Bookshop API listening on port ${config.port}. Email mode: ${config.emailMode}.`));
const timer = setInterval(() => worker.run().catch(error => console.error('Email queue:', error.name)), 15000);
timer.unref();
worker.run().catch(error => console.error('Email queue:', error.name));
let closing = false;
async function stop() {
  if (closing) return;
  closing = true; clearInterval(timer);
  server.close(async () => { await mongoose.disconnect(); process.exit(0); });
}
process.on('SIGTERM', stop); process.on('SIGINT', stop);
