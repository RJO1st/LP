import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { generateCodename } from '@/lib/codename';
import crypto from 'crypto';

/**
 * Lightweight CSV parser — replaces csv-parse/sync to avoid Turbopack
 * bundling issues with Node.js subpath exports.
 *
 * Handles:
 *  - First row as headers (columns: true)
 *  - Double-quoted fields (including quoted commas and escaped quotes "")
 *  - Trimmed values
 *  - Empty lines skipped
 *
 * Returns an array of objects keyed by header names.
 */
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let headers = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue; // skip_empty_lines

    // Split respecting double-quoted fields
    const fields = [];
    let inQuotes = false;
    let field = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          // Escaped quote? peek next char
          if (i + 1 < line.length && line[i + 1] === '"') {
            field += '"';
            i++; // skip second quote
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(field.trim());
          field = '';
        } else {
          field += ch;
        }
      }
    }
    fields.push(field.trim()); // last field

    if (!headers) {
      // First row → normalise header names to lowercase with underscores
      headers = fields.map(h => h.toLowerCase().replace(/\s+/g, '_'));
    } else {
      const row = {};
      headers.forEach((h, i) => { row[h] = fields[i] ?? ''; });
      result.push(row);
    }
  }
  return result;
}

/**
 * POST /api/schools/import-scholars
 * Bulk CSV import of scholars for a school.
 * Requires: proprietor or admin role for the school_id
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // ── Auth: get session ─────────────────────────────────────────────────
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Parse request ────────────────────────────────────────────────────
    const formData = await request.formData()
    const file = formData.get('file')
    const schoolId = formData.get('school_id')
    const academicYear = formData.get('academic_year') || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`

    if (!file || !schoolId) {
      return NextResponse.json(
        { error: 'Missing file or school_id' },
        { status: 400 }
      )
    }

    // ── Auth: verify proprietor/admin role ──────────────────────────────
    const { data: roleData, error: roleError } = await supabase
      .from('school_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('school_id', schoolId)
      .single()

    if (roleError || !roleData || !['proprietor', 'admin'].includes(roleData.role)) {
      return NextResponse.json(
        { error: 'Forbidden. Proprietor or admin role required.' },
        { status: 403 }
      )
    }

    // ── Parse CSV ────────────────────────────────────────────────────────
    const csvBuffer = await file.arrayBuffer()
    const csvText = new TextDecoder().decode(csvBuffer)

    let records;
    try {
      records = parseCSV(csvText);
    } catch (parseErr) {
      return NextResponse.json(
        { error: `CSV parse error: ${parseErr.message}` },
        { status: 400 }
      );
    }

    // Validate required columns
    if (!records.length) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      )
    }

    const firstRecord = records[0]
    const hasRequiredCols = ['student_name', 'class_name', 'year_level'].every(
      col => col in firstRecord
    )
    const hasContactInfo = 'parent_email' in firstRecord || 'parent_phone' in firstRecord

    if (!hasRequiredCols || !hasContactInfo) {
      return NextResponse.json(
        { error: 'CSV must include: student_name, class_name, year_level, and (parent_email or parent_phone)' },
        { status: 400 }
      )
    }

    // ── Process rows ─────────────────────────────────────────────────────
    const created = []
    const skipped = []
    const errors = []

    for (const row of records) {
      const studentName = row.student_name?.trim()
      const parentEmail = row.parent_email?.trim()
      const parentPhone = row.parent_phone?.trim()
      const className = row.class_name?.trim()
      const yearLevel = parseInt(row.year_level, 10)

      // Validate row
      if (!studentName || (!parentEmail && !parentPhone)) {
        skipped.push({
          row: studentName || '(missing name)',
          reason: 'Missing student_name or (parent_email/parent_phone)',
        })
        continue
      }

      if (!className || isNaN(yearLevel)) {
        errors.push({
          row: studentName,
          reason: 'Missing or invalid class_name/year_level',
        })
        continue
      }

      try {
        // ── Find or create class ──────────────────────────────────────
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id')
          .eq('school_id', schoolId)
          .eq('name', className)
          .single()

        let classId
        if (classError || !classData) {
          // Create the class
          const { data: newClass, error: createError } = await supabase
            .from('classes')
            .insert({
              school_id: schoolId,
              name: className,
              year_level: yearLevel,
              curriculum: 'ng_primary', // default, can be overridden
            })
            .select('id')
            .single()

          if (createError) {
            errors.push({
              row: studentName,
              reason: `Failed to create class: ${createError.message}`,
            })
            continue
          }
          classId = newClass.id
        } else {
          classId = classData.id
        }

        // ── Check for duplicate ───────────────────────────────────────
        const { count: dupCount, error: dupError } = await supabase
          .from('scholars')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .ilike('name', studentName)

        if (dupCount && dupCount > 0) {
          // Also check if already in this academic year
          const { count: dupsInYear } = await supabase
            .from('scholars')
            .select(
              'enrolments(id)',
              { count: 'exact', head: true }
            )
            .eq('school_id', schoolId)
            .ilike('name', studentName)
            .eq('enrolments.academic_year', academicYear)

          if (dupsInYear && dupsInYear > 0) {
            skipped.push({
              row: studentName,
              reason: 'Duplicate scholar in same school/year',
            })
            continue
          }
        }

        // ── Generate codename & access code ───────────────────────────
        const codename = generateCodename()
        const accessCode = crypto.randomBytes(3).toString('hex').toUpperCase()

        // ── Create scholar ────────────────────────────────────────────
        const { data: scholar, error: scholarError } = await supabase
          .from('scholars')
          .insert({
            name: studentName,
            school_id: schoolId,
            curriculum: 'ng_primary',
            year_level: yearLevel,
            access_code: accessCode,
            codename,
            parent_id: null,
          })
          .select('id')
          .single()

        if (scholarError) {
          errors.push({
            row: studentName,
            reason: `Failed to create scholar: ${scholarError.message}`,
          })
          continue
        }

        // ── Create enrolment ──────────────────────────────────────────
        const { error: enrolError } = await supabase
          .from('enrolments')
          .insert({
            scholar_id: scholar.id,
            class_id: classId,
            academic_year: academicYear,
          })

        if (enrolError) {
          errors.push({
            row: studentName,
            reason: `Failed to create enrolment: ${enrolError.message}`,
          })
          continue
        }

        // ── Create scholar invitation ─────────────────────────────────
        const validationCode = crypto.randomBytes(4).toString('hex').toUpperCase()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        const { error: inviteError } = await supabase
          .from('scholar_invitations')
          .insert({
            scholar_id: scholar.id,
            validation_code: validationCode,
            parent_email: parentEmail || null,
            parent_phone: parentPhone || null,
            expires_at: expiresAt,
          })

        if (inviteError) {
          errors.push({
            row: studentName,
            reason: `Failed to create invitation: ${inviteError.message}`,
          })
          continue
        }

        // ── Send invitation email (if parent_email exists) ────────────
        if (parentEmail) {
          try {
            const claimUrl = `${process.env.APP_URL || 'https://launchpard.com'}/parent/claim?code=${validationCode}`
            await sendEmail({
              to: parentEmail,
              subject: `${studentName} is ready to learn with LaunchPard!`,
              htmlContent: `
                <p>Hello!</p>
                <p>${studentName} has been enrolled in LaunchPard. To get started, claim their profile using this code:</p>
                <p><strong>${validationCode}</strong></p>
                <p><a href="${claimUrl}">Or click here to claim immediately</a></p>
                <p>This code expires in 7 days.</p>
                <p>Best,<br/>LaunchPard</p>
              `,
            })
          } catch (emailErr) {
            console.error(`Email send failed for ${parentEmail}:`, emailErr.message)
            // Don't fail the row for email errors, just log
          }
        }

        created.push({
          name: studentName,
          className,
          validationCode,
          accessCode,
        })
      } catch (rowErr) {
        errors.push({
          row: studentName,
          reason: rowErr.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      details: {
        created,
        skipped,
        errors,
      },
    })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
