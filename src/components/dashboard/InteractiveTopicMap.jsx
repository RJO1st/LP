"use client";

/**
 * InteractiveTopicMap.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * LaunchPard — Interactive Topic Map Component (Phase 1: Mastery & Progression)
 *
 * Visualises the scholar's learning journey across topics within a subject,
 * organised into three strands: Foundation → Intermediate → Advanced.
 *
 * Features:
 *   - Three vertical lanes (Foundation, Intermediate, Advanced)
 *   - Topic nodes colour-coded by mastery (grey, amber, green, purple)
 *   - Mini progress rings inside nodes
 *   - Lock icons for unmet prerequisites
 *   - Pulse animation on current/recommended topic
 *   - SVG lines showing prerequisite relationships
 *   - Responsive: grid on desktop, scrollable lanes on mobile
 *   - Age-adapted: bigger nodes & emoji labels for KS1, compact text for KS4
 *   - Detail panel when topic is selected
 *   - Dark theme (slate-900 bg)
 *
 * Props:
 *   subjectKey        string    — e.g. "maths", "english"
 *   subjectLabel      string    — e.g. "Mathematics"
 *   topics            array     — [{key, label, strand, prerequisites: [], order}]
 *   topicMastery      object    — {topicKey: {compositeScore, timesSeen, lastSeenAt, tier}}
 *   currentTopicKey   string    — The topic currently being worked on
 *   onSelectTopic     function  — (topicKey) => void
 *   onStartTopic      function  — (topicKey) => void
 *   ageBand           string    — "ks1" | "ks2" | "ks3" | "ks4"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from "react";

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────

const MASTERY_THRESHOLDS = {
  mastered: 0.80,
  developing: 0.45,
};

const STRAND_ORDER = {
  foundation: 0,
  intermediate: 1,
  advanced: 2,
};

const STRAND_LABELS = {
  foundation: "Foundation",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * Get colour and label for a mastery score
 */
function getMasteryColour(score) {
  if (score === undefined || score === null) {
    return { bg: "rgb(148, 163, 184)", text: "rgb(51, 65, 85)", label: "Not started", short: "not_started" }; // slate-400
  }
  if (score >= MASTERY_THRESHOLDS.mastered) {
    return { bg: "rgb(139, 92, 246)", text: "rgb(243, 232, 255)", label: "Exceeding", short: "exceeding" }; // purple-500
  }
  if (score >= MASTERY_THRESHOLDS.developing) {
    return { bg: "rgb(34, 197, 94)", text: "rgb(240, 253, 244)", label: "Mastered", short: "mastered" }; // green-500
  }
  return { bg: "rgb(251, 191, 36)", text: "rgb(78, 22, 9)", label: "Developing", short: "developing" }; // amber-400
}

/**
 * Calculate completion percentage for a strand
 */
function getStrandCompletion(topics, topicMastery, strand) {
  const strandTopics = topics.filter(t => t.strand === strand);
  if (strandTopics.length === 0) return 0;

  const masteredCount = strandTopics.filter(t => {
    const mastery = topicMastery[t.key];
    return mastery && mastery.compositeScore >= MASTERY_THRESHOLDS.mastered;
  }).length;

  return Math.round((masteredCount / strandTopics.length) * 100);
}

/**
 * Check if all prerequisites are met for a topic
 */
function arePrerequisitesMet(topic, topicMastery) {
  if (!topic.prerequisites || topic.prerequisites.length === 0) {
    return true;
  }

  return topic.prerequisites.every(prereqKey => {
    const prereqMastery = topicMastery[prereqKey];
    return (
      prereqMastery &&
      prereqMastery.compositeScore >= MASTERY_THRESHOLDS.developing
    );
  });
}

/**
 * Get coordinates for SVG line connections between topics
 */
