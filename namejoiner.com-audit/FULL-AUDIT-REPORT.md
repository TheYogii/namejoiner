# SEO audit: namejoiner.com

Audited 20 Sep 2026 against the live site. Crawled all 11 sitemap URLs (1 request per second), probed robots, redirects, 404s, headers and assets, and measured Core Web Vitals in headless Chromium (mobile run with 4x CPU and slow-4G throttling, desktop run unthrottled). Nothing was changed on the site.

**SEO Health Score: 84 / 100**  |  Business type: free web tools hub (utility / programmatic-adjacent, ad and affiliate monetisation planned)

| Category | Weight | Score |
|---|---|---|
| Technical SEO | 22% | 82 |
| Content quality | 23% | 86 |
| On-page SEO | 20% | 92 |
| Schema / structured data | 10% | 80 |
| Performance (CWV) | 10% | 90 |
| AI search readiness | 10% | 72 |
| Images | 5% | 70 |

## Executive summary

The fundamentals are in very good shape: every page is indexable with a self-referencing canonical, unique 52-58 character titles, unique 141-160 character descriptions, one H1, clean heading order, valid JSON-LD, working redirects, a proper 404, and content depth well past the site's own 800-word rule on all six tool pages. Core Web Vitals are healthy: CLS 0 everywhere, LCP is a text paragraph (not an image) at 0.7-2.0 s, and the page weight is tiny.

The most important problems are not classic SEO. They are **things the live site does that the site's own Privacy Policy says it does not**, plus two Cloudflare settings that quietly hurt crawlability.

### Top 5 issues
1. **HIGH - The Privacy Policy is wrong about analytics.** The live site loads Cloudflare Web Analytics (`static.cloudflareinsights.com/beacon.min.js` and a `/cdn-cgi/rum` call, injected at the edge). The policy says the site uses no analytics.
2. **HIGH - The Privacy Policy and Terms name the wrong host.** They say the site is hosted on Vercel. Responses come from Cloudflare (`server: cloudflare`, `cf-ray`, no `x-vercel-*` headers). `vercel.json` in the repo is not what is serving the site.
3. **HIGH - Cloudflare Email Address Obfuscation is on.** `hello@namejoiner.com` is rewritten to `[email protected]` plus a decode script, and every mailto link becomes `/cdn-cgi/l/email-protection#...`, which returns 404 to crawlers. That hides the only contact detail from bots and shows up as a broken internal link on 25+ pages in any crawl.
4. **MEDIUM - The logo is 74% of the page weight on light pages.** `/logo.png` is 1562x781 (46.8 KB) and is shown at 72-96 px wide, twice per page.
5. **MEDIUM - Hashed assets are cached for only 4 hours** (`max-age=14400, must-revalidate`) instead of a year with `immutable`, and the HTML is not edge-cached (`cf-cache-status: DYNAMIC`).

### Top 5 quick wins
1. Update the Privacy Policy (analytics, host, and the localStorage/share text flagged earlier). Text change only.
2. Turn off Email Obfuscation in Cloudflare (Scrape Shield). One toggle.
3. Replace `logo.png` with an SVG (or a 200-pixel-wide WebP). Saves about 40 KB per page.
4. Add `public/_headers` with long-lived caching for `/_astro/*` and basic security headers.
5. Re-export the social image at 1200x630 (currently 3750x1969, 164 KB).

## Technical SEO (82)

Works well
- `robots.txt` allows everything and points at `sitemap-index.xml`. The sitemap lists exactly the 11 real pages and all return 200.
- Redirects are correct: `http` and `www` go to `https://namejoiner.com/` (301), `/page/` and `/page.html` go to `/page` (308). No chains.
- A missing URL returns a real 404 with the custom page (not a soft 404).
- Every page: `lang="en"`, viewport, self-canonical, no stray `noindex`. All 11 internal link targets return 200 (excluding the Cloudflare email links below).
- Brotli compression on HTML and assets.

Findings
- HIGH: email obfuscation links return 404 (see above).
- MEDIUM: no HSTS, no CSP, no `X-Frame-Options`/`frame-ancestors`, no `Permissions-Policy`. `x-content-type-options` and `referrer-policy` are present. HSTS is the one worth enabling first.
- MEDIUM: `/_astro/*` hashed files use a 4-hour cache instead of `immutable`.
- LOW: HTML responses carry `access-control-allow-origin: *` (harmless for static pages, unnecessary).
- LOW: sitemap has no `<lastmod>`, and declares news/image/video namespaces it does not use.
- LOW: `/.well-known/security.txt` is missing.
- INFO: `vercel.json` (`cleanUrls`, `trailingSlash`) is unused on this host. Cloudflare is doing the URL normalisation.

## Content quality (86)

Works well
- Word counts: home 740, tool pages 1,786-2,500, About 548, Privacy 509, Terms 522, Contact 75 (fine for a contact page).
- Each tool page has distinct sections, FAQs that add facts, and honest limits (no AI claim, platform rules "not checked live"). Related-tool links and in-body cross-links are present (25-37 internal links per page).
- No duplicated titles or descriptions; the earlier cross-page duplicate check found no copied paragraphs.

