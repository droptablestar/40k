/* Asserts the page's own coarse/fine-pointer media query state, rather than
 * inferring it from viewport width -- the site's nav and CSS branch on
 * `(hover: hover) and (pointer: fine)`, and a project's device config is
 * what actually drives that, not the number we happen to set for width. */

export async function expectCoarsePointer(page) {
  const matches = await page.evaluate(() =>
    window.matchMedia("(hover: none), (pointer: coarse)").matches
  );
  if (!matches) throw new Error("expected coarse-pointer / no-hover media state");
}

export async function expectFinePointer(page) {
  const matches = await page.evaluate(() =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
  if (!matches) throw new Error("expected fine-pointer / hover media state");
}
