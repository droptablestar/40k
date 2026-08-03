module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.setTemplateFormats(["html", "njk"]);

  return {
    htmlTemplateEngine: "njk",
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
  };
};
