# NameJoiner

A hub of free name-combining and name-generating tools, built to rank on Google and monetise later through ads and affiliate links. Site: `https://namejoiner.com`. Deploy target: Vercel.

> **Read `AGENTS.md` first.** `CLAUDE.md` is a symlink to it. It holds the non-negotiable SEO rules, the content rules and the per-tool colour-theme table. This README describes the *current state*; `AGENTS.md` describes the *rules*.

## Status

All six tool pages, the homepage, a 404 and four placeholder legal pages are built and the site builds cleanly (`npm run build`). **Nothing has been committed since the initial commit** (about 50 changed or untracked paths), and the site has not been deployed.

| Route | Page | Theme (`data-theme`) | Primary keyword (assumed, see below) |
|---|---|---|---|
| `/` | Homepage: hero and tool grid | default (neutral teal, from the logo) | brand / hub |
| `/couple-name-combiner` | Couple Name Combiner | `couple` hot pink/berry | couple name combiner |
| `/baby-name-combiner` | Baby Name Combiner | `baby` teal/amber | baby name combiner / generator using parents' names |
| `/business-name-generator` | Business Name Generator | `business` blue/gray | business name generator (from keywords) |
| `/username-generator` | Username Generator | `username` pink/blue | cute username generator |
| `/gamertag-generator` | Gamertag Generator | `gamertag` purple/teal | gamertag generator |
| `/nickname-generator` | Nickname Generator | `nickname` lime/honey | nickname generator |
| `/about`, `/contact`, `/privacy-policy`, `/terms-of-service` | **Placeholders**, `noindex`, excluded from sitemap | default | none |

Keyword targets came from the owner's Ahrefs briefs where they were given. Where none was given (Gamertag, parts of Username), I inferred them. Confirm before relying on them.

## Stack and commands

Astro 7 (static output), Tailwind CSS v4 (CSS-first, no `tailwind.config`), Preact islands (`client:visible`), Lucide icons (`@lucide/astro` in `.astro`, `lucide-preact` in `.tsx`), `@astrojs/sitemap`.

```sh
astro dev --background   # project convention (see AGENTS.md); stop with `astro dev stop`
npm run build            # static build to dist/
npm run preview
```

- `astro.config.mjs`: `site`, `trailingSlash: 'never'`, `build.format: 'file'`, Preact, sitemap (filters out 404 and the placeholder pages), Tailwind via the Vite plugin.
- `vercel.json`: `cleanUrls: true`, `trailingSlash: false`, so `/x` and `/x.html` cannot both exist.
- `public/robots.txt` points at `sitemap-index.xml`. `public/og-default.png` is a simple generated placeholder.
- `.env.example`: optional `PUBLIC_REGISTRAR_AFFILIATE_TEMPLATE` (see Open items).

## Architecture

Every tool page follows one pattern: an `.astro` page (SEO copy, FAQ data, JSON-LD) that mounts one Preact island containing the interactive tool. Names are generated client-side by **pure functions in `src/lib/`**, with no backend and no AI. That is a deliberate positioning: results are rule-based, deterministic (same input, same output, except the "Random" styles), and the copy says so honestly.

### Engines (`src/lib/`)

