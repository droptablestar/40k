(function () {
  var input = document.getElementById("ref-search");
  if (!input) return;

  var groups = Array.prototype.slice.call(document.querySelectorAll(".strat-group"));
  var items = Array.prototype.slice.call(document.querySelectorAll(".strat-list > li"));
  var empty = document.getElementById("ref-empty");
  var count = document.getElementById("ref-count");

  // A page can wrap its groups in <section class="section"> for the jump nav
  // (keywords.html does; the datasheet pages don't). Where it has, the section
  // owns the heading and lede, so hiding only the group would strand a heading
  // over nothing. Collect the ones that exist and hide them alongside.
  var sections = [];
  groups.forEach(function (group) {
    var section = group.closest && group.closest(".section");
    if (section && sections.indexOf(section) === -1) sections.push(section);
  });

  function visibleIn(el) {
    return el.querySelectorAll(".strat-list > li:not([hidden])").length;
  }

  function filter() {
    var q = input.value.trim().toLowerCase();
    var shown = 0;

    items.forEach(function (li) {
      var match = !q || li.textContent.toLowerCase().indexOf(q) !== -1;
      li.hidden = !match;
      if (match) shown++;
    });

    groups.forEach(function (group) {
      group.hidden = visibleIn(group) === 0;
    });

    sections.forEach(function (section) {
      section.hidden = visibleIn(section) === 0;
    });

    if (empty) empty.hidden = shown > 0;

    if (count) {
      count.textContent = !q
        ? items.length + " entries"
        : shown + " of " + items.length;
    }
  }

  input.addEventListener("input", filter);
  filter();
})();
