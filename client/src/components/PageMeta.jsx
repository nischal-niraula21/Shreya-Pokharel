import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_SITE_ORIGIN, pageSEO, structuredData, jsonForHTML } from '../seo.mjs';

function meta(name, content, property = false) {
  const attribute = property ? 'property' : 'name';
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.append(element);
  }
  element.content = content;
}
export default function PageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const origin = document.querySelector('meta[name="site-origin"]')?.content || DEFAULT_SITE_ORIGIN;
    const page = pageSEO(pathname, origin);
    document.title = page.title;
    meta('description', page.description);
    const preview = document.querySelector('meta[name="deployment-preview"]')?.content === 'true';
    meta('robots', preview || page.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    meta('author', 'Shreya Pokharel');
    for (const [name, value] of Object.entries({ 'og:title': page.title, 'og:description': page.description,
      'og:url': page.canonical, 'og:image': page.image, 'og:image:alt': 'And They Say It’s Easy book cover by Shreya Pokharel',
      'og:type': 'website', 'og:site_name': 'Shreya Pokharel' })) meta(name, value, true);
    meta('twitter:card', 'summary_large_image');
    meta('twitter:title', page.title); meta('twitter:description', page.description); meta('twitter:image', page.image);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = page.canonical;
    document.getElementById('site-structured-data')?.remove();
    const data = structuredData(pathname, origin);
    if (data) {
      const script = document.createElement('script');
      script.id = 'site-structured-data'; script.type = 'application/ld+json';
      script.textContent = jsonForHTML(data); document.head.append(script);
    }
  }, [pathname]);
  return null;
}
