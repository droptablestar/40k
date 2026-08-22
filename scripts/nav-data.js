"use strict";

// Pure functions that turn Eleventy's collections.all plus the faction
// registry (_data/factions.js) into ready-to-render navigation data. Kept
// framework-free so they can be unit tested directly (tests/unit/nav-data.test.mjs)
// without spinning up Eleventy, and registered as Nunjucks globals in
// .eleventy.js for use from _includes/base.njk.

// Eleventy resolves an /index.html permalink's url to "/" (its directory-index
// convention), but this site's extensionless-link convention -- and every
// other page's link resolution -- expects "/index" (see scripts/check-links.mjs).
function stripHtml(url) {
  if (url === "/") return "/index";
  return url.endsWith(".html") ? url.slice(0, -5) : url;
}

// Items sharing a `navGroup` front matter value, sorted by `navOrder`.
function navGroupItems(all, group) {
  return all
    .filter((item) => item.data.navGroup === group)
    .slice()
    .sort((a, b) => (a.data.navOrder || 0) - (b.data.navOrder || 0))
    .map((item) => ({
      url: stripHtml(item.url),
      rawUrl: item.url,
      label: item.data.navLabel,
      sections: item.data.sections || [],
    }));
}

function isGroupActive(currentUrl, all, group) {
  return all.some((item) => item.data.navGroup === group && item.url === currentUrl);
}

// Faction registry entries joined against pages declaring a matching
// `factionSlug`, validated so a bad page or registry entry fails the build
// instead of silently mis-rendering the nav.
function factionGroups(all, factions) {
  const facPages = all.filter((item) => item.data.factionSlug);

  for (const item of facPages) {
    const slug = item.data.factionSlug;
    if (!factions.some((f) => f.slug === slug)) {
      throw new Error(
        `Page ${item.url} declares factionSlug "${slug}", which is not in the faction registry.`
      );
    }
  }

  const seen = new Set();
  for (const item of facPages) {
    const key = item.data.factionSlug + ":" + item.data.pageKind;
    if (seen.has(key)) {
      throw new Error(`More than one page declares factionSlug/pageKind "${key}".`);
    }
    seen.add(key);
  }

  return factions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((f) => {
      const pages = facPages.filter((item) => item.data.factionSlug === f.slug);
      const detail = pages.find((item) => item.data.pageKind === "detail");
      if (!detail) {
        throw new Error(`Faction registry entry "${f.slug}" has no page with pageKind: detail.`);
      }
      const datasheets = pages.find((item) => item.data.pageKind === "datasheets");
      const stratagems = pages.find((item) => item.data.pageKind === "stratagems");
      const painting = pages.find((item) => item.data.pageKind === "painting");
      return {
        slug: f.slug,
        name: f.name,
        url: stripHtml(detail.url),
        rawUrl: detail.url,
        sections: detail.data.sections || [],
        datasheetsUrl: datasheets ? stripHtml(datasheets.url) : null,
        stratagemsUrl: stratagems ? stripHtml(stratagems.url) : null,
        paintingUrl: painting ? stripHtml(painting.url) : null,
      };
    });
}

function factionsIndexUrl(all) {
  const matches = all.filter((item) => item.data.pageKind === "factions-index");
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one page with pageKind: factions-index, found ${matches.length}.`
    );
  }
  return stripHtml(matches[0].url);
}

function isFactionsActive(currentUrl, all) {
  return all.some(
    (item) =>
      (item.data.factionSlug || item.data.pageKind === "factions-index") &&
      item.url === currentUrl
  );
}

module.exports = {
  navGroupItems,
  isGroupActive,
  factionGroups,
  factionsIndexUrl,
  isFactionsActive,
};
