"use client";
import { Fragment } from "react";
// src/app/admin/school-leads/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Internal admin page: school-leads sales pipeline.
// Lists demand from non-partner schools captured during /parent/claim.
// Admins can filter by status, update lead status, and add notes.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUSES = [
  { value: null,        label: "All",       colour: "bg-slate-700 text-slate-200" },
  { value: "new",       label: "New",       colour: "bg-amber-500/20 text-amber-300 border border-amber-500/30" },
  { value: "contacted", label: "Contacted", colour: "bg-sky-500/20 text-sky-300 border border-sky-500/30" },
  { value: "converted", label: "Converted", colour: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" },
  { value: "ignored",   label: "Ignored",   colour: "bg-slate-600/40 text-slate-400 border border-slate-600/30" },
];

function statusConfig(val) {
  return STATUSES.find(s => s.value === val) ?? STATUSES[1];
}

function relativeDate(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14)  return `${days}d ago`;
  const wks = Math.floor(days / 7);
  return `${wks}w ago`;
}

// ── Icons (inline SVG) ────────────────────────────────────────────────────────
const Icon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const RefreshIcon = () => <Icon d="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />;
const EditIcon    = () => <Icon d={["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7","M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5"]} />;
const ChevronIcon = ({ open }) => <Icon d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} size={12} />;
const CopyIcon    = () => <Icon d={["M20 9H11a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z","M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"]} />;

