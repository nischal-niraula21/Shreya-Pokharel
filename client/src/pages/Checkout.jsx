import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import { PageMeta } from '../components/Layout.jsx';
function requestKey() {
  const stored = sessionStorage.getItem('book-order-request');
  if (stored) return stored;
  const key = crypto.randomUUID(); sessionStorage.setItem('book-order-request', key); return key;
}
export default function Checkout() {
  const [config, setConfig] = useState(null), [loadError, setLoadError] = useState('');
  const [quantity, setQuantity] = useState(1), [reviewed, setReviewed] = useState(false);
  const [payment, setPayment] = useState('cod'), [proof, setProof] = useState(null);
  const [preview, setPreview] = useState(''), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [received, setReceived] = useState(false), [receiptNote, setReceiptNote] = useState('');
  const summary = useRef(null), success = useRef(null), inFlight = useRef(false), key = useRef(null);
  const load = () => { setLoadError(''); api('/config').then(setConfig).catch(error => setLoadError(error.message)); };
  useEffect(load, []);
  useEffect(() => {
    if (!proof) { setPreview(''); return; }
    const url = URL.createObjectURL(proof); setPreview(url); return () => URL.revokeObjectURL(url);
  }, [proof]);
  useEffect(() => { if (reviewed) summary.current?.focus(); }, [reviewed]);
  useEffect(() => { if (received) success.current?.focus(); }, [received]);
  const count = Number(quantity), validCount = Number.isInteger(count) && count >= 1 && count <= 999;
  const subtotal = config && validCount ? count * config.book.price : null;
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    setError('');
    const form = event.currentTarget;
    for (const name of ['name', 'phone', 'address']) {
      const field = form.elements.namedItem(name);
      field.setCustomValidity(field.value.trim() ? '' : 'Please complete this field.');
    }
    const phone = form.elements.namedItem('phone');
    phone.setCustomValidity(/^[+\d][\d\s().-]{6,34}$/.test(phone.value.trim()) ? '' : 'Please enter a valid phone number.');
    if (!form.reportValidity() || !config || !validCount) return;
    if (!reviewed) { setReviewed(true); return; }
    if (payment === 'qr' && !proof) { setError('Upload your payment screenshot before submitting.'); return; }
    inFlight.current = true; setBusy(true);
    try {
      const data = new FormData(form);
      data.set('payment', payment); data.set('quantity', String(count));
      key.current ||= requestKey(); data.set('requestKey', key.current);
      if (payment === 'qr') { data.set('qrId', config.qr.id); data.set('proof', proof); }
      else { data.delete('proof'); data.delete('qrId'); }
      await api('/orders', { method: 'POST', body: data });
      sessionStorage.removeItem('book-order-request'); setReceived(true);
    } catch (error) {
      if (error.status === 409) {
        sessionStorage.removeItem('book-order-request');
        setReceiptNote('An earlier submission from this checkout was already saved. Contact Shreya if its details need to change.');
        setReceived(true);
      } else setError(error.message);
    }
    finally { inFlight.current = false; setBusy(false); }
  }
  function changeQuantity(value) {
    setQuantity(value); setReviewed(false); setProof(null); setError('');
  }
  return <>
    <PageMeta title="Order the book — Shreya Pokharel" description="Order And They Say It’s Easy. Choose cash on delivery or QR payment with flat NPR 150 delivery across Nepal." />
    <main className="grain" id="main-content" tabIndex={-1}>
      <div className="container order-layout">
        <div className="order-artwork"><img src="/assets/book-cover.jpeg" alt="And They Say It's Easy book cover" className="order-cover" width="1024" height="1536" decoding="async" /><p className="book-signature">signed with love, Shreya</p></div>
        <div>
          <p className="section-label">order now</p><h1 className="order-title">Get your copy</h1>
          {received ? <section className="order-success" ref={success} tabIndex={-1} role="status">
            <h2>Your order has been received.</h2>
            <p>Thank you for ordering my book. We’ll email you once your order is confirmed.</p>
            {receiptNote && <><p>{receiptNote}</p><a className="text-link" href="https://www.instagram.com/pokharel_s?obrf=cTN1ajFwbHpoYThk" target="_blank" rel="noopener noreferrer">Contact Shreya</a></>}
            <Link className="button button-outline" to="/">Back to the book</Link>
          </section> : <>
            <p className="section-description">Fill in your details, review the delivery charge and final total, then choose how you’d like to pay.</p>
            {config && <p className="book-price">{money(config.book.price)} <span>per copy</span></p>}
            {loadError ? <div className="form-message" role="alert"><p>{loadError}</p><button type="button" className="text-link" onClick={load}>Try again</button></div> : !config ? <p className="order-status" role="status">Loading checkout…</p> : null}
            <form className="order-form" onSubmit={submit} aria-describedby="order-status">
              <fieldset className="order-fields" disabled={!config || busy}>
                <legend className="sr-only">Your book order details</legend>
                <div className="form-field"><label className="field-label" htmlFor="buyer-name">Full name</label><input id="buyer-name" name="name" className="form-control" autoComplete="name" maxLength={120} required onInput={event => event.target.setCustomValidity('')} /></div>
                <div className="form-field"><label className="field-label" htmlFor="buyer-email">Your email</label><input id="buyer-email" name="email" type="email" className="form-control" autoComplete="email" maxLength={254} required /><p className="field-help">Your order confirmation will be sent here.</p></div>
                <div className="form-field"><label className="field-label" htmlFor="buyer-phone">Phone number</label><input id="buyer-phone" name="phone" type="tel" className="form-control" autoComplete="tel" maxLength={35} required onInput={event => event.target.setCustomValidity('')} /></div>
                <div className="form-field"><label className="field-label" htmlFor="buyer-address">Delivery address</label><textarea id="buyer-address" name="address" className="form-control" autoComplete="street-address" placeholder="Street, municipality and district, Nepal" rows={3} maxLength={600} required onInput={event => event.target.setCustomValidity('')} /></div>
                <div className="form-field"><label className="field-label" htmlFor="buyer-quantity">Number of copies</label><input id="buyer-quantity" name="quantity" type="number" min={1} max={999} step={1} inputMode="numeric" className="form-control" value={quantity} onChange={event => changeQuantity(event.target.value)} required /></div>
                <div className="form-field"><label className="field-label" htmlFor="buyer-note">A note for me (optional)</label><textarea id="buyer-note" name="note" className="form-control" rows={2} maxLength={1000} /></div>
                <div className="honeypot" aria-hidden="true"><label htmlFor="buyer-website">Leave this empty</label><input id="buyer-website" name="website" tabIndex={-1} autoComplete="off" /></div>
                <p className="order-total">Book subtotal: <strong>{subtotal === null ? '—' : money(subtotal)}</strong></p>
                {reviewed && config && <>
                  <section className="delivery-summary" ref={summary} tabIndex={-1} aria-labelledby="review-heading">
                    <h2 id="review-heading">Review your order</h2>
                    <p>Book subtotal <strong>{money(subtotal)}</strong></p>
                    <p>Delivery charge <strong>{money(config.book.delivery)}</strong></p>
                    <p className="delivery-total">Total including delivery <strong>{money(subtotal + config.book.delivery)}</strong></p>
                    <p className="delivery-help">Flat delivery charge across Nepal, regardless of quantity.</p>
                  </section>
                  <fieldset className="payment-options">
                    <legend>Choose your payment method</legend>
                    <label className={`payment-option ${payment === 'cod' ? 'selected' : ''}`}><input name="payment" type="radio" value="cod" checked={payment === 'cod'} onChange={() => { setPayment('cod'); setProof(null); }} /><span><strong>Cash on delivery</strong><small>Pay {money(subtotal + config.book.delivery)} when your book arrives.</small></span></label>
                    <label className={`payment-option ${payment === 'qr' ? 'selected' : ''}`}><input name="payment" type="radio" value="qr" checked={payment === 'qr'} disabled={!config.qr} onChange={() => setPayment('qr')} /><span><strong>Pay using QR</strong><small>{config.qr ? 'Pay first, then upload your payment screenshot.' : 'QR payment will be available soon.'}</small></span></label>
                  </fieldset>
                  {payment === 'qr' && config.qr && <section className="qr-payment" aria-labelledby="qr-heading">
                    <h3 id="qr-heading">{config.qr.label}</h3>
                    <p>Pay <strong>{money(subtotal + config.book.delivery)}</strong> to <strong>{config.qr.accountName}</strong>.</p>
                    {config.qr.accountDetails && <p className="field-help">{config.qr.accountDetails}</p>}
                    <img className="payment-qr" src={config.qr.imageUrl} alt={`Payment QR for ${config.qr.accountName}`} />
                    <a className="text-link" href={config.qr.imageUrl} download="payment-qr.png">Save QR image</a>
                    <div className="form-field proof-field"><label className="field-label" htmlFor="payment-proof">Payment screenshot</label><input id="payment-proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => {
                      const file = event.target.files?.[0]; setError('');
                      if (file && file.size > 5 * 1024 * 1024) { event.target.value = ''; setProof(null); setError('Choose an image under 5 MB.'); }
                      else setProof(file || null);
                    }} /><p className="field-help">JPG, PNG or WebP, up to 5 MB. Your payment will be checked manually.</p></div>
                    {preview && <img className="proof-preview" src={preview} alt="Selected payment screenshot" />}
                  </section>}
                </>}
                {error && <p className="form-message" role="alert">{error}</p>}
                <button type="submit" className="button button-primary order-submit">{busy ? 'Placing your order…' : reviewed ? 'Place order' : 'Review order'}</button>
              </fieldset>
              <p id="order-status" className="order-status" role="status">{reviewed ? 'Check your total and payment method, then place your order.' : 'You’ll review the delivery charge and final total before placing your order.'}</p>
            </form>
          </>}
        </div>
      </div>
    </main>
  </>;
}
