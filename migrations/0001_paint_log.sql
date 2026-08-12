-- Paint log: the durable copy of what's painted.
--
-- The browser copy in localStorage is the offline fallback, not the record.
-- This is the record. One row per unit so a phone that was offline can be
-- merged in field by field instead of overwriting the whole log.
--
-- A paint log is identified by its code — four words, e.g. "rust-hive-brass-
-- nine" — which is also what sits in the page URL. There are no accounts, so
-- the code is the credential: anyone holding it can read and write that log.
--
-- Merge rule everywhere: the row with the newer updated_at wins. Deletes are
-- tombstones (deleted_at set, row kept) so a delete made offline is not undone
-- by the other device syncing an older copy of the same row back up.

CREATE TABLE IF NOT EXISTS roster (
  id         TEXT PRIMARY KEY,        -- the four-word code
  label      TEXT NOT NULL DEFAULT '',-- optional human name, e.g. "Josh's army"
  rev        INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,        -- unix ms
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS faction (
  id         TEXT PRIMARY KEY,        -- generated on the device
  roster_id  TEXT NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  box        TEXT NOT NULL DEFAULT '',-- Combat Patrol box id it was filled from
  sort       INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER                  -- tombstone; NULL means live
);

CREATE TABLE IF NOT EXISTS unit (
  id         TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL REFERENCES faction(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  models     INTEGER NOT NULL DEFAULT 1,
  stage      INTEGER NOT NULL DEFAULT 0,
  sort       INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_faction_roster ON faction(roster_id);
CREATE INDEX IF NOT EXISTS idx_unit_faction   ON unit(faction_id);