function getTopicCoordinates(topic, index, strandTopics, strand, ageBand) {
  const nodeSize = ageBand === "ks1" ? 80 : ageBand === "ks4" ? 48 : 64;
  const gap = ageBand === "ks1" ? 20 : ageBand === "ks4" ? 8 : 12;
  const totalHeight = strandTopics.length * nodeSize + (strandTopics.length - 1) * gap;
  const startY = (totalHeight - nodeSize) / 2;
  const y = startY + index * (nodeSize + gap) + nodeSize / 2;

  return {
    x: Object.keys(STRAND_ORDER).findIndex(s => s === strand) * 200 + 100,
    y,
  };
}

// ─── ICON COMPONENTS ─────────────────────────────────────────────────────────

const LockIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const StarIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const CheckIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── PROGRESS RING COMPONENT ─────────────────────────────────────────────────

function ProgressRing({ score, size = 64 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - ((score || 0) / 100) * circumference;

  const colour = getMasteryColour((score || 0) / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth="3"
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colour.bg}
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{
          transform: `rotate(-90deg)`,
          transformOrigin: `${size / 2}px ${size / 2}px`,
          transition: "stroke-dashoffset 0.6s ease",
        }}
      />
    </svg>
  );
}

// ─── TOPIC NODE COMPONENT ────────────────────────────────────────────────────

