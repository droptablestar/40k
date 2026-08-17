import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const contract = JSON.parse(
  readFileSync(join(root, "tests", "contracts", "generated-routes.json"), "utf8")
);

// Site paths, extensionless (slice 3 made these canonical): "/index.html" -> "/".
export const routes = contract.generatedPages.map((p) => {
  const withoutExt = p.replace(/\.html$/, "");
  return withoutExt === "/index" ? "/" : withoutExt;
});
