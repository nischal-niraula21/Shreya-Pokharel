import React from 'react';
import { test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Checkout from '../client/src/pages/Checkout.jsx';
import Writing from '../client/src/pages/Writing.jsx';
import Admin from '../client/src/pages/Admin.jsx';
const book = { title: 'And They Say It’s Easy', price: 435, delivery: 150 };
const qr = { id: 'test-qr', label: 'Bank QR', accountName: 'Test owner', accountDetails: 'Test account', imageUrl: '/api/qr/test-qr' };
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
function mockCheckout({ withQR = false, failFirst = false } = {}) {
  let submissions = 0; const payloads = [];
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    if (url === '/api/config') return response({ book, qr: withQR ? qr : null });
    if (url === '/api/orders') {
      payloads.push(options.body); submissions++;
      if (failFirst && submissions === 1) throw new Error('Offline');
      return response({ id: 'SP-TEST', message: 'Your order has been received.' }, 201);
    }
    throw new Error(`Unexpected URL: ${url}`);
  }));
  return payloads;
}
async function fillBuyer(user) {
  await waitFor(() => expect(screen.getByLabelText('Full name')).toBeEnabled());
  await user.type(screen.getByLabelText('Full name'), 'Sample Reader');
  await user.type(screen.getByLabelText('Your email'), 'reader@example.test');
  await user.type(screen.getByLabelText('Phone number'), '+977 9800000000');
  await user.type(screen.getByLabelText('Delivery address'), 'Sample address, Jhapa, Nepal');
}
function checkout() { return render(<MemoryRouter><Checkout /></MemoryRouter>); }

