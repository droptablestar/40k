# CLAUDE.md

Context for Claude Code working in this repo.

## What this is

A Warhammer 40,000 (11th edition) and miniature-painting reference site for a
small group of friends who started playing in 2026. Built with Eleventy
(11ty) — plain HTML/Nunjucks templates and a shared layout, compiled to
static HTML/CSS/JS. No client-side framework, no bundler beyond Eleventy
itself.

Audience is beginners. Write for someone who has never played and never painted.
No meta discussion, no assumed vocabulary, no jargon without a definition.

Live at `40k.middleearth.rocks` and `40k.droptablestar.workers.dev`.

## Layout

```
index.html                    Landing page (content + front matter, no <head>/nav/footer)
painting.html                 Painting guide: beginner track
painting-reference.html       Painting guide: technique reference
tracker.html                  Battle tracker: CP, VP, round, per-unit damage
_includes/base.njk            Shared layout: <head>, sitebar/nav, main/wrap, footer
assets/style.css               Shared design tokens and components (loaded on every page)
assets/css/{page}.css          Per-page CSS, one file per top-level page
assets/js/tracker.js           Tracker's vanilla JS logic
.eleventy.js                   Eleventy config (passthrough copy, template engine)
wrangler.jsonc                 Cloudflare Worker config (assets.directory: _site)
```

Each top-level `.html` file at the repo root is front matter + body content
only — no `<head>`, header, or footer. Those live once in `_includes/base.njk`.
Front matter fields a page can set:

```
layout: base.njk        always this
permalink: /foo.html     explicit, so output filenames never drift from routes
title / description      <title> and meta description
bodyClass                s-painting or s-rules (sets the section accent)
pageCss                  path under assets/, e.g. css/painting.css
pageJs                   path under assets/, e.g. js/tracker.js (optional)
extraFooter               raw HTML appended to the shared footer (optional)
themeColor                sets <meta name="theme-color"> (optional)
```

Page-specific CSS goes in `assets/css/{page}.css`, one file per page. Anything
reused across more than one page (e.g. the in-page jump nav) goes in
`assets/style.css` instead of being duplicated — duplicated per-page CSS
drifting out of sync was the direct cause of several bugs before this
structure existed.

## Building

```bash
npm install
npm run build               # layout check, then build into _site/
npm run check               # layout check on its own
npx @11ty/eleventy          # build without the check
npx @11ty/eleventy --serve  # local dev server with live reload
```

Nunjucks (`.njk`) is the template engine for both `_includes/base.njk` and the
`.html` content files (configured via `htmlTemplateEngine` in `.eleventy.js`).
`assets/` is passthrough-copied into `_site/assets/` unchanged.

## Deploying

Cloudflare Workers Builds, connected to this GitHub repo. Push to `main`
triggers a build using the **Build command** configured in the Cloudflare
dashboard (Workers & Pages → this worker → Settings → Build), which must be:

```
npm install && npx @11ty/eleventy
```

The **Deploy command** (`npx wrangler deploy`) then reads `wrangler.jsonc`'s
`assets.directory` (`_site`) and uploads the built output. `npx wrangler
deploy` also works from local for a one-off deploy, as long as `_site/` has
been built first.

Verify a deploy actually served the file, not just that the build went green:

```bash
curl -sI "https://40k.droptablestar.workers.dev/assets/style.css?v=$(date +%s)" | head -3
```

The cache-busting query string matters. Cloudflare will serve a cached 404 for a
while after a missing file starts existing.

### Gotchas already hit

- `assets/` is plural everywhere. A rename to `asset/` breaks every page.
- If a file isn't in `git ls-files`, it was never committed and Cloudflare never
  saw it. Check this before debugging the deploy.
- Config lives partly in the Cloudflare dashboard (the Build command above). If
  a setting seems to come from nowhere, look there before assuming it's in the
  repo.
- `wrangler.jsonc`'s `assets.directory` must point at `_site` (the build
  output), not `.` — pointing it at the repo root serves source templates
  instead of built HTML.
- `npx @11ty/eleventy` does not clean `_site/` before writing — deleted or
  renamed pages/assets stay in the output directory indefinitely. The build
  command has no clean step, so a removed page can keep serving in
  production. Run `rm -rf _site` before a build when a page/permalink was
  deleted or renamed, and verify locally that the old URL now 404s.

## Design system

All colour and type flows from `:root` in `assets/style.css`. Do not hardcode
colours in page-level CSS — add a token or use an existing one.

```
--ground / --ground-2 / --ground-3   surfaces, darkest to lightest
--bone / --bone-dim                  primary and secondary text
--accent / --accent-lo               section accent
--rust                               warnings and negative markers
--line                               all borders and rules
```

Section accent is set by a body class: `s-painting` is violet, `s-rules` is
gold. New sections either reuse one or add a class.

