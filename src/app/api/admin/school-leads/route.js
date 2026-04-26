// src/app/api/admin/school-leads/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Internal admin API for the school-leads sales pipeline.
// school_leads captures demand from non-partner schools — written when a parent
// selects a non-partner school during /parent/claim. Each row is a warm lead
// for the sales team to convert into a school partnership.
//
// GET  /api/admin/school-leads?status=new&page=1&limit=50
// PATCH /api/admin/school-leads   { id, lead_status, notes }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/security/admin';
import { getServiceRoleClient } from '@/lib/security/serviceRole';
import logger from '@/lib/logger';

// ── Validation ────────────────────────────────────────────────────────────────
const VALID_STATUSES = ['new', 'contacted', 'converted', 'ignored'];

const patchSchema = z.object({
  id:          z.string().uuid(),
  lead_status: z.enum(['new', 'contacted', 'converted', 'ignored']).optional(),
  notes:       z.string().max(2000).optional(),
});

// ── GET: list leads ───────────────────────────────────────────────────────────
export async function GET(req) {
  const { error: adminError } = await requireAdmin(req);
  if (adminError) return adminError;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status') || null;
  const page         = Math.max(1, parseInt(searchParams.get('page')  || '1', 10));
  const limit        = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
  const offset       = (page - 1) * limit;

  if (statusFilter && !VALID_STATUSES.includes(statusFilter)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  const admin = getServiceRoleClient();

  // ── 1. Fetch leads with public-schema joins ──────────────────────────────
  let query = admin
    .from('school_leads')
    .select(`
      id,
      lead_status,
      notes,
      created_at,
      contacted_at,
      converted_at,
      school_id,
      parent_id,
      scholar_id,
      schools ( name ),
      scholars ( name, year_level )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) query = query.eq('lead_status', statusFilter);

  const { data: leads, count, error: leadsError } = await query;
  if (leadsError) {
    logger.error('admin_school_leads_fetch_failed', { error: leadsError });
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  if (!leads?.length) {
    return NextResponse.json({ leads: [], total: 0, page, limit });
  }

  // ── 2. Resolve parent emails in parallel (service-role admin API) ─────────
  const uniqueParentIds = [...new Set(leads.map(l => l.parent_id).filter(Boolean))];

  const emailMap = {};
  await Promise.all(
    uniqueParentIds.map(async (uid) => {
      try {
        const { data: { user } } = await admin.auth.admin.getUserById(uid);
        if (user?.email) emailMap[uid] = user.email;
      } catch {
        // Non-fatal — email column will be null in the response
      }
    })
  );

  // ── 3. Shape response ─────────────────────────────────────────────────────
  const shaped = leads.map(l => ({
    id:           l.id,
    lead_status:  l.lead_status,
    notes:        l.notes ?? null,
    created_at:   l.created_at,
    contacted_at: l.contacted_at ?? null,
    converted_at: l.converted_at ?? null,
    school_id:    l.school_id,
    school_name:  l.schools?.name ?? '(unknown school)',
    scholar_id:   l.scholar_id,
    scholar_name: l.scholars?.name ?? '(unknown scholar)',
    scholar_year: l.scholars?.year_level ?? null,
    parent_id:    l.parent_id,
    parent_email: emailMap[l.parent_id] ?? null,
  }));

  return NextResponse.json({
    leads:  shaped,
    total:  count ?? 0,
    page,
    limit,
    pages:  Math.ceil((count ?? 0) / limit),
  });
}

// ── PATCH: update a lead ──────────────────────────────────────────────────────
export async function PATCH(req) {
  const { error: adminError } = await requireAdmin(req);
  if (adminError) return adminError;

  const rawBody = await req.json().catch(() => null);
  const parsed  = patchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { id, lead_status, notes } = parsed.data;

  if (!lead_status && notes === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const updates = {};
  if (lead_status)        updates.lead_status = lead_status;
  if (notes !== undefined) updates.notes      = notes;

  // Auto-stamp timestamps when status changes
  if (lead_status === 'contacted' && !updates.contacted_at) {
    updates.contacted_at = new Date().toISOString();
  }
  if (lead_status === 'converted' && !updates.converted_at) {
    updates.converted_at = new Date().toISOString();
  }

  const admin = getServiceRoleClient();
  const { data, error } = await admin
    .from('school_leads')
    .update(updates)
    .eq('id', id)
    .select('id, lead_status, notes, contacted_at, converted_at')
    .single();

  if (error) {
    logger.error('admin_school_lead_update_failed', { id, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, lead: data });
}
