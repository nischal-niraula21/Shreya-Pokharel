import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  BOOK,
  hash,
  fail,
  validateOrder,
  matchesPassword,
  publicOrder,
} from './domain.mjs';

import { createEmailWorker, emailConnection } from './email.mjs';
import { createScreenshotStorage } from './cloudinary.mjs';
import { imageFile } from './images.mjs';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 16,
    fieldSize: 2000,
  },
});

const queue = kind => ({
  kind,
  state: 'pending',
  attempts: 0,
  nextAttempt: new Date(),
  error: '',
});

function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .filter(Boolean)
      .map(item => {
        const at = item.indexOf('=');
        return [item.slice(0, at).trim(), item.slice(at + 1)];
      })
  );
}

export function createApp(models, config, options = {}) {
  const { Order, QR, Setting, Admin, Session, RateLimit } = models;
  const app = express();
  const screenshots =
    options.screenshots || createScreenshotStorage(config);

  async function discardUncommittedProof(proof) {
    if (!proof) return;

    try {
      await screenshots.remove(proof);
    } catch {
      console.error(
        'Could not remove an uncommitted screenshot from Cloudinary. Check recent payment-proofs assets.'
      );
    }
  }

  const worker = createEmailWorker(models, config, options.fetcher);

  app.disable('x-powered-by');

  if (config.trustProxy) {
    app.set('trust proxy', config.trustProxy);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'blob:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: config.secureCookie ? [] : null,
        },
      },
    })
  );

  // Allow both local development addresses on the configured port.
  // Production continues to accept only APP_ORIGIN.
  const allowedOrigins = new Set([config.origin]);
  const localOrigin = new URL(config.origin);

  if (
    !config.production &&
    ['localhost', '127.0.0.1'].includes(localOrigin.hostname)
  ) {
    for (const hostname of ['localhost', '127.0.0.1']) {
      localOrigin.hostname = hostname;
      allowedOrigins.add(localOrigin.origin);
    }
  }

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');

    const origin = req.get('Origin');

    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({
        error:
          'This request came from a different website. Refresh this page and try again.',
      });
    }

    if (
      !['GET', 'HEAD'].includes(req.method) &&
      req.get('Sec-Fetch-Site') === 'cross-site'
    ) {
      return res.status(403).json({
        error: 'Cross-site requests are not allowed.',
      });
    }

    next();
  });

  app.get('/api/health', (req, res) => {
    const ready = Order.db.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
  });

  app.use(express.json({ limit: '8kb' }));

  const limited = (prefix, max, seconds) => async (req, res, next) => {
    const window = Math.floor(Date.now() / (seconds * 1000));
    const id = hash(`${prefix}:${req.ip}:${window}`);

    const item = await RateLimit.findOneAndUpdate(
      { _id: id },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          expiresAt: new Date((window + 2) * seconds * 1000),
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (item.count > max) {
      res.set('Retry-After', String(seconds));

      return res.status(429).json({
        error: 'Too many attempts. Please wait and try again.',
      });
    }

    next();
  };

  const requireAdmin = async (req, res, next) => {
    const token = cookies(req).book_admin;

    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(401).json({
        error: 'Please sign in to the admin panel.',
      });
    }

    const session = await Session.findOne({
      _id: hash(token),
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!session) {
      return res.status(401).json({
        error: 'Your session has expired. Please sign in again.',
      });
    }

    if (
      !['GET', 'HEAD'].includes(req.method) &&
      req.get('X-CSRF-Token') !== session.csrf
    ) {
      return res.status(403).json({
        error: 'Refresh the admin panel and try again.',
      });
    }

    req.adminSession = session;
    next();
  };

  const activeQR = async () => {
    const setting = await Setting.findById('checkout').lean();

    return setting?.qrId
      ? QR.findById(setting.qrId).lean()
      : null;
  };

  const qrView = qr =>
    qr
      ? {
        id: qr._id,
        label: qr.label,
        accountName: qr.accountName,
        accountDetails: qr.accountDetails,
        imageUrl: `/api/qr/${qr._id}`,
      }
      : null;

  app.get('/api/config', async (req, res) => {
    res.json({
      book: BOOK,
      qr: screenshots.ready ? qrView(await activeQR()) : null,
    });
  });

  app.get('/api/qr/:id', async (req, res) => {
    // Keep this as a Mongoose document so image.data is a Buffer.
    const qr = await QR.findById(req.params.id).select('+image.data');

    if (!qr?.image?.data) {
      fail(404, 'QR image not found.');
    }

    res.type(qr.image.mime).send(Buffer.from(qr.image.data));
  });

  app.post(
    '/api/orders',
    limited('orders', 12, 3600),
    upload.single('proof'),
    async (req, res) => {
      if (!req.body || typeof req.body !== 'object') {
        fail(400, 'Please complete the order form.');
      }

      if (req.body.website) {
        fail(400, 'Unable to submit this order.');
      }

      const data = validateOrder(req.body);

      let qr = null;
      let proof = null;

      if (data.payment === 'qr') {
        qr = data.qrId
          ? await QR.findById(data.qrId).lean()
          : null;

        if (!qr) {
          fail(
            400,
            'QR payment is unavailable. Please choose cash on delivery.'
          );
        }

        proof = await imageFile(req.file);
      } else if (req.file) {
        fail(
          400,
          'A payment screenshot is only needed for QR payment.'
        );
      }

      const requestHash = hash(
        JSON.stringify(data) + (proof ? hash(proof.data) : '')
      );

      const existing = await Order.findOne({
        requestKey: data.requestKey,
      })
        .select('+requestHash')
        .lean();

      if (existing) {
        if (existing.requestHash !== requestHash) {
          fail(
            409,
            'An order from this checkout has already been received. Contact Shreya if its details need to change.'
          );
        }

        return res.json({
          id: existing._id,
          message: 'Your order has been received.',
        });
      }

      const id =
        `SP-${randomUUID().slice(0, 8).toUpperCase()}-` +
        randomBytes(3).toString('hex').toUpperCase();

      // Check duplicate retries before uploading.
      const savedProof = proof
        ? await screenshots.upload(proof)
        : null;

      try {
        await Order.create({
          ...data,
          _id: id,
          requestHash,
          proof: savedProof,
          qrLabel: qr?.label,
          qrAccountName: qr?.accountName,
          qrAccountDetails: qr?.accountDetails,
          emails: [queue('admin')],
        });
      } catch (error) {
        // Retain the asset if a database failure may have committed.
        if (error.code !== 11000) throw error;

        await discardUncommittedProof(savedProof);

        const prior = await Order.findOne({
          requestKey: data.requestKey,
        })
          .select('+requestHash')
          .lean();

        if (!prior || prior.requestHash !== requestHash) {
          fail(
            409,
            'An order from this checkout has already been received. Contact Shreya if its details need to change.'
          );
        }

        return res.json({
          id: prior._id,
          message: 'Your order has been received.',
        });
      }

      res.status(201).json({
        id,
        message: 'Your order has been received.',
      });
    }
  );

  app.post(
    '/api/admin/login',
    limited('login', 8, 900),
    async (req, res) => {
      const password = req.body?.password;

      if (typeof password !== 'string' || password.length > 256) {
        fail(400, 'Please enter your admin password.');
      }

      const admin = await Admin.findById('owner').lean();

      if (!admin || !matchesPassword(password, admin.password)) {
        fail(401, 'The password is incorrect.');
      }

      const old = cookies(req).book_admin;

      if (old) {
        await Session.deleteOne({ _id: hash(old) });
      }

      const token = randomBytes(32).toString('hex');
      const csrf = randomBytes(24).toString('hex');

      await Session.create({
        _id: hash(token),
        csrf,
        expiresAt: new Date(Date.now() + 8 * 3600000),
      });

      res.cookie('book_admin', token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: config.secureCookie,
        maxAge: 8 * 3600000,
        path: '/api',
      });

      res.json({ csrf });
    }
  );

  app.use('/api/admin', requireAdmin);

  app.get('/api/admin/session', (req, res) => {
    res.json({ csrf: req.adminSession.csrf });
  });

  app.post('/api/admin/logout', async (req, res) => {
    await Session.deleteOne({ _id: req.adminSession._id });

    res.clearCookie('book_admin', {
      httpOnly: true,
      sameSite: 'strict',
      secure: config.secureCookie,
      path: '/api',
    });

    res.json({ ok: true });
  });

  app.get('/api/admin/settings', async (req, res) => {
    res.json({
      qr: qrView(await activeQR()),
      emailConnected: emailConnection(config),
      adminEmail: config.adminEmail,
      emailMode: config.emailMode,
      screenshotStorageConfigured: screenshots.ready,
    });
  });

  app.post('/api/admin/qr', upload.single('qr'), async (req, res) => {
    const label = req.body.label?.trim();
    const accountName = req.body.accountName?.trim();
    const accountDetails = req.body.accountDetails?.trim() || '';

    if (
      !label ||
      label.length > 80 ||
      !accountName ||
      accountName.length > 120 ||
      accountDetails.length > 200
    ) {
      fail(400, 'Enter the payment label and account holder name.');
    }

    if (!req.file) {
      fail(400, 'Please choose your payment QR image.');
    }

    const image = await imageFile(req.file);
    const id = randomUUID();

    const qr = await QR.create({
      _id: id,
      label,
      accountName,
      accountDetails,
      image,
    });

    await Setting.findByIdAndUpdate(
      'checkout',
      { qrId: id },
      { upsert: true }
    );

    res.json({ qr: qrView(qr) });
  });

  app.delete('/api/admin/qr', async (req, res) => {
    await Setting.deleteOne({ _id: 'checkout' });
    res.json({ ok: true });
  });

  app.get('/api/admin/orders', async (req, res) => {
    const filter = {};

    if (
      ['received', 'confirmed', 'rejected'].includes(req.query.status)
    ) {
      filter.status = req.query.status;
    }

    if (['cod', 'qr'].includes(req.query.payment)) {
      filter.payment = req.query.payment;
    }

    const page = Math.max(
      1,
      Math.min(10000, Number.parseInt(req.query.page, 10) || 1)
    );

    const [orders, total, received] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * 20)
        .limit(20)
        .lean(),
      Order.countDocuments(filter),
      Order.countDocuments({ status: 'received' }),
    ]);

    res.json({
      orders: orders.map(publicOrder),
      page,
      total,
      received,
    });
  });

  app.get('/api/admin/orders/:id', async (req, res) => {
    const order = await Order.findById(req.params.id).lean();

    if (!order) {
      fail(404, 'Order not found.');
    }

    res.json({ order: publicOrder(order) });
  });

  app.get('/api/admin/orders/:id/proof', async (req, res) => {
    // Avoid lean() here so legacy MongoDB image bytes remain a Buffer.
    const order = await Order.findById(req.params.id).select(
      '+proof.publicId +proof.data'
    );

    if (!order?.proof) {
      fail(404, 'Payment screenshot not found.');
    }

    if (
      order.proof.storage === 'cloudinary' &&
      order.proof.publicId
    ) {
      const image = await screenshots.download(order.proof);
      return res.type('image/png').send(image);
    }

    if (!order.proof.data) {
      fail(404, 'Payment screenshot not found.');
    }

    res.type(order.proof.mime).send(Buffer.from(order.proof.data));
  });

  app.post('/api/admin/orders/:id/status', async (req, res) => {
    const { status, paymentVerified, reason } = req.body || {};

    if (!['confirmed', 'rejected'].includes(status)) {
      fail(400, 'Choose confirm or reject.');
    }

    const current = await Order.findById(req.params.id).lean();

    if (!current) {
      fail(404, 'Order not found.');
    }

    if (current.status === status) {
      return res.json({ order: publicOrder(current) });
    }

    if (current.status !== 'received') {
      fail(409, 'This order has already been reviewed.');
    }

    if (
      status === 'confirmed' &&
      current.payment === 'qr' &&
      paymentVerified !== true
    ) {
      fail(
        400,
        'Check the payment in your account before confirming this QR order.'
      );
    }

    const rejectionReason =
      typeof reason === 'string' ? reason.trim() : '';

    if (
      status === 'rejected' &&
      (!rejectionReason || rejectionReason.length > 500)
    ) {
      fail(
        400,
        'Add a short reason for the buyer (up to 500 characters).'
      );
    }

    const changed = await Order.findOneAndUpdate(
      { _id: current._id, status: 'received' },
      {
        $set: {
          status,
          rejectionReason:
            status === 'rejected' ? rejectionReason : '',
        },
        $push: { emails: queue(status) },
      },
      { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!changed) {
      fail(
        409,
        'Another request already reviewed this order. Refresh to see its status.'
      );
    }

    res.json({ order: publicOrder(changed) });
  });

  app.post(
    '/api/admin/orders/:id/emails/:kind/retry',
    async (req, res) => {
      if (!emailConnection(config)) {
        fail(
          503,
          'Email is not connected yet. Configure Resend first.'
        );
      }

      if (
        !['admin', 'confirmed', 'rejected'].includes(req.params.kind)
      ) {
        fail(400, 'Unknown email type.');
      }

      const order = await Order.findById(req.params.id).lean();

      if (!order) {
        fail(404, 'Order not found.');
      }

      const job = order.emails.find(
        item => item.kind === req.params.kind
      );

      if (!job) {
        fail(404, 'Email not found.');
      }

      if (job.state === 'sent') {
        fail(409, 'This email was already accepted for sending.');
      }

      if (job.state === 'sending') {
        fail(409, 'This email is already being processed.');
      }

      if (
        job.state === 'review' ||
        (job.firstAttemptAt &&
          Date.now() - job.firstAttemptAt.getTime() >
          23 * 3600000)
      ) {
        fail(
          409,
          'Check the Resend dashboard before attempting an older uncertain email.'
        );
      }

      await Order.updateOne(
        {
          _id: order._id,
          emails: {
            $elemMatch: {
              kind: job.kind,
              state: { $in: ['pending', 'failed'] },
            },
          },
        },
        {
          $set: {
            'emails.$.state': 'pending',
            'emails.$.nextAttempt': new Date(),
            'emails.$.error': '',
          },
        }
      );

      res.json({ ok: true });
    }
  );

  app.use('/api', (req, res) => {
    res.status(404).json({
      error: 'This endpoint does not exist.',
    });
  });

  if (existsSync(resolve(config.clientDist, 'index.html'))) {
    app.use(
      express.static(config.clientDist, {
        dotfiles: 'deny',
        index: false,
      })
    );

    app.get('/{*path}', (req, res) => {
      res.sendFile(resolve(config.clientDist, 'index.html'));
    });
  }

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    let status = error.status || 500;
    let message =
      status < 500
        ? error.message
        : 'Something went wrong. Please try again.';

    if (error instanceof multer.MulterError) {
      status = 400;
      message = 'Choose one JPG, PNG or WebP image under 5 MB.';
    }

    if (
      error instanceof SyntaxError &&
      error.type === 'entity.parse.failed'
    ) {
      status = 400;
      message = 'The submitted request could not be read.';
    }

    if (status >= 500 && !error.status) {
      console.error('Request failed:', error.name);
    }

    res.status(status).json({ error: message });
  });

  return { app, worker };
}