/* Paint log API — the durable half of /roster.html.
 *
 * Two routes, both keyed by the log's four-word code:
 *
 *   GET  /api/paint-log/<code>   read the whole log
 *   PUT  /api/paint-log/<code>   merge a device's copy in, get the result back
 *
 * There are no accounts on this site, so the code is the credential: whoever
 * has it can read and write that log. It is generated on the device, four
 * words from a fixed list, and lives in the page URL so it can be bookmarked
 * and typed back in after a browser wipe.
 *
 * PUT is a merge, not an overwrite. Every faction and unit row carries its own
 * updated_at and the newer one wins, so a phone that spent an afternoon offline
 * syncs its changes without stamping on edits made on the laptop meanwhile.
 * Deletes are tombstones for the same reason.
 *
 * Everything that is not /api/ is a static page and goes straight to the
 * built site in _site (the ASSETS binding).
 */

const CODE_RE = /^[a-z]+(-[a-z]+){3}$/;
const MAX_FACTIONS = 40;
const MAX_UNITS = 200;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    const match = url.pathname.match(/^\/api\/paint-log\/([^/]+)$/);
    if (!match) return json({ error: "no such endpoint" }, 404);

    // The D1 binding is commented out in wrangler.jsonc until the database
    // has been created. Say so plainly — the page reads this and keeps the
    // log on the device rather than pretending it is backed up.
    if (!env.DB) return json({ error: "no database bound yet", nodb: true }, 501);

    const code = decodeURIComponent(match[1]).toLowerCase();
    if (!CODE_RE.test(code)) return json({ error: "bad code" }, 400);

    try {
      if (request.method === "GET") return await read(env, code);
      if (request.method === "PUT") return await merge(env, code, request);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, 500);
    }
    return json({ error: "method not allowed" }, 405, { Allow: "GET, PUT" });
  }
};

/* ---------- read ---------- */

async function read(env, code) {
  const doc = await load(env, code);
  if (!doc) return json({ error: "no log with that code" }, 404);
  return json(doc);
}

async function load(env, code) {
  const roster = await env.DB
    .prepare("SELECT id, label, rev, updated_at FROM roster WHERE id = ?")
    .bind(code).first();
  if (!roster) return null;

  const factions = await env.DB.prepare(
    "SELECT id, name, box, sort, updated_at, deleted_at " +
    "FROM faction WHERE roster_id = ? ORDER BY sort, name"
  ).bind(code).all();

  const units = await env.DB.prepare(
    "SELECT u.id, u.faction_id, u.name, u.models, u.stage, u.sort, " +
    "       u.updated_at, u.deleted_at " +
    "FROM unit u JOIN faction f ON f.id = u.faction_id " +
    "WHERE f.roster_id = ? ORDER BY u.sort, u.name"
  ).bind(code).all();

  const byFaction = {};
  for (const row of factions.results) {
    byFaction[row.id] = {
      id: row.id,
      name: row.name,
      box: row.box || "",
      sort: row.sort,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at || null,
      units: []
    };
  }
  for (const row of units.results) {
    const f = byFaction[row.faction_id];
    if (!f) continue;
    f.units.push({
      id: row.id,
      name: row.name,
      models: row.models,
      stage: row.stage,
      sort: row.sort,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at || null
    });
  }

  return {
    code: roster.id,
    label: roster.label || "",
    rev: roster.rev,
    updatedAt: roster.updated_at,
    factions: factions.results.map((r) => byFaction[r.id])
  };
}

/* ---------- merge ---------- */

