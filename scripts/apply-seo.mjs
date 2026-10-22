import { readFile, writeFile } from 'node:fs/promises';

// Run from the project root AFTER copying the SEO update files into the project.
const layoutFile = 'client/src/components/Layout.jsx';
const mainFile = 'client/src/main.jsx';
const layout = await readFile(layoutFile, 'utf8');
let nextLayout = layout;
if (!layout.includes("export { default as PageMeta } from './PageMeta.jsx'")) {
  if (!/export function PageMeta\([\s\S]*?\n\}/.test(layout)) throw new Error('Could not find the existing PageMeta function. No files changed.');
  nextLayout = layout.replace(/export function PageMeta\([\s\S]*?\n\}/, "export { default as PageMeta } from './PageMeta.jsx';");
}
let main = await readFile(mainFile, 'utf8');
if (!main.includes('function mountApp(')) {
  if (!main.includes("createRoot(document.getElementById('root')).render(")) throw new Error('Could not find the app mount call. No files changed.');
  main = main.replace("import { createRoot } from 'react-dom/client';", "import { createRoot, hydrateRoot } from 'react-dom/client';")
    .replace("createRoot(document.getElementById('root')).render(", 'mountApp(');
  main += `\nfunction mountApp(element) {\n  const root = document.getElementById('root');\n  if (root.dataset.prerendered === 'true') hydrateRoot(root, element);\n  else createRoot(root).render(element);\n}\n`;
}
if (!main.includes('function NotFound() { return <><PageMeta')) {
  main = main.replace("import Layout from './components/Layout.jsx';", "import Layout, { PageMeta } from './components/Layout.jsx';");
  main = main.replace('function NotFound() { return <main', 'function NotFound() { return <><PageMeta /><main')
    .replace('Back to the book</Link></main>; }', 'Back to the book</Link></main></>; }');
}
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
pkg.scripts.build = pkg.scripts.build.replace(/ && node scripts\/prerender\.mjs$/, '') + ' && node scripts/prerender.mjs';
const config = JSON.parse(await readFile('vercel.json', 'utf8'));
if (!config.rewrites?.some(item => item.source?.startsWith('/api') && typeof item.destination === 'string')) {
  throw new Error('No existing API rewrite found in vercel.json. No files changed.');
}
config.rewrites = [
  ...config.rewrites.filter(item => item.source?.startsWith('/api')),
  ...['journey','writing','order','admin'].map(page => ({ source: `/${page}`, destination: `/${page}.html` })),
];
config.redirects = [
  ...(config.redirects || []).filter(item => !['/index.html','/journey.html','/writing.html','/order.html','/admin.html'].includes(item.source)),
  ...['index','journey','writing','order','admin'].map(page => ({ source: `/${page}.html`, destination: page === 'index' ? '/' : `/${page}`, permanent: true })),
];
config.headers = [...(config.headers || []).filter(item => item.source !== '/admin'), { source: '/admin', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
let ignored = await readFile('.gitignore', 'utf8').catch(() => '');
if (!ignored.includes('.prerender/')) ignored += '\n.prerender/\n';
await writeFile('.gitignore', ignored);
await writeFile(layoutFile, nextLayout);
await writeFile(mainFile, main);
await writeFile('package.json', JSON.stringify(pkg, null, 2) + '\n');
await writeFile('vercel.json', JSON.stringify(config, null, 2) + '\n');
console.log('SEO enabled. Existing page paragraphs, scroll effects, API rewrite and other source files were preserved. Run npm run build.');
