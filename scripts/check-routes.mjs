#!/usr/bin/env node
/* Compares the built _site/ against tests/contracts/generated-routes.json.
 * Catches a page silently lost, an asset that stopped being copied, or
 * leftover output from a page that was removed or renamed — Eleventy does
 * not clean _site/ itself, so those go undetected otherwise. */

import { readFileSync, globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = join(root, "_site");
const contract = JSON.parse(
  readFileSync(join(root, "tests/contracts/generated-routes.json"), "utf8")
);

const expected = new Set([...contract.generatedPages, ...contract.passthroughAssets]);

const actual = new Set(
  globSync("**/*", { cwd: siteDir, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => "/" + join(d.parentPath ?? d.path, d.name).slice(siteDir.length + 1).split("\\").join("/"))
);

const missing = [...expected].filter((p) => !actual.has(p));
const unexpected = [...actual].filter((p) => !expected.has(p));
const wronglyPresent = contract.mustNotExist.filter((p) => actual.has(p));

if (missing.length || unexpected.length || wronglyPresent.length) {
  console.error("\n  Route check failed against tests/contracts/generated-routes.json.\n");
  if (missing.length) {
    console.error("  Missing (contracted but not built):");
    missing.forEach((p) => console.error(`    ${p}`));
  }
  if (unexpected.length) {
    console.error("  Unexpected (built but not contracted):");
    unexpected.forEach((p) => console.error(`    ${p}`));
  }
  if (wronglyPresent.length) {
    console.error("  Present but contracted as must-not-exist:");
    wronglyPresent.forEach((p) => console.error(`    ${p}`));
  }
  console.error(
    "\n  Update tests/contracts/generated-routes.json if this route change is\n" +
    "  intentional, or fix the build if it isn't.\n"
  );
  process.exit(1);
}

console.log(`Route check passed — ${expected.size} routes match the contract.`);