async function merge(env, code, request) {
  let body;
  try { body = await request.json(); }
  catch (e) { return json({ error: "body is not JSON" }, 400); }

  const incoming = clean(body);
  if (incoming.error) return json({ error: incoming.error }, 400);

  const now = Date.now();
  const stmts = [];

  stmts.push(env.DB.prepare(
    "INSERT INTO roster (id, label, rev, created_at, updated_at) " +
    "VALUES (?1, ?2, 1, ?3, ?3) ON CONFLICT(id) DO UPDATE SET " +
    "rev = roster.rev + 1, updated_at = ?3, " +
    "label = CASE WHEN ?2 <> '' THEN ?2 ELSE roster.label END"
  ).bind(code, incoming.label, now));

  for (const f of incoming.factions) {
    stmts.push(env.DB.prepare(
      "INSERT INTO faction (id, roster_id, name, box, sort, updated_at, deleted_at) " +
      "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(id) DO UPDATE SET " +
      "name = excluded.name, box = excluded.box, sort = excluded.sort, " +
      "updated_at = excluded.updated_at, deleted_at = excluded.deleted_at " +
      "WHERE excluded.updated_at > faction.updated_at " +
      "  AND faction.roster_id = excluded.roster_id"
    ).bind(f.id, code, f.name, f.box, f.sort, f.updatedAt, f.deletedAt));

    for (const u of f.units) {
      stmts.push(env.DB.prepare(
        "INSERT INTO unit (id, faction_id, name, models, stage, sort, updated_at, deleted_at) " +
        "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) ON CONFLICT(id) DO UPDATE SET " +
        "name = excluded.name, models = excluded.models, stage = excluded.stage, " +
        "sort = excluded.sort, updated_at = excluded.updated_at, " +
        "deleted_at = excluded.deleted_at " +
        "WHERE excluded.updated_at > unit.updated_at " +
        "  AND unit.faction_id = excluded.faction_id"
      ).bind(u.id, f.id, u.name, u.models, u.stage, u.sort, u.updatedAt, u.deletedAt));
    }
  }

  await env.DB.batch(stmts);
  return json(await load(env, code));
}

/* ---------- input, made safe ----------
   Anything the device sends is untrusted: clamp it to the shapes the table
   expects rather than letting a hand-edited localStorage blob through. */

function clean(body) {
  if (!body || typeof body !== "object") return { error: "expected an object" };
  const rawFactions = Array.isArray(body.factions) ? body.factions : [];
  if (rawFactions.length > MAX_FACTIONS) return { error: "too many factions" };

  const now = Date.now();
  const factions = [];
  let unitCount = 0;

  for (let i = 0; i < rawFactions.length; i++) {
    const f = rawFactions[i];
    if (!f || typeof f !== "object" || !id(f.id)) continue;
    const rawUnits = Array.isArray(f.units) ? f.units : [];
    unitCount += rawUnits.length;
    if (unitCount > MAX_UNITS) return { error: "too many units" };

    const units = [];
    for (let j = 0; j < rawUnits.length; j++) {
      const u = rawUnits[j];
      if (!u || typeof u !== "object" || !id(u.id)) continue;
      units.push({
        id: u.id,
        name: text(u.name, "Unit", 60),
        models: int(u.models, 1, 1, 99),
        stage: int(u.stage, 0, 0, 20),
        sort: int(u.sort, j, 0, 9999),
        updatedAt: int(u.updatedAt, now, 0, 4102444800000),
        deletedAt: u.deletedAt ? int(u.deletedAt, now, 0, 4102444800000) : null
      });
    }

    factions.push({
      id: f.id,
      name: text(f.name, "Army", 60),
      box: text(f.box, "", 60),
      sort: int(f.sort, i, 0, 9999),
      updatedAt: int(f.updatedAt, now, 0, 4102444800000),
      deletedAt: f.deletedAt ? int(f.deletedAt, now, 0, 4102444800000) : null,
      units: units
    });
  }

  return { label: text(body.label, "", 60), factions: factions };
}

function id(v) { return typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v); }

function text(v, fallback, max) {
  if (typeof v !== "string") return fallback;
  const s = v.trim().slice(0, max);
  return s || fallback;
}

function int(v, fallback, lo, hi) {
  const n = typeof v === "number" ? Math.round(v) : parseInt(v, 10);
  if (isNaN(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

function json(value, status, headers) {
  return new Response(JSON.stringify(value), {
    status: status || 200,
    headers: Object.assign({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }, headers || {})
  });
}
