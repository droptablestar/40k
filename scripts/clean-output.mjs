#!/usr/bin/env node
/* Removes the build output directory before every build. Eleventy does not
 * clean _site/ itself, so a renamed or deleted page/asset silently keeps
 * serving from a stale file in production if this doesn't run first.
 *
 * Resolves the repo root from this script's own location, not the caller's
 * cwd, so it can't be pointed anywhere else by running from a different
 * directory. */

import { rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "_site");

if (basename(target) !== "_site" || dirname(target) !== root) {
  console.error(`Refusing to clean unexpected path: ${target}`);
  process.exit(1);
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
  console.log(`Removed ${target}`);
} else {
  console.log(`Nothing to remove at ${target}`);
}
