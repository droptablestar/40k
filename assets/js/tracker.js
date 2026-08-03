(function(){
  "use strict";

  var KEY = "benchtable:battle:v1";

  /* ---------- storage with in-memory fallback ---------- */

  var store = (function(){
    var memory = null, usable = true;
    try {
      window.localStorage.setItem("__bt_test", "1");
      window.localStorage.removeItem("__bt_test");
    } catch (e) { usable = false; }
    return {
      usable: usable,
      read: function(){
        if (!usable) return memory;
        try { return JSON.parse(window.localStorage.getItem(KEY)); }
        catch (e) { return null; }
      },
      write: function(value){
        if (!usable) { memory = value; return; }
        try { window.localStorage.setItem(KEY, JSON.stringify(value)); }
        catch (e) { /* quota or private mode; keep playing */ }
      }
    };
  })();

  if (!store.usable) {
    document.getElementById("nostore").hidden = false;
    document.getElementById("saved").textContent = "Session only";
  }

  /* ---------- state ---------- */

  function blankArmy(name){
    return { name: name, cp: 0, vp: 0 };
  }

  function blankGame(){
    return { round: 1, active: 0, armies: [blankArmy("Player one"),
                                           blankArmy("Player two")] };
  }

  function load(){
    var saved = store.read();
    if (!saved || !saved.armies || saved.armies.length !== 2) return blankGame();
    // normalise anything missing so an old save cannot break the page
    saved.round  = clamp(saved.round || 1, 1, 5);
    saved.active = saved.active === 1 ? 1 : 0;
    saved.armies.forEach(function(a){
      a.name = typeof a.name === "string" ? a.name : "Player";
      a.cp   = num(a.cp);
      a.vp   = num(a.vp);
    });
    return saved;
  }

  var game = load();

  function num(v){ v = parseInt(v, 10); return isNaN(v) ? 0 : v; }
  function clamp(v, lo, hi){ return Math.min(hi, Math.max(lo, v)); }

  function save(){ store.write(game); }

  /* ---------- rendering ---------- */

  var pipsEl   = document.getElementById("pips");
  var armiesEl = document.getElementById("armies");

  function renderPips(){
    var html = "";
    for (var r = 1; r <= 5; r++){
      html += '<button class="pip" data-round="' + r + '" aria-pressed="' +
              (game.round === r) + '">' + r + '</button>';
    }
    pipsEl.innerHTML = html;
  }

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }

  function armyPanel(a, i){
    return '<section class="army' + (game.active === i ? " turn" : "") + '">' +
      '<div class="army-head">' +
        '<input value="' + esc(a.name) + '" data-act="rename" data-a="' + i +
          '" aria-label="Army name" maxlength="28">' +
        '<button class="turnflag" data-act="turn" data-a="' + i + '">' +
          (game.active === i ? "Active" : "Set active") + '</button>' +
      '</div>' +

      '<div class="counters">' +
        counter("Command points", a.cp, "cp", i) +
        counter("Victory points", a.vp, "vp", i) +
      '</div>' +
    '</section>';
  }

  function counter(label, value, field, i){
    return '<div class="counter">' +
      '<div class="cname">' + label + '</div>' +
      '<div class="row">' +
        '<button class="step" data-act="dec" data-f="' + field + '" data-a="' + i +
          '" aria-label="Decrease ' + label + '">&minus;</button>' +
        '<output>' + value + '</output>' +
        '<button class="step" data-act="inc" data-f="' + field + '" data-a="' + i +
          '" aria-label="Increase ' + label + '">+</button>' +
      '</div></div>';
  }

  function render(){
    renderPips();
    armiesEl.innerHTML = game.armies.map(armyPanel).join("");
    save();
  }

  /* ---------- events ---------- */

  pipsEl.addEventListener("click", function(e){
    var b = e.target.closest("[data-round]");
    if (!b) return;
    game.round = num(b.getAttribute("data-round"));
    render();
  });

  document.getElementById("advance").addEventListener("click", function(){
    game.round = game.round >= 5 ? 5 : game.round + 1;
    render();
  });

  armiesEl.addEventListener("click", function(e){
    var b = e.target.closest("[data-act]");
    if (!b || b.tagName === "INPUT") return;

    var act = b.getAttribute("data-act");
    var ai  = num(b.getAttribute("data-a"));
    var a   = game.armies[ai];
    if (!a) return;

    if (act === "inc" || act === "dec"){
      var f = b.getAttribute("data-f");
      a[f] = Math.max(0, a[f] + (act === "inc" ? 1 : -1));
    }
    else if (act === "turn"){ game.active = ai; }
    render();
  });

  // rename without a full re-render, so the caret does not jump
  armiesEl.addEventListener("input", function(e){
    var el = e.target;
    if (el.getAttribute("data-act") !== "rename") return;
    game.armies[num(el.getAttribute("data-a"))].name = el.value;
    save();
  });

  document.getElementById("newgame").addEventListener("click", function(){
    if (!window.confirm("Start a new game? Points and round all reset.")) return;
    game = blankGame();
    render();
  });

  render();
})();