function TopicNode({
  topic,
  mastery,
  isCurrent,
  isLocked,
  ageBand,
  onSelect,
}) {
  const nodeSize = ageBand === "ks1" ? 80 : ageBand === "ks4" ? 48 : 64;
  const colour = getMasteryColour(mastery?.compositeScore);
  const isPulsing = isCurrent && !isLocked;
  const scorePct = Math.round((mastery?.compositeScore || 0) * 100);

  const handleClick = () => {
    if (!isLocked) {
      onSelect(topic.key);
    }
  };

  return (
    <div
      role="button"
      tabIndex={isLocked ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
      aria-label={`${topic.label} topic${isLocked ? " (locked)" : ""}${
        isCurrent ? " (current)" : ""
      }`}
      aria-disabled={isLocked}
      className={`relative transition-all duration-300 flex-shrink-0 ${
        isPulsing ? "animate-pulse" : ""
      } ${isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:scale-105"}`}
      style={{
        width: nodeSize,
        height: nodeSize,
      }}
    >
      {/* Glow border for current topic */}
      {isCurrent && !isLocked && (
        <div
          className="absolute inset-0 rounded-lg animate-pulse"
          style={{
            border: "2px solid rgb(79, 70, 229)",
            boxShadow: "0 0 12px rgba(79, 70, 229, 0.5)",
          }}
        />
      )}

      {/* Main node background */}
      <div
        className="absolute inset-0 rounded-lg shadow-lg flex flex-col items-center justify-center"
        style={{
          background: colour.bg,
          border: isCurrent && !isLocked ? "2px solid rgb(79, 70, 229)" : "1px solid rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Progress ring for larger nodes */}
        {ageBand !== "ks4" && mastery && (
          <div className="absolute inset-0 flex items-center justify-center">
            <ProgressRing score={scorePct} size={nodeSize - 4} />
          </div>
        )}

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-1">
          {/* Lock icon or content */}
          {isLocked ? (
            <div style={{ color: "rgba(255, 255, 255, 0.6)" }}>
              <LockIcon size={ageBand === "ks1" ? 24 : 16} />
            </div>
          ) : (
            <>
              {/* Emoji or text label */}
              {ageBand === "ks1" ? (
                <div className="text-3xl mb-1">
                  {["🔢", "📖", "🔬", "🧩", "🎨"][Math.floor(Math.random() * 5)]}
                </div>
              ) : (
                <span
                  style={{
                    color: colour.text,
                    fontSize: ageBand === "ks4" ? 9 : 11,
                    fontWeight: 700,
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                  className="line-clamp-2"
                >
                  {ageBand === "ks4" ? topic.label?.substring(0, 8) : topic.label}
                </span>
              )}

              {/* Star icon for exceeding */}
              {mastery?.compositeScore >= MASTERY_THRESHOLDS.mastered && (
                <div className="absolute top-1 right-1" style={{ color: colour.text }}>
                  <StarIcon size={ageBand === "ks1" ? 16 : 12} />
                </div>
              )}

              {/* Score for KS4 */}
              {ageBand === "ks4" && mastery && (
                <span
                  style={{
                    color: colour.text,
                    fontSize: 7,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {scorePct}%
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Continue badge for current topic */}
      {isCurrent && !isLocked && (
        <div
          className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded-full text-white text-xs font-bold whitespace-nowrap"
          style={{ background: "rgb(79, 70, 229)", fontSize: "10px" }}
        >
          Continue
        </div>
      )}
    </div>
  );
}

// ─── SVG CONNECTIONS COMPONENT ───────────────────────────────────────────────

function PrerequisiteConnections({ topics, topicMastery, ageBand }) {
  const connections = useMemo(() => {
    const lines = [];

    topics.forEach((topic) => {
      if (!topic.prerequisites || topic.prerequisites.length === 0) {
        return;
      }

      const topicStrandIndex = Object.keys(STRAND_ORDER).indexOf(topic.strand);
      const topicInStrand = topics.filter(
        (t) => t.strand === topic.strand && t.key !== topic.key
      );
      const topicIndexInStrand = topicInStrand.findIndex(
        (t) => t.key === topic.key
      );

      topic.prerequisites.forEach((prereqKey) => {
        const prereqTopic = topics.find((t) => t.key === prereqKey);
        if (!prereqTopic) return;

        const prereqStrandIndex = Object.keys(STRAND_ORDER).indexOf(
          prereqTopic.strand
        );
        const prereqInStrand = topics.filter(
          (t) => t.strand === prereqTopic.strand && t.key !== prereqKey
        );
        const prereqIndexInStrand = prereqInStrand.findIndex(
          (t) => t.key === prereqKey
        );

        const isMet = arePrerequisitesMet(prereqTopic, topicMastery);
        const nodeSize = ageBand === "ks1" ? 80 : ageBand === "ks4" ? 48 : 64;
        const gap = ageBand === "ks1" ? 20 : ageBand === "ks4" ? 8 : 12;

        const x1 = prereqStrandIndex * 200 + 100;
        const x2 = topicStrandIndex * 200 + 100;

        const totalHeightPre = prereqInStrand.length * nodeSize + (prereqInStrand.length - 1) * gap;
        const startYPre = (totalHeightPre - nodeSize) / 2;
        const y1 = startYPre + prereqIndexInStrand * (nodeSize + gap) + nodeSize / 2;

        const totalHeightTopic = topicInStrand.length * nodeSize + (topicInStrand.length - 1) * gap;
        const startYTopic = (totalHeightTopic - nodeSize) / 2;
        const y2 = startYTopic + topicIndexInStrand * (nodeSize + gap) + nodeSize / 2;

        lines.push({
          x1,
          y1,
          x2,
          y2,
          isMet,
        });
      });
    });

    return lines;
  }, [topics, topicMastery, ageBand]);

  if (connections.length === 0) {
    return null;
  }

  const minX = Math.min(...connections.flatMap((c) => [c.x1, c.x2])) - 50;
  const maxX = Math.max(...connections.flatMap((c) => [c.x1, c.x2])) + 50;
  const minY = Math.min(...connections.flatMap((c) => [c.y1, c.y2])) - 50;
  const maxY = Math.max(...connections.flatMap((c) => [c.y1, c.y2])) + 50;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={maxX - minX}
      height={maxY - minY}
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="grad-met" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(34, 197, 94)" />
          <stop offset="100%" stopColor="rgb(139, 92, 246)" />
        </linearGradient>
        <linearGradient id="grad-unmet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(239, 68, 68)" />
          <stop offset="100%" stopColor="rgb(148, 163, 184)" />
        </linearGradient>
      </defs>

      {connections.map((conn, i) => (
        <path
          key={i}
          d={`M ${conn.x1} ${conn.y1} Q ${(conn.x1 + conn.x2) / 2} ${(conn.y1 + conn.y2) / 2} ${conn.x2} ${conn.y2}`}
          fill="none"
          stroke={conn.isMet ? "url(#grad-met)" : "url(#grad-unmet)"}
          strokeWidth="2"
          strokeDasharray={conn.isMet ? "0" : "5,5"}
          opacity="0.6"
        />
      ))}
    </svg>
  );
}

// ─── DETAIL PANEL COMPONENT ──────────────────────────────────────────────────

function TopicDetailPanel({
  topic,
  mastery,
  topicMastery,
  isLocked,
  onClose,
  onStartTopic,
  ageBand,
}) {
  if (!topic) return null;

  const colour = getMasteryColour(mastery?.compositeScore);
  const scorePct = Math.round((mastery?.compositeScore || 0) * 100);
  const prerequisites = topic.prerequisites || [];
  const hasMetAll = prerequisites.every((key) =>
    arePrerequisitesMet({ prerequisites: [key] }, topicMastery)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div
        className="bg-slate-900 rounded-2xl p-6 max-w-md w-full max-h-80 overflow-y-auto border border-slate-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">{topic.label}</h3>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {STRAND_LABELS[topic.strand]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Mastery status */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: colour.bg }}
            >
              <span style={{ color: colour.text, fontSize: "20px", fontWeight: "bold" }}>
                {scorePct}%
              </span>
            </div>
            <div>
              <span className="text-sm font-bold text-white block">{colour.label}</span>
              <span className="text-xs text-slate-400">{mastery ? "Working on it" : "Not started"}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        {mastery && (
          <div className="bg-slate-800 rounded-lg p-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Questions answered</span>
              <span className="text-white font-semibold">{mastery.timesSeen || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Last practiced</span>
              <span className="text-white font-semibold">
                {mastery.lastSeenAt
                  ? new Date(mastery.lastSeenAt).toLocaleDateString()
                  : "Never"}
              </span>
            </div>
          </div>
        )}

        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <div className="mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase block mb-2">
              Prerequisites
            </span>
            <div className="space-y-1">
              {prerequisites.map((key) => {
                const prereq = topic.prerequisites?.includes(key) ? { key } : null;
                const prereqMastery = topicMastery[key];
                const isMet =
                  prereqMastery &&
                  prereqMastery.compositeScore >= MASTERY_THRESHOLDS.developing;

                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 text-sm"
                    style={{
                      color: isMet ? "rgb(52, 211, 153)" : "rgb(239, 68, 68)",
                    }}
                  >
                    {isMet ? (
                      <CheckIcon size={16} />
                    ) : (
                      <span className="w-4 h-4 border-2 border-current rounded opacity-50" />
                    )}
                    <span>{key.replace(/_/g, " ").toUpperCase()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onStartTopic(topic.key);
              onClose();
            }}
            disabled={isLocked}
            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
              isLocked
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {mastery ? "Review" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function InteractiveTopicMap({
  subjectKey = "mathematics",
  subjectLabel = "Mathematics",
  topics = [],
  topicMastery = {},
  currentTopicKey = null,
  onSelectTopic = () => {},
  onStartTopic = () => {},
  ageBand = "ks2",
}) {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // Null checks and defaults
  if (!topics || topics.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl p-8 border border-slate-700 text-center">
        <p className="text-slate-400 font-semibold">No topics available for {subjectLabel}</p>
        <p className="text-slate-500 text-sm mt-1">Check back soon!</p>
      </div>
    );
  }

  // Organize topics by strand
  const topicsByStrand = {
    foundation: topics.filter((t) => t.strand === "foundation").sort((a, b) => (a.order || 0) - (b.order || 0)),
    intermediate: topics.filter((t) => t.strand === "intermediate").sort((a, b) => (a.order || 0) - (b.order || 0)),
    advanced: topics.filter((t) => t.strand === "advanced").sort((a, b) => (a.order || 0) - (b.order || 0)),
  };

  // Calculate strand completions
  const strandCompletions = {
    foundation: getStrandCompletion(topics, topicMastery, "foundation"),
    intermediate: getStrandCompletion(topics, topicMastery, "intermediate"),
    advanced: getStrandCompletion(topics, topicMastery, "advanced"),
  };

  // Handle topic selection
  const handleSelectTopic = (topicKey) => {
    const topic = topics.find((t) => t.key === topicKey);
    setSelectedTopic(topic);
    setShowDetail(true);
    onSelectTopic(topicKey);
  };

  const handleClose = () => {
    setShowDetail(false);
    setSelectedTopic(null);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2
          className="text-2xl font-black text-white mb-2"
          style={{ fontFamily: '"display", "system-ui", sans-serif' }}
        >
          {ageBand === "ks1" && "🗺️ "}{ageBand === "ks2" && "🌌 "}{ageBand === "ks3" && "📊 "}{ageBand === "ks4" && "🔥 "}
          Learning Journey
        </h2>
        <p className="text-slate-400 text-sm">
          Progress across {subjectLabel} topics — unlock new areas as you master prerequisites
        </p>
      </div>

      {/* Main map container */}
      <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
        {/* Three-lane layout */}
        <div
          className="relative grid grid-cols-1 md:grid-cols-3 gap-8 p-8 min-h-screen md:min-h-auto"
          style={{ minHeight: ageBand === "ks1" ? "600px" : "500px" }}
        >
          {/* SVG connections overlay */}
          <PrerequisiteConnections topics={topics} topicMastery={topicMastery} ageBand={ageBand} />

          {/* Strand lanes */}
          {Object.entries(topicsByStrand).map(([strand, strandTopics]) => {
            const completion = strandCompletions[strand];

            return (
              <div key={strand} className="flex flex-col">
                {/* Strand header */}
                <div className="mb-6 pb-4 border-b border-slate-700">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                    {STRAND_LABELS[strand]}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-300 whitespace-nowrap">
                      {completion}%
                    </span>
                  </div>
                </div>

                {/* Topics grid/stack */}
                <div className="flex flex-col gap-3 sm:gap-4 items-center">
                  {strandTopics.length > 0 ? (
                    strandTopics.map((topic, index) => {
                      const mastery = topicMastery[topic.key];
                      const isCurrent = topic.key === currentTopicKey;
                      const isLocked = !arePrerequisitesMet(topic, topicMastery);

                      return (
                        <div
                          key={topic.key}
                          className="relative w-full flex justify-center"
                        >
                          <TopicNode
                            topic={topic}
                            mastery={mastery}
                            isCurrent={isCurrent}
                            isLocked={isLocked}
                            ageBand={ageBand}
                            onSelect={handleSelectTopic}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      <p>No topics in this strand yet</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel modal */}
      {showDetail && selectedTopic && (
        <TopicDetailPanel
          topic={selectedTopic}
          mastery={topicMastery[selectedTopic.key]}
          topicMastery={topicMastery}
          isLocked={!arePrerequisitesMet(selectedTopic, topicMastery)}
          onClose={handleClose}
          onStartTopic={onStartTopic}
          ageBand={ageBand}
        />
      )}

      {/* Legend (bottom) */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          { label: "Not started", colour: getMasteryColour(undefined) },
          { label: "Developing", colour: getMasteryColour(0.2) },
          { label: "Mastered", colour: getMasteryColour(0.6) },
          { label: "Exceeding", colour: getMasteryColour(0.9) },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ background: item.colour.bg }}
            />
            <span className="text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
