#!/usr/bin/env node
/* Minimal static server for browser tests. Serves _site/ the way Cloudflare
 * resolves an extensionless path (try "<path>.html") without replicating the
 * 307 redirect hop -- URL-resolution semantics are check-links.mjs's job;
 * this only needs pages to load so UI behaviour can be characterised. */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "_site");
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

async function resolve(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  let safe = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  if (safe === "/" || safe === "\\") safe = "/index";
  const candidates = extname(safe) ? [safe] : [safe + ".html"];
  for (const candidate of candidates) {
    const fsPath = join(root, candidate);
    try {
      const s = await stat(fsPath);
      if (s.isFile()) return fsPath;
    } catch {
      // try next candidate
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  const fsPath = await resolve(req.url || "/");
  if (!fsPath) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  const body = await readFile(fsPath);
  res.writeHead(200, { "Content-Type": types[extname(fsPath)] || "application/octet-stream" });
  res.end(body);
});

server.listen(port, () => {
  console.log(`Static test server listening on http://localhost:${port}`);
});
