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
npx @11ty/eleventy          # one-off build, output in _site/
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
and anything numeric uses the mono face so figures align.

Structural devices should encode something true. Numbered lists are for real
sequences only — the painting order of operations is one, a list of tips is not.

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
  armies: [ { name, cp, vp, units: [ { name, max, cur, kind } ] }, ... ] }
```

`kind` is `"models"` or `"wounds"`. Squads track models remaining, vehicles and
monsters track wounds.

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
