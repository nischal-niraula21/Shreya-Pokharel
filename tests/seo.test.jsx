import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import PageMeta from '../client/src/components/PageMeta.jsx';
import { PAGES, DEFAULT_SITE_ORIGIN, jsonForHTML } from '../client/src/seo.mjs';
afterEach(() => {
  document.head.querySelectorAll('meta, link[rel="canonical"], #site-structured-data').forEach(element => element.remove());
});
test('client navigation updates canonical, search/social metadata and structured data, then marks admin private', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/']}><PageMeta /><Link to="/journey">Author</Link><Link to="/admin">Admin</Link></MemoryRouter>);
  await waitFor(() => expect(document.title).toBe(PAGES['/'].title));
  await user.click(screen.getByText('Author'));
  expect(document.title).toBe(PAGES['/journey'].title);
  expect(document.querySelector('link[rel="canonical"]').href).toBe(`${DEFAULT_SITE_ORIGIN}/journey`);
  expect(document.querySelector('meta[property="og:title"]').content).toBe(PAGES['/journey'].title);
  expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  expect(JSON.parse(document.getElementById('site-structured-data').textContent)['@graph'].at(-1)['@type']).toBe('AboutPage');
  await user.click(screen.getByText('Admin'));
  expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow');
  expect(document.getElementById('site-structured-data')).toBeNull();
});
test('preview pages stay noindex and JSON-LD cannot close a script tag', async () => {
  const meta = document.createElement('meta'); meta.name = 'deployment-preview'; meta.content = 'true'; document.head.append(meta);
  render(<MemoryRouter><PageMeta /></MemoryRouter>);
  await waitFor(() => expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow'));
  expect(jsonForHTML({ text: '</script><script>alert(1)</script>' })).not.toContain('<');
});

test('pre-rendered journey hydrates without replacing content or hydration errors', async () => {
  const { render: renderServer } = await import('../client/entry-server.jsx');
  const { hydrateRoot } = await import('react-dom/client');
  const { act } = await import('react');
  const { Routes, Route } = await import('react-router-dom');
  const { default: Layout } = await import('../client/src/components/Layout.jsx');
  const { default: Journey } = await import('../client/src/pages/Journey.jsx');
  const host = document.createElement('div');
  host.innerHTML = renderServer('/journey'); document.body.append(host);
  const heading = host.querySelector('h1');
  const errors = [];
  const scrollTo = window.scrollTo; window.scrollTo = () => {};
  let root;
  try {
    await act(async () => {
      root = hydrateRoot(host,
        <MemoryRouter initialEntries={['/journey']}><Routes><Route element={<Layout />}><Route path="journey" element={<Journey />} /></Route></Routes></MemoryRouter>,
        { onRecoverableError: error => errors.push(error.message) });
    });
    expect(errors).toEqual([]);
    expect(host.querySelector('h1')).toBe(heading);
  } finally { await act(async () => root?.unmount()); host.remove(); window.scrollTo = scrollTo; }
});
