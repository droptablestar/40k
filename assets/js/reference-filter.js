(function () {
  var input = document.getElementById("ref-search");
  if (!input) return;

  var groups = Array.prototype.slice.call(document.querySelectorAll(".strat-group"));
  var items = Array.prototype.slice.call(document.querySelectorAll(".strat-list > li"));
  var empty = document.getElementById("ref-empty");

  function filter() {
    var q = input.value.trim().toLowerCase();
    var anyVisible = false;

    items.forEach(function (li) {
      var match = !q || li.textContent.toLowerCase().indexOf(q) !== -1;
      li.hidden = !match;
      if (match) anyVisible = true;
    });

    groups.forEach(function (group) {
      group.hidden = group.querySelectorAll("li:not([hidden])").length === 0;
    });

    if (empty) empty.hidden = anyVisible;
  }

  input.addEventListener("input", filter);
})();
