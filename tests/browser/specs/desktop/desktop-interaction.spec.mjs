import { test, expect } from "@playwright/test";
import { mockFonts } from "../../helpers/network.mjs";
import { expectFinePointer } from "../../helpers/pointer.mjs";

test.beforeEach(async ({ page }) => {
  await mockFonts(page);
  await page.goto("/");
  await expectFinePointer(page);
});

test("hovering a nav dropdown opens it", async ({ page }) => {
  const factions = page.locator(".nav-drop").filter({ has: page.locator("summary", { hasText: "Factions" }) });
  await factions.hover();
  await expect(factions).toHaveJSProperty("open", true);
});

test("only one nav dropdown is open at a time via hover", async ({ page }) => {
  const factions = page.locator(".nav-drop").filter({ has: page.locator("summary", { hasText: "Factions" }) });
  const painting = page.locator(".nav-drop").filter({ has: page.locator("summary", { hasText: "Painting" }) });

  await factions.hover();
  await expect(factions).toHaveJSProperty("open", true);

  await painting.hover();
  await expect(painting).toHaveJSProperty("open", true);
  await expect(factions).toHaveJSProperty("open", false);
});

test("clicking outside an open dropdown closes it", async ({ page }) => {
  const factions = page.locator(".nav-drop").filter({ has: page.locator("summary", { hasText: "Factions" }) });
  await factions.locator("summary").click();
  await expect(factions).toHaveJSProperty("open", true);

  await page.locator("footer").click();
  await expect(factions).toHaveJSProperty("open", false);
});

test("Escape closes an open dropdown and returns focus to its summary", async ({ page }) => {
  const factions = page.locator(".nav-drop").filter({ has: page.locator("summary", { hasText: "Factions" }) });
  await factions.locator("summary").click();
  await expect(factions).toHaveJSProperty("open", true);

  await page.keyboard.press("Escape");
  await expect(factions).toHaveJSProperty("open", false);
  await expect(factions.locator("summary")).toBeFocused();
});

test("a jump link lands with its heading clear of the sticky bar", async ({ page }) => {
  await page.goto("/turn-order");
  await page.evaluate(() => document.fonts.ready);

  const target = page.locator("#command");
  await page.locator('.jump a[href="#command"]').click();
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

test("reference filtering updates entries, groups, empty state, and count", async ({ page }) => {
  await page.goto("/keywords");
  await page.evaluate(() => document.fonts.ready);

  const input = page.locator("#ref-search");
  const count = page.locator("#ref-count");
  const empty = page.locator("#ref-empty");

  const totalText = await count.textContent();
  expect(totalText).toMatch(/entries/);

  await input.fill("nonexistent-keyword-zzz");
  await expect(empty).toBeVisible();
  await expect(count).toHaveText("0 of " + totalText.split(" ")[0]);

  await input.fill("");
  await expect(empty).toBeHidden();
  await expect(count).toHaveText(totalText);
});
