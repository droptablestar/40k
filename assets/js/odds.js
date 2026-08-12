/* Attack resolver.
 *
 * A pure function of eleven numbers and two toggles: no storage, no network,
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

  /* A weapon's Attacks and Damage characteristics can be a fixed number or a
     dice roll (D3, D6+1, 2D6, ...) instead — this is the standard set found
     across real datasheets, including Blast's "+X per five models". Index 0
     ("Fixed") means "use the paired numeric stepper" and is handled as a
     plain number everywhere in the maths below. */
  var DICE_PRESETS = [
    { label: "Fixed" },
    { label: "D3",    n: 1, sides: 3, mod: 0 },
    { label: "D3+1",  n: 1, sides: 3, mod: 1 },
    { label: "D3+2",  n: 1, sides: 3, mod: 2 },
    { label: "D3+3",  n: 1, sides: 3, mod: 3 },
    { label: "D6",    n: 1, sides: 6, mod: 0 },
    { label: "D6+1",  n: 1, sides: 6, mod: 1 },
    { label: "D6+2",  n: 1, sides: 6, mod: 2 },
    { label: "D6+3",  n: 1, sides: 6, mod: 3 },
    { label: "2D6",   n: 2, sides: 6, mod: 0 },
    { label: "2D6+3", n: 2, sides: 6, mod: 3 },
    { label: "3D6",   n: 3, sides: 6, mod: 0 }
  ];

  var FIELDS = [
    { group: "attack", key: "attacks",   label: "Attacks",        min: 1, max: 60, value: 10,
      diceKey: "attacksDice" },
    { group: "attack", key: "rapidFire", label: "Rapid Fire",     min: 0, max: 6,  value: 0, fmt: bonusFmt,
      hint: "Extra attacks at half range" },
    { group: "attack", key: "hit",       label: "Hit roll",       min: 2, max: 6,  value: 3, fmt: plus,
      hint: "Ballistic or weapon skill" },
    { group: "attack", key: "sustained", label: "Sustained Hits", min: 0, max: 3,  value: 0, fmt: bonusFmt,
      hint: "Extra hits on an unmodified hit roll of 6" },
    { group: "attack", key: "anti",      label: "Anti",           min: 2, max: 7,  value: 7, fmt: saveFmt,
      hint: "Wound rolls of this or more always wound" },
    { group: "attack", key: "strength",  label: "Strength",       min: 1, max: 24, value: 4 },
    { group: "attack", key: "ap",        label: "Armour piercing", min: -4, max: 0, value: 0, fmt: ap },
    { group: "attack", key: "damage",    label: "Damage",         min: 1, max: 12, value: 1,
      diceKey: "damageDice" },
    { group: "attack", key: "minDamage", label: "Minimum damage", min: 0, max: 12, value: 0, fmt: bonusFmt,
      hint: "Damage per hit can't roll below this" },

    { group: "target", key: "toughness", label: "Toughness",      min: 1, max: 16, value: 4 },
    { group: "target", key: "models",    label: "Models in unit", min: 1, max: 30, value: 5,
      hint: "For Blast's +1 attack per five models" },
    { group: "target", key: "save",      label: "Save",           min: 2, max: 7,  value: 3, fmt: saveFmt },
    { group: "target", key: "invuln",    label: "Invulnerable",   min: 2, max: 7,  value: 7, fmt: saveFmt,
      hint: "Ignores armour piercing" },
    { group: "target", key: "wounds",    label: "Wounds",         min: 1, max: 40, value: 2 },
    { group: "target", key: "fnp",       label: "Feel No Pain",   min: 2, max: 7,  value: 7, fmt: saveFmt,
      hint: "Ignores that much of each point of damage" }
  ];

  var TOGGLES = [
    { key: "cover",         label: "Target in cover",    note: "−1 to hit" },
    { key: "ignoreCover",   label: "Ignores cover",      note: "Cancels the −1 above" },
    { key: "heavy",         label: "Heavy",               note: "+1 to hit while stationary" },
    { key: "reroll1",       label: "Re-roll hit rolls of 1", note: "" },
    { key: "rerollAllHits", label: "Re-roll all hit rolls", note: "Replaces re-roll 1s above" },
    { key: "halfRange",     label: "Within half range",  note: "Applies Rapid Fire above" },
    { key: "blast",         label: "Blast",               note: "Applies models in unit above" },
    { key: "torrent",       label: "Torrent",             note: "Auto-hits, no hit roll" },
    { key: "lethalHits",    label: "Lethal Hits",         note: "Hit rolls of 6 auto-wound" },
    { key: "devWounds",     label: "Devastating Wounds",  note: "Wound rolls of 6 skip the save" },
    { key: "lance",         label: "Charged (Lance)",     note: "+1 to wound" },
    { key: "rerollWound1",  label: "Re-roll wound rolls of 1", note: "Twin-linked" }
  ];

  var state = {};
  FIELDS.forEach(function (f) { state[f.key] = f.value; });
  TOGGLES.forEach(function (t) { state[t.key] = false; });
  // Attacks and Damage each pair with a dice-roll cycle button living in the
  // same row as their stepper (index 0 = "Fixed", i.e. use the stepper).
  state.attacksDice = 0;
  state.damageDice = 0;

  function plus(v) { return v + "+"; }
  function ap(v) { return v === 0 ? "0" : "−" + Math.abs(v); }
  function saveFmt(v) { return v >= 7 ? "—" : v + "+"; }
  function bonusFmt(v) { return v === 0 ? "—" : "+" + v; }

  // A field paired with a dice-roll selector (Attacks, Damage) shows the
  // dice notation instead of its own number once that selector leaves
  // "Fixed" — the number comes from the formula, not the stepper.
  function show(f) {
    if (f.diceKey && state[f.diceKey] !== 0) return DICE_PRESETS[state[f.diceKey]].label;
    return f.fmt ? f.fmt(state[f.key]) : String(state[f.key]);
  }

  /* ---------- the maths ---------- */

  /* A modified roll of 6 always succeeds and a 1 always fails, so a +1/-1
     modifier can't push a 6+ need past "6+" or improve a 2+. Faces sort
     into miss / mid-success / success-via-6 (the last is what Sustained
     Hits and Lethal Hits read). "ones" re-rolls just a natural 1, a fresh
     roll over all three buckets, so each scales by 7/6 with 1/6 coming
     back out of "miss" for the original 1 it replaces. "all" re-rolls
     every miss, so misses only compound with themselves. */
  function rollBuckets(need, reroll) {
    if (need > 6) need = 6;
    if (need < 2) need = 2;
    var midHits = 0, f;
    for (f = 2; f <= 5; f++) if (f >= need) midHits++;
    var pLow = midHits / 6, pHigh = 1 / 6, pMiss = 1 - pLow - pHigh;
    if (reroll === "ones") {
      return { pLow: pLow * 7 / 6, pHigh: pHigh * 7 / 6, pMiss: pMiss * 7 / 6 - 1 / 6 };
    }
    if (reroll === "all") {
      return { pLow: pLow + pMiss * pLow, pHigh: pHigh + pMiss * pHigh, pMiss: pMiss * pMiss };
    }
    return { pLow: pLow, pHigh: pHigh, pMiss: pMiss };
  }

  // Torrent skips the roll (so Sustained/Lethal Hits, which key off a
  // natural 6, can't trigger). Heavy's +1 lands before cover's -1, same
  // as a datasheet reads top to bottom.
  function hitOutcome() {
    if (state.torrent) return { need: null, p1: 1, p6: 0, pMiss: 0, torrent: true };
    var need = state.hit - (state.heavy ? 1 : 0) +
      (state.cover && !state.ignoreCover ? 1 : 0);
    var reroll = state.rerollAllHits ? "all" : (state.reroll1 ? "ones" : "none");
    var b = rollBuckets(need, reroll);
    return { need: Math.max(2, Math.min(6, need)), p1: b.pLow, p6: b.pHigh, pMiss: b.pMiss, torrent: false };
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

  /* A single die's pmf: dense array where index = face value. D3 is exact
     here (roll 1d6, halve round up gives {1,2,3} each at 1/3, same as a
     uniform 3-sided die), not an approximation of the official method. */
  function dieDist(sides) {
    var pmf = [0], p = 1 / sides, i;
    for (i = 1; i <= sides; i++) pmf[i] = p;
    return pmf;
  }

  // pmf of the sum of two independent dense distributions, each indexed
  // from 0.
  function convolve(a, b) {
    var out = new Array(a.length + b.length - 1), i, j;
    for (i = 0; i < out.length; i++) out[i] = 0;
    for (i = 0; i < a.length; i++) {
      if (!a[i]) continue;
      for (j = 0; j < b.length; j++) {
        if (b[j]) out[i + j] += a[i] * b[j];
      }
    }
    return out;
  }

  // Slides a pmf `n` places up the index axis (adds a flat bonus to the
  // quantity it describes).
  function shiftPmf(pmf, n) {
    if (!n) return pmf;
    var shifted = new Array(pmf.length + n), i;
    for (i = 0; i < n; i++) shifted[i] = 0;
    for (i = 0; i < pmf.length; i++) shifted[i + n] = pmf[i];
    return shifted;
  }

  // pmf of "roll `preset.n` dice of `preset.sides` and add `preset.mod`".
  function diceDist(preset) {
    var die = dieDist(preset.sides), pmf = [1], i;
    for (i = 0; i < preset.n; i++) pmf = convolve(pmf, die);
    return shiftPmf(pmf, preset.mod);
  }

  // Folds every index below `min` up to `min` — a minimum-damage floor
  // applied to a per-hit damage pmf before Feel No Pain thins it.
  function floorPmf(pmf, min) {
    if (!min) return pmf;
    var len = Math.max(pmf.length, min + 1), out = new Array(len), i, idx;
    for (i = 0; i < len; i++) out[i] = 0;
    for (i = 0; i < pmf.length; i++) {
      if (!pmf[i]) continue;
      idx = i < min ? min : i;
      out[idx] += pmf[i];
    }
    return out;
  }

  function expectedValue(pmf) {
    var e = 0, i;
    for (i = 0; i < pmf.length; i++) e += i * pmf[i];
    return e;
  }

  function deltaAt(n) {
    var a = new Array(n + 1), i;
    for (i = 0; i < n; i++) a[i] = 0;
    a[n] = 1;
    return a;
  }

  function repeatConvolve(pmf, n) {
    var acc = [1], i;
    for (i = 0; i < n; i++) acc = convolve(acc, pmf);
    return acc;
  }

  // Mixes repeatConvolve(unitPmf, n) over every possible n, weighted by
  // attacksPmf[n] — the Sustained Hits analogue of mixedBinomial, for when
  // a single attack can itself produce more than one hit.
  function mixedRepeat(attacksPmf, unitPmf) {
    var maxN = attacksPmf.length - 1;
    var out = [attacksPmf[0] || 0], acc = [1], n, i;
    for (n = 1; n <= maxN; n++) {
      acc = convolve(acc, unitPmf);
      if (!attacksPmf[n]) continue;
      while (out.length < acc.length) out.push(0);
      for (i = 0; i < acc.length; i++) out[i] += acc[i] * attacksPmf[n];
    }
    return out;
  }

  // Convolution that folds every index at or past `cap` into `cap` itself,
  // so a pmf that would otherwise grow with every extra unsaved wound stays
  // bounded — `cap` is a model's Wounds, and once damage reaches that no
  // further amount changes the outcome.
  function convolveCapped(a, b, cap) {
    var outLen = Math.min(a.length + b.length - 1, cap + 1), i, j, idx;
    var out = new Array(outLen);
    for (i = 0; i < outLen; i++) out[i] = 0;
    for (i = 0; i < a.length; i++) {
      if (!a[i]) continue;
      for (j = 0; j < b.length; j++) {
        if (!b[j]) continue;
        idx = i + j;
        if (idx > cap) idx = cap;
        out[idx] += a[i] * b[j];
      }
    }
    return out;
  }

  // Mixes binomial(n, p) over every possible attack count `n`, weighted by
  // how likely a variable Attacks roll is to land on that count — this is
  // the distribution of unsaved wounds getting through when Attacks itself
  // is random (rolled once, same as the Core Rules sequence).
  function mixedBinomial(attacksPmf, p) {
    var maxN = attacksPmf.length - 1;
    var out = new Array(maxN + 1), n, k;
    for (k = 0; k <= maxN; k++) out[k] = 0;
    for (n = 0; n <= maxN; n++) {
      if (!attacksPmf[n]) continue;
      var bn = binomial(n, p);
      for (k = 0; k <= n; k++) out[k] += attacksPmf[n] * bn[k];
    }
    return out;
  }

  function compute() {
    var hit = hitOutcome();

    // Lance eases the wound need by 1; Anti then caps it at Y+ regardless
    // of Strength vs Toughness.
    var wNeed = woundNeed(state.strength, state.toughness) - (state.lance ? 1 : 0);
    if (wNeed < 2) wNeed = 2;
    if (state.anti < 7 && state.anti < wNeed) wNeed = state.anti;
    var sNeed = saveUsed();

    var woundReroll = state.rerollWound1 ? "ones" : "none";
    var wb = rollBuckets(wNeed, woundReroll);
    var pWound = wb.pLow + wb.pHigh;
    var pFail = sNeed >= 7 ? 1 : (sNeed - 1) / 6;

    // An attack yields 0, 1, or 1+Sustained hits — the last only on a
    // natural 6, so it needs its own bucket, not a plain hit/miss flag.
    // Rapid Fire and Blast both just add flat bonus attacks, so they fold
    // into one shift applied wherever the attack count is produced.
    var sustained = hit.torrent ? 0 : state.sustained;
    var extra = 1 + sustained;
    var bonusAttacks = (state.halfRange ? state.rapidFire : 0) +
      (state.blast ? Math.floor(state.models / 5) : 0);

    var attackHitPmf = new Array(Math.max(2, extra + 1)), i;
    for (i = 0; i < attackHitPmf.length; i++) attackHitPmf[i] = 0;
    attackHitPmf[0] = hit.pMiss;
    attackHitPmf[1] += hit.p1;
    attackHitPmf[extra] += hit.p6;

    // Devastating Wounds: a natural 6 to wound skips the save; anything
    // else still has to beat it as normal. A Lethal Hit skips the wound
    // roll entirely (so it can't roll the 6 Devastating Wounds needs)
    // and goes straight to the save.
    var pNon6Wound = pWound - wb.pHigh;
    var pThroughNormal = state.devWounds ?
      (wb.pHigh * 1 + pNon6Wound * pFail) : (pWound * pFail);
    var pThroughSix = state.lethalHits ? pFail : pThroughNormal;

    // Each attack's wounds-through count is resolved as one random
    // variable right here, not as a global hit total split into streams
    // afterward — normal/six hit totals from the same attacks are
    // correlated, and building each stream's total separately then
    // combining loses that, corrupting the tail (kill%, capped damage)
    // even though the mean comes out right. Resolving per attack and
    // convolving across independent attacks avoids the problem outright.
    var sixThroughPmf = binomial(extra, pThroughSix);
    var attackThroughPmf = new Array(extra + 1);
    for (i = 0; i <= extra; i++) attackThroughPmf[i] = hit.p6 * sixThroughPmf[i];
    attackThroughPmf[0] += hit.pMiss + hit.p1 * (1 - pThroughNormal);
    attackThroughPmf[1] += hit.p1 * pThroughNormal;

    var attacksLabel, hitsPmf, kPmf;
    if (state.attacksDice === 0) {
      var n = state.attacks + bonusAttacks;
      hitsPmf = repeatConvolve(attackHitPmf, n);
      kPmf = repeatConvolve(attackThroughPmf, n);
      attacksLabel = String(n);
    } else {
      var attacksPreset = DICE_PRESETS[state.attacksDice];
      var attacksPmf = shiftPmf(diceDist(attacksPreset), bonusAttacks);
      hitsPmf = mixedRepeat(attacksPmf, attackHitPmf);
      kPmf = mixedRepeat(attacksPmf, attackThroughPmf);
      attacksLabel = attacksPreset.label + (bonusAttacks ? "+" + bonusAttacks : "");
    }
    var maxK = kPmf.length - 1;

    // Feel No Pain thins each damage point independently, so a fixed
    // Damage of D becomes a binomial over D "kept" points — this folds
    // the old fixed-vs-dice split into one path, since a fixed value is
    // just a pmf with all its mass on one number. A minimum-damage floor
    // applies to the raw roll first, before Feel No Pain thins it.
    var baseDamagePmf = floorPmf(state.damageDice === 0 ?
      deltaAt(state.damage) : diceDist(DICE_PRESETS[state.damageDice]), state.minDamage);
    var pFnpIgnore = state.fnp >= 7 ? 0 : (7 - state.fnp) / 6;
    var perHitDamagePmf = mixedBinomial(baseDamagePmf, 1 - pFnpIgnore);

    // Damage past the model's last wound is wasted, so expected damage
    // is the average of min(damage dealt, W). dmgPmf's top index means
    // "W or more", which is also the kill condition, so one loop does both.
    var expDamage = 0, kill = 0, k, d, dmgPmf = [1];
    for (k = 0; k <= maxK; k++) {
      if (k > 0) dmgPmf = convolveCapped(dmgPmf, perHitDamagePmf, state.wounds);
      if (!kPmf[k]) continue;
      for (d = 0; d < dmgPmf.length; d++) {
        if (!dmgPmf[d]) continue;
        expDamage += kPmf[k] * dmgPmf[d] * d;
        if (d >= state.wounds) kill += kPmf[k] * dmgPmf[d];
      }
    }
    if (kill > 1) kill = 1;
    if (kill < 0) kill = 0;

    return {
      hits: expectedValue(hitsPmf),
      wounds: expectedValue(hitsPmf) * pWound,
      through: expectedValue(kPmf),
      damage: expDamage,
      kill: kill,
      hitNeed: hit.need,
      torrent: hit.torrent,
      sustained: sustained,
      woundNeed: wNeed,
      saveNeed: sNeed,
      devWounds: state.devWounds,
      lethalHits: state.lethalHits,
      lance: state.lance,
      anti: state.anti,
      fnp: state.fnp,
      pFnpIgnore: pFnpIgnore,
      attacksLabel: attacksLabel,
      // The base per-roll chances, as fractions. Sustained/Lethal Hits and
      // Devastating Wounds live in the pmfs above, not in these.
      pHit: hit.torrent ? 1 : hit.p1 + hit.p6,
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
    // Attacks and Damage get a dice-roll picker inline, ahead of their own
    // stepper — a native <select> so every profile (including "Fixed", the
    // numeric stepper) is one tap away, not several taps of cycling to reach.
    var dice = f.diceKey ?
      '<span class="ctl-dice-wrap" id="dice-wrap-' + f.diceKey + '">' +
        '<select class="ctl-dice" data-dice="' + f.diceKey +
          '" id="dice-' + f.diceKey + '" aria-label="' + esc(f.label) + ' roll type">' +
          DICE_PRESETS.map(function (p, i) {
            return '<option value="' + i + '"' +
              (state[f.diceKey] === i ? ' selected' : '') + '>' + esc(p.label) + '</option>';
          }).join('') +
        '</select>' +
      '</span>' : '';
    return '<div class="ctl">' +
      '<div class="ctl-label">' +
        '<span class="ctl-name" id="lab-' + f.key + '">' + esc(f.label) + '</span>' +
        (f.hint ? '<span class="ctl-hint">' + esc(f.hint) + '</span>' : '') +
      '</div>' +
      '<div class="ctl-set">' +
        dice +
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
      // The paired numeric stepper locks once its dice selector leaves
      // "Fixed" — the count comes from the roll, not the stepper.
      var locked = f.diceKey && state[f.diceKey] !== 0;
      dec.disabled = locked || state[f.key] <= f.min;
      inc.disabled = locked || state[f.key] >= f.max;

      if (f.diceKey) {
        var diceSel = document.getElementById("dice-" + f.diceKey);
        var diceWrap = document.getElementById("dice-wrap-" + f.diceKey);
        diceSel.value = state[f.diceKey];
        diceSel.classList.toggle("ctl-dice--active", state[f.diceKey] !== 0);
        diceWrap.classList.toggle("ctl-dice-wrap--active", state[f.diceKey] !== 0);
      }
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
      '<span><b>' + esc(r.attacksLabel) + '</b> attacks</span>' +
      '<span><b>' + one(r.hits) + '</b> hits</span>' +
      '<span><b>' + one(r.wounds) + '</b> wounds</span>' +
      '<span><b>' + one(r.through) + '</b> get through</span>';

    var hitName = r.torrent ? "auto-hits" : "to hit " + r.hitNeed + "+" +
      (state.rerollAllHits ? ", re-roll misses" : (state.reroll1 ? ", re-roll 1s" : ""));
    if (r.sustained > 0) hitName += ", sustained hits +" + r.sustained;
    if (r.lethalHits) hitName += ", lethal on 6s";
    var woundName = "to wound " + r.woundNeed + "+" +
      (state.rerollWound1 ? ", re-roll 1s" : "") +
      (r.devWounds ? ", devastating on 6s" : "") +
      (r.lance ? ", lance" : "") +
      (r.anti < 7 ? ", anti " + r.anti + "+" : "");

    var steps = stepHtml(r.pHit, hitName) +
      stepHtml(r.pWound, woundName) +
      stepHtml(r.pFail, r.saveNeed >= 7 ? "no save" : "save " + r.saveNeed + "+ fails");
    if (r.fnp < 7) steps += stepHtml(r.pFnpIgnore, "feel no pain " + r.fnp + "+ ignores");

    document.getElementById("r-steps").innerHTML = steps;
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

  // The dice-roll picker is a native <select>, so every profile is one tap
  // away in the OS's own picker instead of several taps of cycling.
  document.addEventListener("change", function (e) {
    var sel = e.target.closest ? e.target.closest("select.ctl-dice") : null;
    if (!sel) return;
    state[sel.getAttribute("data-dice")] = parseInt(sel.value, 10);
    render();
  });

  render();

  // Exposed so the maths can be checked from the console without clicking
  // through the whole page.
  window.oddsDebug = { state: state, compute: compute, render: render };
})();
