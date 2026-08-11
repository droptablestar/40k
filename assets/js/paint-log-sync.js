/* Paint log sync: keeps the device's copy and the server's copy in step.
 *
 * The device copy in localStorage is what the page renders from, always. It is
 * written the instant you tap something, so a tap never waits on a network and
 * a dead network never loses an edit — the site has to work at a shop with no
 * signal. This file's whole job is to get that copy up to the durable copy in
 * D1 afterwards, and to bring down anything the other device changed.
 *
 * Merge rule, the same on both ends: every faction and unit carries its own
 * updatedAt, and the newer one wins. A delete sets deletedAt and keeps the row
 * (a tombstone) so a delete made offline is not undone by the other device
 * syncing an older copy of that row back up.
 *
 *   var sync = PaintLogSync.open({
 *     code: "rust-hive-brass-nine",
 *     onDoc: function (doc) { ... },      // server sent something newer
 *     onStatus: function (state) { ... }  // "synced" | "saving" | "offline" | "local"
 *   });
 *   sync.push(doc);   // debounced; retried until it lands
 *   sync.pull();      // ask now, rather than waiting for the poll
 */
(function () {
  "use strict";

  var POLL_MS = 30000;   // only while the tab is visible
  var DEBOUNCE_MS = 800; // taps come in bursts; one write per burst
  var RETRY_MS = 5000;   // first retry after a failure, doubling to a minute
  var RETRY_MAX = 60000;

  var WORDS = window.PaintLogWords || [];
  var CODE_RE = /^[a-z]+(-[a-z]+){3}$/;

  function pick(n) {
    var out = new Array(n), i;
    if (window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint32Array(n);
      window.crypto.getRandomValues(buf);
      for (i = 0; i < n; i++) out[i] = WORDS[buf[i] % WORDS.length];
    } else {
      for (i = 0; i < n; i++) {
        out[i] = WORDS[Math.floor(Math.random() * WORDS.length)];
      }
    }
    return out;
  }

  /* Merge two docs into a new one. Rows present on only one side are kept;
     rows on both sides resolve to whichever was touched last. */
  function mergeDocs(mine, theirs) {
    if (!mine) return theirs;
    if (!theirs) return mine;

    var byId = {};
    var order = [];

    function take(list) {
      (list || []).forEach(function (f) {
        var have = byId[f.id];
        if (!have) {
          byId[f.id] = copyFaction(f);
          order.push(f.id);
          return;
        }
        if ((f.updatedAt || 0) > (have.updatedAt || 0)) {
          var units = have.units;
          byId[f.id] = copyFaction(f);
          byId[f.id].units = units;
        }
        mergeUnits(byId[f.id], f.units);
      });
    }

    function copyFaction(f) {
      return {
        id: f.id, name: f.name, box: f.box || "", sort: f.sort || 0,
        updatedAt: f.updatedAt || 0, deletedAt: f.deletedAt || null,
        units: (f.units || []).map(function (u) { return copyUnit(u); })
      };
    }

    function copyUnit(u) {
      return {
        id: u.id, name: u.name, models: u.models, stage: u.stage,
        sort: u.sort || 0, updatedAt: u.updatedAt || 0,
        deletedAt: u.deletedAt || null
      };
    }

    function mergeUnits(into, units) {
      (units || []).forEach(function (u) {
        for (var i = 0; i < into.units.length; i++) {
          if (into.units[i].id !== u.id) continue;
          if ((u.updatedAt || 0) > (into.units[i].updatedAt || 0)) {
            into.units[i] = copyUnit(u);
          }
          return;
        }
        into.units.push(copyUnit(u));
      });
    }

    take(mine.factions);
    take(theirs.factions);

    return {
      code: mine.code || theirs.code,
      label: mine.label || theirs.label || "",
      rev: Math.max(mine.rev || 0, theirs.rev || 0),
      factions: order.map(function (id) { return byId[id]; })
        .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); })
    };
  }

  function open(opts) {
    var code = opts.code;
    var onDoc = opts.onDoc || function () {};
    var onStatus = opts.onStatus || function () {};

    var url = "/api/paint-log/" + encodeURIComponent(code);
    var queued = null;    // latest doc waiting to go up
    var inflight = false;
    var timer = null;
    var backoff = RETRY_MS;
    var available = true; // false once the server says there is no database

    function status(s) { onStatus(s); }

    function send() {
      timer = null;
      if (inflight || !queued || !available) return;
      var doc = queued;
      queued = null;
      inflight = true;
      status("saving");

      fetch(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: doc.label || "", factions: doc.factions })
      }).then(function (res) {
        if (res.status === 501) { available = false; status("local"); return null; }
        if (!res.ok) throw new Error("http " + res.status);
        return res.json();
      }).then(function (server) {
        inflight = false;
        backoff = RETRY_MS;
        if (!server) return;
        status(queued ? "saving" : "synced");
        onDoc(server);
        if (queued) schedule(0);
      }).catch(function () {
        inflight = false;
        // put it back at the front of the queue; a failed write is not a lost one
        queued = queued ? mergeDocs(doc, queued) : doc;
        status("offline");
        schedule(backoff);
        backoff = Math.min(RETRY_MAX, backoff * 2);
      });
    }

    function schedule(ms) {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(send, ms);
    }

    function push(doc) {
      if (!available) return;
      queued = queued ? mergeDocs(queued, doc) : doc;
      schedule(DEBOUNCE_MS);
    }

    function pull() {
      if (!available) return Promise.resolve(null);
      return fetch(url, { headers: { accept: "application/json" } })
        .then(function (res) {
          if (res.status === 404) return null;          // not created yet
          if (res.status === 501) { available = false; status("local"); return null; }
          if (!res.ok) throw new Error("http " + res.status);
          return res.json();
        })
        .then(function (server) {
          if (server) { onDoc(server); status(inflight || queued ? "saving" : "synced"); }
          return server;
        })
        .catch(function () { status("offline"); return null; });
    }

    var poll = window.setInterval(function () {
      if (document.visibilityState === "visible" && !queued) pull();
    }, POLL_MS);

    function wake() { schedule(0); pull(); }
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") wake();
    });

    return {
      code: code,
      push: push,
      pull: pull,
      /* Opening a different log closes this one, or its polling would keep
         pushing the old log's rows into the page. */
      close: function () {
        available = false;
        queued = null;
        window.clearInterval(poll);
        window.removeEventListener("online", wake);
      },
      get available() { return available; }
    };
  }

  window.PaintLogSync = {
    newCode: function () { return pick(4).join("-"); },
    valid: function (code) { return typeof code === "string" && CODE_RE.test(code.trim()); },
    merge: mergeDocs,
    open: open
  };
})();
