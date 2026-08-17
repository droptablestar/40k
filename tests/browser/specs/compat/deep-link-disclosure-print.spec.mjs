import { test, expect } from "@playwright/test";
import { mockFonts } from "../../helpers/network.mjs";

test.beforeEach(async ({ page }) => {
  await mockFonts(page);
});

test("a deep link into a fold-section opens its fold", async ({ page }) => {
  await page.goto("/troubleshooting#priming");
  await page.waitForTimeout(50);
  await expect(page.locator("#priming .fold")).toHaveJSProperty("open", true);
  // a fold-section not targeted stays closed
  await expect(page.locator("#assembly .fold")).toHaveJSProperty("open", false);
});

test("printing opens content disclosures, leaves nav disclosures closed, and restores state", async ({
  page,
}) => {
  await page.goto("/troubleshooting");
  await expect(page.locator("#assembly .fold")).toHaveJSProperty("open", false);

  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(50);
  await expect(page.locator("#assembly .fold")).toHaveJSProperty("open", true);
  await expect(page.locator(".nav-drop").first()).toHaveJSProperty("open", false);

  await page.emulateMedia({ media: "screen" });
  await page.waitForTimeout(50);
  await expect(page.locator("#assembly .fold")).toHaveJSProperty("open", false);
});

test("printing does not reopen a disclosure the visitor had already opened", async ({ page }) => {
  await page.goto("/troubleshooting");
  const priming = page.locator("#priming .fold");
  await priming.locator("summary").first().click();
  await expect(priming).toHaveJSProperty("open", true);

  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(50);
  await expect(priming).toHaveJSProperty("open", true);

  await page.emulateMedia({ media: "screen" });
  await page.waitForTimeout(50);
  // it was open before printing started, so printing must not have closed it
  await expect(priming).toHaveJSProperty("open", true);
});

test("desktop nav dropdown opens and closes by click and Escape", async ({ page, browserName }) => {
  test.skip(browserName !== "firefox", "firefox-only desktop navigation case");

  await page.goto("/");
  const factions = page.locator(".nav-drop").filter({ has: page.locator("summary", { hasText: "Factions" }) });
  await factions.locator("summary").click();
  await expect(factions).toHaveJSProperty("open", true);

  await page.keyboard.press("Escape");
  await expect(factions).toHaveJSProperty("open", false);
});

test("touch opens a nav dropdown", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "webkit-only touch navigation case");

  await page.goto("/");
  const factions = page.locator(".nav-drop").filter({ has: page.locator("summary", { hasText: "Factions" }) });
  await factions.locator("summary").tap();
  await expect(factions).toHaveJSProperty("open", true);
});
