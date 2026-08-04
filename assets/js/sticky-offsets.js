// Keeps --bar-h and --jump-h in sync with the real rendered heights of the two
// sticky bars. Neither has a fixed height: the sitebar stacks into a taller
// column under 560px, and the jump nav wraps to a variable number of rows
// depending on how many sections a page has. CSS uses these for the jump nav's
// sticky top offset and for html{scroll-padding-top}, so a stale value means
// jump links land with the heading tucked behind a bar.
//
// The CSS defaults (56px / 0px) are the desktop case, so this is a correction,
// not a requirement — the page is still usable with JS off.
(function () {
  var root = document.documentElement;
  var bar = document.querySelector(".sitebar");
  var jump = document.querySelector(".jump");
  if (!bar && !jump) return;

  function measure() {
    if (bar) root.style.setProperty("--bar-h", bar.offsetHeight + "px");
    // The jump nav is itself sticky and offset by --bar-h, so only its own
    // height belongs here; scroll-padding-top adds the two together.
    if (jump) root.style.setProperty("--jump-h", jump.offsetHeight + "px");
  }

  measure();

  if (window.ResizeObserver) {
    var ro = new ResizeObserver(measure);
    if (bar) ro.observe(bar);
    if (jump) ro.observe(jump);
  } else {
    window.addEventListener("resize", measure);
  }

  // Font swap changes both bars' heights after first paint, and ResizeObserver
  // covers that everywhere it exists — but the resize-only fallback path won't
  // see it, so re-measure once fonts are ready.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
