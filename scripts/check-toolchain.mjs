#!/usr/bin/env node
/* Fails the build early if Node or npm don't match the repo's pinned
 * versions, instead of letting a version mismatch surface as a confusing
 * failure somewhere downstream. */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const expectedNode = pkg.engines.node;
const observedNode = process.version.replace(/^v/, "");

const expectedNpm = pkg.packageManager.split("@")[1];
const npmExecPath = process.env.npm_execpath;
const observedNpm = npmExecPath
  ? execFileSync(process.execPath, [npmExecPath, "--version"], { encoding: "utf8" }).trim()
  : execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();

const failures = [];
if (observedNode !== expectedNode) {
  failures.push(`Node: expected ${expectedNode}, observed ${observedNode}`);
}
if (observedNpm !== expectedNpm) {
  failures.push(`npm: expected ${expectedNpm}, observed ${observedNpm}`);
}

if (failures.length) {
  console.error("\n  Toolchain check failed.\n");
  for (const f of failures) console.error(`  ${f}`);
  console.error(`\n  This repo pins Node ${expectedNode} and npm ${expectedNpm} (see .nvmrc).\n`);
  process.exit(1);
}

console.log(`Toolchain check passed — Node ${observedNode}, npm ${observedNpm}.`);
