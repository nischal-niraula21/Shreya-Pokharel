# SEO update for Shreya Pokharel

Current canonical website: https://shreyapokharel-olive.vercel.app

This is a small source-code update for your EXISTING project. It preserves your
current page paragraphs, photos, scroll reveal component, homepage health request,
backend credentials and API rewrite. It does not include an older copy of Journey.jsx,
Layout.jsx, main.jsx, package.json or vercel.json to overwrite your edited versions.
The apply script makes the required targeted edits to those files locally.

## Install the update

1. Extract and merge the included client/, scripts/ and tests/ folders into your
   existing project root, beside package.json. Keep all existing files.
2. In a terminal opened at that root, run:

   node scripts/apply-seo.mjs
   npm run build
   node scripts/check-seo.mjs

3. Commit the added/modified files and push to your connected GitHub branch.
   Vercel's existing build command remains npm run build. The script adds a second
   build stage that generates each page's actual HTML and metadata. It adds no npm
   dependencies. Your backend still uses npm ci --omit=dev and npm start.
4. After Vercel reports Ready, open:

   https://shreyapokharel-olive.vercel.app/robots.txt
   https://shreyapokharel-olive.vercel.app/sitemap.xml

   The first should reference your sitemap; the second should list four public
   URLs. Check /journey, /writing, /order and /admin by opening them directly too.

Use the project with the latest static vercel.json setup (not vercel.mjs). The
apply script requires a valid existing API rewrite and keeps its Render URL.
It replaces the broad SPA fallback with explicit routes for the generated pages;
unmatched URLs use the generated 404.html on Vercel. Existing .html page links
redirect to their canonical extensionless routes.

## What changes

- Page-specific book/author titles and natural descriptions.
- Canonical URLs without tracking query parameters.
- Open Graph and Twitter sharing metadata using the real book cover.
- Book, Person, WebSite and WebPage JSON-LD with known factual information only.
  No invented ISBN, reviews, ratings, publication date or awards are added.
- Four public pages in sitemap.xml; the admin page is excluded.
- Admin noindex metadata and response header. Authentication remains essential:
  noindex is not access control.
- Preview builds stay noindex. The normal production build is indexable.
- Public content and metadata are pre-rendered into HTML at build time, without
  calling MongoDB, Cloudinary or the order API. React hydrates that existing HTML
  in the browser and keeps checkout/admin interactive.
- Existing client navigation updates title, canonical, social tags and JSON-LD.
- The book remains NPR 435; delivery remains NPR 150 per order. This update does
  not modify the backend's price or any existing order.

## Free Google Search Console setup

Add a URL-prefix property for:

https://shreyapokharel-olive.vercel.app/

Choose HTML tag verification. Copy ONLY the token from content="..." and add it
in Vercel > Settings > Environment Variables > Production as:

GOOGLE_SITE_VERIFICATION=YOUR_TOKEN

Redeploy Vercel, then click Verify in Search Console. The verification tag is
included in every generated page. Keep it configured after verification.

In Search Console > Sitemaps, submit:

https://shreyapokharel-olive.vercel.app/sitemap.xml

Use URL Inspection to inspect the homepage and request indexing. Check the
rendered HTML and Google-selected canonical after deployment. Crawling and
indexing can take days or weeks; inclusion, ranking and AI Overview citations
are decided by Google and cannot be guaranteed or bought through this update.

The intended searches include the book title, Shreya Pokharel's name, and buying
the book in Nepal. No meta-keywords tag or hidden keyword blocks are used.

## When the custom domain arrives

Set this PUBLIC build-time value in Vercel and redeploy:

SITE_URL=https://YOUR-CANONICAL-DOMAIN

Use the exact HTTPS origin, without a path. All canonical URLs, social image URLs,
JSON-LD links, sitemap URLs and robots.txt update from that value. Update Render's
APP_ORIGIN to the same frontend domain. No SEO source edit is needed for the move.
Configure redirects from the old domain and verify the new property in Search
Console. Keep your Resend credentials exclusively on Render.

## Verification and limits

The update was tested on the supplied project, including built HTML checks,
client navigation, reduced indexability of admin/previews, safe JSON-LD encoding,
and React hydration of the Journey page. Existing checkout UI tests also pass.
No installed dependencies or private .env are included in this patch.
The live URL was not accessible through the web tool, and no GitHub push, hosting
change or Search Console submission was performed. Hosted routes/canonical URLs
and current customized page content must be checked after you deploy the patch.

References:
https://developers.google.com/search/docs/fundamentals/seo-starter-guide
https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
https://developers.google.com/search/docs/appearance/ai-features