test('delivery total is revealed at review, COD submits and the exact receipt message appears', async () => {
  const payloads = mockCheckout(); const user = userEvent.setup(); checkout(); await fillBuyer(user);
  expect(screen.queryByRole('heading', { name: 'Review your order' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Review order' }));
  expect(screen.getByText('NPR 150')).toBeInTheDocument(); expect(screen.getByText('NPR 585')).toBeInTheDocument();
  expect(screen.getByLabelText(/Pay using QR/)).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Place order' }));
  expect(await screen.findByRole('heading', { name: 'Your order has been received.' })).toBeInTheDocument();
  expect(payloads).toHaveLength(1); expect(payloads[0].get('payment')).toBe('cod');
  expect(payloads[0].get('email')).toBe('reader@example.test');
  expect(screen.queryByText(/tracking/i)).not.toBeInTheDocument();
});
test('changing quantity resets the review and calculates a single flat delivery charge', async () => {
  mockCheckout(); const user = userEvent.setup(); checkout(); await fillBuyer(user);
  await user.click(screen.getByRole('button', { name: 'Review order' }));
  const quantity = screen.getByLabelText('Number of copies'); await user.clear(quantity); await user.type(quantity, '3');
  expect(screen.queryByRole('heading', { name: 'Review your order' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Review order' }));
  expect(screen.getByText('NPR 1,455')).toBeInTheDocument(); expect(screen.getByText('NPR 150')).toBeInTheDocument();
});
test('QR selection shows account details and requires a screenshot without any transaction-ID field', async () => {
  const payloads = mockCheckout({ withQR: true });
  const createObjectURL = vi.fn(() => 'blob:test-proof'), revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
  const user = userEvent.setup(); checkout(); await fillBuyer(user);
  await user.click(screen.getByRole('button', { name: 'Review order' }));
  await user.click(screen.getByLabelText(/Pay using QR/));
  expect(screen.getByRole('heading', { name: 'Bank QR' })).toBeInTheDocument();
  expect(screen.getByText('Test account')).toBeInTheDocument();
  expect(screen.queryByLabelText(/transaction/i)).not.toBeInTheDocument();
  const input = screen.getByLabelText('Payment screenshot'); expect(input).toBeRequired();
  await user.click(screen.getByRole('button', { name: 'Place order' }));
  expect(payloads).toHaveLength(0);
  await user.upload(input, new File(['test image bytes'], 'proof.png', { type: 'image/png' }));
  // JSDOM misreports user-event uploads as valueMissing. Required is asserted above;
  // the real server separately tests missing files, file decoding and size limits.
  input.required = false;

  await user.click(screen.getByRole('button', { name: 'Place order' }));
  await screen.findByRole('heading', { name: 'Your order has been received.' });
  expect(payloads[0].get('payment')).toBe('qr'); expect(payloads[0].get('qrId')).toBe('test-qr'); expect(payloads[0].get('proof').name).toBe('proof.png');
});
test('a failed network request can be retried with the same duplicate-protection key', async () => {
  const payloads = mockCheckout({ failFirst: true }); const user = userEvent.setup(); checkout(); await fillBuyer(user);
  await user.click(screen.getByRole('button', { name: 'Review order' })); await user.click(screen.getByRole('button', { name: 'Place order' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not connect');
  await user.click(screen.getByRole('button', { name: 'Place order' })); await screen.findByRole('heading', { name: 'Your order has been received.' });
  expect(payloads[0].get('requestKey')).toBe(payloads[1].get('requestKey'));
});
test('original poems remain native disclosure controls', () => {
  render(<MemoryRouter><Writing /></MemoryRouter>);
  expect(document.querySelectorAll('details > summary')).toHaveLength(3);
});
test('admin login, review and confirmation work while email remains explicitly disconnected', async () => {
  const order = { id: 'SP-TEST', status: 'received', createdAt: new Date().toISOString(), name: 'Sample Reader', email: 'reader@example.test', phone: '+977 9800000000', address: 'Sample address', quantity: 1, payment: 'cod', subtotal: 435, delivery: 150, total: 585, emails: [{ kind: 'admin', state: 'pending' }] };
  let confirmed = false;
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    if (url === '/api/admin/session') return response({ error: 'Sign in' }, 401);
    if (url === '/api/admin/login') return response({ csrf: 'test-csrf' });
    if (url === '/api/admin/settings') return response({ qr: null, emailConnected: false, adminEmail: '' });
    if (url.startsWith('/api/admin/orders?')) return response({ orders: [{ ...order, status: confirmed ? 'confirmed' : 'received' }], total: 1, received: confirmed ? 0 : 1 });
    if (url.endsWith('/status')) { expect(options.headers['X-CSRF-Token']).toBe('test-csrf'); confirmed = true; return response({ order: { ...order, status: 'confirmed', emails: [...order.emails, { kind: 'confirmed', state: 'pending' }] } }); }
    throw new Error(`Unexpected URL: ${url}`);
  }));
  const user = userEvent.setup(); render(<MemoryRouter><Admin /></MemoryRouter>);
  await user.type(await screen.findByLabelText('Admin password'), 'test-password'); await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText(/Email is not connected yet/)).toBeInTheDocument();
  await user.click(await screen.findByRole('button', { name: /Sample Reader/ }));
  await user.click(screen.getByRole('button', { name: 'Confirm order' }));
  await waitFor(() => expect(screen.getByText('Confirmation to buyer')).toBeInTheDocument());
  expect(screen.getAllByText('Email not connected — queued')).toHaveLength(2);
  expect(confirmed).toBe(true);
});


test('a conflicting retry acknowledges the saved order instead of placing another one', async () => {
  let submissions = 0;
  vi.stubGlobal('fetch', vi.fn(async url => {
    if (url === '/api/config') return response({ book, qr: null });
    if (url === '/api/orders') { submissions++; return response({ error: 'Already received' }, 409); }
    throw new Error('Unexpected URL');
  }));
  const user = userEvent.setup(); checkout(); await fillBuyer(user);
  await user.click(screen.getByRole('button', { name: 'Review order' }));
  await user.click(screen.getByRole('button', { name: 'Place order' }));
  await screen.findByRole('heading', { name: 'Your order has been received.' });
  expect(screen.getByText(/An earlier submission from this checkout was already saved/)).toBeInTheDocument();
  expect(submissions).toBe(1);
  expect(screen.queryByRole('button', { name: 'Place order' })).not.toBeInTheDocument();
});
