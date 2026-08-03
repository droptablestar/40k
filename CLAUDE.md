# CLAUDE.md

Context for Claude Code working in this repo.

## What this is

A Warhammer 40,000 (11th edition) and miniature-painting reference site for a
small group of friends who started playing in 2026. Static HTML and CSS, no
build step, no framework, no dependencies.

Audience is beginners. Write for someone who has never played and never painted.
No meta discussion, no assumed vocabulary, no jargon without a definition.

Live at `40k.middleearth.rocks` and `40k.droptablestar.workers.dev`.

## Layout

```
index.html        Landing page
painting.html     Painting guide: beginner track, then technique reference
tracker.html      Battle tracker: CP, VP, round, per-unit damage
assets/style.css  Shared design tokens and components
wrangler.jsonc    Cloudflare Worker config
.assetsignore     Files excluded from the public asset upload
```

Page-specific CSS goes in a `<style>` block in that page. Anything reused goes
in `assets/style.css`. There is no bundler — keep it that way unless there's a
real reason.

## Deploying

Cloudflare Worker with static assets, connected to this GitHub repo. Push to
`main` triggers a build. `npx wrangler deploy` deploys from local.

Verify a deploy actually served the file, not just that the build went green:

```bash
curl -sI "https://40k.droptablestar.workers.dev/assets/style.css?v=$(date +%s)" | head -3
```

The cache-busting query string matters. Cloudflare will serve a cached 404 for a
while after a missing file starts existing.

### Gotchas already hit

- `.assetsignore` uses gitignore syntax and silently drops matching files from
  the upload. A bare `assets` line will exclude the entire stylesheet directory
  and the site will render as unstyled HTML. Check this file first when styling
  disappears.
- `assets/` is plural everywhere. A rename to `asset/` breaks every page.
- If a file isn't in `git ls-files`, it was never committed and Cloudflare never
  saw it. Check this before debugging the deploy.
- Config lives partly in the Cloudflare dashboard. If a setting seems to come
  from nowhere, look there before assuming it's in the repo.

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

Responsive to 360px. Visible keyboard focus. `prefers-reduced-motion` respected.
Print styles on reference pages. Touch targets at least 34px, since these pages
get used on a phone at a table.

## Tracker

Vanilla JS in `tracker.html`. State in `localStorage` under
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
