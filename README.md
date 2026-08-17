# Bench & Table

A plain-language Warhammer 40,000 (11th edition) and miniature painting reference
for our group. Built with Eleventy (11ty): plain HTML/Nunjucks templates and a
shared layout, compiled to static HTML/CSS/JS.

Live at `40k.middleearth.rocks` and `40k.droptablestar.workers.dev`.

## Structure

```
index.html                 Landing page, grouped by when you'd reach for a page
painting.html               Painting guide: beginner track
painting-reference.html     Painting guide: technique reference
tracker.html                 Battle tracker: CP, VP, round, per-unit damage
_includes/base.njk          Shared layout: head, nav, footer
assets/style.css             Shared design tokens and components
assets/css/{page}.css        Per-page CSS
assets/js/tracker.js         Tracker's vanilla JS
```

Each `.html` file at the root is front matter + body content only. See
CLAUDE.md for the full front matter field reference and design system.

## Build

Node and npm versions are pinned in `.nvmrc` and `package.json`.

```bash
npm install
npm run build                # clean _site/, layout check, build, HTML/link/route check
npm run test:unit             # unit and regression tests
npx @11ty/eleventy --serve  # local dev server with live reload
```

CI (`.github/workflows/ci.yml`) runs the same build and test steps on every
push and pull request.

## Browser tests

Playwright tests verify layout, interactivity, and state across device types
and browsers. Run them with `npm run test:ui` — they test mobile/desktop
viewports, touch/mouse input, and Firefox/webkit compatibility. See CLAUDE.md
for detailed test coverage and per-project options.

## Tracker

Vanilla JS (`assets/js/tracker.js`, plus the pure state helpers in
`assets/js/tracker-state.js`), state in `localStorage` under
`benchtable:battle:v1` (v1 contract below).

State shape:

```js
{ round: 1, active: 0,
  armies: [ { name, cp, vp }, ... ] }
```

Command points, victory points, battle round, whose turn it is — that's it.
Per-unit damage tracking was tried and removed (models-vs-wounds was more
confusing than useful); track that on the table instead.

### v1 storage contract

Anything read back from `localStorage` is passed through `normalize()`
before use, which recovers or resets malformed data instead of throwing:

- Missing or non-numeric `round` -> falls back to `1`.
- `round` outside 1-5 or fractional -> rounded and clamped into 1-5.
- Numeric strings (`"3"`, `"12"`) are treated as malformed, not coerced —
  they fall back the same as any other invalid value.
- Negative `cp`/`vp` -> `0`.
- An invalid `armies` container (wrong shape, wrong length, non-object
  entries) resets the whole game to a blank two-army state rather than
  throwing.
- Unknown top-level or per-army properties are preserved untouched, so a
  future version can add fields without this version discarding them.

`tests/fixtures/tracker-v1.json` is the source of truth for these cases —
each entry pairs a malformed input with its exact expected recovered state.

### Offline contract

A storage probe runs at startup (`benchtable:probe:v1`). If storage is
unavailable (private mode, blocked cookies) the tracker falls back to
in-memory state for the rest of the page session and shows a "Session only"
banner — the game still works, it just resets on reload. If a write throws
*after* startup (quota exceeded, storage revoked mid-session), the tracker
keeps the latest state in memory, stops touching `localStorage` for the rest
of the page session, and shows the same banner.

**It is per-device.** Two phones do not sync. Either one person tracks the whole
game, or each player tracks their own army and you compare VP at the end.

Each page sets a section class on `<body>` (the `bodyClass` front matter field)
which swaps the accent colour:

- `s-painting` — violet
- `s-rules` — brass

Add a new page by copying `painting.html`'s front matter block, changing
`bodyClass`/`permalink`/`title`, and writing the body content — the header,
nav, and footer come from `_includes/base.njk` automatically.

## Deploy

Cloudflare Workers Builds, connected to this GitHub repo. Push to `main`
triggers a build. See CLAUDE.md's Deploying section for the exact Build
command and gotchas.

## Content rules

- Do not reproduce GW rules text. Summarise in our own words and link to the
  free official PDF.
- Anywhere the site and the official rules disagree, the official rules win.
- 11th edition changed detachments, stratagems, cover, and objective scoring.
  Any 10th edition guide you find online is wrong about scoring — check the
  date before copying anything in.
- Errata land roughly every couple of months. Fix pages in the repo rather than
  arguing at the table.
