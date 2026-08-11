/* Attack resolver.
 *
 * A pure function of nine numbers and two toggles: no storage, no network,
 * no state beyond the current control values. Everything is computed exactly
 * (closed-form probabilities and an exact binomial tail) rather than simulated,
 * so the same inputs always give the same answer.
 *
 * The wound chart here must stay identical to the one on /charts.html.
 */
(function () {
  "use strict";

  /* ---------- the controls ----------
     One spec per stepper. `fmt` turns the stored number into what the player
     reads on their datasheet ("3+", "-1", "—"), so the stored value can stay
     a plain number the maths can use directly. */

  var FIELDS = [
    { group: "attack", key: "attacks",   label: "Attacks",        min: 1, max: 60, value: 10 },
    { group: "attack", key: "hit",       label: "Hit roll",       min: 2, max: 6,  value: 3, fmt: plus,
      hint: "Ballistic or weapon skill" },
    { group: "attack", key: "strength",  label: "Strength",       min: 1, max: 24, value: 4 },
    { group: "attack", key: "ap",        label: "Armour piercing", min: -4, max: 0, value: 0, fmt: ap },
    { group: "attack", key: "damage",    label: "Damage",         min: 1, max: 12, value: 1 },

    { group: "target", key: "toughness", label: "Toughness",      min: 1, max: 16, value: 4 },
    { group: "target", key: "save",      label: "Save",           min: 2, max: 7,  value: 3, fmt: saveFmt },
    { group: "target", key: "invuln",    label: "Invulnerable",   min: 2, max: 7,  value: 7, fmt: saveFmt,
      hint: "Ignores armour piercing" },
    { group: "target", key: "wounds",    label: "Wounds",         min: 1, max: 40, value: 2 }
  ];

  var TOGGLES = [
    { key: "cover",   label: "Target in cover", note: "−1 to hit" },
    { key: "reroll1", label: "Re-roll hit rolls of 1", note: "" }
  ];

  var state = {};
  FIELDS.forEach(function (f) { state[f.key] = f.value; });
  TOGGLES.forEach(function (t) { state[t.key] = false; });

  function plus(v) { return v + "+"; }
  function ap(v) { return v === 0 ? "0" : "−" + Math.abs(v); }
  function saveFmt(v) { return v >= 7 ? "—" : v + "+"; }

  function show(f) { return f.fmt ? f.fmt(state[f.key]) : String(state[f.key]); }

  /* ---------- the maths ---------- */

  /* A modified hit roll of 6 always hits and a 1 always misses, so cover's
     -1 can never take a 6+ shooter past "6+", and never improves a 2+. */
  function hitChance() {
    var need = state.hit + (state.cover ? 1 : 0);
    if (need > 6) need = 6;
    if (need < 2) need = 2;
    var p = (7 - need) / 6;
    // A re-rolled 1 is a fresh roll with the same chance of landing.
    if (state.reroll1) p = p + (1 / 6) * p;
    return { need: need, p: p };
  }

  /* Strength vs Toughness, in the same order as the chart on /charts.html.
     Double-or-more is checked before greater-than, and half-or-less before
     less-than, because both pairs overlap. */
  function woundNeed(s, t) {
    if (s >= 2 * t) return 2;
    if (s > t) return 3;
    if (s === t) return 4;
    if (s * 2 <= t) return 6;
    return 5;
  }

  /* Armour piercing worsens the armour save; it never touches an invulnerable
     save. The model uses whichever of the two is better. 7+ or worse cannot
     be rolled, so it never saves. Cover does not improve saves in 11th. */
  function saveUsed() {
    var armour = state.save >= 7 ? 7 : state.save - state.ap;
    var need = Math.min(armour, state.invuln);
    if (need > 7) need = 7;
    return need;
  }

  /* Exact binomial: chance of each possible number of unsaved wounds out of
     `n` attacks. Built by ratio from pmf[0] rather than with factorials, so
     nothing overflows at 60 attacks. */
  function binomial(n, p) {
    var pmf = new Array(n + 1), k;
    if (p <= 0) { for (k = 0; k <= n; k++) pmf[k] = 0; pmf[0] = 1; return pmf; }
    if (p >= 1) { for (k = 0; k <= n; k++) pmf[k] = 0; pmf[n] = 1; return pmf; }
    pmf[0] = Math.pow(1 - p, n);
    for (k = 1; k <= n; k++) {
      pmf[k] = pmf[k - 1] * ((n - k + 1) / k) * (p / (1 - p));
    }
    return pmf;
  }

  function compute() {
    var hit = hitChance();
    var wNeed = woundNeed(state.strength, state.toughness);
    var sNeed = saveUsed();

    var pWound = (7 - wNeed) / 6;
    var pFail = sNeed >= 7 ? 1 : (sNeed - 1) / 6;
    var pThrough = hit.p * pWound * pFail;

    var n = state.attacks;
    var pmf = binomial(n, pThrough);

    // Damage that spills past the model's last wound is wasted, so the
    // expected damage is the average of min(k * D, W), not attacks * damage.
    var expDamage = 0, k;
    for (k = 0; k <= n; k++) {
      expDamage += pmf[k] * Math.min(k * state.damage, state.wounds);
    }

    // It dies on ceil(W / D) unsaved wounds or more.
    var needed = Math.ceil(state.wounds / state.damage);
    var kill = 0;
    for (k = needed; k <= n; k++) kill += pmf[k];
    if (kill > 1) kill = 1;
    if (kill < 0) kill = 0;

    return {
      hits: n * hit.p,
      wounds: n * hit.p * pWound,
      through: n * pThrough,
      damage: expDamage,
      kill: kill,
      hitNeed: hit.need,
      woundNeed: wNeed,
      saveNeed: sNeed,
      // The three per-roll chances behind the chain above, as fractions.
      // pHit already includes cover and the re-roll, so it moves when they do
      // even though the number on the dice does not.
      pHit: hit.p,
      pWound: pWound,
      pFail: pFail
    };
  }

  /* ---------- rendering ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function ctlHtml(f) {
    return '<div class="ctl">' +
      '<div class="ctl-label">' +
        '<span class="ctl-name" id="lab-' + f.key + '">' + esc(f.label) + '</span>' +
        (f.hint ? '<span class="ctl-hint">' + esc(f.hint) + '</span>' : '') +
      '</div>' +
      '<div class="ctl-set">' +
        '<button class="ctl-btn" type="button" data-act="dec" data-k="' + f.key +
          '" aria-label="Lower ' + esc(f.label) + '">&minus;</button>' +
        '<output class="ctl-val" id="val-' + f.key + '" aria-labelledby="lab-' + f.key + '">' +
          esc(show(f)) + '</output>' +
        '<button class="ctl-btn" type="button" data-act="inc" data-k="' + f.key +
          '" aria-label="Raise ' + esc(f.label) + '">+</button>' +
      '</div>' +
    '</div>';
  }

  function chipHtml(t) {
    return '<button class="chip-toggle" type="button" data-t="' + t.key +
      '" aria-pressed="false">' + esc(t.label) +
      (t.note ? '<span>' + esc(t.note) + '</span>' : '') + '</button>';
  }

  function fill(id, list) {
    document.getElementById(id).innerHTML = list.join("");
  }

  fill("ctls-attack", FIELDS.filter(function (f) { return f.group === "attack"; }).map(ctlHtml));
  fill("ctls-target", FIELDS.filter(function (f) { return f.group === "target"; }).map(ctlHtml));
  fill("chips", TOGGLES.map(chipHtml));

  var one = function (v) { return v.toFixed(1); };
  // One decimal on every percentage, so 66.7 and 100.0 line up in the row.
  var pct = function (v) { return (v * 100).toFixed(1) + "%"; };

  function stepHtml(p, name) {
    return '<div class="step"><span class="step-pct">' + pct(p) +
      '</span><span class="step-name">' + esc(name) + '</span></div>';
  }

  function render() {
    FIELDS.forEach(function (f) {
      var el = document.getElementById("val-" + f.key);
      el.textContent = show(f);
      // A control sitting at its floor or ceiling stops responding; say so
      // rather than letting a tap silently do nothing.
      var dec = document.querySelector('[data-act="dec"][data-k="' + f.key + '"]');
      var inc = document.querySelector('[data-act="inc"][data-k="' + f.key + '"]');
      dec.disabled = state[f.key] <= f.min;
      inc.disabled = state[f.key] >= f.max;
    });

    TOGGLES.forEach(function (t) {
      document.querySelector('[data-t="' + t.key + '"]')
        .setAttribute("aria-pressed", String(!!state[t.key]));
    });

    var r = compute();

    document.getElementById("r-damage").textContent = one(r.damage);
    document.getElementById("r-damage-foot").textContent =
      "of " + state.wounds + (state.wounds === 1 ? " wound" : " wounds");
    document.getElementById("r-kill").textContent = Math.round(r.kill * 100) + "%";

    document.getElementById("r-chain").innerHTML =
      '<span><b>' + state.attacks + '</b> attacks</span>' +
      '<span><b>' + one(r.hits) + '</b> hits</span>' +
      '<span><b>' + one(r.wounds) + '</b> wounds</span>' +
      '<span><b>' + one(r.through) + '</b> get through</span>';

    document.getElementById("r-steps").innerHTML =
      stepHtml(r.pHit, "to hit " + r.hitNeed + "+" +
        (state.reroll1 ? ", re-roll 1s" : "")) +
      stepHtml(r.pWound, "to wound " + r.woundNeed + "+") +
      stepHtml(r.pFail, r.saveNeed >= 7 ? "no save" : "save " + r.saveNeed + "+ fails");
  }

  /* ---------- input ---------- */

  function bump(key, dir) {
    var f = FIELDS.filter(function (x) { return x.key === key; })[0];
    if (!f) return;
    var next = state[key] + dir;
    if (next < f.min || next > f.max) return;
    state[key] = next;
    render();
  }

  // Hold to repeat. Twenty taps to get to 20 attacks is the difference between
  // this being usable mid-game and not, and the buttons are the only input.
  var timer = null, holding = null;

  function stopHold() {
    if (timer) { clearInterval(timer); clearTimeout(timer); timer = null; }
    holding = null;
  }

  function startHold(key, dir) {
    stopHold();
    holding = key;
    timer = setTimeout(function () {
      timer = setInterval(function () { bump(key, dir); }, 90);
    }, 420);
  }

  document.addEventListener("pointerdown", function (e) {
    var b = e.target.closest ? e.target.closest(".ctl-btn") : null;
    if (!b || b.disabled) return;
    startHold(b.getAttribute("data-k"), b.getAttribute("data-act") === "inc" ? 1 : -1);
  });

  ["pointerup", "pointercancel", "pointerleave", "blur"].forEach(function (ev) {
    document.addEventListener(ev, stopHold, true);
  });

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-t]") : null;
    if (t) { state[t.getAttribute("data-t")] = !state[t.getAttribute("data-t")]; render(); return; }

    var b = e.target.closest ? e.target.closest(".ctl-btn") : null;
    if (!b || b.disabled) return;
    bump(b.getAttribute("data-k"), b.getAttribute("data-act") === "inc" ? 1 : -1);
  });

  render();

  // Exposed so the maths can be checked from the console without clicking
  // through the whole page.
  window.oddsDebug = { state: state, compute: compute, render: render };
})();
