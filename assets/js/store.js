/* Shared localStorage wrapper with an in-memory fallback.
 *
 * Both tools that keep state on the device — the battle tracker and the paint
 * log — need the same three things: a probe to find out whether storage is
 * writable at all, a read/write pair that never throws, and a flag the page
 * can use to show a "this session only" banner. That logic lived in
 * tracker.js first; it is here so the second copy never drifts from the
 * first.
 *
 * Loaded on every page by base.njk, before the page's own pageJs script.
 *
 *   var store = BenchStore.open("benchtable:thing:v1");
 *   store.usable            // false when the browser blocks storage
 *   store.read()            // parsed value, or null
 *   store.write(value)      // JSON, best effort
 */
(function(){
  "use strict";

  var usable = (function(){
    try {
      window.localStorage.setItem("__bt_test", "1");
      window.localStorage.removeItem("__bt_test");
      return true;
    } catch (e) { return false; }
  })();

  window.BenchStore = {
    open: function(key){
      var memory = null;
      return {
        usable: usable,
        read: function(){
          if (!usable) return memory;
          try { return JSON.parse(window.localStorage.getItem(key)); }
          catch (e) { return null; }
        },
        write: function(value){
          if (!usable) { memory = value; return; }
          try { window.localStorage.setItem(key, JSON.stringify(value)); }
          catch (e) { /* quota or private mode; keep going in memory */ }
        }
      };
    }
  };
})();
