-- DEFAULT md5(random()::text) is a hand-added backfill for any pre-existing
-- rows: Postgres evaluates a volatile default once per existing row on
-- ADD COLUMN NOT NULL DEFAULT, so each gets its own distinct seed rather
-- than one shared value. App code always supplies a real
-- crypto.randomUUID() on insert going forward - this default only matters
-- for rows that existed before this migration ran.
ALTER TABLE "users" ADD COLUMN "avatar_seed" text NOT NULL DEFAULT md5(random()::text);