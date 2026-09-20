# Action plan: namejoiner.com

## Phase 1 - Critical / high (this week)
1. **Correct the Privacy Policy.** State that Cloudflare Web Analytics is running (cookieless, collects page-load and performance data), or switch it off in the Cloudflare dashboard. Also change "hosted on Vercel" to the real host (Cloudflare), update the local storage line (saved favorites), and mention that sharing sends names to the app or site the user picks. Update the Terms if they name the host. *Effort: 30 min. I wrote the current wording from the repo (`vercel.json`), not from the live headers, so this is my error to fix.*
2. **Turn off Cloudflare Email Address Obfuscation** (Security, Scrape Shield). Then confirm `hello@namejoiner.com` is plain text in the HTML and that the `/cdn-cgi/l/email-protection` links are gone. *Effort: 5 min.*

## Phase 2 - Medium (weeks 2-3)
3. Replace `public/logo.png` with an SVG or a small WebP. Keep the same width/height attributes. *~40 KB saved per page.*
4. Add `public/_headers`: `/_astro/*` -> `Cache-Control: public, max-age=31536000, immutable`; also `X-Frame-Options: DENY` (or `frame-ancestors`), `Permissions-Policy`, and enable HSTS in Cloudflare after checking every subdomain is HTTPS-ready.
5. Re-export `og-default.png` at 1200x630 (under about 100 KB); consider a per-tool social image.
6. Cache static HTML at the edge (Cloudflare cache rule) if your host allows it.
7. Add an `Organization` JSON-LD entity (name, url, logo) and reference it as `publisher`.
8. Add a named maker/organisation and a real "last reviewed" date to About and the tool guides.

## Phase 3 - Low / content and authority (month 2)
9. Give the footer's two `<h2>` headings a non-heading element.
10. Add `lastmod` to the sitemap; bump `dateModified` in schema only when content really changes.
11. Consider a more neutral hero button label on the homepage.
12. Optional: `llms.txt`, `security.txt`, per-page `screenshot`/`featureList` in `WebApplication`.
13. Once there is traffic, verify in Google Search Console and add real CrUX data.

## Phase 4 - Monitoring
- Submit `sitemap-index.xml` in Search Console; watch Coverage and Core Web Vitals.
- Re-run this audit after Phase 1-2 to confirm the score and the broken-link count.
