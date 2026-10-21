export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export async function api(path, { csrf, ...options } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options,
      headers: { ...(options.body instanceof FormData ? {} : options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...options.headers },
    });
  } catch { throw new ApiError('Could not connect. Check your internet connection and try again.', 0); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || 'This request could not be completed. Please try again.', response.status);
  return data;
}
export const money = amount => `NPR ${amount.toLocaleString('en-NP')}`;
