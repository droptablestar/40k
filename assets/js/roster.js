/* Paint log: the armies you own, the units in them, and how far each unit is
   through painting.

   Two copies of the log exist. The device copy (localStorage, via store.js) is
   what this file reads and writes, always and immediately — a tap never waits
   on a network. The durable copy lives in D1 under the log's four-word code;
   paint-log-sync.js carries edits up to it and merges anything the other
   device changed back down. Losing the browser's copy costs nothing as long as
   you still have the code, which is the point of the whole arrangement. */
(function(){
  "use strict";

  var store = window.BenchStore.open("benchtable:roster:v2");
  var old   = window.BenchStore.open("benchtable:roster:v1");
  var ack   = window.BenchStore.open("benchtable:roster-code-seen:v1");

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

  var BOXES = window.CombatPatrols || [];

  /* ---------- small helpers ---------- */

  function num(v){ v = parseInt(v, 10); return isNaN(v) ? 0 : v; }
  function clamp(v, lo, hi){ return Math.min(hi, Math.max(lo, v)); }
  /* Every row carries the moment it changed, and the merge on both ends keeps
     the newer one. Two taps inside the same millisecond would otherwise tie,
     and a tie loses the second tap — so the clock is nudged forward instead of
     ever repeating itself. */
  var lastStamp = 0;
  function now(){
    lastStamp = Math.max(Date.now(), lastStamp + 1);
    return lastStamp;
  }

  function rid(prefix){
    var n = Math.floor(Math.random() * 1e9);
    if (window.crypto && window.crypto.getRandomValues){
      var b = new Uint32Array(1);
      window.crypto.getRandomValues(b);
      n = b[0];
    }
    return prefix + now().toString(36) + n.toString(36);
  }

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }

  function live(list){
    return (list || []).filter(function(x){ return !x.deletedAt; });
  }

  /* ---------- the document ---------- */

  function blank(code){ return { code: code, label: "", rev: 0, factions: [] }; }

  function cleanUnit(u, i){
    return {
      id:        typeof u.id === "string" ? u.id : rid("u"),
      name:      typeof u.name === "string" && u.name ? u.name : "Unit",
      models:    clamp(num(u.models) || 1, 1, 99),
      stage:     clamp(num(u.stage), 0, LAST),
      sort:      num(u.sort) || i,
      updatedAt: num(u.updatedAt) || now(),
      deletedAt: u.deletedAt ? num(u.deletedAt) : null
    };
  }

  function cleanFaction(f, i){
    return {
      id:        typeof f.id === "string" ? f.id : rid("f"),
      name:      typeof f.name === "string" && f.name ? f.name : "Army",
      box:       typeof f.box === "string" ? f.box : "",
      sort:      num(f.sort) || i,
      updatedAt: num(f.updatedAt) || now(),
      deletedAt: f.deletedAt ? num(f.deletedAt) : null,
      units: (Array.isArray(f.units) ? f.units : [])
        .filter(function(u){ return u && typeof u === "object"; })
        .map(cleanUnit)
    };
  }

  /* Normalise anything that arrives — an old save, a hand-edited one, or a
     reply from the server — so a bad shape can never break the page. */
  function cleanDoc(raw, code){
    if (!raw || typeof raw !== "object") return blank(code);
    var out = {
      code:  code,
      label: typeof raw.label === "string" ? raw.label : "",
      rev:   num(raw.rev),
      factions: (Array.isArray(raw.factions) ? raw.factions : [])
        .filter(function(f){ return f && typeof f === "object"; })
        .map(cleanFaction)
    };
    // Never hand out a stamp older than something already in the log — the
    // other device's clock may be a little ahead of this one's.
    out.factions.forEach(function(f){
      lastStamp = Math.max(lastStamp, f.updatedAt);
      f.units.forEach(function(u){ lastStamp = Math.max(lastStamp, u.updatedAt); });
    });
    return out;
  }

  /* The first version of this page kept a flat list of units and no code.
     Anything logged then becomes one unnamed army in the new shape. */
  function carryOver(code){
    var was = old.read();
    if (!was || !was.units || !was.units.length) return null;
    var doc = blank(code);
    doc.factions.push(cleanFaction({
      id: rid("f"), name: "My army", sort: 0, updatedAt: now(),
      units: was.units
    }, 0));
    return doc;
  }

  /* ---------- state ---------- */

  var doc  = null;
  var code = null;
  var sync = null;

  var el = {
    start:     document.getElementById("start"),
    startNew:  document.getElementById("start-new"),
    startOpen: document.getElementById("start-open"),
    startCode: document.getElementById("start-code"),
    startErr:  document.getElementById("start-err"),
    body:      document.getElementById("logbody"),
    codeVal:   document.getElementById("codeval"),
    logName:   document.getElementById("logname"),
    codeWrite: document.getElementById("codewrite"),
    codeOk:    document.getElementById("codeok"),
    codeCopy:  document.getElementById("codecopy"),
    codeSwap:  document.getElementById("codeswitch"),
    codeSync:  document.getElementById("codesync"),
    factions:  document.getElementById("factions"),
    empty:     document.getElementById("empty"),
    pct:       document.getElementById("pct"),
    fill:      document.getElementById("pfill"),
    models:    document.getElementById("pmodels"),
    units:     document.getElementById("punits"),
    pick:      document.getElementById("fpick"),
    fname:     document.getElementById("fname"),
    fnameWrap: document.getElementById("fnamewrap"),
    addf:      document.getElementById("addf"),
    saved:     document.getElementById("saved"),
    clear:     document.getElementById("clear")
  };

  if (!store.usable) {
    document.getElementById("nostore").hidden = false;
    el.saved.textContent = "Not kept on this device";
  }

  function saveLocal(){ store.write({ code: code, doc: doc }); }

  function touched(){
    saveLocal();
    if (sync) sync.push(doc);
    render();
  }

  /* ---------- totals ---------- */

  function tally(factions){
    var t = { models: 0, ready: 0, units: 0, readyUnits: 0 };
    factions.forEach(function(f){
      live(f.units).forEach(function(u){
        t.models += u.models;
        t.units  += 1;
        if (u.stage >= READY){ t.ready += u.models; t.readyUnits += 1; }
      });
    });
    return t;
  }

  function pctOf(t){ return t.models ? Math.round((t.ready / t.models) * 100) : 0; }

  /* ---------- rendering ---------- */

  function ladder(stage){
    var html = "";
    for (var i = 0; i <= LAST; i++){
      html += '<i class="dot' + (i <= stage ? " on" : "") +
              (i === READY ? " line" : "") + '"></i>';
    }
    return '<span class="ladder" aria-hidden="true">' + html + '</span>';
  }

  function unitRow(f, u){
    var s    = STAGES[u.stage];
    var next = u.stage < LAST ? STAGES[u.stage + 1].name : null;
    var lbl  = next ? "Move " + u.name + " on to " + next
                    : u.name + " is finished";
    var ids  = ' data-f="' + f.id + '" data-u="' + u.id + '"';

    return '<li class="unit' + (u.stage >= READY ? " ready" : "") + '">' +
      '<button class="uadv" type="button" data-act="next"' + ids +
        ' aria-label="' + esc(lbl) + '"' + (next ? "" : " disabled") + '>' +
        '<span class="uname">' + esc(u.name) + '</span>' +
        '<span class="ustage">' + s.name + '</span>' +
        ladder(u.stage) +
        '<span class="umeta">' + u.models + (u.models === 1 ? " model" : " models") +
          ' &middot; stage ' + (u.stage + 1) + ' of ' + STAGES.length + '</span>' +
      '</button>' +
      '<div class="uside">' +
        '<button class="ubtn" type="button" data-act="back"' + ids +
          ' aria-label="Step ' + esc(u.name) + ' back a stage"' +
          (u.stage ? "" : " disabled") + '>&larr;</button>' +
        '<button class="ubtn del" type="button" data-act="delunit"' + ids +
          ' aria-label="Delete ' + esc(u.name) + '">&times;</button>' +
      '</div>' +
    '</li>';
  }

  function factionBlock(f){
    var units = live(f.units).sort(function(a, b){ return a.sort - b.sort; });
    var t     = tally([f]);
    var pct   = pctOf(t);

    return '<section class="faction" aria-labelledby="fh-' + f.id + '">' +
      '<header class="fhead">' +
        '<div class="fid">' +
          '<h2 id="fh-' + f.id + '">' + esc(f.name) + '</h2>' +
          (f.box ? '<p class="fbox">' + esc(f.box) + '</p>' : "") +
        '</div>' +
        '<p class="fpct"><output>' + pct + '</output><span>%</span></p>' +
        '<button class="ubtn del fdel" type="button" data-act="delfaction" ' +
          'data-f="' + f.id + '" aria-label="Remove ' + esc(f.name) +
          ' from the log">&times;</button>' +
      '</header>' +
      '<p class="fmeta">' + t.ready + " / " + t.models + ' models table-ready' +
        ' &middot; ' + t.readyUnits + " / " + t.units + ' units</p>' +
      '<div class="fbar"><div class="ffill" style="width:' + pct + '%"></div></div>' +
      (units.length
        ? '<ul class="units">' + units.map(function(u){ return unitRow(f, u); }).join("") + '</ul>'
        : '<p class="fnone">No units in this army yet.</p>') +
      '<details class="fadd">' +
        '<summary>Add a unit</summary>' +
        '<form class="addu" data-f="' + f.id + '">' +
          '<div class="addu-name">' +
            '<label for="un-' + f.id + '">Unit</label>' +
            '<input id="un-' + f.id + '" type="text" maxlength="40" ' +
              'autocomplete="off" placeholder="Intercessor Squad" required>' +
          '</div>' +
          '<div class="addu-count">' +
            '<label for="um-' + f.id + '">Models</label>' +
            '<div class="stepper">' +
              '<button class="step" type="button" data-step="-1" ' +
                'aria-label="One fewer model">&minus;</button>' +
              '<output id="um-' + f.id + '" aria-live="polite">1</output>' +
              '<button class="step" type="button" data-step="1" ' +
                'aria-label="One more model">+</button>' +
            '</div>' +
          '</div>' +
          '<button class="btn" type="submit">Add unit</button>' +
        '</form>' +
      '</details>' +
    '</section>';
  }

  function renderProgress(factions){
    var t   = tally(factions);
    var pct = pctOf(t);
    el.pct.textContent    = pct;
    el.fill.style.width   = pct + "%";
    el.models.textContent = t.ready + " / " + t.models + " models";
    el.units.textContent  = t.readyUnits + " / " + t.units + " units";
  }

  function render(){
    var factions = live(doc.factions).sort(function(a, b){ return a.sort - b.sort; });
    el.factions.innerHTML = factions.map(factionBlock).join("");
    el.empty.hidden = factions.length > 0;
    renderProgress(factions);
  }

  function renderKey(){
    document.getElementById("stage-key").innerHTML = STAGES.map(function(s, i){
      return '<li' + (i === READY ? ' class="mark-ready"' : "") + '><div><b>' +
        s.name + '</b><span>' + s.note +
        (i === READY ? " Table-ready from here up." : "") +
        '</span></div></li>';
    }).join("");
  }

  function renderPicker(){
    var html = '<option value="">Empty — I\'ll name it myself</option>';
    if (BOXES.length){
      html += '<optgroup label="Combat Patrol boxes">';
      BOXES.forEach(function(b){
        html += '<option value="' + esc(b.id) + '">' + esc(b.box) + '</option>';
      });
      html += "</optgroup>";
    }
    el.pick.innerHTML = html;
  }

  /* ---------- finding things ---------- */

  function faction(id){
    for (var i = 0; i < doc.factions.length; i++){
      if (doc.factions[i].id === id) return doc.factions[i];
    }
    return null;
  }

  function unit(f, id){
    for (var i = 0; i < f.units.length; i++){
      if (f.units[i].id === id) return f.units[i];
    }
    return null;
  }

  /* ---------- edits ---------- */

  el.factions.addEventListener("click", function(e){
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var f = faction(b.getAttribute("data-f"));
    if (!f) return;
    var act = b.getAttribute("data-act");

    if (act === "delfaction"){
      if (!window.confirm("Remove " + f.name + " and its units from the log?")) return;
      f.deletedAt = now();
      f.updatedAt = now();
      touched();
      return;
    }

    var u = unit(f, b.getAttribute("data-u"));
    if (!u) return;

    if (act === "next")      u.stage = Math.min(LAST, u.stage + 1);
    else if (act === "back") u.stage = Math.max(0, u.stage - 1);
    else if (act === "delunit"){
      if (!window.confirm("Delete " + u.name + " from the log?")) return;
      u.deletedAt = now();
    }
    u.updatedAt = now();
    touched();
  });

  /* the per-army model stepper */
  el.factions.addEventListener("click", function(e){
    var b = e.target.closest("[data-step]");
    if (!b) return;
    var out = b.parentNode.querySelector("output");
    out.textContent = clamp(num(out.textContent) + num(b.getAttribute("data-step")), 1, 99);
  });

  el.factions.addEventListener("submit", function(e){
    var form = e.target.closest(".addu");
    if (!form) return;
    e.preventDefault();
    var f = faction(form.getAttribute("data-f"));
    if (!f) return;
    var input = form.querySelector("input");
    var name  = input.value.trim();
    if (!name){ input.focus(); return; }
    f.units.push(cleanUnit({
      id: rid("u"), name: name,
      models: num(form.querySelector("output").textContent) || 1,
      stage: 0, sort: f.units.length, updatedAt: now()
    }, f.units.length));
    touched();
    // the list re-renders, so put the cursor back where the person was typing
    var again = el.factions.querySelector('.addu[data-f="' + f.id + '"]');
    if (again){
      again.closest("details").open = true;
      again.querySelector("input").focus();
    }
  });

  el.pick.addEventListener("change", function(){
    el.fnameWrap.hidden = !!el.pick.value;
  });

  el.addf.addEventListener("submit", function(e){
    e.preventDefault();
    var boxId = el.pick.value;
    var box   = null;
    for (var i = 0; i < BOXES.length; i++){ if (BOXES[i].id === boxId) box = BOXES[i]; }

    var name = box ? box.faction : el.fname.value.trim();
    if (!name){ el.fname.focus(); return; }

    var f = cleanFaction({
      id: rid("f"), name: name, box: box ? box.box : "",
      sort: doc.factions.length, updatedAt: now(),
      units: box ? box.units.map(function(u, i){
        return { id: rid("u"), name: u.name, models: u.models, stage: 0,
                 sort: i, updatedAt: now() };
      }) : []
    }, doc.factions.length);

    doc.factions.push(f);
    el.fname.value = "";
    el.pick.value = "";
    el.fnameWrap.hidden = false;
    touched();
  });

  el.clear.addEventListener("click", function(){
    if (!live(doc.factions).length) return;
    if (!window.confirm("Clear the whole paint log? Every army goes.")) return;
    doc.factions.forEach(function(f){
      f.deletedAt = f.deletedAt || now();
      f.updatedAt = now();
      f.units.forEach(function(u){
        u.deletedAt = u.deletedAt || now();
        u.updatedAt = now();
      });
    });
    touched();
  });

  /* ---------- the code ---------- */

  function showCode(){
    el.codeVal.textContent = code;
    el.codeWrite.hidden = ack.read() === code;
    showName();
  }

  /* the name is only written back on change, so a poll landing mid-type
     doesn't yank the field out from under the person typing in it. */
  function showName(){
    if (document.activeElement !== el.logName){
      el.logName.value = doc.label || "";
    }
    document.title = (doc.label ? doc.label + " — " : "") +
      "Paint log — Bench & Table";
  }

  el.logName.addEventListener("change", function(){
    var name = el.logName.value.trim().slice(0, 60);
    if (name === doc.label) return;
    doc.label = name;
    el.logName.value = name;
    document.title = (name ? name + " — " : "") + "Paint log — Bench & Table";
    touched();
  });

  el.codeOk.addEventListener("click", function(){
    ack.write(code);
    el.codeWrite.hidden = true;
  });

  el.codeCopy.addEventListener("click", function(){
    var said = function(msg){
      el.codeCopy.textContent = msg;
      window.setTimeout(function(){ el.codeCopy.textContent = "Copy code"; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(code).then(function(){ said("Copied"); },
                                              function(){ said("Copy failed"); });
    } else {
      said("Select it and copy");
    }
  });

  el.codeSwap.addEventListener("click", function(){
    var typed = window.prompt(
      "Open another log. Type its four-word code, or leave this blank and " +
      "press OK to start a new one.\n\nThis log stays where it is — you can " +
      "come back to it with the code " + code + ".", "");
    if (typed === null) return;
    typed = typed.trim().toLowerCase();
    if (!typed){ startNew(); return; }
    if (!window.PaintLogSync.valid(typed)){
      window.alert("That isn't a log code. They are four words joined by dashes.");
      return;
    }
    go(typed, blank(typed));
  });

  function syncStatus(state){
    if (state === "synced"){
      el.codeSync.textContent = "Backed up. Open this code anywhere to get it back.";
      el.saved.textContent = "Saved";
    } else if (state === "saving"){
      el.codeSync.textContent = "Saving…";
      el.saved.textContent = "Saving…";
    } else if (state === "offline"){
      el.codeSync.textContent =
        "No connection. Saved on this device and will go up when there is one.";
      el.saved.textContent = "Saved on this device";
    } else if (state === "local"){
      el.codeSync.textContent =
        "Backup isn't switched on for this site yet, so this log is on this " +
        "device only.";
      el.saved.textContent = "Saved on this device";
    }
  }

  /* ---------- starting up ---------- */

  function urlCode(){
    var m = window.location.search.match(/[?&]log=([^&]+)/);
    if (!m) return null;
    var c = decodeURIComponent(m[1]).trim().toLowerCase();
    return window.PaintLogSync.valid(c) ? c : null;
  }

  function putCodeInUrl(){
    if (!window.history || !window.history.replaceState) return;
    window.history.replaceState(null, "", "/roster.html?log=" + code);
  }

  function go(nextCode, nextDoc){
    if (sync){ sync.close(); sync = null; }
    code = nextCode;
    doc  = cleanDoc(nextDoc, code);
    putCodeInUrl();
    saveLocal();
    showCode();
    el.start.hidden = true;
    el.body.hidden = false;
    render();

    var opened = window.PaintLogSync.open({
      code: code,
      onStatus: function(state){ if (code === nextCode) syncStatus(state); },
      onDoc: function(server){
        if (code !== nextCode) return; // a different log is on screen now
        doc = cleanDoc(window.PaintLogSync.merge(doc, server), code);
        saveLocal();
        showName();
        render();
      }
    });
    sync = opened;

    // Ask for the server's copy, then make sure ours is up there — a brand new
    // log has to be created, and a log edited offline has changes to hand over.
    opened.pull().then(function(){
      if (code === nextCode) opened.push(doc);
    });
  }

  function startNew(){
    var fresh = window.PaintLogSync.newCode();
    ack.write("");
    go(fresh, carryOver(fresh) || blank(fresh));
  }

  el.startNew.addEventListener("click", startNew);

  el.startOpen.addEventListener("submit", function(e){
    e.preventDefault();
    var typed = el.startCode.value.trim().toLowerCase();
    if (!window.PaintLogSync.valid(typed)){
      el.startErr.hidden = false;
      el.startCode.focus();
      return;
    }
    el.startErr.hidden = true;
    ack.write(typed); // they already have it written down, they just typed it
    go(typed, blank(typed));
  });

  renderKey();
  renderPicker();

  var saved = store.read() || {};
  var wanted = urlCode() || (window.PaintLogSync.valid(saved.code) ? saved.code : null);

  if (wanted){
    go(wanted, wanted === saved.code ? saved.doc : blank(wanted));
  } else {
    el.start.hidden = false;
  }
})();
