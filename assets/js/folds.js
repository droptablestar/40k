/* Deep links into collapsed content.
 *
 * The nav submenus and jump navs link straight to a section, and some of
 * those sections now keep their body in a <details class="fold">. Landing on
 * a closed one shows a heading and nothing else, which reads as a broken
 * link. Chrome opens a <details> when navigation targets something inside it;
 * Safari and Firefox are less consistent, and none of them help when the
 * target is the section *containing* the fold rather than the fold itself.
 *
 * So: open any fold that contains the target, plus the first fold inside a
 * targeted section. No-JS still gets a usable page — the content is one tap
 * away, not missing.
 */
(function () {
  /* The one fold that *is* an element's body, or null. Strictly the whole
   * body — something that merely contains a fold (an opt-in aside among other
   * content) must stay shut, or the fold may as well not exist, and a run of
   * folds is a menu where opening whichever comes first is just noise. */
  function bodyFold(el) {
    var body = Array.prototype.filter.call(el.children, function (child) {
      return !/^H[1-6]$/.test(child.tagName);
    });
    if (body.length === 1 && body[0].matches && body[0].matches("details.fold")) {
      return body[0];
    }
    return null;
  }

  function openFor(hash) {
    if (!hash || hash.length < 2) return;
    var target;
    try {
      target = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch (e) {
      return;
    }
    if (!target) return;

    // folds the target sits inside (it may itself be one)
    var node = target;
    while (node) {
      if (node.tagName === "DETAILS" && node.classList.contains("fold")) {
        node.open = true;
      }
      node = node.parentElement;
    }

    /* A target whose entire body is one fold: open it, or the link lands on
     * a heading with nothing under it. Applies to a section and to a column
     * of a split section, which carries its own id. */
    var fold = bodyFold(target);

    /* A split section carries the id of its *first* column — the second
     * column has its own — so the section's body is two columns, not one
     * fold. Fall through to the first column's fold, which is the heading
     * the section id is named after. */
    if (!fold && target.classList.contains("fold-section")) {
      var firstColumn = target.querySelector(":scope > div");
      if (firstColumn) fold = bodyFold(firstColumn);
    }

    if (fold) fold.open = true;

    // opening changes the page height, so the browser's own scroll to the
    // anchor can land short — put it back on the target afterwards
    if (target.scrollIntoView) target.scrollIntoView();
  }

  openFor(window.location.hash);
  window.addEventListener("hashchange", function () {
    openFor(window.location.hash);
  });

  /* The "#" link beside a folded heading is for grabbing a link to the
   * section, not for toggling it. Keep the click off the summary so an open
   * section doesn't slam shut when you reach for its permalink. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".heading-anchor");
    if (a && a.closest("summary")) e.stopPropagation();
  }, true);

  /* Printing. A printed page of headings with every answer collapsed is
   * useless, and CSS alone can't reliably reopen a <details> — the content is
   * hidden via ::details-content, which older browsers don't expose. So open
   * everything before the print dialog and put it back afterwards. This
   * covers every disclosure on the site, not just .fold. */
  var reopened = [];
  // Both the beforeprint event and the print media query can fire for one
  // print. Without this guard the second call finds everything already open,
  // records an empty list, and nothing gets closed again afterwards.
  var printing = false;

  function openAllForPrint() {
    if (printing) return;
    printing = true;
    reopened = [];
    Array.prototype.forEach.call(
      document.querySelectorAll("details:not([open])"),
      function (d) {
        // the nav dropdowns are chrome, not content — leave them shut
        if (d.classList.contains("nav-drop")) return;
        reopened.push(d);
        d.open = true;
      }
    );
  }

  function restoreAfterPrint() {
    if (!printing) return;
    printing = false;
    reopened.forEach(function (d) { d.open = false; });
    reopened = [];
  }

  window.addEventListener("beforeprint", openAllForPrint);
  window.addEventListener("afterprint", restoreAfterPrint);

  // Safari fires no beforeprint; it only flips the print media query.
  if (window.matchMedia) {
    var mq = window.matchMedia("print");
    var onChange = function (e) {
      if (e.matches) openAllForPrint();
      else restoreAfterPrint();
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
})();
