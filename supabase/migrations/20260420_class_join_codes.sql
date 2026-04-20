-- ── 20260420_class_join_codes.sql ────────────────────────────────────────────
-- Adds join_code to classes for parent self-enrolment (Item 3 sprint).
-- Adds onboarding_completed_at to schools (Item 1 sprint).
-- Safe to run on existing DB: IF NOT EXISTS / DO $$ guards throughout.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. join_code column ───────────────────────────────────────────────────────
ALTER TABLE classes ADD COLUMN IF NOT EXISTS join_code TEXT;

-- Backfill existing rows with a deterministic short code
-- Format: 6 uppercase alphanumeric, e.g. "A3KF9R"
UPDATE classes
SET    join_code = upper(substring(md5(id::text || random()::text), 1, 6))
WHERE  join_code IS NULL;

-- Unique constraint (idempotent)
DO $$ BEGIN
  ALTER TABLE classes ADD CONSTRAINT classes_join_code_unique UNIQUE (join_code);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object  THEN NULL;
END $$;

-- ── 2. onboarding flag on schools ────────────────────────────────────────────
ALTER TABLE schools ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ── 3. Public info API helper (service-role only writes, read via API) ────────
-- The /api/classes/info?code= route uses service role — no extra RLS needed.
-- Existing RLS policies on `classes` stay intact.

-- ── 4. Trigger: auto-generate join_code on INSERT ────────────────────────────
CREATE OR REPLACE FUNCTION generate_class_join_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  candidate TEXT;
  attempts  INT := 0;
BEGIN
  LOOP
    candidate := upper(substring(md5(gen_random_uuid()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM classes WHERE join_code = candidate);
    attempts := attempts + 1;
    IF attempts > 20 THEN
      -- Fallback: use 8 chars to virtually guarantee uniqueness
      candidate := upper(substring(md5(gen_random_uuid()::text), 1, 8));
      EXIT;
    END IF;
  END LOOP;
  NEW.join_code := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_join_code ON classes;
CREATE TRIGGER trg_class_join_code
  BEFORE INSERT ON classes
  FOR EACH ROW
  WHEN (NEW.join_code IS NULL)
  EXECUTE FUNCTION generate_class_join_code();
