#!/usr/bin/env node
/* Layout and design-token guard.
 *
 * One recurring bug has broken this site's layout more than any other: a
 * max-width on text, capping headings and body copy to a measure so they
 * stop spanning the content column. .wrap is the only thing that should
 * decide how wide anything gets.
 *
 * This fails on any max-width in a stylesheet that isn't either
 *   - a media query (`@media (max-width:820px)`), or
 *   - `none` / `100%`, or
 *   - marked with a trailing `max-width-ok` comment explaining why.
 *
 * Add the marker when a cap is genuinely right (a tooltip panel, an image),
 * with a reason. Don't add it to make an error go away.
 *
 * It also fails on any new font-size or hex-colour literal, for the same
 * reason: `--fs-*` tokens and the :root colour tokens are the one source of
 * truth (CLAUDE.md's design system section). A literal is fine only when it
 * is marked `fs-ok`/`color-ok` with a reason (no token fits, or it's a
 * decorative gradient/mask stop rather than a themeable surface colour) --
 * `:root` and print (`@media print`) blocks are exempt, since that's where
 * the tokens themselves and deliberate print overrides live.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS_DIR = join(root, "assets");
const failures = [];

function check(file) {
  const isSharedStylesheet = file.endsWith(`${join("assets", "style.css")}`);
  let inRootOrPrint = 0;
  const lines = readFileSync(file, "utf8").split("\n");

  // A marker on the line itself or the line directly above covers both a
  // trailing comment and a one-line lead-in explaining a whole block.
  const markedNearby = (marker, i) =>
    marker.test(lines[i]) || (i > 0 && marker.test(lines[i - 1]));

  lines.forEach((line, i) => {
    if (/:root\s*{|@media print/.test(line)) inRootOrPrint++;
    else if (inRootOrPrint > 0) {
      inRootOrPrint += (line.match(/{/g) || []).length;
      inRootOrPrint -= (line.match(/}/g) || []).length;
    }

    if (/max-width/.test(line) && !/@media/.test(line) &&
        !/max-width\s*:\s*(none|100%)/.test(line) && !markedNearby(/max-width-ok/, i)) {
      failures.push({ file, line: i + 1, text: line.trim(), kind: "max-width" });
    }

    if (/font-size\s*:\s*[0-9]/.test(line) && !/var\(--fs-/.test(line) && !markedNearby(/fs-ok/, i)) {
      failures.push({ file, line: i + 1, text: line.trim(), kind: "font-size" });
    }

    if (!inRootOrPrint && /#[0-9a-fA-F]{3,8}\b/.test(line) && !markedNearby(/color-ok/, i) &&
        !isSharedStylesheet) {
      failures.push({ file, line: i + 1, text: line.trim(), kind: "color" });
    }
  });
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith(".css")) check(path);
  }
}

walk(ASSETS_DIR);

if (failures.length) {
  console.error("\n  Layout check failed.\n");
  for (const f of failures) {
    console.error(`  ${f.file}:${f.line} [${f.kind}]`);
    console.error(`    ${f.text}`);
  }
  console.error(
    "\n  max-width: text spans the full width of .wrap. Remove the cap, or if\n" +
    "  genuinely correct, append a comment containing `max-width-ok` and say why.\n" +
    "\n  font-size: use an existing --fs-* token. If none fits, append a comment\n" +
    "  containing `fs-ok` and say why.\n" +
    "\n  color: use an existing --token from style.css's :root. If this is a\n" +
    "  decorative gradient/mask stop, not a themeable surface colour, append a\n" +
    "  comment containing `color-ok` and say why.\n"
  );
  process.exit(1);
}

console.log("Layout check passed — no content max-widths, unmarked font-size or colour literals.");
