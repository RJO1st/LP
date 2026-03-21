// ─── Deploy to: src/components/ReminderSettings.jsx ──────────────────────────
// Inline reminder config shown per scholar on parent dashboard.
// Parent picks days + time → scholar gets nudged via email/push.
"use client";
import { useState, useEffect } from "react";

const DAYS = [
  { key: "monday",    short: "Mon" },
  { key: "tuesday",   short: "Tue" },
  { key: "wednesday", short: "Wed" },
  { key: "thursday",  short: "Thu" },
  { key: "friday",    short: "Fri" },
  { key: "saturday",  short: "Sat" },
  { key: "sunday",    short: "Sun" },
];

const TIMEZONES = [
  { value: "Europe/London",     label: "🇬🇧 UK (GMT/BST)" },
  { value: "Africa/Lagos",      label: "🇳🇬 Nigeria (WAT)" },
  { value: "America/Toronto",   label: "🇨🇦 Eastern (ET)" },
  { value: "America/Vancouver", label: "🇨🇦 Pacific (PT)" },
  { value: "America/Edmonton",  label: "🇨🇦 Mountain (MT)" },
  { value: "Australia/Sydney",  label: "🇦🇺 Sydney (AEST)" },
];

export default function ReminderSettings({ scholarId, scholarName, onSaved }) {
  const [days, setDays]         = useState(["monday", "wednesday", "friday"]);
  const [time, setTime]         = useState("16:00");
  const [timezone, setTimezone] = useState("Europe/London");
  const [method, setMethod]     = useState("email");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [stats, setStats]       = useState({ total_sent: 0, total_ignored: 0 });

  // Load existing config
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/reminders?scholar_id=${scholarId}`);
        const data = await res.json();
        if (data && data.scholar_id) {
          setDays(data.days_of_week || ["monday", "wednesday", "friday"]);
          setTime(data.reminder_time?.slice(0, 5) || "16:00");
          setTimezone(data.timezone || "Europe/London");
          setMethod(data.method || "email");
          setIsActive(data.is_active !== false);
          setStats({ total_sent: data.total_sent || 0, total_ignored: data.total_ignored || 0 });
        }
      } catch { /* first time — use defaults */ }
      setLoaded(true);
    })();
  }, [scholarId]);

  const toggleDay = (day) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scholar_id: scholarId,
          days_of_week: days,
          reminder_time: time,
          timezone,
          method,
          is_active: isActive,
        }),
      });
      if (res.ok) onSaved?.();
    } catch { /* silently fail */ }
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <span className="text-sm font-black text-amber-800">Practice reminders</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only peer" />
          <div className="w-9 h-5 bg-slate-300 peer-checked:bg-amber-500 rounded-full transition-colors
                          after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 
                          after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" />
        </label>
      </div>

      {isActive && (
        <>
          {/* Day picker */}
          <div className="flex gap-1 mb-3">
            {DAYS.map(d => (
              <button
                key={d.key}
                onClick={() => toggleDay(d.key)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all
                  ${days.includes(d.key)
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white text-slate-400 border border-slate-200 hover:border-amber-300"}`}
              >
                {d.short}
              </button>
            ))}
          </div>

          {/* Time + Timezone */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="text-[9px] font-bold uppercase text-amber-600 tracking-wider">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-bold uppercase text-amber-600 tracking-wider">Timezone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-amber-400 focus:outline-none"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Method */}
          <div className="flex gap-2 mb-3">
            {[
              { value: "email", label: "📧 Email", desc: "Send to parent" },
              { value: "push",  label: "📱 Push",  desc: "Browser notification" },
              { value: "both",  label: "📧+📱",    desc: "Both" },
            ].map(m => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all
                  ${method === m.value
                    ? "bg-amber-500 text-white"
                    : "bg-white text-slate-500 border border-slate-200 hover:border-amber-300"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Nudge stats */}
          {stats.total_sent > 0 && (
            <div className="flex gap-3 mb-3 text-center">
              <div className="flex-1 bg-white rounded-xl p-2 border border-amber-100">
                <p className="text-lg font-black text-amber-700">{stats.total_sent}</p>
                <p className="text-[9px] font-bold uppercase text-amber-400">Sent</p>
              </div>
              <div className="flex-1 bg-white rounded-xl p-2 border border-amber-100">
                <p className="text-lg font-black text-emerald-600">
                  {stats.total_sent - stats.total_ignored}
                </p>
                <p className="text-[9px] font-bold uppercase text-emerald-400">Responded</p>
              </div>
              <div className="flex-1 bg-white rounded-xl p-2 border border-amber-100">
                <p className="text-lg font-black text-red-500">{stats.total_ignored}</p>
                <p className="text-[9px] font-bold uppercase text-red-400">Ignored</p>
              </div>
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || days.length === 0}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save reminders"}
          </button>
        </>
      )}
    </div>
  );
}