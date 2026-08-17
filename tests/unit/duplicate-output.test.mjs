import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

// A post-build directory scan of _site can't see a file that overwrote
// another -- only Eleventy itself, at write time, can catch two source
// files targeting the same output path. This proves that guarantee holds,
// so a future config change that disabled it would fail CI instead of
// silently dropping a page.

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const eleventyBin = join(root, "node_modules", ".bin", "eleventy");
const fixture = join(root, "tests", "fixtures", "duplicate-permalink");

test("two sources targeting one output route fail the build", () => {
  const outDir = mkdtempSync(join(tmpdir(), "eleventy-dup-"));
  try {
    assert.throws(() => {
      // cwd is the fixture dir itself so the repo's own .eleventyignore
      // (which excludes tests/) does not also exclude this fixture.
      execFileSync(eleventyBin, [`--input=.`, `--output=${outDir}`], {
        cwd: fixture,
        stdio: "pipe",
      });
    }, /Output conflict/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
