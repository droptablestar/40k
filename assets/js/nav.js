(function () {
  var drops = Array.prototype.slice.call(document.querySelectorAll(".nav-drop"));
  if (!drops.length) return;

  drops.forEach(function (drop) {
    drop.addEventListener("toggle", function () {
      if (!drop.open) return;
      drops.forEach(function (other) {
        if (other !== drop) other.open = false;
      });
    });
  });

  document.addEventListener("click", function (e) {
    drops.forEach(function (drop) {
      if (drop.open && !drop.contains(e.target)) drop.open = false;
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    drops.forEach(function (drop) {
      if (drop.open) {
        drop.open = false;
        drop.querySelector("summary").focus();
      }
    });
  });

  var hoverCapable = window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (hoverCapable) {
    drops.forEach(function (drop) {
      var closeTimer;
      drop.addEventListener("mouseenter", function () {
        clearTimeout(closeTimer);
        drops.forEach(function (other) {
          if (other !== drop) other.open = false;
        });
        drop.open = true;
      });
      drop.addEventListener("mouseleave", function () {
        closeTimer = setTimeout(function () { drop.open = false; }, 150);
      });
      // e.detail === 0 means the click was keyboard-activated (Enter/Space),
      // not a mouse click — leave that alone so keyboard toggling still works.
      drop.querySelector("summary").addEventListener("click", function (e) {
        if (e.detail !== 0) e.preventDefault();
      });
    });

    // Submenus (e.g. the Tyranids flyout) sit a few pixels off from their
    // trigger link, so a diagonal mouse path toward the submenu briefly
    // crosses dead space with no element under the cursor — a bare :hover
    // rule drops there and slams the submenu (and via bubbling, the whole
    // dropdown) shut. Give it the same grace-period pattern as the
    // top-level dropdown above instead of relying on :hover directly.
    Array.prototype.slice.call(document.querySelectorAll(".nav-item-group"))
      .forEach(function (group) {
        if (!group.querySelector(".nav-subpanel")) return;
        var closeTimer;
        group.addEventListener("mouseenter", function () {
          clearTimeout(closeTimer);
          group.classList.add("sub-open");
        });
        group.addEventListener("mouseleave", function () {
          closeTimer = setTimeout(function () {
            group.classList.remove("sub-open");
          }, 150);
        });
      });
  }
})();
