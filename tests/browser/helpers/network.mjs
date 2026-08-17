/* Serves the checked-in font fixture in place of Google Fonts, and aborts
 * any other external request, so browser tests make no network calls and
 * computed-style assertions (which depend on the real font metrics) stay
 * stable across runs. */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fontsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures", "fonts");

export async function mockFonts(page) {
  await page.route("**/*", async (route) => {
    const url = route.request().url();

    if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) {
      route.continue();
      return;
    }

    if (url.startsWith("https://fonts.googleapis.com/css2")) {
      const body = await readFile(join(fontsDir, "fonts.css"), "utf8");
      route.fulfill({ status: 200, contentType: "text/css", body });
      return;
    }

    if (url.startsWith("https://fonts.gstatic.com/")) {
      const name = new URL(url).pathname.split("/").pop();
      try {
        const body = await readFile(join(fontsDir, "files", name));
        route.fulfill({ status: 200, contentType: "font/woff2", body });
      } catch {
        route.fulfill({ status: 404, body: "" });
      }
      return;
    }

    // Anything else leaving the page is an unexpected external request --
    // abort it so the test fails loudly instead of silently depending on
    // the network.
    route.abort("failed");
  });
}
