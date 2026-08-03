(function () {
  var tips = Array.prototype.slice.call(document.querySelectorAll(".tip"));
  if (!tips.length) return;

  function keepInView(tip) {
    var panel = tip.querySelector(".tip-panel");
    if (!panel) return;

    // reset to the natural default (left:0 relative to the trigger) before
    // measuring, then clamp with an explicit pixel shift — a left/right
    // toggle isn't enough, since flipping to the right edge can just as
    // easily push the panel off the left edge instead.
    panel.style.left = "0px";
    panel.style.right = "auto";

    var margin = 8;
    var rect = panel.getBoundingClientRect();
    var shift = 0;

    if (rect.right > window.innerWidth - margin) {
      shift = (window.innerWidth - margin) - rect.right;
    }
    if (rect.left + shift < margin) {
      shift += margin - (rect.left + shift);
    }

    if (shift !== 0) panel.style.left = shift + "px";
  }

  tips.forEach(function (tip) {
    // covers tap/click (native <details> toggle)
    tip.addEventListener("toggle", function () {
      if (!tip.open) return;
      keepInView(tip);
      tips.forEach(function (other) {
        if (other !== tip) other.open = false;
      });
    });
    // covers mouse hover (CSS reveals the panel without setting `open`)
    tip.addEventListener("mouseenter", function () {
      keepInView(tip);
      tips.forEach(function (other) {
        if (other !== tip) other.open = false;
      });
    });
  });
})();
