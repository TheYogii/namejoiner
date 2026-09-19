## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)



# NameJoiner — Project Rules

## Stack
- Astro (latest), Tailwind CSS v4
- Deploy target: Vercel
- Follow the Vercel design guidelines and Astro Docs MCP server conventions already loaded in this project

## Site purpose
NameJoiner.com is a hub of free name-combining tools (couple name combiner, baby name combiner,
business name generator, username generator, nickname generator, etc.) built to rank organically
on Google and monetize via ads + affiliate links. Every page must be built to win search traffic,
not just look good.

## Non-negotiable SEO rules
1. Every page needs a unique, keyword-targeted <title> (50-60 chars) and meta description (140-160 chars).
2. Every page has exactly one H1 containing the primary keyword.
3. Use semantic heading hierarchy (H1 > H2 > H3), never skip levels, never use headings for styling only.
4. No thin content. Every page must have at least 800-1200 words of genuinely useful, non-repetitive
   body content spread across distinct sections that each answer a different user question or use case.
   Never pad word count by rephrasing the same point multiple times.
5. Add JSON-LD structured data: FAQPage schema on every page with an FAQ section, SoftwareApplication
   or WebApplication schema on tool pages.
6. Add Open Graph + Twitter Card meta tags on every page (title, description, image, url).
7. Every image needs descriptive, keyword-relevant alt text (never "image1.png" or empty alt on
   meaningful images).
8. Internal linking: every tool page must link to at least 2-3 other relevant tool pages on the site
   with descriptive anchor text (not "click here").
9. Canonical URLs on every page.
10. Flat URL structure: /tool-name, never /tools/category/tool-name.
11. Core Web Vitals matter: lazy-load below-the-fold images, avoid layout shift, keep JS minimal —
    prefer Astro islands (client:visible / client:idle) over client:load for interactive widgets.
12. Mobile-first responsive design. Test every component at 375px width minimum.

## Design system rules
- Each tool page has its own accent color theme (defined below) layered on a shared base layout,
  shared header/footer, and shared typography — so the site feels cohesive but each tool feels
  purpose-built rather than templated.
- Base neutral palette (shared across all pages): warm off-white background (#FFFBF9), dark text (#2C2420),
  secondary text (#6B5D56).
- Tool accent themes (Tailwind config keys — extend as new tools launch):
  - couple: hot pink/berry — bg #FFF5F9, primary #FF006E, primary-dark #B8004A, secondary #FF85B3,
    secondary-dark #A3244F, pill-a #FFE4EF, pill-b #FFD0E4. Raw primary is only 3.8:1 on white, so text and
    selected fills use primary-dark (6.7:1), never the raw primary
  - baby: soft teal/amber — bg #F7FBF9, primary #1D9E75, primary-dark #0F6E56, secondary #EF9F27,
    secondary-dark #854F0B
  - business: blue/gray — bg #F7F9FB, primary #378ADD, primary-dark #185FA5, secondary #5F5E5A
  - gamertag: purple/teal — bg #F9F7FE, primary #7F77DD, primary-dark #534AB7, secondary #1D9E75,
    secondary-dark #0F6E56
  - username: pink/blue — bg #FDF7FA, primary #D4537E, primary-dark #72243E, secondary #378ADD,
    secondary-dark #185FA5
  - nickname: lime/honey — bg #FAFBF0, primary #7C9A2D, primary-dark #4B5F14, secondary #E0A030,
    secondary-dark #7A4E0A
- No generic gradients or stock "dating site" pink. Warm, confident, editorial feel — think a
  well-designed indie SaaS product, not a clip-art greeting card.
- Rounded corners (12-16px on cards), generous whitespace, no heavy drop shadows.
- Use an icon set consistently across the site (e.g. Tabler icons or Lucide) — pick one and stick
  to outline style throughout, never mix icon styles.
- Result "pills" (generated name output) should alternate between two tint shades of the tool's
  accent color for visual rhythm, not a flat single-color list.

## Content rules
- Never write filler FAQ answers that just rephrase the question. Each FAQ answer must add a fact,
  example, or actionable detail not already stated elsewhere on the page.
- Long-tail keyword variants (see per-page briefs) should each map to a genuinely distinct content
  section — different use case, different example, different angle — never the same paragraph
  reworded with a different keyword swapped in.
- Write in an active, warm, human tone. No corporate filler words (leverage, seamless, unlock, empower).

## Accessibility
- All interactive elements keyboard-navigable.
- Sufficient color contrast (WCAG AA minimum) — verify accent colors against text colors before shipping.
- Form inputs have associated <label> elements (visually hidden if needed, never missing).