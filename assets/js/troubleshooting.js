// Open every entry before printing and put them back afterwards. A
// troubleshooting page printed with all the answers collapsed is useless, and
// CSS alone can't reliably reveal a closed <details> across browsers.
(function () {
  var entries = Array.prototype.slice.call(document.querySelectorAll(".fix"));
  if (!entries.length) return;

  var wasOpen = [];

  function openAll() {
    wasOpen = entries.map(function (d) { return d.open; });
    entries.forEach(function (d) { d.open = true; });
  }

  function restore() {
    entries.forEach(function (d, i) { d.open = wasOpen[i]; });
  }

  window.addEventListener("beforeprint", openAll);
  window.addEventListener("afterprint", restore);
})();
