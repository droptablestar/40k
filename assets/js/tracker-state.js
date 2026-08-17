(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BenchtableTracker = factory();
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var STORAGE_KEY = "benchtable:battle:v1";
  var PROBE_KEY = "benchtable:probe:v1";

  function isFiniteNumber(v) {
    return typeof v === "number" && isFinite(v);
  }

  function isPlainObject(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  }

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  // Malformed or missing rounds fall back to 1; valid numbers are rounded
  // to the nearest integer and clamped to the five-round battle. Numeric
  // strings are treated as malformed, not silently widened.
  function normalizeRound(v) {
    if (!isFiniteNumber(v)) return 1;
    return clamp(Math.round(v), 1, 5);
  }

  // Malformed, missing, or negative counts fall back to 0. Numeric strings
  // are treated as malformed, not silently widened.
  function normalizeCount(v) {
    if (!isFiniteNumber(v)) return 0;
    var n = Math.trunc(v);
    return n < 0 ? 0 : n;
  }

  function blankArmy(name) {
    return { name: name, cp: 0, vp: 0 };
  }

  function blankGame() {
    return {
      round: 1,
      active: 0,
      armies: [blankArmy("Player one"), blankArmy("Player two")],
    };
  }

  function hasValidArmiesContainer(armies) {
    return Array.isArray(armies) && armies.length === 2 && armies.every(isPlainObject);
  }

  // Recovers a saved game to a safe, renderable shape. Any structurally
  // invalid armies container resets the whole game rather than throwing --
  // a hand-edited or corrupted save must never leave the tracker blank.
  // Unknown top-level and per-army properties are retained untouched.
  function normalize(saved) {
    if (!saved || !hasValidArmiesContainer(saved.armies)) return blankGame();
    saved.round = normalizeRound(saved.round);
    saved.active = saved.active === 1 ? 1 : 0;
    saved.armies.forEach(function (a) {
      a.name = typeof a.name === "string" ? a.name : "Player";
      a.cp = normalizeCount(a.cp);
      a.vp = normalizeCount(a.vp);
    });
    return saved;
  }

  function advanceRound(round) {
    return round >= 5 ? 5 : round + 1;
  }

  function adjustCounter(value, delta) {
    return Math.max(0, value + delta);
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    PROBE_KEY: PROBE_KEY,
    blankArmy: blankArmy,
    blankGame: blankGame,
    normalize: normalize,
    advanceRound: advanceRound,
    adjustCounter: adjustCounter,
  };
});
