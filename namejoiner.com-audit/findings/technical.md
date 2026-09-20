# Technical findings
- robots.txt: `User-agent: *`, `Allow: /`, Sitemap line. OK.
- Sitemap: sitemap-index.xml -> sitemap-0.xml, 11 URLs, all 200. No lastmod.
- Redirects: http->https 301, www->apex 301, /x/ and /x.html -> /x 308. No chains.
- 404: real 404 status, custom page, `cache-control: no-store`.
- Headers on HTML: brotli, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `access-control-allow-origin: *`, `cache-control: public, max-age=0, must-revalidate`, `cf-cache-status: DYNAMIC`. Missing: HSTS, CSP, X-Frame-Options, Permissions-Policy.
- Assets: /_astro/* and /logo.png etc. `max-age=14400, must-revalidate`.
- Cloudflare email obfuscation: `/cdn-cgi/l/email-protection#...` links (404 to crawlers), `[email protected]` text, `email-decode.min.js`.
- Cloudflare Web Analytics beacon loaded in browsers (not in curl HTML): `static.cloudflareinsights.com/beacon.min.js`, `/cdn-cgi/rum`.
