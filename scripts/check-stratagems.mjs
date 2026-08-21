#!/usr/bin/env node
/* Validates _data/stratagems.js before it reaches a template. Catches a
 * malformed or contradictory entry (missing field, bad status, markup
 * leaking into plain text, an id collision, a faction that doesn't exist)
 * at build time instead of as a broken or silently wrong render. */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stratagems = (await import(join(root, "_data/stratagems.js"))).default;
const factions = (await import(join(root, "_data/factions.js"))).default;

const factionSlugs = new Set(factions.map((f) => f.slug));
const requiredFields = [
  "id",
  "factionSlug",
  "group",
  "name",
  "cp",
  "cpStatus",
  "timing",
  "summary",
  "order",
];
const plainTextFields = ["name", "timing", "summary"];
const cpStatuses = new Set(["confirmed", "unverified"]);

const errors = [];
const err = (entry, message) =>
  errors.push(`  ${entry?.id ?? "(no id)"}: ${message}`);

const seenIds = new Set();

for (const entry of stratagems) {
  for (const field of requiredFields) {
    if (entry[field] === undefined) err(entry, `missing required field "${field}"`);
  }

  if (entry.id) {
    if (seenIds.has(entry.id)) err(entry, "duplicate id");
    seenIds.add(entry.id);
  }

  if (entry.factionSlug && !factionSlugs.has(entry.factionSlug)) {
    err(entry, `factionSlug "${entry.factionSlug}" is not in _data/factions.js`);
  }

  if (entry.cpStatus !== undefined && !cpStatuses.has(entry.cpStatus)) {
    err(entry, `cpStatus must be one of ${[...cpStatuses].join(", ")}, got "${entry.cpStatus}"`);
  }

  if (entry.cpStatus === "confirmed") {
    if (!Number.isInteger(entry.cp) || entry.cp < 1 || entry.cp > 3) {
      err(entry, `cp must be an integer between 1 and 3 when confirmed, got ${JSON.stringify(entry.cp)}`);
    }
  } else if (entry.cpStatus === "unverified") {
    if (entry.cp !== null) {
      err(entry, `cp must be null when cpStatus is "unverified", got ${JSON.stringify(entry.cp)}`);
    }
  }

  if (entry.order !== undefined && (!Number.isInteger(entry.order) || entry.order < 1)) {
    err(entry, `order must be a positive integer, got ${JSON.stringify(entry.order)}`);
  }

  for (const field of plainTextFields) {
    const value = entry[field];
    if (typeof value === "string" && /[<>]/.test(value)) {
      err(entry, `${field} contains markup ("<" or ">"), must be plain text`);
    }
  }
}

if (errors.length) {
  console.error("\n  Stratagems check failed against _data/stratagems.js.\n");
  console.error(errors.join("\n"));
  console.error("");
  process.exit(1);
}

console.log(`Stratagems check passed — ${stratagems.length} entries validated.`);
