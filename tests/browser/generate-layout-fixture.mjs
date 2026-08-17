#!/usr/bin/env node
/* Regenerates tests/browser/fixtures/layout.json -- run by hand after a
 * reviewed, intentional layout change, never by CI. The committed fixture is
 * what shared/layout-fixture.spec.mjs diffs live captures against. */

import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, "fixtures", "layout.json");
const port = 4174;

function startServer() {
  return new Promise((resolvePromise) => {
    const proc = spawn("node", [join(here, "helpers", "static-server.mjs")], {
      env: { ...process.env, PORT: String(port) },
      stdio: "pipe",
    });
    proc.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("listening")) resolvePromise(proc);
    });
  });
}

async function captureViewport(browser, viewport, hasTouch) {
  const context = await browser.newContext({
    baseURL: `http://localhost:${port}`,
    viewport,
    hasTouch,
  });
  const page = await context.newPage();

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

  const navLink = await page.locator(".sitenav a").first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontFamily: cs.fontFamily, fontSize: cs.fontSize, color: cs.color };
  });

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

  await page.goto("/tracker");
  await page.evaluate(() => document.fonts.ready);
  const tracker = await page.locator(".armies").evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { width: Math.round(box.width) };
  });
  const output = await page.locator(".counter output").first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontFamily: cs.fontFamily, fontVariantNumeric: cs.fontVariantNumeric };
  });

  await page.goto("/troubleshooting");
  const printBefore = await page.locator("#assembly .fold").evaluate((el) => el.open);
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(50);
  const printDuring = await page.locator("#assembly .fold").evaluate((el) => el.open);
  const navDropDuringPrint = await page.locator(".nav-drop").first().evaluate((el) => el.open);
  await page.emulateMedia({ media: "screen" });
  await page.waitForTimeout(50);
  const printAfter = await page.locator("#assembly .fold").evaluate((el) => el.open);

  await context.close();

  return {
    nav,
    navLink,
    table,
    tracker,
    trackerOutput: output,
    print: { before: printBefore, duringPrint: printDuring, navDropDuringPrint, after: printAfter },
  };
}

const server = await startServer();
const browser = await chromium.launch();

const fixture = {
  tolerances: {
    "*.width": 2,
    "*.height": 2,
    note: "pixel dimensions may drift by up to the listed tolerance across renderer patch versions; everything else is an exact match",
  },
  mobile: await captureViewport(browser, { width: 360, height: 780 }, true),
  desktop: await captureViewport(browser, { width: 1280, height: 900 }, false),
};

await browser.close();
server.kill();

await writeFile(fixturePath, JSON.stringify(fixture, null, 2) + "\n");
console.log(`Wrote ${fixturePath}`);
