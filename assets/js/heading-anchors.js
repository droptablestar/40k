(function () {
  function headingFor(el) {
    if (/^H[1-3]$/.test(el.tagName)) return el;
    return el.querySelector(":scope > h2, :scope > h3") ||
      el.querySelector(":scope > div > h2, :scope > div > h3") ||
      // a section collapsed to a row keeps its heading inside the summary
      el.querySelector(":scope > details > summary > h2");
  }

  Array.prototype.slice.call(document.querySelectorAll("[id]")).forEach(function (el) {
    var heading = headingFor(el);
    if (!heading || heading.querySelector(".heading-anchor")) return;
    var a = document.createElement("a");
    a.className = "heading-anchor";
    a.href = "#" + el.id;
    a.setAttribute("aria-label", "Link to this section");

    if (heading.closest("summary")) {
      /* The heading is the label of a collapsed section, so the whole row is
       * already a toggle. Wrapping the text in a link would make one tap mean
       * two things: it would toggle *and* navigate, and the resulting
       * hashchange re-opens what you just closed. Append the "#" beside the
       * heading instead, leaving the text as a plain toggle. */
      a.classList.add("heading-anchor-beside");
      heading.appendChild(a);
      return;
    }

    while (heading.firstChild) a.appendChild(heading.firstChild);
    heading.appendChild(a);
  });
})();