| File | Role |
|---|---|
| `combine.ts` | **Core two-name blending engine.** Six techniques (portmanteau, reverse, syllable mix, letter pooling, shared-sound overlap, compound), `syllabify`, `pronounceability` (cluster-aware scoring), `generatePool`, `pickResults`. Used by Couple, Baby, Business and the Username interest mode. Optional `laneCap`, `keep` and `nudges` hooks are additive: defaults reproduce the original output exactly. |
| `couple.ts` | **Vibe layer** (Romantic, Cute, Wedding, Ship Name, Unique) that re-ranks `combine.ts` output. It never changes engine scoring. |
| `baby.ts` | Baby names on top of `combine.ts`: middle-name mode (a parent's name stays whole), sibling-style matching, sound-preference filter. |
| `business.ts` | Brandable blends plus brand prefix/suffix compounds (Get, Try, Go, Labs, Hub, HQ...), hyphens dropped. |
| `registrar.ts` | Namecheap search links; optional affiliate wrapping via env var. |
| `handles.ts`, `wordlists.ts` | **Shared prefix/suffix/pair/twist handle engine.** Word lists are pure data (`SOCIAL_STYLES`, `GAMING_STYLES`). `evaluateHandle` is the shared acceptance check. |
| `platforms.ts` | Platform rules and profile-URL builders for the gaming platforms and the social platforms (limits, allowed characters, "fits" labels). |
| `interest.ts` | Username two-word mode: blends the base word with an interest word through `combine.ts` and the Couple vibe layer. |
| `stylize.ts` | Fancy Text: small caps, bold script, full-width, plus text-presentation symbols. Reversible, so tests can prove the plain name is recoverable. |
| `nicknames.ts`, `nickname-safety.ts` | **Separate engine** (one name in, variants out): stems, styles, audiences (Who's it for), Format (word or phrase), optional trait. `kidSafe()` is a word-list content filter. |
| `clipboard.ts` | Copy helper with a fallback. |

### Shared UI (`src/components/`)

- **Tools** (islands): `CombinerTool` (Couple), `BabyCombinerTool`, `BusinessNameTool`, `NicknameTool`, and `UsernameTool` / `GamertagTool`, which are thin wrappers around the shared `HandleTool` (props supply lists, platforms, optional interest field and Fancy Text).
- `ResultPills`: alternating tinted pills, copy button (or Plain and Fancy copy buttons), optional outbound link.
- `OptionPill.tsx` (`RadioPill`, `TogglePill`, `ButtonLabel`) + `pillStyles.ts`: **every selector and primary button on the site renders through these.** The `icon` prop is required, so no option can ship without one. Pill icons are 16px, button icons 18px, 1.75 stroke.
- `FormSection`: bordered group in a form. No numbered step badges, by decision.
- Layout: `BaseLayout.astro` (meta, canonical, OG/Twitter, JSON-LD, theme on `<body>`), `Header.astro`, `Footer.astro`, `Wordmark.astro`, `ToolMenuRows.astro`, `ToolThemeWrapper.astro`, `ToolCard/ToolGrid/ToolIcon.astro`.
- `src/data/tools.ts` is the **single source of truth for tools** (slug, name, short label, description, theme, icon, `built`, `primaryNavSlugs`). Header, footer, homepage and every "related tools" list are built from it.

### Design system

- `src/styles/themes.css`: one `[data-theme]` block per tool with CSS variables (`--accent`, `--accent-dark`, `--accent-bg`, `--accent-2`, `--accent-2-dark`, `--pill-a/b`, `--accent-mid`, `--accent-glow`). Tailwind reads them as `bg-accent`, `text-accent-dark`, `bg-pill-a` and so on through `@theme inline` in `global.css`. **Components never name a specific tool's colour.**
- `src/styles/global.css`: neutrals, the fixed brand token (`--color-brand: #000`, the "Joiner" half of the logo, deliberately not themed), `.btn-primary` (gradient from `--accent-mid` to `--accent-dark`), input focus glow, the site-wide motion setting (200ms ease-out; `--default-transition-*`), and the header dropdown and mobile menu open/close animation (`data-open`). `prefers-reduced-motion` makes everything instant.
- Text on accents must use `--accent-dark` for AA contrast; the raw primary fails against white at small sizes. Selected pills and buttons use primary-dark for that reason.

### Header and navigation

Logo, then three direct links (Couple, Gamertag, Username; short labels below 1024px), then a "More Tools" dropdown (Baby, Business, Nickname). The mobile hamburger lists all six in two labelled groups. Which tools are direct is `primaryNavSlugs` in `tools.ts`; any other tool lands in the dropdown automatically. The current page is highlighted (direct link, or the trigger plus its row in the dropdown). Logic is in `src/scripts/header-nav.ts` (hover, click, Escape, tab-out).

## Content, SEO and honesty conventions

- Every page: unique title (50-60 chars, primary keyword near the front), unique description (140-160), one H1, canonical, OG/Twitter, WebApplication + FAQPage JSON-LD (FAQ data is defined once and feeds both the visible FAQ and the schema), 800+ words of non-repetitive copy. Per-page H1, `<title>`, "how it works" heading, related-tools heading and FAQ wording were **deliberately diversified** to avoid a templated look. Keep them different when editing.
- **Never claim AI.** The copy states the tools are rule-based. "AI" appears only in honest negations (intro, how-it-works, one FAQ), never as a feature.
- Related-tools blocks and inline cross-links are **gated on `built` in `tools.ts`** so nothing links to a page that does not exist.
- Where limits or specs come from memory and are not live-checked, the UI and copy say so ("as we understand them, not checked live").
- **Safety:** Nickname's Kid audience runs `kidSafe()` on every result (sexual and anatomy innuendo, profanity, slurs, bullying words; **drug and violence terms are deliberately out of scope**), over-blocks on purpose, and the UI tells people to read each nickname first. The free-text trait field rejects unkind or rude words for every audience. Handle engines use a small blocklist.

## Open items and unverified assumptions

1. **Platform specs are from memory, not verified.** In `platforms.ts`: Xbox (12 chars, no underscore, must start with a letter), PlayStation 3-16, Steam 32, Minecraft Java 3-16, Roblox 3-20 with one underscore; Instagram 30, TikTok 24, Snapchat 3-15, X 4-15 with no dots. Profile URL patterns for the "Check if taken" links (`instagram.com/<n>/`, `tiktok.com/@<n>`, `snapchat.com/add/<n>`, `x.com/<n>`) are also unchecked. The owner said they would verify these before launch.
2. **Not monetised yet.** The Business "Check .com" links go to a plain Namecheap search. Set `PUBLIC_REGISTRAR_AFFILIATE_TEMPLATE` (use `{url}` where the destination goes) and the links become `rel="sponsored"` with a disclosure line automatically.
3. **Placeholder pages** (`about`, `contact`, `privacy-policy`, `terms-of-service`) need real content before launch and are `noindex` until then.
4. **No real-browser visual QA.** The headless browser in the dev environment could not launch (missing system libraries), so layout, spacing, focus and hover were verified by simulation only. Do a visual pass at 375px, 768px, 1024px and wide desktop, especially the header dropdown at 768px and 1024px.
5. After deploying, add the domain in Google Search Console and submit `sitemap-index.xml`.
6. Known quality limits, by design: near-identical or very short name pairs give short lists (the tools show a "kept only the cleanest options" note instead of padding); Classic nicknames are thin for short names; a few weak shortened forms remain (for example Rine, Zabeth).

## Testing

There is **no test suite in the repo**. All verification during development used throwaway scripts in temporary directories, and a new session will not have them. The approach, if you want to recreate it (worth committing under `tests/`):

- **UI tests:** bundle a tool with `esbuild --bundle --format=iife --jsx=automatic --jsx-import-source=preact` (add `--define:import.meta.env='{}'` for the Business tool), mount it in `jsdom` with `runScripts: 'outside-only'`, stub `matchMedia` and `navigator.clipboard`, then drive inputs, radios and clicks.
- **Engine tests:** run the `src/lib` files under Node with import specifiers rewritten to `.ts`.
- **Regression baselines:** snapshot outputs for a fixed list of names before touching shared engines, and require byte-identical output afterwards. This is how every additive change to `combine.ts`, `handles.ts` and `nicknames.ts` was proven safe.
- **Checks that caught real bugs:** an independent weak-pattern detector and an independent adult-word lexicon (not the filters' own lists); a group-by-group icon audit; a static audit of all built pages (titles, descriptions, canonicals, JSON-LD, links, sitemap).

## Gotchas learned the hard way

- **Tailwind v4 layers:** unlayered CSS beats every utility. The input focus rule is unlayered on purpose. Utilities beat `@layer base` and `components`.
- `white-space` is inherited. A `whitespace-nowrap` on the nav `<ul>` silently stopped the dropdown descriptions from wrapping. Put `nowrap` on the elements that need it, not on containers.
- A CSS grid with no column template sizes to its widest item's content. The dropdown list needs `grid-cols-1` or long text overflows.
- The build emits `color-mix()` with a plain fallback first. Derived colours that must render everywhere (`--accent-mid`, `--accent-glow`) are precomputed literals in `themes.css`.
- With `build.format: 'file'`, `Astro.url.pathname` ends in `.html`. The header strips it for active-page matching.
- Island props must be serialisable, so wrapper islands import their functions and lists themselves (`UsernameTool` and `GamertagTool` do this).
- In jsdom tests, a radio whose value is `"on"` has no `value` attribute (it is the default), so select those by position.

## Adding a tool

1. Add its entry to `src/data/tools.ts` (`built: false` until the page exists) and, if it needs one, a theme block in `themes.css` plus a row in the theme table in `AGENTS.md`.
2. Put pure logic in `src/lib/`; reuse `combine.ts` or `handles.ts` rather than forking them. Do not change existing default behaviour, and add a baseline check.
3. Build the island from `OptionPill` / `FormSection` / `ResultPills`. Every option needs an icon.
4. Write the `.astro` page: per-page H1, title, how-it-works and related headings that differ from the other pages; FAQ array feeding both markup and JSON-LD; internal links to at least two other built tools.
5. Flip `built: true`. The nav dropdown, homepage grid, footer, sitemap and gated links pick it up automatically.
