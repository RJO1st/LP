"use client";
/**
 * PhaserConstellationMap.jsx — React wrapper for the Phaser constellation
 *
 * Renders topics as glowing star nodes in a full-canvas constellation layout.
 * Each topic = one star, connected by luminous constellation lines.
 * Mobile-optimised with responsive sizing.
 *
 * Props:
 *   - topics: Array<{ slug, label, mastery, status, subject }>
 *   - subjects: string[]
 *   - subject: string (active subject)
 *   - onTopicClick: (topic, subject) => void
 *   - onSubjectChange: (subject) => void
 *   - height: number (default 480)
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const PhaserScene = dynamic(() => import("./PhaserScene"), { ssr: false });

const SUBJECT_COLORS = {
  mathematics: "#6366f1", maths: "#6366f1",
  english: "#f59e0b", science: "#10b981",
  history: "#ef4444", geography: "#3b82f6",
  computing: "#8b5cf6", french: "#ec4899",
  spanish: "#14b8a6", art: "#f97316", music: "#06b6d4",
};

function getSubjectColor(s) {
  return SUBJECT_COLORS[(s || "").toLowerCase().replace(/\s+/g, "_")] || "#a78bfa";
}

// Prepare nodes for the scene — no complex layout needed, scene handles positioning
function prepareNodes(topics) {
  return topics.map((t, i) => ({
    ...t,
    topic: t.slug || t.label || `topic_${i}`,
    label: (t.label || t.slug || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    mastery: Math.round((t.mastery ?? t.mastery_score ?? 0) * (t.mastery > 1 ? 1 : 100)),
    status: t.status || "current",
    color: getSubjectColor(t.subject),
  }));
}

export default function PhaserConstellationMap({
  topics = [],
  subjects = [],
  subject = "mathematics",
  onTopicClick,
  onSubjectChange,
  height = 480,
}) {
  const [sceneClass, setSceneClass] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(600);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setContainerWidth(Math.round(w));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Filter topics for active subject
  const filteredTopics = useMemo(() => {
    return topics.filter(
      (t) => (t.subject || "").toLowerCase() === subject.toLowerCase()
    );
  }, [topics, subject]);

  // Prepare nodes — scene handles all layout internally
  const nodes = useMemo(() => {
    return prepareNodes(filteredTopics);
  }, [filteredTopics]);

  // Load Phaser scene class
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const PhaserModule = await import("phaser");
        const Phaser = PhaserModule.default || PhaserModule;
        const { createConstellationScene } = await import("./ConstellationScene");
        const SceneClass = createConstellationScene(Phaser);
        if (!cancelled && SceneClass) {
          setSceneClass(() => SceneClass);
        } else if (!cancelled) {
          setLoadFailed(true);
        }
      } catch (err) {
        console.error("PhaserConstellationMap: Failed to load", err);
        if (!cancelled) setLoadFailed(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleNodeClick = useCallback(
    (topic, subj) => {
      onTopicClick?.({ topic, subject: subj || subject });
    },
    [onTopicClick, subject]
  );

  const reactData = useMemo(
    () => ({
      nodes,
      edges: [], // edges now handled internally by the scene
      onNodeClick: handleNodeClick,
      subject,
    }),
    [nodes, handleNodeClick, subject]
  );

  // Fallback to original SVG constellation map
  if (loadFailed) {
    const FallbackMap = dynamic(
      () => import("@/components/dashboard/ConstellationMap"),
      { ssr: false }
    );
    return (
      <FallbackMap
        topics={topics}
        subjects={subjects}
        subject={subject}
        onTopicClick={onTopicClick}
        onSubjectChange={onSubjectChange}
      />
    );
  }

  // Stats
  const masteredCount = filteredTopics.filter((t) => t.status !== "locked" && (t.mastery ?? 0) >= 0.8).length;
  const inProgressCount = filteredTopics.filter((t) => t.status !== "locked" && (t.mastery ?? 0) < 0.8 && (t.mastery ?? 0) > 0).length;
  const lockedCount = filteredTopics.filter((t) => t.status === "locked").length;
  const overallPct = filteredTopics.length > 0
    ? Math.round(filteredTopics.reduce((s, t) => s + (t.mastery ?? 0) * (t.mastery > 1 ? 1 : 100), 0) / filteredTopics.length)
    : 0;

  // Dynamic height — scale with topic count, generous vertical space for labels
  const isMobile = containerWidth < 500;
  const topicCount = filteredTopics.length;
  const cols = isMobile
    ? (topicCount <= 6 ? 2 : 3)
    : (topicCount <= 6 ? 3 : topicCount <= 12 ? 4 : topicCount <= 20 ? 5 : 6);
  const rows = Math.ceil(topicCount / Math.max(cols, 1));
  const rowHeight = isMobile ? 80 : 95;
  const dynamicHeight = Math.max(height, Math.min(1100, rows * rowHeight + 100));

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Subject tabs */}
      {subjects.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {subjects.map((s) => {
            const active = (s || "").toLowerCase() === subject.toLowerCase();
            return (
              <button
                key={s}
                onClick={() => onSubjectChange?.(s)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid",
                  transition: "all 0.2s",
                  background: active ? getSubjectColor(s) : "rgba(124,58,237,0.04)",
                  color: active ? "#fff" : "#7c3aed",
                  borderColor: active ? getSubjectColor(s) : "rgba(124,58,237,0.12)",
                }}
              >
                {(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            );
          })}
        </div>
      )}

      {sceneClass ? (
        <div style={{
          overflowX: "hidden",
          overflowY: "hidden",
          borderRadius: 16,
        }}>
          <PhaserScene
            sceneClass={sceneClass}
            reactData={reactData}
            width={containerWidth}
            height={dynamicHeight}
            className="constellation-phaser-map"
          />
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height: dynamicHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(7,7,32,0.4)",
            borderRadius: 16,
          }}
        >
          <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 700 }}>
            Mapping constellation...
          </div>
        </div>
      )}

      {/* Stats overlay */}
      <div
        style={{
          position: "absolute",
          top: subjects.length > 1 ? 42 : 8,
          right: 8,
          padding: "6px 10px",
          background: "rgba(7,7,32,0.7)",
          borderRadius: 8,
          backdropFilter: "blur(8px)",
          fontSize: 9,
          fontWeight: 700,
          color: "rgba(255,255,255,0.7)",
        }}
      >
        <span style={{ color: "#22c55e" }}>{masteredCount}</span> mastered
        {" · "}
        <span style={{ color: "#3b82f6" }}>{inProgressCount}</span> active
        {" · "}
        <span style={{ color: "#64748b" }}>{lockedCount}</span> locked
        {" · "}
        <span style={{ color: "#a78bfa", fontWeight: 900 }}>{overallPct}%</span>
      </div>
    </div>
  );
}
