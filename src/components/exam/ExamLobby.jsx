"use client";
/**
 * ExamLobby.jsx — LaunchPard Mission Briefing Centre
 * Deploy to: src/components/exam/ExamLobby.jsx
 *
 * Ultra-premium exam paper selection and launch experience.
 * - Netflix-style subject selector (horizontal scrolling)
 * - Toggle-style filter chips (tier, year) — no exam board branding
 * - Rich glassmorphism paper cards with subject-based accent colors
 * - Animated ambient starfield background
 * - Sophisticated modal detail panel with mode selector
 * - Previous attempts with grade color-coding
 * - 60fps animations, mobile-first responsive design
 * - LaunchPard mission briefing theme (no exam board branding)
 *
 * Props:
 *   - scholar: { id, year_group, curriculum, display_name }
 *   - onStartExam: fn({ paperId, mode }) — start exam
 *   - onBack: fn() — return to dashboard
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CSS ANIMATIONS (Keyframes)
// ─────────────────────────────────────────────────────────────────────────────

const styles = `
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  @keyframes twinkle {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }

  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.1); }
    50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255,255,255,0.15); }
  }

  @keyframes slide-in-top {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .modal-overlay {
    animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .header-bar {
    animation: slide-in-top 0.5s ease-out;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// AMBIENT STARFIELD (Fixed Background)
// ─────────────────────────────────────────────────────────────────────────────

function AmbientStarfield() {
  const starsRef = useRef(null);

  useEffect(() => {
    const container = starsRef.current;
    if (!container) return;

    // Generate random stars
    const starCount = 80;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement("div");
      const size = Math.random() * 2 + 0.5;
      const duration = Math.random() * 3 + 2;
      const delay = Math.random() * 3;

      star.style.cssText = `
        position: absolute;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        width: ${size}px;
        height: ${size}px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 50%;
        animation: twinkle ${duration}s ease-in-out ${delay}s infinite;
        pointer-events: none;
      `;
      fragment.appendChild(star);
    }

    container.appendChild(fragment);
  }, []);

  return (
    <div
      ref={starsRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ICON COMPONENTS (Inline SVG)
// ─────────────────────────────────────────────────────────────────────────────

const ClockIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const PencilIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TargetIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const BookIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const CalculatorIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <rect x="8" y="6" width="8" height="4" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
  </svg>
);

const CheckIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronLeftIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { value: "", label: "All Subjects", icon: "📚", color: "rgb(100, 116, 139)" },
  { value: "mathematics", label: "Mathematics", icon: "📐", color: "rgb(59, 130, 246)" },
  { value: "english_language", label: "English Language", icon: "📖", color: "rgb(168, 85, 247)" },
  { value: "english_literature", label: "English Literature", icon: "📚", color: "rgb(168, 85, 247)" },
  { value: "science", label: "Science", icon: "🔬", color: "rgb(34, 197, 94)" },
  { value: "biology", label: "Biology", icon: "🧬", color: "rgb(34, 197, 94)" },
  { value: "chemistry", label: "Chemistry", icon: "⚗️", color: "rgb(10, 177, 201)" },
  { value: "physics", label: "Physics", icon: "⚛️", color: "rgb(139, 92, 246)" },
  { value: "history", label: "History", icon: "🏛️", color: "rgb(245, 158, 11)" },
  { value: "geography", label: "Geography", icon: "🌍", color: "rgb(34, 197, 94)" },
];

const GRADE_COLORS = {
  9: "#10b981",
  8: "#10b981",
  7: "#3b82f6",
  6: "#3b82f6",
  5: "#f59e0b",
  4: "#f59e0b",
  3: "#ef4444",
  2: "#ef4444",
  1: "#ef4444",
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT SELECTOR (Netflix-style)
// ─────────────────────────────────────────────────────────────────────────────

function SubjectSelector({ activeSubject, onSubjectChange, papers }) {
  const scrollContainerRef = useRef(null);

  // Count papers per subject
  const subjectCounts = useMemo(() => {
    const counts = {};
    SUBJECTS.forEach(s => {
      counts[s.value] = papers.filter(p => !s.value || p.subject === s.value).length;
    });
    return counts;
  }, [papers]);

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 300;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div style={{ position: "relative", marginBottom: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Scroll button left */}
        <button
          onClick={() => scroll("left")}
          style={{
            flexShrink: 0,
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "rgba(255, 255, 255, 0.04)",
            color: "rgba(255, 255, 255, 0.6)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 150ms ease-out",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
          }}
        >
          <ChevronLeftIcon size={18} />
        </button>

        {/* Subject scroll container */}
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            display: "flex",
            gap: "12px",
            overflowX: "auto",
            overflowY: "hidden",
            scrollBehavior: "smooth",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            paddingBottom: "4px",
            // Hide scrollbar
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          {SUBJECTS.map(subject => {
            const isActive = activeSubject === subject.value;
            const count = subjectCounts[subject.value] || 0;

            return (
              <button
                key={subject.value}
                onClick={() => onSubjectChange(subject.value)}
                style={{
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 18px",
                  borderRadius: "24px",
                  border: isActive ? "2px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.15)",
                  background: isActive
                    ? "rgba(59, 130, 246, 0.15)"
                    : "rgba(255, 255, 255, 0.04)",
                  color: "rgba(255, 255, 255, 0.95)",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                  transition: "all 200ms ease-out",
                  boxShadow: isActive
                    ? "0 0 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
                    : "inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                  }
                }}
              >
                <span style={{ fontSize: "18px" }}>{subject.icon}</span>
                <span>{subject.label}</span>
                {count > 0 && (
                  <span
                    style={{
                      marginLeft: "4px",
                      fontSize: "12px",
                      opacity: 0.6,
                      fontWeight: "400",
                    }}
                  >
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scroll button right */}
        <button
          onClick={() => scroll("right")}
          style={{
            flexShrink: 0,
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "rgba(255, 255, 255, 0.04)",
            color: "rgba(255, 255, 255, 0.6)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 150ms ease-out",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
          }}
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>

      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER CHIPS
// ─────────────────────────────────────────────────────────────────────────────

function FilterChips({ filters, onFilterChange }) {
  const tierOptions = [
    { value: "", label: "All Tiers" },
    { value: "foundation", label: "Foundation" },
    { value: "higher", label: "Higher" },
  ];

  const yearOptions = [
    { value: "", label: "All Years" },
    { value: "2024", label: "2024" },
    { value: "2023", label: "2023" },
    { value: "2022", label: "2022" },
  ];

  const renderChipGroup = (label, filterKey, options) => (
    <div key={filterKey} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <span
        style={{
          fontSize: "12px",
          fontWeight: "700",
          color: "rgba(255, 255, 255, 0.5)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {options.map(opt => {
          const isActive = filters[filterKey] === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onFilterChange(filterKey, opt.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "16px",
                border: isActive ? "1.5px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.1)",
                background: isActive
                  ? "rgba(59, 130, 246, 0.12)"
                  : "rgba(255, 255, 255, 0.03)",
                color: "rgba(255, 255, 255, 0.85)",
                fontSize: "13px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 150ms ease-out",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                }
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        marginBottom: "32px",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {renderChipGroup("Tier", "tier", tierOptions)}
      {renderChipGroup("Year", "year", yearOptions)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAPER CARD
// ─────────────────────────────────────────────────────────────────────────────

function PaperCard({ paper, onSelect }) {
  const getSubjectMeta = () => {
    const subject = SUBJECTS.find(s => s.value === paper.subject);
    return {
      icon: subject?.icon || "📋",
      color: subject?.color || "rgb(100, 116, 139)",
    };
  };

  const subjectMeta = getSubjectMeta();

  return (
    <button
      onClick={() => onSelect(paper)}
      style={{
        position: "relative",
        textAlign: "left",
        width: "100%",
        padding: "20px",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        color: "rgba(255, 255, 255, 0.95)",
        cursor: "pointer",
        transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: "240px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = `0 20px 40px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.05)";
      }}
    >
      {/* Gradient accent top (subject color) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${subjectMeta.color}, transparent)`,
          opacity: 0.6,
        }}
      />

      {/* Content */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
        <span style={{ fontSize: "28px" }}>{subjectMeta.icon}</span>
      </div>

      {/* Title & Meta */}
      <h3
        style={{
          fontSize: "16px",
          fontWeight: "700",
          marginBottom: "4px",
          letterSpacing: "-0.01em",
        }}
      >
        {paper.display_title || `LaunchPard ${paper.subject
          ?.split("_")
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ") || "Paper"}`}
      </h3>
      <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "12px" }}>
        {paper.paper_number ? `Paper ${paper.paper_number}` : paper.code?.replace(/paper\s*/i, "Paper ") || "Paper 1"}{paper.tier ? ` • ${paper.tier.charAt(0).toUpperCase() + paper.tier.slice(1)}` : ""}
      </p>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          fontSize: "12px",
          color: "rgba(255, 255, 255, 0.6)",
          marginBottom: "16px",
          flex: 1,
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{paper.total_marks || 100}</span>
          <span style={{ fontSize: "11px", opacity: 0.7 }}>marks</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{paper.duration_minutes || 90}</span>
          <span style={{ fontSize: "11px", opacity: 0.7 }}>mins</span>
        </div>
      </div>

      {/* Tier badge */}
      {paper.tier && (
        <div
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: "600",
            background:
              paper.tier === "foundation"
                ? "rgba(34, 197, 94, 0.2)"
                : "rgba(168, 85, 247, 0.2)",
            color:
              paper.tier === "foundation"
                ? "rgb(134, 239, 172)"
                : "rgb(216, 180, 254)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            width: "fit-content",
          }}
        >
          {paper.tier}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function PaperCardSkeleton() {
  return (
    <div
      style={{
        width: "100%",
        height: "200px",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          animation: "shimmer 2s infinite",
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%)",
          backgroundSize: "1000px 100%",
          height: "100%",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────

function DetailModal({ paper, onClose, onStartExam, loading }) {
  const [selectedMode, setSelectedMode] = useState("timed");

  if (!paper) return null;

  const modes = [
    {
      id: "timed",
      label: "Timed Exam",
      icon: ClockIcon,
      desc: "Full exam conditions with countdown timer",
      accent: "#3b82f6",
    },
    {
      id: "practice",
      label: "Practice Mode",
      icon: PencilIcon,
      desc: "No timer, review answers after each question",
      accent: "#10b981",
    },
    {
      id: "topic_focus",
      label: "Topic Focus",
      icon: TargetIcon,
      desc: "Select specific topics for targeted practice",
      accent: "#f59e0b",
    },
    {
      id: "review",
      label: "Review Mode",
      icon: BookIcon,
      desc: "See questions and mark scheme together",
      accent: "#a855f7",
    },
  ];

  const getSubjectMeta = () => {
    const subject = SUBJECTS.find(s => s.value === paper.subject);
    return {
      color: subject?.color || "rgb(100, 116, 139)",
    };
  };

  const subjectMeta = getSubjectMeta();

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 49,
          animation: "scale-in 0.2s ease-out",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          animation: "scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={onClose}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: "520px",
            maxHeight: "90vh",
            borderRadius: "24px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(12, 15, 26, 0.95) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "rgba(255, 255, 255, 0.95)",
                  marginBottom: "4px",
                  letterSpacing: "-0.02em",
                }}
              >
                {paper.display_title || `LaunchPard ${paper.subject
                  ?.split("_")
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ") || "Paper"}`}
              </h2>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>
                {paper.paper_number ? `Paper ${paper.paper_number}` : paper.code?.replace(/paper\s*/i, "Paper ") || "Paper 1"} • {paper.total_marks || 100} marks • {paper.duration_minutes || 90} mins
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                flexShrink: 0,
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(255, 255, 255, 0.05)",
                color: "rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 150ms ease-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.95)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
              }}
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Scrollable content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.03)",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "8px" }}>
                  Marks
                </p>
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "rgba(255, 255, 255, 0.95)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {paper.total_marks || 100}
                </p>
              </div>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.03)",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "8px" }}>
                  Duration
                </p>
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "rgba(255, 255, 255, 0.95)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {paper.duration_minutes || 90}m
                </p>
              </div>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.03)",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "8px" }}>
                  Questions
                </p>
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "rgba(255, 255, 255, 0.95)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {paper.total_questions || "?"}
                </p>
              </div>
            </div>

            {/* Mode selector */}
            <div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "rgba(255, 255, 255, 0.95)",
                  marginBottom: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Exam Mode
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {modes.map(mode => {
                  const IconComponent = mode.icon;
                  const isActive = selectedMode === mode.id;

                  return (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      style={{
                        padding: "16px",
                        borderRadius: "10px",
                        border: isActive ? `2px solid ${mode.accent}` : "1px solid rgba(255, 255, 255, 0.08)",
                        background: isActive
                          ? `${mode.accent}15`
                          : "rgba(255, 255, 255, 0.03)",
                        color: "rgba(255, 255, 255, 0.95)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        textAlign: "left",
                        transition: "all 200ms ease-out",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                        }
                      }}
                    >
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "6px",
                          background: `${mode.accent}30`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: mode.accent,
                          flexShrink: 0,
                        }}
                      >
                        <IconComponent size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "2px" }}>
                          {mode.label}
                        </p>
                        <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                          {mode.desc}
                        </p>
                      </div>
                      {isActive && (
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            background: mode.accent,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            flexShrink: 0,
                          }}
                        >
                          <CheckIcon size={12} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "20px 24px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              gap: "12px",
            }}
          >
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.04)",
                color: "rgba(255, 255, 255, 0.7)",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 150ms ease-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => onStartExam(paper.id, selectedMode)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "700",
                opacity: loading ? 0.5 : 1,
                transition: "all 200ms ease-out",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 10px 25px rgba(59, 130, 246, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {loading ? "Starting..." : "Start Exam"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIOUS ATTEMPTS
// ─────────────────────────────────────────────────────────────────────────────

function PreviousAttemptsSection({ attempts, onReview, loading }) {
  if (!attempts || attempts.length === 0) return null;

  return (
    <section>
      <h2
        style={{
          fontSize: "24px",
          fontWeight: "700",
          color: "rgba(255, 255, 255, 0.95)",
          marginBottom: "20px",
          letterSpacing: "-0.01em",
        }}
      >
        Your Previous Attempts
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {attempts.map(attempt => {
          const percentage = Math.round((attempt.score / (attempt.total_score || 100)) * 100);
          const grade = attempt.grade ? parseInt(attempt.grade) : null;
          const gradeColor = grade ? GRADE_COLORS[grade] : "rgba(255, 255, 255, 0.5)";

          return (
            <button
              key={attempt.id}
              onClick={() => onReview(attempt)}
              disabled={loading === attempt.id}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                color: "rgba(255, 255, 255, 0.95)",
                cursor: loading === attempt.id ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                textAlign: "left",
                transition: "all 200ms ease-out",
                opacity: loading === attempt.id ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (loading !== attempt.id) {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    marginBottom: "4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {attempt.paper_name || "Exam Paper"}
                </h4>
                <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                  {new Date(attempt.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  flexShrink: 0,
                  textAlign: "right",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "rgba(255, 255, 255, 0.95)",
                      fontVariantNumeric: "tabular-nums",
                      marginBottom: "2px",
                    }}
                  >
                    {attempt.score}/{attempt.total_score || 100}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: gradeColor,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {attempt.grade ? `Grade ${attempt.grade}` : ""} • {percentage}%
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

// Helper function for responsive padding (simple calculation instead of CSS clamp)
function getResponsivePadding() {
  const width = typeof window !== "undefined" ? window.innerWidth : 1024;
  if (width < 640) return "16px";
  if (width < 1024) return "24px";
  return "40px";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ExamLobby({ scholar, onStartExam, onBack }) {
  const [papers, setPapers] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingExam, setLoadingExam] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);

  const [filters, setFilters] = useState({
    subject: "",
    tier: "",
    year: "",
  });

  // Fetch papers
  useEffect(() => {
    const fetchPapers = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("type", "gcse");
        if (filters.subject) params.append("subject", filters.subject);
        if (filters.tier) params.append("tier", filters.tier);
        if (filters.year) params.append("year", filters.year);

        const res = await fetch(`/api/exam-papers?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch papers");
        const data = await res.json();
        setPapers(Array.isArray(data) ? data : data.papers || []);
      } catch (err) {
        setError(err.message);
        setPapers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, [filters]);

  // Fetch attempts
  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const scholarId = scholar?.id;
        if (!scholarId) { setAttempts([]); return; }
        const res = await fetch(`/api/exam-sittings?scholar_id=${scholarId}`);
        if (res.status === 401 || res.status === 404) {
          setAttempts([]);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch attempts");
        const data = await res.json();
        setAttempts(Array.isArray(data) ? data : data.sittings || []);
      } catch (err) {
        console.error("Error fetching attempts:", err);
        setAttempts([]);
      }
    };

    fetchAttempts();
  }, [scholar?.id]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleStartExam = async (paperId, mode) => {
    setLoadingExam(paperId);
    try {
      const paper = papers.find(p => p.id === paperId);
      onStartExam({ paperId, mode, paperTitle: paper?.subject });
      setSelectedPaper(null);
    } catch (err) {
      console.error("Error starting exam:", err);
    } finally {
      setLoadingExam(null);
    }
  };

  const handleReviewAttempt = (attempt) => {
    setLoadingExam(attempt.id);
    try {
      onStartExam({ sittingId: attempt.id, mode: "review" });
    } catch (err) {
      console.error("Error reviewing attempt:", err);
    } finally {
      setLoadingExam(null);
    }
  };

  return (
    <>
      <style>{styles}</style>

      {/* Ambient starfield background */}
      <AmbientStarfield />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          background: "linear-gradient(135deg, rgba(10, 10, 20, 0.95) 0%, rgba(12, 15, 26, 0.95) 100%)",
          color: "rgba(255, 255, 255, 0.95)",
        }}
      >
        {/* Header */}
        <div
          className="header-bar"
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(12, 15, 26, 0.6) 100%)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 40px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h1
                  style={{
                    fontSize: "32px",
                    fontWeight: "700",
                    marginBottom: "8px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  LaunchPard Mission Centre
                </h1>
                <p
                  style={{
                    fontSize: "14px",
                    color: "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  Year {scholar?.year_group || "?"} • {scholar?.curriculum || "UK National"}
                </p>
              </div>
              <button
                onClick={onBack}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "rgba(255, 255, 255, 0.7)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  transition: "all 150ms ease-out",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.95)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                }}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 40px" }}>
          {/* Subject selector */}
          <SubjectSelector
            activeSubject={filters.subject}
            onSubjectChange={value => handleFilterChange("subject", value)}
            papers={papers}
          />

          {/* Filter chips */}
          <FilterChips filters={filters} onFilterChange={handleFilterChange} />

          {/* Paper grid */}
          <section style={{ marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "700",
                marginBottom: "24px",
                letterSpacing: "-0.01em",
              }}
            >
              {loading ? "Loading mission briefings..." : papers.length === 0 ? "No papers available" : "Available Mission Briefings"}
            </h2>

            {error && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "rgb(252, 165, 165)",
                  marginBottom: "24px",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            {loading ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "20px",
                }}
              >
                {[...Array(6)].map((_, i) => (
                  <PaperCardSkeleton key={i} />
                ))}
              </div>
            ) : papers.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.02)",
                }}
              >
                <p style={{ fontSize: "15px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "16px" }}>
                  No papers match your filters
                </p>
                <button
                  onClick={() => setFilters({ subject: "", tier: "", year: "" })}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "rgb(147, 197, 253)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    transition: "all 150ms ease-out",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
                  }}
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(clamp(250px, 50vw, 320px), 1fr))",
                  gap: "20px",
                }}
              >
                {papers.map(paper => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    onSelect={setSelectedPaper}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Previous attempts */}
          <PreviousAttemptsSection
            attempts={attempts}
            onReview={handleReviewAttempt}
            loading={loadingExam}
          />
        </div>
      </div>

      {/* Detail modal */}
      <DetailModal
        paper={selectedPaper}
        onClose={() => setSelectedPaper(null)}
        onStartExam={handleStartExam}
        loading={loadingExam !== null}
      />
    </>
  );
}
