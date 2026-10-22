import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { PAGES, DEFAULT_SITE_ORIGIN, siteOrigin } from '../client/src/seo.mjs';
const origin = siteOrigin(process.env.SITE_URL || DEFAULT_SITE_ORIGIN);
const preview = process.env.VERCEL_ENV === 'preview';
for (const [path, page] of Object.entries(PAGES)) {
  const file = path === '/' ? 'index' : path.slice(1);
  const html = await readFile(`client/dist/${file}.html`, 'utf8');
  const { document } = new JSDOM(html).window;
  assert.equal(document.title, page.title);
  assert.equal(document.querySelectorAll('meta[name="description"]').length, 1);
  assert.equal(document.querySelector('meta[name="description"]').content, page.description);
  assert.equal(document.querySelector('link[rel="canonical"]').href, new URL(path, origin).href);
  assert.equal(document.querySelector('meta[property="og:url"]').content, new URL(path, origin).href);
  assert.ok(document.querySelector('meta[property="og:image"]').content.startsWith(origin));
  assert.equal(document.querySelector('meta[name="robots"]').content.startsWith('noindex'), Boolean(page.noindex || preview));
  assert.ok(document.querySelector('#root h1'), `${path} must have visible HTML before JavaScript`);
  assert.ok(document.querySelector('#root').textContent.includes('Shreya'));
  if (!page.noindex) {
    const graph = JSON.parse(document.getElementById('site-structured-data').textContent)['@graph'];
    assert.equal(graph.find(item => item['@type'] === 'Book').author['@id'], `${origin}/#author`);
  }
}
const sitemap = await readFile('client/dist/sitemap.xml', 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, 4);
assert.ok(!sitemap.includes('/admin'));
assert.ok(sitemap.includes(`${origin}/journey`));
const robots = await readFile('client/dist/robots.txt', 'utf8');
assert.ok(preview ? robots.includes('Disallow: /\n') : robots.includes(`${origin}/sitemap.xml`));
console.log('SEO checks passed: 5 page documents, unique metadata, canonical/social URLs, readable HTML, linked author/book data, sitemap and robots.');