// ── Main component ────────────────────────────────────────────────────────────
export default function SchoolLeadsPage() {
  const [leads,       setLeads]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [page,        setPage]        = useState(1);
  const [statusFilter,setStatusFilter]= useState(null);   // null = All
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  // Per-row editing state
  const [expandedId,  setExpandedId]  = useState(null);
  const [editNotes,   setEditNotes]   = useState({});   // { [id]: string }
  const [saving,      setSaving]      = useState({});   // { [id]: bool }
  const [savedIds,    setSavedIds]    = useState({});   // { [id]: 'ok'|'err' }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (statusFilter) params.set("status", statusFilter);
      const res  = await fetch(`/api/admin/school-leads?${params}`);
      if (res.status === 401) { setError("Not signed in as admin."); return; }
      if (res.status === 403) { setError("Access denied — admin only."); return; }
      if (!res.ok)            { setError("Failed to load leads."); return; }
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      setError("Network error — could not load leads.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [statusFilter]);

  // ── Update status ─────────────────────────────────────────────────────────
  async function updateStatus(id, lead_status) {
    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/admin/school-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, lead_status }),
      });
      if (!res.ok) throw new Error("Update failed");
      setLeads(prev => prev.map(l =>
        l.id === id ? { ...l, lead_status } : l
      ));
      setSavedIds(prev => ({ ...prev, [id]: "ok" }));
      setTimeout(() => setSavedIds(prev => ({ ...prev, [id]: undefined })), 2000);
    } catch {
      setSavedIds(prev => ({ ...prev, [id]: "err" }));
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  }

  // ── Save notes ────────────────────────────────────────────────────────────
  async function saveNotes(id) {
    const notes = editNotes[id] ?? leads.find(l => l.id === id)?.notes ?? "";
    setSaving(prev => ({ ...prev, [`notes_${id}`]: true }));
    try {
      const res = await fetch("/api/admin/school-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes }),
      });
      if (!res.ok) throw new Error("Save failed");
      setLeads(prev => prev.map(l => l.id === id ? { ...l, notes } : l));
      setSavedIds(prev => ({ ...prev, [`notes_${id}`]: "ok" }));
      setTimeout(() => setSavedIds(prev => ({ ...prev, [`notes_${id}`]: undefined })), 2000);
    } catch {
      setSavedIds(prev => ({ ...prev, [`notes_${id}`]: "err" }));
    } finally {
      setSaving(prev => ({ ...prev, [`notes_${id}`]: false }));
    }
  }

  // ── Copy helper ───────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(null);
  function copyText(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(k => k === key ? null : k), 1500);
    });
  }

  // ── Summary counts ─────────────────────────────────────────────────────────
  const counts = leads.reduce((acc, l) => {
    acc[l.lead_status] = (acc[l.lead_status] || 0) + 1;
    return acc;
  }, {});

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-200 p-6 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">School Leads Pipeline</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Non-partner school demand captured at /parent/claim
              {total > 0 && ` · ${total} total`}
            </p>
          </div>
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-sm transition-colors disabled:opacity-50"
          >
            <RefreshIcon />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {STATUSES.map(s => {
            const isActive = statusFilter === s.value;
            return (
              <button
                key={String(s.value)}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                {s.label}
                {s.value && counts[s.value] ? (
                  <span className="ml-1.5 opacity-70">({counts[s.value]})</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-md bg-red-900/30 border border-red-800/50 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm">No leads yet{statusFilter ? ` with status "${statusFilter}"` : ""}.</p>
          </div>
        )}

        {/* Leads table */}
        {leads.length > 0 && (
          <div className="rounded-xl border border-slate-700/50 overflow-hidden bg-slate-800/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/60">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">School</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Scholar</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Parent</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Created</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  <th className="px-4 py-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, idx) => {
                  const isExpanded = expandedId === lead.id;
                  const cfg        = statusConfig(lead.lead_status);
                  const isSaving   = saving[lead.id];
                  const notesSaving= saving[`notes_${lead.id}`];

                  return (
                    <Fragment key={lead.id}>
                      <tr
                        className={`border-b border-slate-700/30 transition-colors ${
                          idx % 2 === 0 ? "bg-slate-800/10" : "bg-transparent"
                        } hover:bg-slate-700/20`}
                      >
                        {/* School */}
                        <td className="px-4 py-3 font-medium text-white">
                          {lead.school_name}
                        </td>

                        {/* Scholar */}
                        <td className="px-4 py-3 text-slate-300">
                          {lead.scholar_name}
                          {lead.scholar_year && (
                            <span className="ml-1.5 text-xs text-slate-500">Y{lead.scholar_year}</span>
                          )}
                        </td>

                        {/* Parent email */}
                        <td className="px-4 py-3">
                          {lead.parent_email ? (
                            <button
                              onClick={() => copyText(lead.parent_email, lead.id)}
                              className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors group"
                              title="Copy email"
                            >
                              <span className="font-mono text-xs">{lead.parent_email}</span>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500">
                                {copied === lead.id ? (
                                  <span className="text-emerald-400 text-xs">✓</span>
                                ) : <CopyIcon />}
                              </span>
                            </button>
                          ) : (
                            <span className="text-slate-500 text-xs italic">no email</span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {relativeDate(lead.created_at)}
                        </td>

                        {/* Status pill */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.colour}`}>
                            {cfg.label}
                          </span>
                          {lead.contacted_at && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              contacted {relativeDate(lead.contacted_at)}
                            </div>
                          )}
                        </td>

                        {/* Status action buttons */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {STATUSES.filter(s => s.value && s.value !== lead.lead_status).map(s => (
                              <button
                                key={s.value}
                                onClick={() => updateStatus(lead.id, s.value)}
                                disabled={isSaving}
                                className={`px-2 py-0.5 rounded text-xs font-medium ${s.colour} hover:opacity-80 transition-opacity disabled:opacity-40`}
                              >
                                {isSaving && saving[lead.id] ? "…" : `→ ${s.label}`}
                              </button>
                            ))}
                            {savedIds[lead.id] === "ok" && (
                              <span className="text-emerald-400 text-xs">✓ saved</span>
                            )}
                            {savedIds[lead.id] === "err" && (
                              <span className="text-red-400 text-xs">failed</span>
                            )}
                          </div>
                        </td>

                        {/* Expand toggle (notes) */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded"
                            title={isExpanded ? "Collapse" : "Notes / expand"}
                          >
                            <ChevronIcon open={isExpanded} />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded notes row */}
                      {isExpanded && (
                        <tr className="bg-slate-800/40 border-b border-slate-700/30">
                          <td colSpan={7} className="px-4 pb-4 pt-2">
                            <div className="flex flex-col gap-2">
                              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                <EditIcon />
                                Internal notes
                              </label>
                              <textarea
                                rows={3}
                                className="w-full max-w-xl bg-slate-900/60 border border-slate-600/60 rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 resize-none"
                                placeholder="Contact history, decision-maker name, school size…"
                                value={editNotes[lead.id] ?? lead.notes ?? ""}
                                onChange={e => setEditNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => saveNotes(lead.id)}
                                  disabled={notesSaving}
                                  className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                  {notesSaving ? "Saving…" : "Save notes"}
                                </button>
                                {savedIds[`notes_${lead.id}`] === "ok" && (
                                  <span className="text-emerald-400 text-xs">✓ saved</span>
                                )}
                                {savedIds[`notes_${lead.id}`] === "err" && (
                                  <span className="text-red-400 text-xs">Save failed</span>
                                )}
                                {lead.parent_email && (
                                  <a
                                    href={`mailto:${lead.parent_email}?subject=Your child%27s school on LaunchPard`}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Email parent →
                                  </a>
                                )}
                              </div>

                              {/* Lead metadata */}
                              <div className="flex gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                                <span>Lead ID: <code className="font-mono text-slate-400">{lead.id.slice(0, 8)}…</code></span>
                                <span>School ID: <code className="font-mono text-slate-400">{lead.school_id?.slice(0, 8) ?? "—"}…</code></span>
                                {lead.contacted_at && <span>Contacted: {new Date(lead.contacted_at).toLocaleDateString("en-GB")}</span>}
                                {lead.converted_at  && <span>Converted: {new Date(lead.converted_at).toLocaleDateString("en-GB")}</span>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-slate-500">
              Page {page} of {pages} · {total} leads total
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1 rounded-md text-xs bg-slate-700/60 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages || loading}
                className="px-3 py-1 rounded-md text-xs bg-slate-700/60 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && leads.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
