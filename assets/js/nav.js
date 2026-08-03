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
})();
