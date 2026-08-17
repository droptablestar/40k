import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import BenchtableTracker from "../../assets/js/tracker-state.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixturePath = join(root, "tests", "fixtures", "tracker-v1.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

test("storage keys match the benchtable: convention", () => {
  assert.equal(BenchtableTracker.STORAGE_KEY, fixture.storageKey);
  assert.equal(BenchtableTracker.PROBE_KEY, fixture.probeKey);
});

// Cases with a `rawStoredValue`, `storageUnavailable`, or
// `writeThrowsAfterStartup` exercise the localStorage/DOM-integrated
// startup and write-failure paths, not the pure normalize() function --
// those are covered by the browser tests instead.
const normalizeCases = fixture.cases.filter(
  (c) => "input" in c && !c.storageUnavailable && !c.writeThrowsAfterStartup
);

test("normalize() fixture pairs", async (t) => {
  for (const c of normalizeCases) {
    await t.test(c.name, () => {
      const result = BenchtableTracker.normalize(structuredClone(c.input));
      assert.deepEqual(result, c.expectedState);
    });
  }
});

test("normalize() with no saved value returns a blank game", () => {
  assert.deepEqual(BenchtableTracker.normalize(null), BenchtableTracker.blankGame());
  assert.deepEqual(BenchtableTracker.normalize(undefined), BenchtableTracker.blankGame());
});

test("blankGame() shape", () => {
  assert.deepEqual(BenchtableTracker.blankGame(), {
    round: 1,
    active: 0,
    armies: [
      { name: "Player one", cp: 0, vp: 0 },
      { name: "Player two", cp: 0, vp: 0 },
    ],
  });
});

test("blankArmy() shape", () => {
  assert.deepEqual(BenchtableTracker.blankArmy("Test"), { name: "Test", cp: 0, vp: 0 });
});

test("advanceRound() steps forward and clamps at 5", () => {
  assert.equal(BenchtableTracker.advanceRound(1), 2);
  assert.equal(BenchtableTracker.advanceRound(4), 5);
  assert.equal(BenchtableTracker.advanceRound(5), 5);
});

test("adjustCounter() steps and clamps at 0", () => {
  assert.equal(BenchtableTracker.adjustCounter(0, 1), 1);
  assert.equal(BenchtableTracker.adjustCounter(1, -1), 0);
  assert.equal(BenchtableTracker.adjustCounter(0, -1), 0);
});
