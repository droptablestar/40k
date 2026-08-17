import { test, expect } from "@playwright/test";
import { mockFonts } from "../../helpers/network.mjs";
import { expectCoarsePointer } from "../../helpers/pointer.mjs";

test.beforeEach(async ({ page }) => {
  await mockFonts(page);
  await page.goto("/");
  await expectCoarsePointer(page);
});

test("tapping a nav dropdown opens it", async ({ page }) => {
  const factions = page.locator(".nav-drop").filter({ has: page.locator("summary", { hasText: "Factions" }) });
  await factions.locator("summary").tap();
  await expect(factions).toHaveJSProperty("open", true);
});

test("only one nav dropdown is open at a time", async ({ page }) => {
  const factions = page.locator(".nav-drop").filter({ has: page.locator("summary", { hasText: "Factions" }) });
  const painting = page.locator(".nav-drop").filter({ has: page.locator("summary", { hasText: "Painting" }) });

  await factions.locator("summary").tap();
  await expect(factions).toHaveJSProperty("open", true);

  await painting.locator("summary").tap();
  await expect(painting).toHaveJSProperty("open", true);
  await expect(factions).toHaveJSProperty("open", false);
});

test("tapping outside an open dropdown closes it", async ({ page }) => {
  const factions = page.locator(".nav-drop").filter({ has: page.locator("summary", { hasText: "Factions" }) });
  await factions.locator("summary").tap();
  await expect(factions).toHaveJSProperty("open", true);

  await page.locator("footer").tap();
  await expect(factions).toHaveJSProperty("open", false);
});

test("a jump link lands with its heading clear of the sticky bars", async ({ page }) => {
  await page.goto("/turn-order");
  await page.evaluate(() => document.fonts.ready);

  const target = page.locator("#command");
  await page.locator('.jump a[href="#command"]').tap();
  await page.waitForTimeout(100);

  const barH = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bar-h"))
  );
  const jumpH = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--jump-h"))
  );
  const headingTop = await target.evaluate((el) => el.getBoundingClientRect().top);

  expect(headingTop).toBeGreaterThanOrEqual(barH + jumpH - 4);
});
