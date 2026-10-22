import { useEffect, useRef, useState } from 'react';
import { api, money } from '../api.js';
import { PageMeta } from '../components/Layout.jsx';
const date = value => new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium', timeStyle: 'short' });
const label = value => ({ received: 'Needs review', confirmed: 'Confirmed', rejected: 'Rejected' }[value] || value);
function EmailStatus({ order, connected, csrf, onChange, onError }) {
  const [busy, setBusy] = useState('');
  async function retry(kind) {
    setBusy(kind);
    try { await api(`/admin/orders/${order.id}/emails/${kind}/retry`, { method: 'POST', csrf }); onChange(); }
    catch (error) { onError(error); } finally { setBusy(''); }
  }
  return <section className="admin-section"><h3>Emails</h3>
    {order.emails.map(job => <div className="email-row" key={job.kind}>
      <div><strong>{job.kind === 'admin' ? 'New-order notification to you' : job.kind === 'confirmed' ? 'Confirmation to buyer' : 'Update to buyer'}</strong>
        <p className="field-help">{job.state === 'sent' ? 'Accepted by Resend' : !connected ? 'Email not connected — queued' : ({ pending: 'Queued', sending: 'Sending…', failed: 'Send failed', review: 'Needs manual email review' }[job.state])}</p>
        {job.error && <p className="field-help">{job.error}</p>}
      </div>
      {connected && ['pending', 'failed'].includes(job.state) && <button className="gallery-arrow" type="button" disabled={Boolean(busy)} onClick={() => retry(job.kind)}>{busy === job.kind ? 'Queueing…' : 'Retry now'}</button>}
    </div>)}
    {!order.emails.some(job => job.kind === 'confirmed') && order.status === 'received' && <p className="field-help">The buyer’s confirmation email is queued when you confirm this order.</p>}
  </section>;
}
function OrderDetail({ order, csrf, connected, onClose, onUpdate, onError }) {
  const [verified, setVerified] = useState(false), [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false), [busy, setBusy] = useState(false);
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  async function change(status) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await api(`/admin/orders/${order.id}/status`, {
        method: 'POST', csrf,
        body: JSON.stringify({ status, paymentVerified: verified, reason })
      });
      onUpdate(result.order);
    } catch (error) { onError(error); } finally { setBusy(false); }
  }
  async function refresh() {
    try { const result = await api(`/admin/orders/${order.id}`); onUpdate(result.order); }
    catch (error) { onError(error); }
  }
  return <section className="admin-detail" aria-label="Order details">
    <div className="admin-detail-heading"><div><p className={`status-badge status-${order.status}`}>{label(order.status)}</p><h2 ref={heading} tabIndex={-1}>{order.id}</h2><p className="field-help">{date(order.createdAt)} · Nepal time</p></div><button type="button" className="gallery-arrow" onClick={onClose}>Back to orders</button></div>
    <dl className="order-facts">
      <dt>Buyer</dt><dd>{order.name}</dd><dt>Email</dt><dd><a className="text-link" href={`mailto:${order.email}`}>{order.email}</a></dd>
      <dt>Phone</dt><dd>{order.phone}</dd><dt>Delivery address</dt><dd className="preserve-lines">{order.address}</dd>
      <dt>Copies</dt><dd>{order.quantity}</dd><dt>Book subtotal</dt><dd>{money(order.subtotal)}</dd>
      <dt>Delivery</dt><dd>{money(order.delivery)}</dd><dt>Total</dt><dd><strong>{money(order.total)}</strong></dd>
      <dt>Payment method</dt><dd>{order.payment === 'cod' ? 'Cash on delivery' : 'Pay using QR'}</dd>
      {order.note && <><dt>Buyer’s note</dt><dd className="preserve-lines">{order.note}</dd></>}
    </dl>
    {order.payment === 'qr' && <section className="admin-section">
      <h3>Payment screenshot</h3><p>{order.qrLabel} · {order.qrAccountName}</p>
      {order.qrAccountDetails && <p className="field-help">{order.qrAccountDetails}</p>}
      <a className="text-link" href={`/api/admin/orders/${order.id}/proof`} target="_blank" rel="noopener noreferrer">Open screenshot</a>
      <img className="admin-proof" src={`/api/admin/orders/${order.id}/proof`} alt="Buyer’s payment screenshot" />
      {order.status === 'received' && <label className="verify-payment"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} /><span>I checked my payment account and received the correct amount.</span></label>}
    </section>}
    {order.status === 'received' ? <section className="admin-section">
      <h3>Review this order</h3>
      <div className="admin-actions"><button className="button button-primary" type="button" disabled={busy || (order.payment === 'qr' && !verified)} onClick={() => change('confirmed')}>{busy ? 'Saving…' : 'Confirm order'}</button><button className="button button-outline" type="button" disabled={busy} onClick={() => setRejecting(!rejecting)}>Reject order</button></div>
      {rejecting && <form className="rejection-form" onSubmit={event => { event.preventDefault(); change('rejected'); }}><label className="field-label" htmlFor="rejection-reason">Reason for the buyer</label><textarea id="rejection-reason" className="form-control" rows={3} required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /><p className="field-help">If a payment was made, arrange any refund directly. This action does not issue a refund.</p><button className="button button-outline" disabled={busy || !reason.trim()}>Confirm rejection</button></form>}
    </section> : order.rejectionReason ? <p className="form-message">Reason: {order.rejectionReason}</p> : null}
    <EmailStatus order={order} csrf={csrf} connected={connected} onChange={refresh} onError={onError} />
  </section>;
}
function PaymentSettings({ csrf, settings, onSaved, onError }) {
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault(); const form = event.currentTarget;
    setBusy(true);
    try { await api('/admin/qr', { method: 'POST', csrf, body: new FormData(form) }); form.reset(); onSaved(); }
    catch (error) { onError(error); } finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm('Disable QR payment for new checkout sessions? Existing orders will be kept.')) return;
    setBusy(true);
    try { await api('/admin/qr', { method: 'DELETE', csrf }); onSaved(); }
    catch (error) { onError(error); } finally { setBusy(false); }
  }
  return <section className="admin-settings"><h2>QR payment setup</h2>
    <p className="section-description">Upload your real payment QR. Cash on delivery remains available. New QR orders include a screenshot for you to verify.</p>
    {settings.qr && <div className="current-qr"><img className="payment-qr" src={settings.qr.imageUrl} alt="Current payment QR" /><div><h3>{settings.qr.label}</h3><p>{settings.qr.accountName}</p><p className="field-help">{settings.qr.accountDetails}</p><button className="text-link" type="button" disabled={busy} onClick={remove}>Disable QR payment</button></div></div>}
    <form className="settings-form" onSubmit={save}>
      <div className="form-field"><label className="field-label" htmlFor="qr-label">Payment label</label><input id="qr-label" name="label" className="form-control" maxLength={80} placeholder="For example: Bank QR" required /></div>
      <div className="form-field"><label className="field-label" htmlFor="qr-name">Account holder name</label><input id="qr-name" name="accountName" className="form-control" maxLength={120} required /></div>
      <div className="form-field"><label className="field-label" htmlFor="qr-details">Account details (optional)</label><input id="qr-details" name="accountDetails" className="form-control" maxLength={200} placeholder="Payment app, bank name or account number" /></div>
      <div className="form-field"><label className="field-label" htmlFor="qr-upload">Your payment QR image</label><input id="qr-upload" name="qr" type="file" accept="image/jpeg,image/png,image/webp" required /><p className="field-help">JPG, PNG or WebP, up to 5 MB. Upload a replacement to update the details above.</p></div>
      <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : settings.qr ? 'Replace payment QR' : 'Save payment QR'}</button>
    </form>
  </section>;
}
export default function Admin() {
  const [csrf, setCsrf] = useState(''), [checking, setChecking] = useState(true);
  const [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [tab, setTab] = useState('orders'), [settings, setSettings] = useState(null);
  const [status, setStatus] = useState('received'), [payment, setPayment] = useState(''), [page, setPage] = useState(1);
  const [data, setData] = useState(null), [selected, setSelected] = useState(null), [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(false);
  function onError(error) { setError(error.message); if (error.status === 401) { setCsrf(''); setSelected(null); } }
  const refreshAll = () => setRefresh(value => value + 1);
  useEffect(() => { api('/admin/session').then(data => setCsrf(data.csrf)).catch(error => { if (error.status !== 401) setError(error.message); }).finally(() => setChecking(false)); }, []);
  useEffect(() => {
    if (!csrf) return;
    let live = true;
    api('/admin/settings').then(result => { if (live) setSettings(result); }).catch(onError);
    return () => { live = false; };
  }, [csrf, refresh]);
  useEffect(() => {
    if (!csrf || tab !== 'orders') return;
    let live = true; setLoading(true);
    api(`/admin/orders?status=${status}&payment=${payment}&page=${page}`).then(result => { if (live) setData(result); }).catch(onError).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [csrf, tab, status, payment, page, refresh]);
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }); setCsrf(data.csrf); setPassword(''); }
    catch (error) { onError(error); } finally { setBusy(false); }
  }
  async function logout() {
    try { await api('/admin/logout', { method: 'POST', csrf }); setCsrf(''); setSelected(null); setError(''); }
    catch (error) { onError(error); }
  }
  return <>
    <PageMeta title="Order admin — Shreya Pokharel" description="Private book order management." />
    <main className="container admin-page" id="main-content" tabIndex={-1}>
      <p className="section-label">admin</p><h1 className="order-title">Book orders</h1>
      {error && <p className="form-message" role="alert">{error}</p>}
      {checking ? <p className="section-description">Checking your session…</p> : !csrf ? <form className="login-form" onSubmit={login}>
        <p>Sign in to review orders and payment screenshots.</p><label className="field-label" htmlFor="admin-password">Admin password</label><input id="admin-password" type="password" className="form-control" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={256} /><button className="button button-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form> : <>
        <div className="admin-toolbar"><div className="admin-tabs"><button className={tab === 'orders' ? 'active' : ''} type="button" onClick={() => { setTab('orders'); setSelected(null); setError(''); }}>Orders</button><button className={tab === 'settings' ? 'active' : ''} type="button" onClick={() => { setTab('settings'); setError(''); }}>Payment settings</button></div><button type="button" className="text-link" onClick={logout}>Sign out</button></div>

        {tab === 'settings' ? settings ? <PaymentSettings csrf={csrf} settings={settings} onSaved={refreshAll} onError={onError} /> : <p>Loading settings…</p> : selected ? <OrderDetail key={selected.id} order={selected} csrf={csrf} connected={Boolean(settings?.emailConnected)} onClose={() => { setSelected(null); setError(''); }} onUpdate={order => { setSelected(order); setError(''); refreshAll(); }} onError={onError} /> : <>
          <div className="order-filters"><div className="form-field"><label htmlFor="order-filter">Status</label><select id="order-filter" className="form-control" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="received">Needs review</option><option value="confirmed">Confirmed</option><option value="rejected">Rejected</option><option value="">All orders</option></select></div><div className="form-field"><label htmlFor="payment-filter">Payment</label><select id="payment-filter" className="form-control" value={payment} onChange={event => { setPayment(event.target.value); setPage(1); }}><option value="">All methods</option><option value="cod">Cash on delivery</option><option value="qr">Pay using QR</option></select></div><button className="gallery-arrow" type="button" onClick={refreshAll} disabled={loading}>Refresh</button></div>
          <p className="field-help" role="status">{loading ? 'Loading orders…' : data ? `${data.total} matching orders · ${data.received} awaiting review` : ''}</p>
          {!loading && data?.orders.length === 0 && <p className="empty-state">No orders here yet.</p>}
          <div className="admin-order-list">{data?.orders.map(order => <button type="button" className="admin-order-card" key={order.id} onClick={() => { setSelected(order); setError(''); }}><span><span className={`status-badge status-${order.status}`}>{label(order.status)}</span><strong>{order.name}</strong><small>{order.id} · {date(order.createdAt)}</small></span><span><strong>{money(order.total)}</strong><small>{order.quantity} {order.quantity === 1 ? 'copy' : 'copies'} · {order.payment === 'cod' ? 'COD' : 'QR'}</small><span className="text-link">View order →</span></span></button>)}</div>
          {data && data.total > 20 && <div className="pagination"><button className="gallery-arrow" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button><p>Page {page} of {Math.ceil(data.total / 20)}</p><button className="gallery-arrow" disabled={page * 20 >= data.total || loading} onClick={() => setPage(value => value + 1)}>Next</button></div>}
        </>}
      </>}
    </main>
  </>;
}
