/* Master–detail layout for pages whose sections are folded rows (the
 * painting guides, troubleshooting). At >=900px, once this script confirms
 * JS is actually running, the folded index in `.detail-nav` becomes a
 * permanent sidebar and exactly one `.fold-section` is shown at a time in
 * `.detail-panels` beside it — better for looking something up mid-task than
 * scrolling a stack of accordion rows.
 *
 * Below 900px, or with JS disabled, none of this runs: `.detail-nav` stays
 * `display:none` (see style.css) and every `.fold-section` is exactly the
 * accordion it already was. This script only ever toggles the `hidden`
 * attribute on top-level folds and their sections — it never removes or
 * replaces markup, and it never touches folds nested *inside* a section
 * (a colour's own entry, a single "fix" card) — so no-JS, deep links, and
 * print all still have every section, and folds.js's own deep-link and
 * print handling keeps working unchanged underneath this.
 */
(function () {
  var groups = Array.prototype.slice.call(document.querySelectorAll(".detail"));
  if (!groups.length) return;

  var mq = window.matchMedia("(min-width:900px)");

  groups.forEach(function (group) {
    var nav = group.querySelector(".detail-nav");
    var panels = group.querySelector(".detail-panels");
    if (!nav || !panels) return;

    var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
    var sections = Array.prototype.slice.call(panels.querySelectorAll(":scope > .fold-section"));
    if (!links.length || !sections.length) return;

    // The in-page jump nav (jump.njk) sits directly before `.detail` and
    // lists the same sections again — keep it for the accordion, hide it
    // once the sidebar is doing that job instead.
    var jump = group.previousElementSibling;
    if (!jump || !jump.classList || !jump.classList.contains("jump")) jump = null;

    var active = false;

    /* The fold that *is* an id'd element's own body — mirrors folds.js's
     * bodyFold, but also covers a split section whose outer element carries
     * the first column's id, with no id of its own on that column's div
     * (see painting.html's #loading / #rinsing pair). */
    function foldFor(el) {
      if (!el) return null;
      if (el.classList.contains("fold")) return el;
      var direct = el.querySelector(":scope > .fold");
      if (direct) return direct;
      if (el.classList.contains("fold-section")) {
        var firstDiv = el.querySelector(":scope > div");
        if (firstDiv) return firstDiv.querySelector(":scope > .fold");
      }
      return null;
    }

    /* The section's top-level folds only — a direct child, or the direct
     * child of a direct child div (the split-section shape). Deliberately
     * stops there: a section's fold-body can contain its own nested folds
     * (a single colour, a single fix) and those must never be hidden by
     * this, or a deep link into one would land on nothing. */
    function topFolds(section) {
      var out = [];
      Array.prototype.forEach.call(section.children, function (child) {
        if (child.classList && child.classList.contains("fold")) {
          out.push(child);
        } else if (child.tagName === "DIV") {
          var f = child.querySelector(":scope > .fold");
          if (f) out.push(f);
        }
      });
      return out;
    }

    function idFor(link) {
      return link.getAttribute("href").slice(1);
    }

    function select(id, opts) {
      opts = opts || {};
      var target = document.getElementById(id);
      var fold = foldFor(target);
      if (!fold) return false;
      var section = fold.closest(".fold-section");
      if (!section || sections.indexOf(section) === -1) return false;

      sections.forEach(function (s) { s.hidden = s !== section; });
      topFolds(section).forEach(function (f) {
        f.hidden = f !== fold;
        if (f === fold) f.open = true;
      });

      links.forEach(function (a) {
        if (idFor(a) === id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });

      if (opts.scroll) {
        var scrollTarget = opts.scrollEl || target;
        if (scrollTarget && scrollTarget.scrollIntoView) scrollTarget.scrollIntoView();
      }
      return true;
    }

    /* Resolves the current #hash to { linkId, el } — el is the actual hash
     * target (which may be nested inside a section, e.g. #c-white inside
     * #colours), linkId is the sidebar entry that owns it. Returns null for
     * an empty or unrecognised hash. */
    function resolveHash() {
      var raw = (window.location.hash || "").slice(1);
      if (!raw) return null;
      try { raw = decodeURIComponent(raw); } catch (e) { return null; }
      var el = document.getElementById(raw);
      if (!el) return null;

      var node = el;
      while (node && node !== panels) {
        if (node.id && links.some(function (a) { return idFor(a) === node.id; })) {
          return { linkId: node.id, el: el };
        }
        node = node.parentElement;
      }
      return null;
    }

    function selectFromHash(scroll) {
      var resolved = resolveHash();
      if (resolved) return select(resolved.linkId, { scroll: scroll, scrollEl: resolved.el });
      return select(idFor(links[0]), { scroll: false });
    }

    function enable() {
      if (active) return;
      active = true;
      group.classList.add("detail-live");
      if (jump) jump.hidden = true;
      // folds.js already ran the initial native anchor scroll, but switching
      // this page to the grid layout changes its height enough to throw
      // that off, so put the target back in view once it has settled.
      selectFromHash(true);
    }

    function disable() {
      if (!active) return;
      active = false;
      group.classList.remove("detail-live");
      if (jump) jump.hidden = false;
      sections.forEach(function (s) { s.hidden = false; });
      Array.prototype.forEach.call(panels.querySelectorAll(".fold-section > .fold, .fold-section > div > .fold"), function (f) {
        f.hidden = false;
      });
      links.forEach(function (a) { a.removeAttribute("aria-current"); });
    }

    function sync() {
      if (mq.matches) enable();
      else disable();
    }

    links.forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (!active) return; // narrow viewport: behave like a normal anchor
        e.preventDefault();
        var id = idFor(a);
        history.pushState(null, "", "#" + id);
        select(id, { scroll: true });
      });
    });

    // Deep links fired after load too — the nav submenu, the jump nav.
    window.addEventListener("hashchange", function () {
      if (!active) return;
      selectFromHash(true);
    });

    // In live mode the sidebar drives selection; a fold's own toggle would
    // otherwise let a tap collapse the only visible panel with no other way
    // to reopen it than reselecting the same sidebar link.
    Array.prototype.forEach.call(panels.querySelectorAll(".fold-section > .fold > summary, .fold-section > div > .fold > summary"), function (summary) {
      summary.addEventListener("click", function (e) {
        if (active) e.preventDefault();
      });
    });

    if (mq.addEventListener) mq.addEventListener("change", sync);
    else if (mq.addListener) mq.addListener(sync);
    sync();

    // Printing must still output every section, not just the selected one.
    var wasActive = false;
    var printing = false; // beforeprint and the print media query can both fire once

    function openForPrint() {
      if (printing) return;
      printing = true;
      wasActive = active;
      if (!active) return;
      sections.forEach(function (s) { s.hidden = false; });
      Array.prototype.forEach.call(panels.querySelectorAll(".fold-section > .fold, .fold-section > div > .fold"), function (f) {
        f.hidden = false;
      });
    }

    function restoreAfterPrint() {
      if (!printing) return;
      printing = false;
      if (!wasActive) return;
      selectFromHash(false);
    }

    window.addEventListener("beforeprint", openForPrint);
    window.addEventListener("afterprint", restoreAfterPrint);
    if (window.matchMedia) {
      var pmq = window.matchMedia("print");
      var onPrintChange = function (e) {
        if (e.matches) openForPrint();
        else restoreAfterPrint();
      };
      if (pmq.addEventListener) pmq.addEventListener("change", onPrintChange);
      else if (pmq.addListener) pmq.addListener(onPrintChange);
    }
  });
})();