Typefaces: Bricolage Grotesque for display, IBM Plex Sans for body, IBM Plex
Mono for data, labels, and eyebrows. Loaded from Google Fonts. Ratios, counters,
and anything numeric uses the mono face so figures align — apply
`font-variant-numeric: tabular-nums` explicitly wherever digits sit in a
column or a stat line (weapon profiles, M/T/Sv/W/Ld/OC lines, tracker
counters), even in mono contexts, so it's correct by declaration and not
just by accident of the typeface.

Type scale: six sizes, defined as `--fs-micro` (9px) through `--fs-base`
(16px) in `assets/style.css`. Every `font-size` on the site should be one of
these — new sizes don't get invented ad hoc. Fluid `clamp()` is its own tier
for display headings (hero `h1`, `.section > h2`) and stays outside this
scale. `.mark`'s 12px is the one deliberate one-off (the brand mark sits a
half-step above `--fs-xs`); don't add others without a real reason.

```
--fs-micro:9px    decorative tags — "not written yet", pending marks
--fs-2xs:10px     small mono labels — table headers, stat-line meta
--fs-xs:11px      ui mono — eyebrow, nav, jump, crumb, footer
--fs-sm:13.5px    support/secondary body text
--fs-md:15px      component labels — card titles, list item names
--fs-base:16px    primary reading text
```

Interactive `.card` links get a folded top-right corner (`a.card::before`,
a CSS border-triangle) instead of a hover-only cue or a generic accent
rail down the side — the latter is a recognizable "AI-generated design"
tell (accent bar/rail on a rounded card) and this site is touch-first, so
affordances need to read without a hover state anyway. Static/pending
cards get neither.

Structural devices should encode something true. Numbered lists are for real
sequences only — the painting order of operations is one, a list of tips is not.

### Text spans the column

`.wrap` is the only thing that decides how wide anything gets. Headings and
body copy run its full width. **Never put a `max-width` on text** — no `60ch`
measure caps on a lede, no `14ch` on a heading. This has been introduced and
removed repeatedly and it is the single most common layout bug on this site.

`assets/style.css` declares `max-width:none` once for `.hero h1`, `.hero p`,
`.section > h2`, `.sub` and `.hero-lede`; per-page CSS should not re-declare
it. `npm run check` (which `npm run build` runs first) fails on any
`max-width` in a stylesheet that is not a media query, not `none`/`100%`, and
not marked with a trailing `max-width-ok` comment. Add that marker only for a
genuine non-text cap — a tooltip panel, an image — and say why in the comment.

Note that per-page CSS loads *after* `style.css`, so a page-level cap still
wins over the shared rule. The check, not the cascade, is what actually
prevents this.

### Quality floor

Mobile is the primary target, not a fallback — design and test for phone
first; desktop is secondary. Every new page/feature gets checked at 360px
width before being considered done (not just "responsive in theory" — actually
render it, e.g. with a Playwright screenshot and a `scrollWidth`/`clientWidth`
overflow check).

Touch targets, tap-ability, and one-handed/thumb reachability matter more than
desktop mouse-hover interactions — hover-only affordances are a trap here.
Painting means wet or paint-covered hands, and gaming means one-handed phone
use at a table, so favor large tap targets (34px minimum), minimal typing, and
glanceable layouts over dense information.

Visible keyboard focus. `prefers-reduced-motion` respected. Print styles on
reference pages.

## Tracker

Vanilla JS in `assets/js/tracker.js`, loaded by `tracker.html` via its
`pageJs` front matter field. State in `localStorage` under
`benchtable:battle:v1`, with an in-memory fallback and a visible banner when
storage is blocked.

```js
{ round: 1, active: 0,
  armies: [ { name, cp, vp }, ... ] }
```

Command points, victory points, battle round, and whose turn it is — that's
the whole surface. Per-unit damage tracking was tried and removed; the
models-vs-wounds distinction was more confusing than useful, so use a
physical damage tracker (dice, tokens) at the table instead.

Per-device. Two phones do not sync. If sync gets built, the plan is per-army
write ownership — each phone writes only its own army, reads the other — over
Cloudflare KV or D1, with polling rather than WebSockets. Keep localStorage as
the offline fallback; the site has to work at a shop with no signal.

## Content rules

- **Never reproduce GW rules text.** Summarise in our own words and link to the
  free official PDF. This site is public.
- Where this site and the official rules disagree, the official rules win. Say
  so on any page that summarises rules.
- 11th edition launched June 2026. It changed detachments, stratagems, cover,
  and objective scoring — objective markers were removed from missions entirely.
  **Most search results and video content are still 10th edition and are wrong
  about scoring.** Check the date on any source before using it.
- Do not encode scoring rules into the tracker. VP is a manual counter. Errata
  land regularly and baked-in rules go stale silently.
- Unbuilt pages appear on the landing page as dashed placeholders rather than
  being hidden, so the gaps are visible.

## Writing style

Plain verbs, sentence case, no filler. Say what a thing does rather than selling
it. Be specific over clever.

Symptom-first for anything diagnostic — people look up "chalky drybrush," not
"brush loading technique."

Give exact numbers where they exist (ratios, temperatures, prices) and flag them
as starting points where they vary.
