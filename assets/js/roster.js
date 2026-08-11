/* Paint log: units in the army, and how far each one is through painting.
   State on the device only — see assets/js/store.js for the storage guard. */
(function(){
  "use strict";

  var store = window.BenchStore.open("benchtable:roster:v1");

  /* ---------- stages ----------
     The order of work from painting.html, "Your first model, end to end",
     with its three prep steps (clip, mould lines, glue) counted as one.
     READY is the first stage that counts as table-ready; everything from
     there up counts too. */

  var STAGES = [
    { name: "On sprue",   note: "Still in the box or on the sprue." },
    { name: "Built",      note: "Clipped, mould lines scraped, glued." },
    { name: "Primed",     note: "Thin passes, several angles." },
    { name: "Basecoated", note: "Big areas, thinned paint, two coats." },
    { name: "Washed",     note: "A dark wash for the recesses." },
    { name: "Highlighted",note: "Raised areas brought back up." },
    { name: "Details",    note: "Eyes, weapons, pouches, seals." },
    { name: "Based",      note: "Texture on the base, rim painted." },
    { name: "Varnished",  note: "Matt spray, so it survives handling." }
  ];

  var READY = 7; // "Based" — see the note on the page for why the line sits here
  var LAST  = STAGES.length - 1;

  /* ---------- state ---------- */

  function num(v){ v = parseInt(v, 10); return isNaN(v) ? 0 : v; }
  function clamp(v, lo, hi){ return Math.min(hi, Math.max(lo, v)); }

  function blank(){ return { units: [] }; }

  function load(){
    var saved = store.read();
    if (!saved || !saved.units || !saved.units.length) return blank();
    // normalise, so an old or hand-edited save cannot break the page
    return {
      units: saved.units.filter(function(u){ return u && typeof u === "object"; })
        .map(function(u, i){
          return {
            id:     typeof u.id === "string" ? u.id : "u" + Date.now() + i,
            name:   typeof u.name === "string" && u.name ? u.name : "Unit",
            models: clamp(num(u.models) || 1, 1, 99),
            stage:  clamp(num(u.stage), 0, LAST)
          };
        })
    };
  }

  var log = load();
  var pending = 1; // model count in the add form

  function save(){ store.write(log); }

  if (!store.usable) {
    document.getElementById("nostore").hidden = false;
    document.getElementById("saved").textContent = "Session only";
  }

  /* ---------- elements ---------- */

  var unitsEl  = document.getElementById("units");
  var emptyEl  = document.getElementById("empty");
  var pctEl    = document.getElementById("pct");
  var fillEl   = document.getElementById("pfill");
  var modelsEl = document.getElementById("pmodels");
  var punitsEl = document.getElementById("punits");
  var nameEl   = document.getElementById("uname");
  var countEl  = document.getElementById("umodels");
  var formEl   = document.getElementById("add");

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }

  /* ---------- rendering ---------- */

  function totals(){
    var t = { models: 0, ready: 0, units: 0, readyUnits: 0 };
    log.units.forEach(function(u){
      t.models += u.models;
      t.units  += 1;
      if (u.stage >= READY){ t.ready += u.models; t.readyUnits += 1; }
    });
    return t;
  }

  function renderProgress(){
    var t   = totals();
    var pct = t.models ? Math.round((t.ready / t.models) * 100) : 0;
    pctEl.textContent    = pct;
    fillEl.style.width   = pct + "%";
    modelsEl.textContent = t.ready + " / " + t.models + " models";
    punitsEl.textContent = t.readyUnits + " / " + t.units + " units";
  }

  function ladder(stage){
    var html = "";
    for (var i = 0; i <= LAST; i++){
      html += '<i class="dot' + (i <= stage ? " on" : "") +
              (i === READY ? " line" : "") + '"></i>';
    }
    return '<span class="ladder" aria-hidden="true">' + html + '</span>';
  }

  function unitRow(u){
    var s    = STAGES[u.stage];
    var next = u.stage < LAST ? STAGES[u.stage + 1].name : null;
    var lbl  = next ? "Move " + u.name + " on to " + next
                    : u.name + " is finished";

    return '<li class="unit' + (u.stage >= READY ? " ready" : "") + '">' +
      '<button class="uadv" type="button" data-act="next" data-id="' + u.id +
        '" aria-label="' + esc(lbl) + '"' + (next ? "" : " disabled") + '>' +
        '<span class="uname">' + esc(u.name) + '</span>' +
        '<span class="ustage">' + s.name + '</span>' +
        ladder(u.stage) +
        '<span class="umeta">' + u.models + (u.models === 1 ? " model" : " models") +
          ' &middot; stage ' + (u.stage + 1) + ' of ' + STAGES.length + '</span>' +
      '</button>' +
      '<div class="uside">' +
        '<button class="ubtn" type="button" data-act="back" data-id="' + u.id +
          '" aria-label="Step ' + esc(u.name) + ' back a stage"' +
          (u.stage ? "" : " disabled") + '>&larr;</button>' +
        '<button class="ubtn del" type="button" data-act="del" data-id="' + u.id +
          '" aria-label="Delete ' + esc(u.name) + '">&times;</button>' +
      '</div>' +
    '</li>';
  }

  function render(){
    unitsEl.innerHTML = log.units.map(unitRow).join("");
    emptyEl.hidden = log.units.length > 0;
    renderProgress();
    save();
  }

  function renderKey(){
    document.getElementById("stage-key").innerHTML = STAGES.map(function(s, i){
      return '<li' + (i === READY ? ' class="mark-ready"' : "") + '><div><b>' +
        s.name + '</b><span>' + s.note +
        (i === READY ? " Table-ready from here up." : "") +
        '</span></div></li>';
    }).join("");
  }

  /* ---------- events ---------- */

  function find(id){
    for (var i = 0; i < log.units.length; i++){
      if (log.units[i].id === id) return log.units[i];
    }
    return null;
  }

  unitsEl.addEventListener("click", function(e){
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var u = find(b.getAttribute("data-id"));
    if (!u) return;
    var act = b.getAttribute("data-act");

    if (act === "next"){ u.stage = Math.min(LAST, u.stage + 1); }
    else if (act === "back"){ u.stage = Math.max(0, u.stage - 1); }
    else if (act === "del"){
      if (!window.confirm("Delete " + u.name + " from the log?")) return;
      log.units = log.units.filter(function(x){ return x !== u; });
    }
    render();
  });

  formEl.addEventListener("click", function(e){
    var b = e.target.closest("[data-step]");
    if (!b) return;
    pending = clamp(pending + num(b.getAttribute("data-step")), 1, 99);
    countEl.textContent = pending;
  });

  formEl.addEventListener("submit", function(e){
    e.preventDefault();
    var name = nameEl.value.trim();
    if (!name) { nameEl.focus(); return; }
    log.units.push({
      id: "u" + Date.now() + Math.floor(Math.random() * 1000),
      name: name, models: pending, stage: 0
    });
    nameEl.value = "";
    pending = 1;
    countEl.textContent = pending;
    render();
    nameEl.focus();
  });

  document.getElementById("clear").addEventListener("click", function(){
    if (!log.units.length) return;
    if (!window.confirm("Clear the whole paint log? Every unit goes.")) return;
    log = blank();
    render();
  });

  renderKey();
  render();
})();
