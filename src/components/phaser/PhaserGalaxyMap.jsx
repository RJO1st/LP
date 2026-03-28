"use client";
/**
 * PhaserGalaxyMap.jsx — React wrapper for the Phaser-powered Galaxy Map
 *
 * Renders a realistic orbital solar system using Phaser's WebGL renderer.
 * Falls back gracefully to the original SVG GalaxyMap if Phaser fails.
 *
 * Props:
 *   - scholar: { id, name, ... }
 *   - subjects: string[]
 *   - masteryRecords: Array<{ subject, mastery_score, times_seen, ... }>
 *   - onLaunchQuest: (subjectKey) => void
 *   - height: number (default 400)
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

// Lazy load PhaserScene to avoid SSR issues
const PhaserScene = dynamic(() => import("./PhaserScene"), { ssr: false });

// Tier configuration matching the original GalaxyMap
const TIER_CONFIG = {
  exceeding: { min: 80, label: "Exceeding", color: "#22c55e" },
  expected:  { min: 70, label: "Expected",  color: "#3b82f6" },
  developing:{ min: 55, label: "Developing", color: "#f59e0b" },
  unexplored:{ min: 0,  label: "Unexplored", color: "#a78bfa" },
};

const SUBJECT_COLORS = {
  mathematics: "#6366f1", maths: "#6366f1", math: "#6366f1",
  english: "#f59e0b", science: "#10b981", history: "#ef4444",
  geography: "#3b82f6", computing: "#8b5cf6", french: "#ec4899",
  spanish: "#14b8a6", art: "#f97316", music: "#06b6d4",
};

function getSubjectColor(subject) {
  const key = (subject || "").toLowerCase().replace(/\s+/g, "_");
  return SUBJECT_COLORS[key] || "#6366f1";
}

function getTier(score) {
  if (score >= 80) return "exceeding";
  if (score >= 70) return "expected";
  if (score >= 55) return "developing";
  return "unexplored";
}

export default function PhaserGalaxyMap({
  scholar = {},
  subjects = [],
  masteryRecords = [],
  onLaunchQuest,
  height = 400,
}) {
  const [sceneClass, setSceneClass] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const sceneRef = useRef(null);

  // Aggregate mastery records by subject into planet data
  const planets = useMemo(() => {
    const bySubject = {};
    masteryRecords.forEach((r) => {
      const subj = (r.subject || "").toLowerCase();
      if (!bySubject[subj]) bySubject[subj] = { total: 0, count: 0 };
      bySubject[subj].total += (r.mastery_score ?? r.p_know ?? 0) * 100;
      bySubject[subj].count += 1;
    });

    // Include all subjects even if no mastery data
    const allSubjects = new Set([
      ...subjects.map((s) => (typeof s === "string" ? s : s?.slug || s?.name || "").toLowerCase()),
      ...Object.keys(bySubject),
    ]);

    return Array.from(allSubjects)
      .filter(Boolean)
      .map((subj) => {
        const data = bySubject[subj] || { total: 0, count: 0 };
        const avgScore = data.count > 0 ? Math.round(data.total / data.count) : 0;
        return {
          subject: subj,
          label: subj.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          avgScore,
          tier: getTier(avgScore),
          color: getSubjectColor(subj),
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [subjects, masteryRecords]);

  // Load scene class dynamically
  useEffect(() => {
    let cancelled = false;
    const loadScene = async () => {
      try {
        const PhaserModule = await import("phaser");
        const Phaser = PhaserModule.default || PhaserModule;
        const { createGalaxyScene } = await import("./GalaxyScene");
        const SceneClass = createGalaxyScene(Phaser);
        if (!cancelled && SceneClass) {
          setSceneClass(() => SceneClass);
        } else if (!cancelled) {
          setLoadFailed(true);
        }
      } catch (err) {
        console.error("PhaserGalaxyMap: Failed to load scene", err);
        if (!cancelled) setLoadFailed(true);
      }
    };
    loadScene();
    return () => { cancelled = true; };
  }, []);

  // Stable click handler
  const handlePlanetClick = useCallback(
    (subjectKey) => {
      onLaunchQuest?.(subjectKey);
    },
    [onLaunchQuest]
  );

  // React data to pass into Phaser registry
  const reactData = useMemo(
    () => ({
      planets,
      onPlanetClick: handlePlanetClick,
      scholar,
    }),
    [planets, handlePlanetClick, scholar]
  );

  const handleSceneReady = useCallback((scene) => {
    sceneRef.current = scene;
  }, []);

  // Fallback: load original SVG galaxy map
  if (loadFailed) {
    const GalaxyMapFallback = dynamic(
      () => import("@/components/adventure/GalaxyMap"),
      { ssr: false }
    );
    return (
      <GalaxyMapFallback
        scholar={scholar}
        subjects={subjects}
        masteryRecords={masteryRecords}
        onLaunchQuest={onLaunchQuest}
      />
    );
  }

  if (!sceneClass) {
    return (
      <div
        style={{
          width: "100%",
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(10,10,46,0.4)",
          borderRadius: 16,
        }}
      >
        <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 700 }}>
          Initialising galaxy...
        </div>
      </div>
    );
  }

  // On mobile, give the galaxy a wider canvas so users can scroll/swipe
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const canvasWidth = isMobile ? Math.max(600, (typeof window !== "undefined" ? window.innerWidth : 400) * 1.5) : "100%";

  return (
    <div style={{ position: "relative" }}>
      {/* Horizontal scroll container for mobile */}
      <div
        style={{
          overflowX: isMobile ? "auto" : "hidden",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          borderRadius: 16,
          scrollbarWidth: "none",
        }}
      >
        <PhaserScene
          sceneClass={sceneClass}
          reactData={reactData}
          onSceneReady={handleSceneReady}
          width={canvasWidth}
          height={height}
          className="galaxy-phaser-map"
        />
      </div>
      {/* Scroll hint for mobile */}
      {isMobile && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          padding: "3px 8px", borderRadius: 6,
          background: "rgba(124,58,237,0.6)", backdropFilter: "blur(4px)",
          fontSize: 8, fontWeight: 700, color: "#fff",
          pointerEvents: "none", opacity: 0.8,
        }}>
          ← Swipe →
        </div>
      )}
      {/* Legend overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          display: "flex",
          gap: 12,
          padding: "6px 12px",
          background: "rgba(10,10,46,0.7)",
          borderRadius: 8,
          backdropFilter: "blur(8px)",
        }}
      >
        {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: cfg.color,
                opacity: 0.8,
              }}
            />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
