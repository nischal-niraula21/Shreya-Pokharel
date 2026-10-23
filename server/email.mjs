import { createHash } from 'node:crypto';
import { BOOK } from './domain.mjs';
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}
const money = value => `NPR ${value.toLocaleString('en-NP')}`;
export function emailConnection(config) {
  return config.emailMode === 'resend' && Boolean(config.resendKey && config.emailFrom && config.adminEmail);
}
export function composeEmail(order, kind, config) {
  const details = [
    `Order: ${order._id}`, `Book: ${BOOK.title}`, `Copies: ${order.quantity}`,
    `Book subtotal: ${money(order.subtotal)}`, `Delivery charge: ${money(order.delivery)}`,
    `Total: ${money(order.total)}`,
    `Payment method: ${order.payment === 'cod' ? 'Cash on delivery' : 'Pay using QR'}`,
    `Name: ${order.name}`, `Email: ${order.email}`, `Phone: ${order.phone}`,
    `Delivery address: ${order.address}`, `Note: ${order.note || 'None'}`,
  ].join('\n');
  let subject, text;
  if (kind === 'admin') {
    subject = `New book order — ${order._id}`;
    text = `A new book order has been received.\n\n${details}\n\nReview this order${order.payment === 'qr' ? ' and its payment screenshot' : ''} in the admin panel:\n${config.origin}/admin\n\nThis order still requires your review.`;
  } else if (kind === 'confirmed') {
    subject = `Your book order is confirmed — ${order._id}`;
    text = `Hello ${order.name},\n\nYour order has been confirmed. Thank you for ordering my book.\n\n${details}\n\n${order.payment === 'cod' ? `Please pay ${money(order.total)} on delivery.` : 'Your QR payment has been checked and accepted.'}\n\nWe will contact you using your provided phone number if delivery coordination is needed.\n\nShreya Pokharel`;
  } else {
    subject = `An update on your book order — ${order._id}`;
    text = `Hello ${order.name},\n\nWe are unable to confirm your order at this time.\n\nReason: ${order.rejectionReason}\n\n${details}\n\nIf you have already paid, please reply so we can resolve your payment or refund.\n\nShreya Pokharel`;
  }
  return {
    from: config.emailFrom,
    to: [kind === 'admin' ? config.adminEmail : order.email],
    subject,
    text,
    html: `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escapeHTML(subject)}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f5f2ed;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="background-color:#f5f2ed;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="max-width:600px;background-color:#ffffff;">
                <tr>
                  <td style="padding:24px;background-color:#0c0908;text-align:center;">
                    <a href="${escapeHTML(config.origin)}"
                      style="font-family:Georgia,'Times New Roman',serif;
                        font-size:28px;letter-spacing:-0.7px;
                        text-decoration:none;white-space:nowrap;">
                      <span style="color:#eee9df;font-weight:bold;">Shreya</span>
                      <span style="color:#e53640;font-style:italic;font-weight:normal;">Pokharel</span>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 24px;font-family:Arial,Helvetica,sans-serif;
                    font-size:15px;line-height:1.7;color:#292420;overflow-wrap:anywhere;">
                    ${escapeHTML(text).replace(/\r?\n/g, '<br>')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
    reply_to: config.replyTo || config.adminEmail,
  };
  export function createEmailWorker({ Order }, config, fetcher = fetch) {
    let busy = false;
    const update = (id, kind, fields) => Order.updateOne({ _id: id, 'emails.kind': kind }, {
      $set: Object.fromEntries(Object.entries(fields).map(([key, value]) => [`emails.$.${key}`, value])),
    });
    const run = async () => {
      if (busy || !emailConnection(config)) return;
      busy = true;
      try {
        const candidates = await Order.find({
          emails: {
            $elemMatch: {
              $or: [
                { state: 'pending', nextAttempt: { $lte: new Date() } },
                { state: 'sending', lockUntil: { $lte: new Date() } },
              ]
            }
          }
        }).sort({ createdAt: 1 }).limit(10).lean();
        for (const order of candidates) for (const job of order.emails) {
          if (!['pending', 'sending'].includes(job.state)) continue;
          const now = new Date();
          const locked = await Order.findOneAndUpdate({
            _id: order._id, emails: {
              $elemMatch: {
                kind: job.kind, $or: [
                  { state: 'pending', nextAttempt: { $lte: now } },
                  { state: 'sending', lockUntil: { $lte: now } },
                ],
              }
            }
          }, { $set: { 'emails.$.state': 'sending', 'emails.$.lockUntil': new Date(Date.now() + 60000) }, $inc: { 'emails.$.attempts': 1 } }, { returnDocument: 'after' }).lean();
          if (!locked) continue;
          const active = locked.emails.find(item => item.kind === job.kind);
          if (active.firstAttemptAt && Date.now() - active.firstAttemptAt.getTime() > 23 * 60 * 60 * 1000) {
            await update(order._id, job.kind, { state: 'review', error: 'Check the Resend dashboard; the safe retry window has expired.' });
            continue;
          }
          const payload = active.payload || JSON.stringify(composeEmail(locked, job.kind, config));
          await update(order._id, job.kind, { payload, firstAttemptAt: active.firstAttemptAt || now });
          try {
            const response = await fetcher('https://api.resend.com/emails', {
              method: 'POST', headers: {
                'Content-Type': 'application/json', Authorization: `Bearer ${config.resendKey}`,
                'Idempotency-Key': `book-order-${createHash('sha256').update(`${order._id}/${job.kind}`).digest('hex')}`
              },
              body: payload, signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}.`);
            const result = await response.json();
            if (!result.id) throw new Error('Email provider did not return a message reference.');
            await update(order._id, job.kind, { state: 'sent', providerId: String(result.id), error: '' });
          } catch (error) {
            await update(order._id, job.kind, {
              state: active.attempts >= 5 ? 'failed' : 'pending',
              error: error.message.startsWith('Email provider') ? error.message : 'Email connection failed. Check the configuration and retry.',
              nextAttempt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** (active.attempts - 1))),
            });
          }
        }
      } finally { busy = false; }
    };
    return { run };
  }
}
