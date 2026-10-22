import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { build } from 'vite';
import { PAGES, DEFAULT_SITE_ORIGIN, siteOrigin, pageSEO, structuredData, jsonForHTML } from '../client/src/seo.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'client/dist');
const temporary = resolve(root, '.prerender');
const origin = siteOrigin(process.env.SITE_URL || DEFAULT_SITE_ORIGIN);
const preview = process.env.VERCEL_ENV === 'preview';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const meta = (key, value, property = false) => `<meta ${property ? 'property' : 'name'}="${key}" content="${escape(value)}">`;
const template = await readFile(resolve(output, 'index.html'), 'utf8');
try {
  await build({
    configFile: resolve(root, 'client/vite.config.js'),
    build: { ssr: resolve(root, 'client/entry-server.jsx'), outDir: temporary,
      emptyOutDir: true, minify: false,
      rollupOptions: { output: { entryFileNames: 'entry-server.mjs' } } },
  });
  const { render } = await import(pathToFileURL(resolve(temporary, 'entry-server.mjs')).href);
  for (const path of [...Object.keys(PAGES), '/404']) {
    const page = pageSEO(path, origin);
    const data = structuredData(path, origin);
    const head = [
      `<title>${escape(page.title)}</title>`,
      meta('description', page.description), meta('author', 'Shreya Pokharel'),
      ...(process.env.GOOGLE_SITE_VERIFICATION ? [meta('google-site-verification', process.env.GOOGLE_SITE_VERIFICATION)] : []),
      meta('site-origin', origin), meta('deployment-preview', String(preview)),
      meta('robots', preview || page.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'),
      `<link rel="canonical" href="${escape(page.canonical)}">`,
      ...Object.entries({ 'og:title': page.title, 'og:description': page.description,
        'og:url': page.canonical, 'og:type': 'website', 'og:site_name': 'Shreya Pokharel',
        'og:image': page.image, 'og:image:alt': 'And They Say It’s Easy book cover by Shreya Pokharel' })
        .map(([name, value]) => meta(name, value, true)),
      meta('twitter:card', 'summary_large_image'), meta('twitter:title', page.title),
      meta('twitter:description', page.description), meta('twitter:image', page.image),
      ...(data ? [`<script id="site-structured-data" type="application/ld+json">${jsonForHTML(data)}</script>`] : []),
    ].join('\n');
    const html = template.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta\s+name="description"[^>]*>/i, '')
      .replace('</head>', `${head}\n</head>`)
      .replace('<div id="root"></div>', `<div id="root" data-prerendered="true">${render(path)}</div>`);
    const target = resolve(output, path === '/' ? 'index.html' : path === '/404' ? '404.html' : `${path.slice(1)}.html`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html);
  }
  const publicPaths = Object.keys(PAGES).filter(path => !PAGES[path].noindex);
  await writeFile(resolve(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    publicPaths.map(path => `  <url><loc>${escape(new URL(path, origin).href)}</loc></url>`).join('\n') + '\n</urlset>\n');
  await writeFile(resolve(output, 'robots.txt'), preview ? 'User-agent: *\nDisallow: /\n' :
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`);
  console.log(`SEO: rendered ${publicPaths.length} public pages, private admin metadata, sitemap and robots.txt for ${origin}`);
} finally { await rm(temporary, { recursive: true, force: true }); }
