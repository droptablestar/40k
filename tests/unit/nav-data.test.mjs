import { test } from "node:test";
import assert from "node:assert/strict";

import nav from "../../scripts/nav-data.js";

const { navGroupItems, isGroupActive, factionGroups, factionsIndexUrl, isFactionsActive } = nav;

function page(url, data) {
  return { url, data };
}

// A minimal collections.all standing in for the real site: index/tracker on
// navGroup "top", painting pages on "painting", rules pages on "rules", and
// a factions index plus two factions (one with datasheets/stratagems, one
// without) on the faction registry.
const all = [
  page("/index.html", { navGroup: "top", navLabel: "Start", navOrder: 1 }),
  page("/tracker.html", { navGroup: "top", navLabel: "Tracker", navOrder: 2 }),
  page("/painting.html", {
    navGroup: "painting",
    navLabel: "Painting, start to finish",
    navOrder: 1,
    sections: [{ id: "kit", label: "What to buy" }],
  }),
  page("/painting-reference.html", {
    navGroup: "painting",
    navLabel: "Technique reference",
    navOrder: 2,
  }),
  page("/turn-order.html", { navGroup: "rules", navLabel: "Turn order", navOrder: 1 }),
  page("/factions.html", { pageKind: "factions-index" }),
  page("/factions/tyranids.html", {
    factionSlug: "tyranids",
    pageKind: "detail",
    sections: [{ id: "identity", label: "Identity" }],
  }),
  page("/factions/tyranids/datasheets.html", {
    factionSlug: "tyranids",
    pageKind: "datasheets",
  }),
  page("/factions/tyranids/stratagems.html", {
    factionSlug: "tyranids",
    pageKind: "stratagems",
  }),
  page("/factions/tyranids/painting.html", {
    factionSlug: "tyranids",
    pageKind: "painting",
  }),
  page("/factions/world-eaters.html", { factionSlug: "world-eaters", pageKind: "detail" }),
];

const factions = [
  { slug: "tyranids", name: "Tyranids", order: 1 },
  { slug: "world-eaters", name: "World Eaters", order: 2 },
];

test("navGroupItems() returns group members sorted by navOrder with .html stripped", () => {
  assert.deepEqual(navGroupItems(all, "top"), [
    { url: "/index", rawUrl: "/index.html", label: "Start", sections: [] },
    { url: "/tracker", rawUrl: "/tracker.html", label: "Tracker", sections: [] },
  ]);
});

test("navGroupItems() carries sections through for the painting group", () => {
  const items = navGroupItems(all, "painting");
  assert.equal(items.length, 2);
  assert.equal(items[0].url, "/painting");
  assert.deepEqual(items[0].sections, [{ id: "kit", label: "What to buy" }]);
  assert.equal(items[1].url, "/painting-reference");
});

test("navGroupItems() covers the rules group", () => {
  assert.deepEqual(navGroupItems(all, "rules"), [
    { url: "/turn-order", rawUrl: "/turn-order.html", label: "Turn order", sections: [] },
  ]);
});

test("navGroupItems() returns empty array for a group with no members", () => {
  assert.deepEqual(navGroupItems(all, "nonexistent"), []);
});

test("isGroupActive() true for the current page's own group, false otherwise", () => {
  assert.equal(isGroupActive("/tracker.html", all, "top"), true);
  assert.equal(isGroupActive("/tracker.html", all, "painting"), false);
  assert.equal(isGroupActive("/painting.html", all, "painting"), true);
});

test("factionGroups() joins registry entries with their detail/datasheets/stratagems pages", () => {
  const groups = factionGroups(all, factions);
  assert.deepEqual(groups, [
    {
      slug: "tyranids",
      name: "Tyranids",
      url: "/factions/tyranids",
      rawUrl: "/factions/tyranids.html",
      sections: [{ id: "identity", label: "Identity" }],
      datasheetsUrl: "/factions/tyranids/datasheets",
      stratagemsUrl: "/factions/tyranids/stratagems",
      paintingUrl: "/factions/tyranids/painting",
    },
    {
      slug: "world-eaters",
      name: "World Eaters",
      url: "/factions/world-eaters",
      rawUrl: "/factions/world-eaters.html",
      sections: [],
      datasheetsUrl: null,
      stratagemsUrl: null,
      paintingUrl: null,
    },
  ]);
});

test("factionGroups() throws when a page declares an unregistered factionSlug", () => {
  const badAll = all.concat(page("/factions/orks.html", { factionSlug: "orks", pageKind: "detail" }));
  assert.throws(() => factionGroups(badAll, factions), /factionSlug "orks".*not in the faction registry/);
});

test("factionGroups() throws when two pages share a factionSlug/pageKind pair", () => {
  const badAll = all.concat(
    page("/factions/tyranids-2.html", { factionSlug: "tyranids", pageKind: "detail" })
  );
  assert.throws(() => factionGroups(badAll, factions), /More than one page declares factionSlug\/pageKind "tyranids:detail"/);
});

test("factionGroups() throws when a registry entry has no detail page", () => {
  const noDetail = factions.concat({ slug: "orks", name: "Orks", order: 3 });
  assert.throws(() => factionGroups(all, noDetail), /"orks" has no page with pageKind: detail/);
});

test("factionsIndexUrl() resolves the single factions-index page", () => {
  assert.equal(factionsIndexUrl(all), "/factions");
});

test("factionsIndexUrl() throws when there is not exactly one factions-index page", () => {
  assert.throws(() => factionsIndexUrl(all.filter((p) => p.data.pageKind !== "factions-index")), /found 0/);
  const dup = all.concat(page("/factions-2.html", { pageKind: "factions-index" }));
  assert.throws(() => factionsIndexUrl(dup), /found 2/);
});

test("isFactionsActive() true on the factions index and any faction page, false elsewhere", () => {
  assert.equal(isFactionsActive("/factions.html", all), true);
  assert.equal(isFactionsActive("/factions/tyranids.html", all), true);
  assert.equal(isFactionsActive("/factions/tyranids/datasheets.html", all), true);
  assert.equal(isFactionsActive("/tracker.html", all), false);
});
