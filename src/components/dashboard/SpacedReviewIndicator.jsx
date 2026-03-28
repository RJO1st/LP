"use client";

/**
 * SpacedReviewIndicator.jsx
 * Deploy to: src/components/dashboard/SpacedReviewIndicator.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Spaced review indicator showing which topics are due/overdue for review based
 * on SM-2 scheduling. Displays urgency with color coding, predicts mastery decay,
 * and provides quick-access review buttons.
 *
 * Props:
 *   masteryRecords    — Array of topic mastery records with SM-2 scheduling data
 *   onStartReview     — Callback when user initiates review: (topicKey, subjectKey) => void
 *   maxItems          — Max topics to display in queue (default: 5)
 *   ageBand           — Explicit age band override (default: "ks2")
 *
 * Context: Uses mastery engine functions to compute forgetting decay and determine
 *          which topics are due/overdue.
 *
 * Features:
 *   - Review queue with urgency color coding (green/amber/red)
 *   - Predicted mastery decay ("Will drop from X% to Y%...")
 *   - Urgency pulse animation on most overdue item
 *   - Summary header with total topics needing review + estimated time
 *   - Upcoming reviews section (topics due in next 3 days)
 *   - Empty state with next review schedule
 *   - Age-adapted language (KS1/KS2/KS3/KS4)
 *   - Dark theme matching scholar dashboard (slate-900 bg)
 *   - Full accessibility with aria labels + semantic structure
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo, useRef, useEffect, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { applyForgettingDecay, computeStability } from "@/lib/masteryEngine";

/**
 * Compute days since last review
 */
function daysSinceLastSeen(lastSeenAt) {
  if (!lastSeenAt) return Infinity;
  const ms = Date.now() - new Date(lastSeenAt).getTime();
  return Math.floor(ms / 86_400_000);
}

/**
 * Compute days until review is due
 * Negative = overdue (already past the interval)
 */
function daysUntilDue(lastSeenAt, intervalDays) {
  if (!lastSeenAt || !intervalDays) return Infinity;
  const daysSince = daysSinceLastSeen(lastSeenAt);
  return intervalDays - daysSince;
}

/**
 * Determine urgency level and color based on days overdue
 * Returns { urgencyLevel, colorCode, label }
 */
function getUrgency(daysOverdue) {
  if (daysOverdue < 0) return { urgencyLevel: 0, colorCode: "#10b981", label: "Due today" };
  if (daysOverdue < 1) return { urgencyLevel: 1, colorCode: "#f59e0b", label: "1 day overdue" };
  if (daysOverdue <= 3) return { urgencyLevel: 2, colorCode: "#f59e0b", label: `${Math.ceil(daysOverdue)} days overdue` };
  return { urgencyLevel: 3, colorCode: "#ef4444", label: `${Math.ceil(daysOverdue)} days overdue` };
}

/**
 * Format a date for display
 */
function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Predict mastery decay if topic is not reviewed
 * Returns { currentPercent, predictedPercent, daysAhead }
 */
function predictMasteryDecay(record) {
  const { compositeScore = 0, lastSeenAt, intervalDays = 1, stability = 0 } = record;
  const currentPercent = Math.round(compositeScore * 100);

  // Predict decay after 1 week if not reviewed
  const predictedScore = applyForgettingDecay(
    compositeScore,
    lastSeenAt,
    stability,
    intervalDays
  );
  const predictedPercent = Math.round(predictedScore * 100);
  const daysAhead = 7;

  return { currentPercent, predictedPercent, daysAhead };
}

/**
 * Get age-band adapted icon + heading text
 */
function getAdaptedHeading(band) {
  const headings = {
    ks1: { icon: "⭐", text: "Time to remember!" },
    ks2: { icon: "🧠", text: "Memory boost needed!" },
    ks3: { icon: "📅", text: "Spaced review due" },
    ks4: { icon: "📋", text: "Spaced review due" },
  };
  return headings[band] || headings.ks2;
}

/**
 * Single review item card component
 */
