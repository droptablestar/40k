import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(root, "scripts", "check-links.mjs");

function run(fixtureRelPath) {
  return execFileSync("node", [script, fixtureRelPath], { cwd: root, encoding: "utf8" });
}

function runExpectFailure(fixtureRelPath) {
  try {
    execFileSync("node", [script, fixtureRelPath], { cwd: root, stdio: "pipe", encoding: "utf8" });
    throw new Error("expected check-links.mjs to exit non-zero");
  } catch (err) {
    assert.equal(err.status, 1);
    return err.stderr;
  }
}

test("document-relative links and encoded fragments resolve", () => {
  const output = run("tests/fixtures/link-checker/ok");
  assert.match(output, /Link check passed/);
});

test("a missing srcset resource fails the check", () => {
  const stderr = runExpectFailure("tests/fixtures/link-checker/bad");
  assert.match(stderr, /missing\.jpg/);
});

test("an internal a[href] ending in .html fails the check", () => {
  const stderr = runExpectFailure("tests/fixtures/link-checker/non-canonical");
  assert.match(stderr, /must be extensionless/);
});