Findings
- MEDIUM (E-E-A-T): no named person or organisation anywhere. About says what the site is but not who makes it, and there is no "last reviewed" byline on the guides. For a utility site this is a modest trust gap; a named maker and a real "updated" date would help.
- LOW: Contact is one line plus an email that is currently obfuscated (see above).
- LOW: "Updated for 2026" is claimed in copy; `dateModified` in schema is a fixed `2026-09-18` and will go stale unless it is bumped on real changes.

## On-page SEO (92)
- Titles 52-58 chars, keyword near the front on every tool page. Descriptions 141-160.
- One H1 per page containing the primary keyword; H2/H3 order never skips.
- OG and Twitter tags present on every page (title, description, image, url, `summary_large_image`).
- LOW: the footer emits two `<h2>`s ("Tools", "NameJoiner") on every page, so each page's outline ends with two headings that are not content. Making them plain text or `<p>`/`aria-label` keeps the outline clean.
- LOW: homepage hero button says "Try the couple name combiner", a keyword-style link on a page meant to be a neutral hub.

## Schema (80)
- All JSON-LD parses. Home: `WebSite` + `FAQPage` (4). Tool pages: `WebApplication` (free, USD 0, `dateModified`) + `FAQPage` (5-8), matching the visible FAQs. Static pages: none.
- MEDIUM: no `Organization` (with `logo`) entity, and `WebSite`/`WebApplication` do not reference a `publisher`. Adding one helps brand entity recognition.
- INFO: Google limited FAQ rich results to a small set of authoritative sites in 2023, so the FAQ markup will not produce expandable results for this site. It is harmless and still describes the content, but do not expect a SERP feature from it.
- LOW: `WebApplication` could include `screenshot` and a `featureList`. Do not add ratings or review counts unless real.

## Performance (90)
Lab data (headless Chromium; mobile throttled 4x CPU / 150 ms / 1.6 Mbps):

| Page | LCP (mobile) | LCP (desktop) | CLS | Weight |
|---|---|---|---|---|
| Home | 1.9 s (text) | 0.9 s | 0 | 62 KB |
| Couple | 0.9 s (text) | 2.0 s* | 0 | 98 KB |
| Username | 1.2 s (text) | 0.9 s | 0 | 104 KB |
| About | 1.9 s (text) | 0.7 s | 0 | 61 KB |

*One slow first request (TTFB 1.7 s); the other desktop pages were 0.4-0.6 s. This is lab data from one location, not field data. Search Console / CrUX would be the real check once there is traffic.

- Works well: LCP element is text on every page; no layout shift; tool JS is only 28-34 KB and only loads when the tool scrolls into view (`client:visible`); CSS is 8 KB.
- MEDIUM: TTFB of 230-650 ms typical because HTML is `cf-cache-status: DYNAMIC` with `max-age=0, must-revalidate`. Edge-caching the static HTML would cut it.
- MEDIUM: the 4-hour asset cache (above) forces revalidation of every hashed file on repeat visits.
- INFO: the Cloudflare analytics beacon is the only third-party request (about 0 KB transferred).

## Images (70)
- Alt text present and descriptive on all images; width/height set; header logo is eager with `fetchpriority=high`, footer logo lazy. No CLS.
- MEDIUM: `logo.png` 1562x781, 46.8 KB, displayed at 72-96 px wide. Two copies per page, one fetch. Use an SVG (best) or a 300 px WebP (about 3-6 KB).
- MEDIUM: `og-default.png` is 3750x1969 (164 KB). Facebook/LinkedIn recommend 1200x630; large sources may be re-scaled or rejected by some scrapers. One shared image also means every page previews identically. Per-page images would improve click-through when shared.
- LOW: both logo images use the same alt ("NameJoiner home"). Fine, but the footer one could be empty or "NameJoiner" since it sits next to a text tagline.

## AI search readiness (72)
- `robots.txt` allows all crawlers, so AI crawlers can fetch everything. No `llms.txt` (404), which is optional and low value.
- Content is structured for citation: definitional first paragraphs, question-style H3s with self-contained answers, concrete numbers (character limits, counts).
- Gaps: no named author/organisation (weakens trust signals), no external brand mentions yet (expected for a new site), no `Organization` schema, no dated "last reviewed" text.

## Search experience (SXO)
- Tool pages put the tool directly below a short intro and use the query in the H1, which matches the "tool" intent for terms like "couple name combiner" and "gamertag generator". Long-form guidance sits below the tool, so the page type matches.
- Risk to watch: blog-style listicles often rank for "baby name combiner"-type terms. If Search Console shows impressions but low clicks, test a stronger above-the-fold example result.

## Not run
- No Google API, DataForSEO, Moz/Bing or backlink data (no credentials). Backlinks, rankings, indexation and field CWV are therefore not assessed.
- The skill's PDF generator (`google_report.py`) is not installed here, so no PDF was produced.
