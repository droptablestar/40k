#!/usr/bin/env node
/* Validates every built page against .htmlvalidate.json (html-validate's
 * "recommended" ruleset: invalid nesting, duplicate IDs, invalid ARIA,
 * missing required attributes, broken details/summary, nested interactive
 * elements, and more). Runs against _site/, not source templates, so it
 * catches what actually ships. */

import { HtmlValidate, FileSystemConfigLoader } from "html-validate";
import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = join(root, "_site");

const files = globSync("**/*.html", { cwd: siteDir }).map((f) => join(siteDir, f));

const htmlvalidate = new HtmlValidate(new FileSystemConfigLoader(), {
  root,
});

let hadErrors = false;

for (const file of files) {
  const report = await htmlvalidate.validateFile(file);
  if (!report.valid) {
    hadErrors = true;
    for (const result of report.results) {
      console.error(`\n${relative(root, result.filePath)}`);
      for (const msg of result.messages) {
        console.error(`  ${msg.line}:${msg.column}  ${msg.severity === 2 ? "error" : "warning"}  ${msg.message}  ${msg.ruleId}`);
      }
    }
  }
}

if (hadErrors) {
  console.error("\n  HTML validation failed. See .htmlvalidate.json for the ruleset.\n");
  process.exit(1);
}

console.log(`HTML check passed — ${files.length} pages validated.`);
