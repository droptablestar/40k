import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import nunjucks from "nunjucks";

const includesDir = join(dirname(fileURLToPath(import.meta.url)), "../../_includes");
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(includesDir));

function render(tmpl, context) {
  return env.renderString(tmpl, context);
}

const hostile = '<script>alert(1)</script> & "quoted" \'single\'';
const abilityTips = [{ id: "a", label: hostile, body: hostile }];

test("keywordList escapes hostile characters in plain keyword text", () => {
  const out = render(
    `{%- from "datasheet-parts.njk" import keywordList -%}{{ keywordList(keywords, abilityTips) }}`,
    { keywords: [{ type: "plain", text: hostile }], abilityTips }
  );
  assert.ok(!out.includes("<script>"), "raw script tag leaked into output");
  assert.ok(out.includes("&lt;script&gt;"), "hostile text was not escaped");
});

test("keywordList escapes hostile characters via an ability-tip ref", () => {
  const out = render(
    `{%- from "datasheet-parts.njk" import keywordList -%}{{ keywordList(keywords, abilityTips) }}`,
    { keywords: [{ type: "ref", ref: "a" }], abilityTips }
  );
  assert.ok(!out.includes("<script>"), "raw script tag leaked into output");
  assert.ok(out.includes("&lt;script&gt;"), "hostile label/body was not escaped");
});

test("weaponTable escapes hostile characters in weapon name and tags", () => {
  const out = render(
    `{%- from "datasheet-parts.njk" import weaponTable -%}{{ weaponTable(weapons, abilityTips) }}`,
    {
      weapons: [
        {
          name: hostile,
          tags: ["a"],
          range: hostile,
          attacks: "1",
          skill: "1+",
          strength: "1",
          ap: "0",
          damage: "1",
        },
      ],
      abilityTips,
    }
  );
  assert.ok(!out.includes("<script>"), "raw script tag leaked into output");
  assert.ok(out.includes("&lt;script&gt;"), "hostile weapon fields were not escaped");
});

test("traitList escapes hostile characters in name and body", () => {
  const out = render(
    `{%- from "datasheet-parts.njk" import traitList -%}{{ traitList(traits) }}`,
    { traits: [{ name: hostile, body: hostile }] }
  );
  assert.ok(!out.includes("<script>"), "raw script tag leaked into output");
  assert.ok(out.includes("&lt;script&gt;"), "hostile trait fields were not escaped");
});

test("statLine escapes hostile characters in stat values", () => {
  const out = render(`{%- from "datasheet-parts.njk" import statLine -%}{{ statLine(stats) }}`, {
    stats: { m: hostile, t: "1", sv: "1+", w: "1", ld: "1+", oc: "1" },
  });
  assert.ok(!out.includes("<script>"), "raw script tag leaked into output");
  assert.ok(out.includes("&lt;script&gt;"), "hostile stat value was not escaped");
});

test("unitName escapes hostile characters in name", () => {
  const out = render(`{%- from "datasheet-parts.njk" import unitName -%}{{ unitName(unit) }}`, {
    unit: { name: hostile, modelCount: null },
  });
  assert.ok(!out.includes("<script>"), "raw script tag leaked into output");
  assert.ok(out.includes("&lt;script&gt;"), "hostile unit name was not escaped");
});
