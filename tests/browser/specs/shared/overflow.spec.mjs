import { test, expect } from "@playwright/test";
import { mockFonts } from "../../helpers/network.mjs";
import { expectCoarsePointer, expectFinePointer } from "../../helpers/pointer.mjs";
import { routes } from "../../helpers/routes.mjs";

// functional-mobile-chromium and compat-webkit are touch/coarse-pointer
// devices; functional-desktop-chromium is mouse/fine-pointer. Confirmed once
// per project rather than assumed from viewport width.
test.beforeEach(async ({ page }, testInfo) => {
  await mockFonts(page);
  await page.goto("/");
  if (testInfo.project.name === "functional-desktop-chromium") {
    await expectFinePointer(page);
  } else {
    await expectCoarsePointer(page);
  }
});

for (const route of routes) {
  test(`no horizontal overflow on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });
}
