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
roster.html                  Paint log: armies, units, painting stage, percent table-ready
_includes/base.njk          Shared layout: head, nav, footer
assets/style.css             Shared design tokens and components
assets/css/{page}.css        Per-page CSS
assets/js/tracker.js         Tracker's vanilla JS
worker/paint-log-api.mjs     Worker behind /api/*, for the paint log's stored copy
migrations/                  D1 schema for the paint log
```

Each `.html` file at the root is front matter + body content only. See
CLAUDE.md for the full front matter field reference and design system.

## Build

```bash
npm install
npx @11ty/eleventy          # one-off build → _site/
npx @11ty/eleventy --serve  # local dev server with live reload
```

## Tracker

Vanilla JS (`assets/js/tracker.js`), state in `localStorage` under
`benchtable:battle:v1`. If storage is unavailable (private mode, blocked
cookies) it falls back to in-memory state and shows a banner — the game still
works, it just resets on reload.

State shape:

```js
{ round: 1, active: 0,
  armies: [ { name, cp, vp }, ... ] }
```

Command points, victory points, battle round, whose turn it is — that's it.
Per-unit damage tracking was tried and removed (models-vs-wounds was more
confusing than useful); track that on the table instead.

**It is per-device.** Two phones do not sync. Either one person tracks the whole
game, or each player tracks their own army and you compare VP at the end.

## Paint log

Armies, the units in them, and how far each one is through painting. Unlike the
tracker this is **not** per-device: each log has a four-word code, the log is
stored in Cloudflare D1 under that code, and typing the code on any device
opens the same log. The browser copy is the offline fallback, so it keeps
working at a shop with no signal and catches up afterwards.

The database is not created yet — the `d1_databases` block in `wrangler.jsonc`
is commented out, and until it is filled in the log stays on the device and the
page says so. See CLAUDE.md's Paint log section for the two commands.

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
