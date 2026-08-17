#!/usr/bin/env node
/* Validates every internal link, stylesheet, script, and image/srcset
 * reference in the built site using an HTML parser (not regex).
 *
 * Resolves URLs the way Cloudflare serves them, not the way the Eleventy
 * dev server tolerates them: a root-relative or document-relative path with
 * no extension maps to "<path>.html" in _site (Cloudflare's
 * auto-trailing-slash rewrite); a path ending ".html" maps to that file
 * directly (today's links are all `.html`-suffixed, which round-trips
 * through a 307 in production -- see the plan's ground-truth section --
 * but still resolves, so it is not treated as a broken link here). Every
 * other path (assets) maps to itself. Query strings are stripped before
 * resolution; fragments are checked against the target document's ids.
 *
 * `a[href]` internal links must be extensionless -- a page link ending
 * ".html" is flagged even if it would resolve, since canonical links are
 * meant to avoid the 307 redirect entirely. Asset references (css/js/img)
 * are unaffected. */

import * as cheerio from "cheerio";
import { readFileSync, existsSync, globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(root, "_site");

const files = globSync("**/*.html", { cwd: siteDir }).map((f) => f.split("\\").join("/"));

function isExternal(url) {
  return /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
}

// path is site-root-relative, e.g. "/factions/tyranids.html" or "/assets/style.css".
function resolveToSiteFile(sitePath) {
  if (sitePath.endsWith(".html") || posix.extname(sitePath) !== "") {
    return sitePath;
  }
  return sitePath + ".html";
}

const idCache = new Map();
function idsOf(sitePath) {
  if (idCache.has(sitePath)) return idCache.get(sitePath);
  const fsPath = join(siteDir, sitePath);
  let ids = null;
  if (existsSync(fsPath)) {
    const $ = cheerio.load(readFileSync(fsPath, "utf8"));
    ids = new Set();
    $("[id]").each((_, el) => ids.add($(el).attr("id")));
  }
  idCache.set(sitePath, ids);
  return ids;
}

function checkReference(rawUrl, currentSitePath, attrLabel, errors, requireCanonical = false) {
  if (!rawUrl || isExternal(rawUrl)) return;

  const hashIndex = rawUrl.indexOf("#");
  const fragment = hashIndex === -1 ? null : decodeURIComponent(rawUrl.slice(hashIndex + 1));
  let pathPart = hashIndex === -1 ? rawUrl : rawUrl.slice(0, hashIndex);
  const queryIndex = pathPart.indexOf("?");
  if (queryIndex !== -1) pathPart = pathPart.slice(0, queryIndex);

  if (requireCanonical && pathPart.endsWith(".html")) {
    errors.push(`${attrLabel} "${rawUrl}" -> internal link must be extensionless, not .html`);
    return;
  }

  let sitePath;
  if (pathPart === "") {
    sitePath = currentSitePath;
  } else if (pathPart.startsWith("/")) {
    sitePath = resolveToSiteFile(decodeURIComponent(pathPart));
  } else {
    const dir = posix.dirname("/" + currentSitePath);
    sitePath = resolveToSiteFile(posix.normalize(posix.join(dir, decodeURIComponent(pathPart))));
  }
  sitePath = sitePath.replace(/^\/+/, "");

  const fsPath = join(siteDir, sitePath);
  if (!existsSync(fsPath)) {
    errors.push(`${attrLabel} "${rawUrl}" -> not found: /${sitePath}`);
    return;
  }

  if (fragment) {
    const ids = idsOf(sitePath);
    if (!ids || !ids.has(fragment)) {
      errors.push(`${attrLabel} "${rawUrl}" -> #${fragment} not found in /${sitePath}`);
    }
  }
}

function checkSrcset(rawSrcset, currentSitePath, attrLabel, errors) {
  if (!rawSrcset) return;
  for (const candidate of rawSrcset.split(",")) {
    const url = candidate.trim().split(/\s+/)[0];
    checkReference(url, currentSitePath, attrLabel, errors);
  }
}

let hadErrors = false;

for (const file of files) {
  const fsPath = join(siteDir, file);
  const $ = cheerio.load(readFileSync(fsPath, "utf8"));
  const errors = [];

  $("a[href]").each((_, el) =>
    checkReference($(el).attr("href"), file, "a[href]", errors, true)
  );
  $("link[href]").each((_, el) => {
    const rel = ($(el).attr("rel") || "").toLowerCase();
    if (rel === "preconnect" || rel === "dns-prefetch") return;
    checkReference($(el).attr("href"), file, "link[href]", errors);
  });
  $("script[src]").each((_, el) => checkReference($(el).attr("src"), file, "script[src]", errors));
  $("img[src]").each((_, el) => checkReference($(el).attr("src"), file, "img[src]", errors));
  $("img[srcset], source[srcset]").each((_, el) =>
    checkSrcset($(el).attr("srcset"), file, "[srcset]", errors)
  );

  if (errors.length) {
    hadErrors = true;
    console.error(`\n/${file}`);
    errors.forEach((e) => console.error(`  ${e}`));
  }
}

if (hadErrors) {
  console.error("\n  Link check failed.\n");
  process.exit(1);
}

console.log(`Link check passed — ${files.length} pages checked.`);
