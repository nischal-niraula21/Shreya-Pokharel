export const DEFAULT_SITE_ORIGIN = 'https://shreyapokharel-olive.vercel.app';
export const SITE_NAME = 'Shreya Pokharel';
export const BOOK_NAME = 'And They Say It’s Easy';
export const PAGES = {
  '/': {
    title: 'And They Say It’s Easy — Book by Shreya Pokharel',
    description: 'Discover And They Say It’s Easy, Shreya Pokharel’s debut novel about relationships, trauma and navigating life. Meet the author and order across Nepal.',
  },
  '/journey': {
    title: 'Shreya Pokharel — Author of And They Say It’s Easy',
    description: 'Meet Shreya Pokharel, a writer and law student from Jhapa, Nepal, and the author of And They Say It’s Easy. Explore her journey through law and writing.',
  },
  '/writing': {
    title: 'Poems & Articles by Shreya Pokharel | And They Say It’s Easy',
    description: 'Read original poems and articles by Shreya Pokharel, author of And They Say It’s Easy, exploring justice, power, relationships and feeling.',
  },
  '/order': {
    title: 'Buy And They Say It’s Easy by Shreya Pokharel in Nepal',
    description: 'Order And They Say It’s Easy by Shreya Pokharel for NPR 435. Delivery is NPR 150 across Nepal. Choose cash on delivery or available QR payment.',
  },
  '/admin': { title: 'Private Order Admin — Shreya Pokharel', description: 'Private book order management.', noindex: true },
};
export function siteOrigin(value = DEFAULT_SITE_ORIGIN) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('SITE_URL must be your HTTPS website origin, without a path, query or credentials.');
  }
  return url.origin;
}
export function pageSEO(pathname, origin = DEFAULT_SITE_ORIGIN) {
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const page = PAGES[path] || { title: 'Page not found — Shreya Pokharel', description: 'This page could not be found.', noindex: true };
  const canonical = new URL(path, siteOrigin(origin)).href;
  return { ...page, path, canonical, image: new URL('/assets/book-cover.jpeg', origin).href };
}
export function structuredData(pathname, origin = DEFAULT_SITE_ORIGIN) {
  const base = siteOrigin(origin);
  const person = {
    '@type': 'Person', '@id': `${base}/#author`, name: SITE_NAME,
    url: `${base}/journey`, image: `${base}/assets/shreya-3.jpeg`,
    description: 'Writer and law student from Jhapa, Nepal; author of And They Say It’s Easy.',
    sameAs: ['https://www.instagram.com/pokharel_s/'],
  };
  const book = {
    '@type': 'Book', '@id': `${base}/#book`, name: BOOK_NAME,
    url: `${base}/`, image: `${base}/assets/book-cover.jpeg`,
    author: { '@id': `${base}/#author` },
    description: 'A debut novel by Shreya Pokharel exploring relationships, trauma and navigating life.',
  };
  const page = pageSEO(pathname, base);
  if (page.noindex) return null;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${base}/#website`, name: SITE_NAME, alternateName: BOOK_NAME, url: `${base}/` },
      person, book,
      { '@type': pathname === '/journey' ? 'AboutPage' : 'WebPage', '@id': `${page.canonical}#webpage`,
        url: page.canonical, name: page.title, description: page.description,
        isPartOf: { '@id': `${base}/#website` },
        about: { '@id': `${base}/#${pathname === '/journey' ? 'author' : 'book'}` } },
    ],
  };
}
export function jsonForHTML(value) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