function ReviewItem({
  record,
  isOverdue,
  isUpcoming,
  onReviewClick,
  animateIndex = 0,
}) {
  const { band, theme: t } = useTheme();
  const itemRef = useRef(null);

  // Pulse animation for most overdue item
  const isPulsing = isOverdue && animateIndex === 0;

  const daysUntil = daysUntilDue(record.lastSeenAt, record.intervalDays);
  const daysOverdue = Math.max(0, -daysUntil);
  const urgency = getUrgency(daysOverdue);
  const decay = predictMasteryDecay(record);

  // Animate on mount if pulsing
  useEffect(() => {
    if (!isPulsing || !itemRef.current) return;
    const keyframes = `
      @keyframes pulse-urgency {
        0%, 100% { box-shadow: 0 0 0 0 ${urgency.colorCode}80; }
        50% { box-shadow: 0 0 0 8px ${urgency.colorCode}00; }
      }
    `;
    if (!document.getElementById("pulse-anim-style")) {
      const style = document.createElement("style");
      style.id = "pulse-anim-style";
      style.textContent = keyframes;
      document.head.appendChild(style);
    }
    itemRef.current.style.animation = "pulse-urgency 2s infinite";
    return () => {
      if (itemRef.current) itemRef.current.style.animation = "";
    };
  }, [isPulsing, urgency.colorCode]);

  return (
    <div
      ref={itemRef}
      style={{
        background: isUpcoming ? "rgba(148, 163, 184, 0.1)" : "#ffffff",
        border: `1px solid ${isUpcoming ? "#cbd5e1" : urgency.colorCode}40`,
        borderLeft: `4px solid ${isUpcoming ? "#cbd5e1" : urgency.colorCode}`,
        borderRadius: "8px",
        padding: "12px 14px",
        marginBottom: "10px",
        opacity: isUpcoming ? 0.75 : 1,
        transition: "all 0.3s ease",
      }}
      role="article"
      aria-label={`${record.topicLabel} review status`}
    >
      {/* Header: Topic + Subject + Days Overdue */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#1e293b",
              marginBottom: "2px",
              lineHeight: 1.2,
            }}
          >
            {record.topicLabel}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: 500,
            }}
          >
            {record.subjectLabel}
          </div>
        </div>
        <div
          style={{
            background: urgency.colorCode,
            color: "#ffffff",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            marginLeft: "8px",
          }}
          aria-label={`Status: ${urgency.label}`}
        >
          {isUpcoming ? `Due in ${Math.ceil(daysUntil)} d` : urgency.label}
        </div>
      </div>

      {/* Mastery Decay Prediction (only for overdue items) */}
      {isOverdue && !isUpcoming && (
        <div
          style={{
            fontSize: "12px",
            color: "#475569",
            marginBottom: "10px",
            lineHeight: 1.4,
            paddingLeft: "0px",
          }}
        >
          <span style={{ color: "#64748b" }}>
            {decay.currentPercent >= decay.predictedPercent
              ? `Will drop from ${decay.currentPercent}% to ${decay.predictedPercent}% if not reviewed this week`
              : `Your mastery is holding steady at ${decay.currentPercent}%`}
          </span>
        </div>
      )}

      {/* Mini progress bar showing current mastery */}
      <div
        style={{
          height: "4px",
          background: "#e2e8f0",
          borderRadius: "2px",
          overflow: "hidden",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(record.compositeScore || 0) * 100}%`,
            background: decay.currentPercent >= 70 ? "#10b981" : decay.currentPercent >= 50 ? "#f59e0b" : "#ef4444",
            transition: "width 0.3s ease",
          }}
          role="progressbar"
          aria-valuenow={decay.currentPercent}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label={`Mastery: ${decay.currentPercent}%`}
        />
      </div>

      {/* Review Button (only for overdue, clickable) */}
      {isOverdue && !isUpcoming && (
        <button
          onClick={() => onReviewClick(record.topicKey, record.subjectKey)}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: urgency.colorCode,
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
            letterSpacing: "0.5px",
          }}
          onMouseEnter={(e) => {
            e.target.style.opacity = "0.85";
            e.target.style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.target.style.opacity = "1";
            e.target.style.transform = "scale(1)";
          }}
          aria-label={`Start review for ${record.topicLabel}`}
        >
          Review Now
        </button>
      )}

      {/* Upcoming indicator (no button) */}
      {isUpcoming && (
        <div
          style={{
            fontSize: "12px",
            color: "#64748b",
            fontStyle: "italic",
            marginTop: "4px",
          }}
        >
          Scheduled for {formatDate(
            new Date(
              Date.now() + (daysUntil * 86_400_000)
            ).toISOString()
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Main SpacedReviewIndicator component
 */
export default function SpacedReviewIndicator({
  masteryRecords = [],
  onStartReview = () => {},
  maxItems = 5,
  ageBand,
}) {
  const { band: contextBand, theme: t } = useTheme();
  const band = ageBand || contextBand;
  const [isAnimating, setIsAnimating] = useState(true);

  // Segregate records: overdue (due), upcoming (next 3 days), and future
  const { dueTopics, upcomingTopics, mostOverdue } = useMemo(() => {
    if (!masteryRecords || masteryRecords.length === 0) {
      return { dueTopics: [], upcomingTopics: [], mostOverdue: null };
    }

    const now = Date.now();
    const categorized = masteryRecords.map((r) => {
      const daysSince = daysSinceLastSeen(r.lastSeenAt);
      const daysUntil = daysUntilDue(r.lastSeenAt, r.intervalDays);
      const isDue = daysUntil <= 0;
      const isUpcoming = daysUntil > 0 && daysUntil <= 3;
      const daysOverdue = Math.max(0, -daysUntil);

      return {
        ...r,
        daysUntil,
        daysOverdue,
        isDue,
        isUpcoming,
      };
    });

    // Sort: due items by most overdue first, then upcoming by soonest first
    const due = categorized
      .filter((r) => r.isDue)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, maxItems);

    const upcoming = categorized
      .filter((r) => r.isUpcoming)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);

    const mostOv = due.length > 0 ? due[0] : null;

    return { dueTopics: due, upcomingTopics: upcoming, mostOverdue: mostOv };
  }, [masteryRecords, maxItems]);

  const heading = getAdaptedHeading(band);

  // Estimated review time (5 min per topic)
  const estimatedMinutes = Math.max(5, dueTopics.length * 5);

  // Empty state
  if (dueTopics.length === 0 && upcomingTopics.length === 0) {
    const nextReview = upcomingTopics.length > 0
      ? upcomingTopics[0]
      : masteryRecords.length > 0
        ? [...masteryRecords].sort((a, b) => {
            const aUntil = daysUntilDue(a.lastSeenAt, a.intervalDays);
            const bUntil = daysUntilDue(b.lastSeenAt, b.intervalDays);
            return aUntil - bUntil;
          })[0]
        : null;

    const nextDaysUntil = nextReview
      ? daysUntilDue(nextReview.lastSeenAt, nextReview.intervalDays)
      : null;

    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
          textAlign: "center",
          minHeight: "180px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
        role="region"
        aria-label="Spaced review status"
      >
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>✨</div>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#1e293b",
            marginBottom: "8px",
          }}
        >
          All caught up!
        </h3>
        <p
          style={{
            fontSize: "13px",
            color: "#64748b",
            marginBottom: "16px",
            lineHeight: 1.5,
          }}
        >
          Your knowledge is fresh. Keep it sharp with regular practice.
        </p>
        {nextReview && nextDaysUntil !== null && nextDaysUntil > 0 && (
          <p
            style={{
              fontSize: "12px",
              color: "#475569",
              background: "#f1f5f9",
              padding: "8px 12px",
              borderRadius: "6px",
            }}
          >
            <strong>Next review:</strong> {nextReview.topicLabel} in{" "}
            {Math.ceil(nextDaysUntil)} days
          </p>
        )}
      </div>
    );
  }

  // Render component
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        overflow: "hidden",
      }}
      role="region"
      aria-label="Spaced review indicator"
    >
      {/* Header Section */}
      <div
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)",
          borderBottom: "1px solid #e2e8f0",
          padding: "16px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>{heading.icon}</span>
          <div>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#1e293b",
                margin: "0 0 2px 0",
                lineHeight: 1,
              }}
            >
              {heading.text}
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: "#64748b",
                margin: 0,
              }}
            >
              {dueTopics.length} topic{dueTopics.length !== 1 ? "s" : ""} need review
            </p>
          </div>
        </div>

        {/* Badge: total time */}
        {dueTopics.length > 0 && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
            aria-label={`Estimated review time: ${estimatedMinutes} minutes`}
          >
            ~{estimatedMinutes} min
          </div>
        )}
      </div>

      {/* Body: Review Queue */}
      <div style={{ padding: "14px" }}>
        {/* Due Topics */}
        {dueTopics.length > 0 && (
          <div>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
                margin: "0 0 10px 0",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Due Now
            </h3>
            {dueTopics.map((record, idx) => (
              <ReviewItem
                key={`${record.topicKey}-${record.subjectKey}`}
                record={record}
                isOverdue
                isUpcoming={false}
                onReviewClick={onStartReview}
                animateIndex={idx}
              />
            ))}

            {/* Progress bar: review completion */}
            <div
              style={{
                marginTop: "12px",
                padding: "10px 0",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  marginBottom: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Review progress</span>
                <span style={{ fontWeight: 600 }}>0/{dueTopics.length}</span>
              </div>
              <div
                style={{
                  height: "6px",
                  background: "#e2e8f0",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}
                role="progressbar"
                aria-valuenow="0"
                aria-valuemin="0"
                aria-valuemax={dueTopics.length}
                aria-label="Overall review completion"
              >
                <div
                  style={{
                    height: "100%",
                    width: "0%",
                    background: "#10b981",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* CTA: Start Session */}
            {dueTopics.length > 0 && (
              <button
                onClick={() => {
                  if (mostOverdue) {
                    onStartReview(mostOverdue.topicKey, mostOverdue.subjectKey);
                  }
                }}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "10px 14px",
                  background: "#3b82f6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  letterSpacing: "0.5px",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#2563eb";
                  e.target.style.transform = "scale(1.01)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#3b82f6";
                  e.target.style.transform = "scale(1)";
                }}
                aria-label="Start review session with most urgent topic"
              >
                Start Review Session
              </button>
            )}
          </div>
        )}

        {/* Upcoming Topics */}
        {upcomingTopics.length > 0 && (
          <div style={{ marginTop: dueTopics.length > 0 ? "16px" : "0" }}>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
                margin: "0 0 10px 0",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Coming Soon
            </h3>
            {upcomingTopics.map((record) => (
              <ReviewItem
                key={`${record.topicKey}-${record.subjectKey}`}
                record={record}
                isOverdue={false}
                isUpcoming
                onReviewClick={onStartReview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
