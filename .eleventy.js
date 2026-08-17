const nav = require("./scripts/nav-data.js");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.setTemplateFormats(["html", "njk"]);

  eleventyConfig.addNunjucksGlobal("navGroupItems", nav.navGroupItems);
  eleventyConfig.addNunjucksGlobal("isGroupActive", nav.isGroupActive);
  eleventyConfig.addNunjucksGlobal("factionGroups", nav.factionGroups);
  eleventyConfig.addNunjucksGlobal("factionsIndexUrl", nav.factionsIndexUrl);
  eleventyConfig.addNunjucksGlobal("isFactionsActive", nav.isFactionsActive);

  return {
    htmlTemplateEngine: "njk",
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
  };
};
