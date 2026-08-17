import { test, expect } from "@playwright/test";
import { mockFonts } from "../../helpers/network.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixture = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures", "layout.json"), "utf8")
);
const WIDTH_HEIGHT_TOLERANCE = 2;

function closeEnough(actual, expected) {
  return Math.abs(actual - expected) <= WIDTH_HEIGHT_TOLERANCE;
}

test.beforeEach(async ({ page }) => {
  await mockFonts(page);
});

test("navigation, table, and tracker computed layout match the committed fixture", async ({
  page,
}, testInfo) => {
  const key = testInfo.project.name === "functional-mobile-chromium" ? "mobile" : "desktop";
  const expected = fixture[key];

  await page.goto("/charts");
  await page.evaluate(() => document.fonts.ready);

  const nav = await page.locator(".sitebar").evaluate((el) => {
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return {
      position: cs.position,
      height: Math.round(box.height),
      backgroundColor: cs.backgroundColor,
    };
  });
  expect(nav.position).toBe(expected.nav.position);
  expect(closeEnough(nav.height, expected.nav.height)).toBe(true);
  expect(nav.backgroundColor).toBe(expected.nav.backgroundColor);

  const navLink = await page.locator(".sitenav a").first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontFamily: cs.fontFamily, fontSize: cs.fontSize, color: cs.color };
  });
  expect(navLink).toEqual(expected.navLink);

  const table = await page.locator(".wound-table").evaluate((el) => {
    const box = el.getBoundingClientRect();
    const cell = el.querySelector("td, th");
    const cellCs = cell ? getComputedStyle(cell) : null;
    return {
      width: Math.round(box.width),
      cellFontFamily: cellCs && cellCs.fontFamily,
      cellFontVariantNumeric: cellCs && cellCs.fontVariantNumeric,
    };
  });
  expect(closeEnough(table.width, expected.table.width)).toBe(true);
  expect(table.cellFontFamily).toBe(expected.table.cellFontFamily);
  expect(table.cellFontVariantNumeric).toBe(expected.table.cellFontVariantNumeric);

  await page.goto("/tracker");
  await page.evaluate(() => document.fonts.ready);
  const tracker = await page.locator(".armies").evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { width: Math.round(box.width) };
  });
  expect(closeEnough(tracker.width, expected.tracker.width)).toBe(true);

  const output = await page.locator(".counter output").first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontFamily: cs.fontFamily, fontVariantNumeric: cs.fontVariantNumeric };
  });
  expect(output).toEqual(expected.trackerOutput);
});

test("print disclosure state matches the committed fixture", async ({ page }, testInfo) => {
  const key = testInfo.project.name === "functional-mobile-chromium" ? "mobile" : "desktop";
  const expected = fixture[key].print;

  await page.goto("/troubleshooting");
  expect(await page.locator("#assembly .fold").evaluate((el) => el.open)).toBe(expected.before);

  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(50);
  expect(await page.locator("#assembly .fold").evaluate((el) => el.open)).toBe(expected.duringPrint);
  expect(await page.locator(".nav-drop").first().evaluate((el) => el.open)).toBe(
    expected.navDropDuringPrint
  );

  await page.emulateMedia({ media: "screen" });
  await page.waitForTimeout(50);
  expect(await page.locator("#assembly .fold").evaluate((el) => el.open)).toBe(expected.after);
});
