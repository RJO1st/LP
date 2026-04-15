-- ═══════════════════════════════════════════════════════════════════════════════
-- LaunchPard School Dashboard Migration — April 15 2026
--
-- Adds multi-tenancy for schools: classes, teacher assignments, enrolments,
-- scholar invitations (for parent claiming via validation code), and
-- school-level role assignments.
--
-- Safe to run on a fresh or existing DB: all CREATE TABLE IF NOT EXISTS,
-- DROP CONSTRAINT IF EXISTS, CREATE INDEX IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Ensure schools table has required columns ─────────────────────────────
-- The schools table was created outside migrations. Add any missing columns.
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS curriculum   TEXT,
  ADD COLUMN IF NOT EXISTS school_type  TEXT DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS verified     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_schools_country    ON schools(country);
CREATE INDEX IF NOT EXISTS idx_schools_curriculum ON schools(curriculum);

-- ── 2. Classes ────────────────────────────────────────────────────────────────
-- One class per year group / section within a school.
CREATE TABLE IF NOT EXISTS classes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,             -- e.g. "Primary 6A"
  year_level   INT  NOT NULL,             -- 1-6 for primary
  curriculum   TEXT NOT NULL DEFAULT 'ng_primary',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_school     ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_year_level ON classes(year_level);

-- ── 3. Enrolments ─────────────────────────────────────────────────────────────
-- Links scholars to a class for a given academic year.
CREATE TABLE IF NOT EXISTS enrolments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id     UUID NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  class_id       UUID NOT NULL REFERENCES classes(id)  ON DELETE CASCADE,
  academic_year  TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY') || '-' ||
                                       to_char(CURRENT_DATE + INTERVAL '1 year', 'YYYY'),
  enrolled_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (scholar_id, class_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_enrolments_scholar ON enrolments(scholar_id);
CREATE INDEX IF NOT EXISTS idx_enrolments_class   ON enrolments(class_id);

-- ── 4. Teacher assignments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id)    ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'class_teacher',  -- 'class_teacher' | 'subject_teacher'
  subject     TEXT,                                    -- null = class teacher; set for subject teachers
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (teacher_id, class_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class   ON teacher_assignments(class_id);

-- ── 5. Scholar invitations ────────────────────────────────────────────────────
-- Generated during CSV import. Parent enters the code at /parent/claim to link
-- their account to their child's scholar record.
CREATE TABLE IF NOT EXISTS scholar_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id      UUID NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  validation_code TEXT NOT NULL UNIQUE,
  parent_email    TEXT,
  parent_phone    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'claimed' | 'expired'
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_invitation_contact CHECK (parent_email IS NOT NULL OR parent_phone IS NOT NULL),
  CONSTRAINT chk_invitation_status  CHECK (status IN ('pending', 'claimed', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_invitations_code     ON scholar_invitations(validation_code) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_invitations_scholar  ON scholar_invitations(scholar_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email    ON scholar_invitations(parent_email) WHERE parent_email IS NOT NULL;

-- Automatically expire pending invitations (no trigger needed — query filters by expires_at)

-- ── 6. School roles ───────────────────────────────────────────────────────────
-- Assigns users to school-level roles. A user can be a proprietor of multiple
-- schools but typically has one role per school.
CREATE TABLE IF NOT EXISTS school_roles (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id  UUID NOT NULL REFERENCES schools(id)    ON DELETE CASCADE,
  role       TEXT NOT NULL,   -- 'proprietor' | 'admin' | 'teacher'
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, school_id),
  CONSTRAINT chk_school_role CHECK (role IN ('proprietor', 'admin', 'teacher'))
);

CREATE INDEX IF NOT EXISTS idx_school_roles_user   ON school_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_school_roles_school ON school_roles(school_id);

-- ── 7. Add school_id to scholars if missing ───────────────────────────────────
ALTER TABLE scholars ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
CREATE INDEX IF NOT EXISTS idx_scholars_school ON scholars(school_id);

-- ── 8. Row Level Security ─────────────────────────────────────────────────────

-- classes: proprietors and admins see all classes in their school;
--          teachers see only their assigned classes
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_classes_school_admin ON classes;
CREATE POLICY rls_classes_school_admin ON classes
  FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_roles
      WHERE user_id = auth.uid() AND role IN ('proprietor', 'admin')
    )
  );

DROP POLICY IF EXISTS rls_classes_teacher ON classes;
CREATE POLICY rls_classes_teacher ON classes
  FOR SELECT
  USING (
    id IN (
      SELECT class_id FROM teacher_assignments WHERE teacher_id = auth.uid()
    )
  );

-- enrolments: same visibility as classes
ALTER TABLE enrolments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_enrolments_admin ON enrolments;
CREATE POLICY rls_enrolments_admin ON enrolments
  FOR ALL
  USING (
    class_id IN (
      SELECT c.id FROM classes c
      JOIN school_roles sr ON sr.school_id = c.school_id
      WHERE sr.user_id = auth.uid() AND sr.role IN ('proprietor', 'admin')
    )
  );

DROP POLICY IF EXISTS rls_enrolments_teacher ON enrolments;
CREATE POLICY rls_enrolments_teacher ON enrolments
  FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM teacher_assignments WHERE teacher_id = auth.uid()
    )
  );

-- Parents see enrolments for their own scholars
DROP POLICY IF EXISTS rls_enrolments_parent ON enrolments;
CREATE POLICY rls_enrolments_parent ON enrolments
  FOR SELECT
  USING (
    scholar_id IN (
      SELECT id FROM scholars WHERE parent_id = auth.uid()
    )
  );

-- scholar_invitations: service role only for insert/update;
--                      parents can read by code (enforced in API, not RLS)
ALTER TABLE scholar_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_invitations_service ON scholar_invitations;
CREATE POLICY rls_invitations_service ON scholar_invitations
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- school_roles: only service role writes; users can read their own roles
ALTER TABLE school_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_school_roles_read ON school_roles;
CREATE POLICY rls_school_roles_read ON school_roles
  FOR SELECT
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS rls_school_roles_service ON school_roles;
CREATE POLICY rls_school_roles_service ON school_roles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- teacher_assignments: teachers see their own; admins/proprietors see all
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_teacher_assignments_own ON teacher_assignments;
CREATE POLICY rls_teacher_assignments_own ON teacher_assignments
  FOR SELECT
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS rls_teacher_assignments_admin ON teacher_assignments;
CREATE POLICY rls_teacher_assignments_admin ON teacher_assignments
  FOR ALL
  USING (
    class_id IN (
      SELECT c.id FROM classes c
      JOIN school_roles sr ON sr.school_id = c.school_id
      WHERE sr.user_id = auth.uid() AND sr.role IN ('proprietor', 'admin')
    )
  );

-- ── 9. Post-migration validation ──────────────────────────────────────────────
DO $$
DECLARE t_count INT;
BEGIN
  SELECT COUNT(*) INTO t_count FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('classes','enrolments','teacher_assignments','scholar_invitations','school_roles');
  IF t_count < 5 THEN
    RAISE EXCEPTION 'School dashboard migration: only % of 5 expected tables created', t_count;
  END IF;
  RAISE NOTICE 'School dashboard migration validated: all 5 tables present.';
END $$;

COMMIT;

-- ── Verification queries (run manually after applying) ────────────────────────
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('classes','enrolments','teacher_assignments','scholar_invitations','school_roles') ORDER BY table_name;
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('classes','enrolments','teacher_assignments','scholar_invitations','school_roles');
