#!/usr/bin/env node
/* Layout guard.
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
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS_DIR = join(root, "assets");
const failures = [];

function check(file) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (!/max-width/.test(line)) return;
    if (/@media/.test(line)) return;
    if (/max-width\s*:\s*(none|100%)/.test(line)) return;
    if (/max-width-ok/.test(line)) return;
    failures.push({ file, line: i + 1, text: line.trim() });
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
  console.error("\n  Layout check failed — max-width on content.\n");
  for (const f of failures) {
    console.error(`  ${f.file}:${f.line}`);
    console.error(`    ${f.text}`);
  }
  console.error(
    "\n  Text spans the full width of .wrap. Remove the cap, or if this one is\n" +
    "  genuinely correct, append a comment containing `max-width-ok` and say why.\n"
  );
  process.exit(1);
}

console.log("Layout check passed — no content max-widths.");
