#!/usr/bin/env node
/* Validates _data/datasheets.js and _data/abilityTips.js before they reach
 * a template. Catches a missing stat, a malformed stat format, an unknown
 * ability reference, an id collision, or markup leaking into plain text at
 * build time instead of as a broken or silently wrong render. */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const datasheets = (await import(join(root, "_data/datasheets.js"))).default;
const abilityTips = (await import(join(root, "_data/abilityTips.js"))).default;
const factions = (await import(join(root, "_data/factions.js"))).default;

const factionSlugs = new Set(factions.map((f) => f.slug));
const requiredUnitFields = [
  "id",
  "factionSlug",
  "group",
  "name",
  "stats",
  "keywords",
  "weapons",
  "traits",
  "order",
];
const requiredStatFields = ["m", "t", "sv", "w", "ld", "oc"];
const requiredWeaponFields = ["id", "name", "tags", "range", "attacks", "skill", "strength", "ap", "damage"];
const plainTextFields = ["name"];
const hasMarkup = (s) => typeof s === "string" && /[<>]/.test(s);
const inchOrNumber = /^\d+(″)?$/;
const plusStat = /^\d\+$/;

const errors = [];
const err = (ctx, message) => errors.push(`  ${ctx}: ${message}`);

const abilityIds = new Set(abilityTips.map((a) => a.id));
const seenAbilityIds = new Set();
for (const a of abilityTips) {
  if (!a.id || !a.label || !a.body) err(a.id ?? "(no id)", "ability-tips entry missing id/label/body");
  if (seenAbilityIds.has(a.id)) err(a.id, "duplicate ability-tips id");
  seenAbilityIds.add(a.id);
  if (hasMarkup(a.label)) err(a.id, "ability-tips label contains markup");
  if (hasMarkup(a.body)) err(a.id, "ability-tips body contains markup");
}

const seenUnitIds = new Set();
const seenWeaponIds = new Set();

for (const unit of datasheets) {
  const uid = unit.id ?? "(no id)";

  for (const field of requiredUnitFields) {
    if (unit[field] === undefined) err(uid, `missing required field "${field}"`);
  }

  if (unit.id) {
    if (seenUnitIds.has(unit.id)) err(uid, "duplicate unit id");
    seenUnitIds.add(unit.id);
  }

  if (unit.factionSlug && !factionSlugs.has(unit.factionSlug)) {
    err(uid, `factionSlug "${unit.factionSlug}" is not in _data/factions.js`);
  }

  if (unit.order !== undefined && (!Number.isInteger(unit.order) || unit.order < 1)) {
    err(uid, `order must be a positive integer, got ${JSON.stringify(unit.order)}`);
  }

  for (const field of plainTextFields) {
    if (hasMarkup(unit[field])) err(uid, `${field} contains markup, must be plain text`);
  }

  if (unit.stats) {
    for (const field of requiredStatFields) {
      if (unit.stats[field] === undefined) err(uid, `stats missing "${field}"`);
    }
    if (unit.stats.m !== undefined && !inchOrNumber.test(unit.stats.m)) {
      err(uid, `stats.m "${unit.stats.m}" doesn't match N or N″`);
    }
    for (const field of ["t", "w", "oc"]) {
      if (unit.stats[field] !== undefined && !/^\d+$/.test(unit.stats[field])) {
        err(uid, `stats.${field} "${unit.stats[field]}" must be a plain integer string`);
      }
    }
    for (const field of ["sv", "ld"]) {
      if (unit.stats[field] !== undefined && !plusStat.test(unit.stats[field])) {
        err(uid, `stats.${field} "${unit.stats[field]}" doesn't match N+`);
      }
    }
  }

  for (const kw of unit.keywords ?? []) {
    if (kw.type === "ref") {
      if (!abilityIds.has(kw.ref)) err(uid, `keyword ref "${kw.ref}" is not in _data/abilityTips.js`);
    } else if (kw.type === "plain") {
      if (hasMarkup(kw.text)) err(uid, `keyword text "${kw.text}" contains markup`);
    } else {
      err(uid, `keyword has unknown type "${kw.type}"`);
    }
  }

  for (const w of unit.weapons ?? []) {
    const wid = `${uid}/${w.id ?? "(no id)"}`;
    for (const field of requiredWeaponFields) {
      if (w[field] === undefined) err(wid, `missing required field "${field}"`);
    }
    if (w.id) {
      if (seenWeaponIds.has(w.id)) err(wid, "duplicate weapon id");
      seenWeaponIds.add(w.id);
    }
    if (hasMarkup(w.name)) err(wid, "weapon name contains markup");
    for (const ref of w.tags ?? []) {
      if (!abilityIds.has(ref)) err(wid, `weapon tag ref "${ref}" is not in _data/abilityTips.js`);
    }
  }

  for (const t of unit.traits ?? []) {
    if (hasMarkup(t.name) || hasMarkup(t.body)) {
      err(uid, `trait "${t.name}" contains markup`);
    }
  }
}

if (errors.length) {
  console.error("\n  Datasheets check failed against _data/datasheets.js.\n");
  console.error(errors.join("\n"));
  console.error("");
  process.exit(1);
}

console.log(`Datasheets check passed — ${datasheets.length} units, ${abilityTips.length} ability tips validated.`);
