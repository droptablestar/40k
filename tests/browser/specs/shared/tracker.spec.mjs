import { test, expect } from "@playwright/test";
import { mockFonts } from "../../helpers/network.mjs";

const KEY = "benchtable:battle:v1";

test.beforeEach(async ({ page }) => {
  await mockFonts(page);
  await page.goto("/tracker");
  // Every test starts from a blank game, not whatever a previous test left
  // in localStorage.
  await page.evaluate((key) => window.localStorage.removeItem(key), KEY);
  await page.reload();
});

test("increment and decrement a counter", async ({ page }) => {
  const cp = page.locator('.army').first().locator('.counter', { hasText: "Command points" });
  await cp.locator('[data-act="inc"]').click();
  await cp.locator('[data-act="inc"]').click();
  await expect(cp.locator("output")).toHaveText("2");

  await cp.locator('[data-act="dec"]').click();
  await expect(cp.locator("output")).toHaveText("1");
});

test("a counter does not go below zero", async ({ page }) => {
  const cp = page.locator('.army').first().locator('.counter', { hasText: "Command points" });
  await cp.locator('[data-act="dec"]').click();
  await expect(cp.locator("output")).toHaveText("0");
});

test("advancing the round moves the active pip", async ({ page }) => {
  await page.locator("#advance").click();
  await expect(page.locator('.pip[data-round="2"]')).toHaveAttribute("aria-pressed", "true");
});

test("clicking a round pip jumps directly to that round", async ({ page }) => {
  await page.locator('.pip[data-round="4"]').click();
  await expect(page.locator('.pip[data-round="4"]')).toHaveAttribute("aria-pressed", "true");
});

test("setting the active player toggles the turn flag", async ({ page }) => {
  const second = page.locator(".army").nth(1);
  await second.locator('[data-act="turn"]').click();
  await expect(second).toHaveClass(/turn/);
  await expect(second.locator('[data-act="turn"]')).toHaveText("Active");
});

test("renaming an army persists the new name", async ({ page }) => {
  const nameInput = page.locator(".army").first().locator('[data-act="rename"]');
  await nameInput.fill("Blood Angels");
  await nameInput.blur();

  const saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), KEY);
  expect(saved.armies[0].name).toBe("Blood Angels");
});

test("state persists across a reload", async ({ page }) => {
  const cp = page.locator('.army').first().locator('.counter', { hasText: "Command points" });
  await cp.locator('[data-act="inc"]').click();
  await page.locator("#advance").click();

  await page.reload();

  await expect(cp.locator("output")).toHaveText("1");
  await expect(page.locator('.pip[data-round="2"]')).toHaveAttribute("aria-pressed", "true");
});

test("tracker interaction keeps working after the browser context goes offline", async ({
  page,
  context,
}) => {
  await context.setOffline(true);
  const cp = page.locator(".army").first().locator('.counter', { hasText: "Command points" });
  await cp.locator('[data-act="inc"]').click();
  await expect(cp.locator("output")).toHaveText("1");
  await context.setOffline(false);
});
