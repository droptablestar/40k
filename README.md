# Bench & Table

A plain-language Warhammer 40,000 (11th edition) and miniature painting reference
for our group. Static HTML, no build step, no dependencies.

## Structure

```
index.html        Landing page, grouped by when you'd reach for a page
painting.html     Painting guide: beginner track + technique reference
tracker.html      Battle tracker: CP, VP, round, per-unit damage
assets/style.css  Shared design tokens and components
CNAME             Custom domain for GitHub Pages
```

## Tracker

Vanilla JS, no framework, state in `localStorage` under `benchtable:battle:v1`.
If storage is unavailable (private mode, blocked cookies) it falls back to
in-memory state and shows a banner — the game still works, it just resets on
reload.

State shape:

```js
{ round: 1, active: 0,
  armies: [ { name, cp, vp, units: [ { name, max, cur, kind } ] }, ... ] }
```

`kind` is `"models"` or `"wounds"` — squads track models remaining, vehicles
and monsters track wounds.

**It is per-device.** Two phones do not sync. Either one person tracks the whole
game, or each player tracks their own army and you compare VP at the end. Real
sync needs a backend, which would end the "static site" property.

Each page sets a section class on `<body>` which swaps the accent colour:

- `s-painting` — violet
- `s-rules` — brass

Add a new section by copying `painting.html`, changing the body class, and adding
the link to the two `.sitenav` blocks.

## Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Initial reference site"
git branch -M main
git remote add origin git@github.com:<user>/wh40k-ref.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch →
`main` / `(root)`**.

For the custom domain, add a `CNAME` file containing only the hostname:

```bash
echo 'wh40k.example.com' > CNAME
git add CNAME && git commit -m "Add custom domain" && git push
```

DNS record — CNAME `wh40k` pointing at `<user>.github.io.`

Then set the same hostname under Settings → Pages → Custom domain, and tick
**Enforce HTTPS** once the cert provisions (usually under an hour).

## Alternative: self-host behind nginx-proxy-manager

Only worth it if you want this LAN-only.

```bash
docker run -d --name wh40k-ref --restart unless-stopped \
  -v /path/to/wh40k-ref:/usr/share/nginx/html:ro \
  -p 8090:80 \
  nginx:alpine
```

Then add a Proxy Host in NPM pointing at `<server-ip>:8090`, request a Let's
Encrypt cert, and point DNS at the server.

## Content rules

- Do not reproduce GW rules text. Summarise in our own words and link to the
  free official PDF.
- Anywhere the site and the official rules disagree, the official rules win.
- 11th edition changed detachments, stratagems, cover, and objective scoring.
  Any 10th edition guide you find online is wrong about scoring — check the
  date before copying anything in.
- Errata land roughly every couple of months. Fix pages in the repo rather than
  arguing at the table.
