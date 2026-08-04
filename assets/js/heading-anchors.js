(function () {
  function headingFor(el) {
    if (/^H[1-3]$/.test(el.tagName)) return el;
    return el.querySelector(":scope > h2, :scope > h3") ||
      el.querySelector(":scope > div > h2, :scope > div > h3");
  }

  Array.prototype.slice.call(document.querySelectorAll("[id]")).forEach(function (el) {
    var heading = headingFor(el);
    if (!heading || heading.querySelector(".heading-anchor")) return;
    var a = document.createElement("a");
    a.className = "heading-anchor";
    a.href = "#" + el.id;
    a.setAttribute("aria-label", "Link to this section");
    while (heading.firstChild) a.appendChild(heading.firstChild);
    heading.appendChild(a);
  });
})();
