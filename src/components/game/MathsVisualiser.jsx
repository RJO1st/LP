"use client";
// ─── MathsVisualiser.jsx ─────────────────────────────────────────────────────
// LaunchPard-native concrete visuals. Bright panels, WCAG AA accessible.
// Single file — split into MathsVisuals_Core + MathsVisuals_Tier2 caused
// Turbopack barrel-export resolution issues; merged back for reliability.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from "react";

// ─── EXTRACTED MODULE IMPORTS ────────────────────────────────────────────────
// These were extracted from this file for maintainability.
// Each module is self-contained with its own design tokens.
import { ForcesVis, VelocityVis, FoodChainVis, AtomVis, PeriodicTableVis, StateChangesVis, PHScaleVis, MoleculeVis, CellVis, PunnettVis, EnergyStoresVis, WaveVis, EMSpectrumVis, FreeBodyVis } from "./ScienceVisuals";
import { NVRShapeItem, NVRVis, NVRShapePropertyVis, NVRReflectionVis, NVRNetVis, NVRRotationVis, NVROddOneOutVis, NVRMatrixVis, NVRPaperFoldVis, NVRShapeReflectionVis } from "./NVRVisuals";
import { CoordinateVis, AngleVis, AngleOnLineDiagram, TriangleAngleDiagram, AnglesAtPointDiagram, VerticallyOppositeDiagram, AreaVis, RulerVis, FormulaTriangleVis } from "./GeometryVisuals";
import { TAccountVis, BreakEvenVis, SupplyDemandVis, ProfitLossVis, TradeFlowVis, OrgStructureVis, MarketingMixVis, MotionGraphVis, CircuitVis, QuadraticVis, ElementVis } from "./BusinessVisuals";
import { CompassVis, MapGridVis, ClimateGraphVis, LayerDiagramVis, WaterCycleVis, TimelineVis, SourceAnalysisVis, MapRegionVis} from "./GeographyHistoryVisuals";
import { HumanBodyVis, SolarSystemVis, ClassificationKeyVis, LightDiagramVis, ElectricalSymbolsVis, MagnetVis, PhotosynthesisVis, RespirationVis} from "./ScienceVisuals_Ext";
import { SentenceStructureVis, SpellingPatternVis, PunctuationVis, WordClassVis } from "./EnglishVisuals";
import { NVRShapeRotationVis, NVRCodeVis, NVRPlanElevationVis } from "./NVRVisuals_Ext";
import { FlowchartVis, BinaryVis, BooleanLogicVis, NetworkDiagramVis, CodeBlockVis, SortingVis, DatabaseTableVis, HTMLStructureVis } from "./ComputingVisuals";
import { CONCEPT_VISUALS } from "./KS12ScienceVisuals";
import { CivicEducationVis, GovernmentVis, ReligiousStudiesVis, DesignTechVis, AgricultureVis, EconomicsVis, TopicCardVis } from "./HumanitiesVisuals";
import { PieChartVis, PercentageBarVis, ProbabilityVis, SymmetryVis, EquationSolverVis, ProbabilityTreeVis, GraphPlotterVis, TimelineVis as AnimatedTimelineVis, PlaceValueVis as AdvancedPlaceValueVis, ClockFaceVis, TallyChartVis } from "./AdvancedVisuals";
// Quiz3DVisual — shelved (3D inline visuals disabled)
import { CircleTheoremVis, NumberMachineVis, ReactionProfileVis, PeriodicTableOutlineVis, PedigreeChartVis, PetriDishVis, MicroscopeDiagramVis, CoordinateGridVis } from "./ExamStyleVisuals";
import KenneyVisuals, { resolveKenneyVisual } from "./KenneyVisuals";
import InteractiveGraph from "./InteractiveGraph";
import JSXGraphBoard, { createLinearGraphProps, createQuadraticGraphProps, createTrigGraphProps, createGeometryProps, createSliderExplorerProps } from "./JSXGraphBoard";
import DataTable from "./DataTable";
import LongMultiplication from "./LongMultiplication";

const RX_NUM       = /\d+(?:\.\d+)?/g;                         // all numbers incl decimals
const RX_TWO_NUMS  = /(\d+)[^\d]+(\d+)/;                       // first two integers in text
const RX_UNITS     = /(?:cm|m{1,2}|km|in|ft)/i;               // length units
const RX_COORD     = /\((-?\d+),\s*(-?\d+)\)/;                 // (x, y) coordinate pair
const RX_DECIMAL_OP = /\d+\.\d+\s*[×x*]|[×x*]\s*\d+\.\d+/;  // decimal × something

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  indigo:     "#4f46e5",
  indigoBg:   "#eef2ff",
  indigoBd:   "#c7d2fe",
  nebula:     "#9333ea",
  nebulaBg:   "#f5f3ff",
  nebulaBd:   "#ddd6fe",
  amber:      "#d97706",
  amberBg:    "#fffbeb",
  amberBd:    "#fde68a",
  emerald:    "#059669",
  emeraldBg:  "#ecfdf5",
  emeraldBd:  "#a7f3d0",
  rose:       "#e11d48",
  roseBg:     "#fff1f2",
  roseBd:     "#fecdd3",
  slate:      "#475569",
  slateBg:    "#f8fafc",
  slateBd:    "#e2e8f0",
  text:       "#1e293b",
  textMid:    "#64748b",
};

// ─── PANEL ────────────────────────────────────────────────────────────────────
function Panel({ children, accent = T.indigo, bg, bd, ariaLabel }) {
  const panelBg = bg || "#ffffff";
  const panelBd = bd || `${accent}44`;
  return (
    <div
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      style={{
        background: panelBg,
        borderRadius: 16,
        border: `2px solid ${panelBd}`,
        boxShadow: `0 2px 12px ${accent}18`,
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}>
      {children}
    </div>
  );
}

// ─── ORBIT DOT — filled orb with strong border ────────────────────────────────
function Dot({ color, bg, border, size = 20, strikethrough = false }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: bg || color,
        border: `2.5px solid ${border || color}`,
        boxSizing: "border-box",
      }} />
      {strikethrough && (
        <svg
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          width={size} height={size}
        >
          <line
            x1={size * 0.15} y1={size * 0.85}
            x2={size * 0.85} y2={size * 0.15}
            stroke={T.rose} strokeWidth={2.5} strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}

// ─── BASIC CONCEPT — rich animated SVG visuals for KS1/KS2 science ──────────
// Uses CONCEPT_VISUALS from KS12ScienceVisuals for rich animated components.
// Falls back to inline SVGs for plant topics, then emoji as last resort.
function BasicConceptVis({ concept, label, emoji, question }) {
  // 1) Check for a rich animated component from KS12ScienceVisuals
  const RichComponent = CONCEPT_VISUALS[concept] || null;
  if (RichComponent) {
    return (
      <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd} ariaLabel={label}>
        <span style={{ fontSize: 11, fontWeight: 800, color: T.emerald, textTransform: "uppercase", letterSpacing: 1 }}>
          {label}
        </span>
        <RichComponent question={question} />
      </Panel>
    );
  }

  // 2) Inline SVGs for basic plant concepts (leaf, root, stem, flower, seed, plant_parts)
  const CONCEPT_SVGS = {
    leaf: (
      <svg width="120" height="100" viewBox="0 0 120 100">
        <ellipse cx="60" cy="45" rx="40" ry="32" fill="#22c55e" opacity="0.85" />
        <ellipse cx="60" cy="45" rx="40" ry="32" fill="none" stroke="#15803d" strokeWidth="2" />
        <line x1="60" y1="15" x2="60" y2="90" stroke="#15803d" strokeWidth="2.5" />
        <line x1="38" y1="30" x2="55" y2="42" stroke="#15803d" strokeWidth="1.5" opacity="0.7" />
        <line x1="82" y1="30" x2="65" y2="42" stroke="#15803d" strokeWidth="1.5" opacity="0.7" />
        <line x1="32" y1="45" x2="55" y2="48" stroke="#15803d" strokeWidth="1.5" opacity="0.7" />
        <line x1="88" y1="45" x2="65" y2="48" stroke="#15803d" strokeWidth="1.5" opacity="0.7" />
        <line x1="38" y1="58" x2="55" y2="52" stroke="#15803d" strokeWidth="1.5" opacity="0.7" />
        <line x1="82" y1="58" x2="65" y2="52" stroke="#15803d" strokeWidth="1.5" opacity="0.7" />
      </svg>
    ),
    plant_parts: (
      <svg width="120" height="120" viewBox="0 0 120 120">
        <path d="M60,95 Q50,105 40,115 M60,95 Q55,110 50,118 M60,95 Q65,110 70,118 M60,95 Q70,105 80,115" stroke="#92400e" strokeWidth="2" fill="none" />
        <line x1="60" y1="30" x2="60" y2="95" stroke="#16a34a" strokeWidth="3" />
        <ellipse cx="42" cy="60" rx="18" ry="10" fill="#22c55e" transform="rotate(-30 42 60)" />
        <ellipse cx="78" cy="50" rx="18" ry="10" fill="#22c55e" transform="rotate(30 78 50)" />
        <circle cx="60" cy="22" r="4" fill="#fbbf24" />
        <ellipse cx="60" cy="12" rx="5" ry="8" fill="#f472b6" />
        <ellipse cx="52" cy="18" rx="5" ry="8" fill="#f472b6" transform="rotate(72 52 18)" />
        <ellipse cx="55" cy="28" rx="5" ry="8" fill="#f472b6" transform="rotate(144 55 28)" />
        <ellipse cx="65" cy="28" rx="5" ry="8" fill="#f472b6" transform="rotate(-144 65 28)" />
        <ellipse cx="68" cy="18" rx="5" ry="8" fill="#f472b6" transform="rotate(-72 68 18)" />
      </svg>
    ),
    root: (
      <svg width="120" height="100" viewBox="0 0 120 100">
        <rect x="0" y="0" width="120" height="35" fill="#87CEEB" opacity="0.2" />
        <rect x="0" y="35" width="120" height="65" fill="#92400e" opacity="0.15" />
        <line x1="60" y1="5" x2="60" y2="45" stroke="#16a34a" strokeWidth="3" />
        <ellipse cx="45" cy="25" rx="15" ry="8" fill="#22c55e" transform="rotate(-20 45 25)" />
        <path d="M60,45 Q50,60 35,80 M60,45 Q55,65 45,85 M60,45 Q60,65 60,90 M60,45 Q65,65 75,85 M60,45 Q70,60 85,80" stroke="#92400e" strokeWidth="2" fill="none" />
      </svg>
    ),
    stem: (
      <svg width="100" height="110" viewBox="0 0 100 110">
        <line x1="50" y1="10" x2="50" y2="100" stroke="#16a34a" strokeWidth="4" />
        <ellipse cx="35" cy="35" rx="16" ry="9" fill="#22c55e" transform="rotate(-25 35 35)" />
        <ellipse cx="65" cy="55" rx="16" ry="9" fill="#22c55e" transform="rotate(25 65 55)" />
        <ellipse cx="35" cy="75" rx="16" ry="9" fill="#22c55e" transform="rotate(-25 35 75)" />
        <path d="M50,10 Q50,8 50,5" stroke="#16a34a" strokeWidth="2" />
      </svg>
    ),
    flower: (
      <svg width="110" height="110" viewBox="0 0 110 110">
        <line x1="55" y1="60" x2="55" y2="105" stroke="#16a34a" strokeWidth="3" />
        <ellipse cx="40" cy="85" rx="14" ry="7" fill="#22c55e" transform="rotate(-30 40 85)" />
        <circle cx="55" cy="45" r="8" fill="#fbbf24" />
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="55" cy="28" rx="8" ry="14" fill="#ec4899" opacity="0.8" transform={`rotate(${a} 55 45)`} />
        ))}
      </svg>
    ),
    seed: (
      <svg width="100" height="90" viewBox="0 0 100 90">
        <ellipse cx="50" cy="55" rx="18" ry="22" fill="#92400e" opacity="0.7" />
        <path d="M50,35 Q48,20 42,10" stroke="#16a34a" strokeWidth="2" fill="none" />
        <ellipse cx="38" cy="12" rx="10" ry="6" fill="#22c55e" transform="rotate(-20 38 12)" />
        <path d="M50,35 Q52,22 58,12" stroke="#16a34a" strokeWidth="2" fill="none" />
        <ellipse cx="62" cy="14" rx="10" ry="6" fill="#22c55e" transform="rotate(20 62 14)" />
      </svg>
    ),
  // ── History keyword visuals ───────────────────────────────────────────────
    hist_building: (
      <svg width="130" height="110" viewBox="0 0 130 110">
        {/* Ground */}
        <rect x="0" y="95" width="130" height="15" fill="#78716c" opacity="0.3" rx="2" />
        {/* Main building body */}
        <rect x="25" y="40" width="80" height="55" fill="#a8a29e" stroke="#78716c" strokeWidth="1.5" rx="1" />
        {/* Roof */}
        <polygon points="20,40 65,10 110,40" fill="#92400e" stroke="#78716c" strokeWidth="1.5" />
        {/* Door */}
        <rect x="52" y="65" width="26" height="30" fill="#57534e" rx="13 13 0 0" />
        <circle cx="73" cy="82" r="2" fill="#fbbf24" />
        {/* Windows */}
        <rect x="32" y="50" width="14" height="16" fill="#7dd3fc" stroke="#78716c" strokeWidth="1" rx="1" />
        <line x1="39" y1="50" x2="39" y2="66" stroke="#78716c" strokeWidth="0.8" />
        <line x1="32" y1="58" x2="46" y2="58" stroke="#78716c" strokeWidth="0.8" />
        <rect x="84" y="50" width="14" height="16" fill="#7dd3fc" stroke="#78716c" strokeWidth="1" rx="1" />
        <line x1="91" y1="50" x2="91" y2="66" stroke="#78716c" strokeWidth="0.8" />
        <line x1="84" y1="58" x2="98" y2="58" stroke="#78716c" strokeWidth="0.8" />
        {/* Chimney */}
        <rect x="85" y="15" width="10" height="25" fill="#78716c" />
        <rect x="83" y="12" width="14" height="5" fill="#78716c" rx="1" />
      </svg>
    ),
    hist_battle: (
      <svg width="130" height="110" viewBox="0 0 130 110">
        {/* Crossed swords */}
        <line x1="25" y1="90" x2="95" y2="15" stroke="#a8a29e" strokeWidth="4" strokeLinecap="round" />
        <line x1="35" y1="90" x2="105" y2="15" stroke="#78716c" strokeWidth="4" strokeLinecap="round" />
        {/* Sword 1 handle + guard */}
        <rect x="18" y="85" width="22" height="6" fill="#92400e" rx="2" />
        <circle cx="29" cy="88" r="2" fill="#fbbf24" />
        <line x1="22" y1="80" x2="36" y2="80" stroke="#78716c" strokeWidth="3" strokeLinecap="round" />
        {/* Sword 2 handle + guard */}
        <rect x="90" y="85" width="22" height="6" fill="#92400e" rx="2" />
        <circle cx="101" cy="88" r="2" fill="#fbbf24" />
        <line x1="94" y1="80" x2="108" y2="80" stroke="#78716c" strokeWidth="3" strokeLinecap="round" />
        {/* Shield */}
        <path d="M55,30 Q65,25 75,30 L75,60 Q65,75 55,60 Z" fill="#dc2626" stroke="#78716c" strokeWidth="1.5" />
        <path d="M60,35 Q65,32 70,35 L70,55 Q65,65 60,55 Z" fill="#fbbf24" opacity="0.6" />
        <circle cx="65" cy="47" r="5" fill="#fbbf24" stroke="#92400e" strokeWidth="1" />
      </svg>
    ),
    hist_royalty: (
      <svg width="130" height="110" viewBox="0 0 130 110">
        {/* Crown */}
        <path d="M30,65 L30,35 L50,50 L65,20 L80,50 L100,35 L100,65 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
        <rect x="28" y="65" width="74" height="12" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" rx="2" />
        {/* Jewels */}
        <circle cx="65" cy="50" r="5" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" />
        <circle cx="45" cy="55" r="4" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1" />
        <circle cx="85" cy="55" r="4" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
        {/* Crown points jewels */}
        <circle cx="30" cy="35" r="3" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
        <circle cx="65" cy="20" r="3" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" />
        <circle cx="100" cy="35" r="3" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
        {/* Velvet base */}
        <path d="M32,77 Q65,85 98,77" fill="#7c2d12" opacity="0.5" />
        {/* Sparkles */}
        <text x="18" y="30" fontSize="10" fill="#fbbf24" opacity="0.7">✦</text>
        <text x="108" y="28" fontSize="8" fill="#fbbf24" opacity="0.5">✦</text>
        <text x="60" y="95" fontSize="9" fill="#fbbf24" opacity="0.6">✦</text>
      </svg>
    ),
    hist_transport: (
      <svg width="130" height="110" viewBox="0 0 130 110">
        {/* Road */}
        <rect x="0" y="88" width="130" height="22" fill="#78716c" opacity="0.25" rx="2" />
        <line x1="10" y1="99" x2="30" y2="99" stroke="#fbbf24" strokeWidth="1.5" opacity="0.4" strokeDasharray="6 4" />
        <line x1="50" y1="99" x2="70" y2="99" stroke="#fbbf24" strokeWidth="1.5" opacity="0.4" strokeDasharray="6 4" />
        <line x1="90" y1="99" x2="110" y2="99" stroke="#fbbf24" strokeWidth="1.5" opacity="0.4" strokeDasharray="6 4" />
        {/* Wagon/cart body */}
        <rect x="12" y="58" width="45" height="28" fill="#92400e" stroke="#78716c" strokeWidth="1.5" rx="2" />
        <rect x="15" y="62" width="12" height="10" fill="#7dd3fc" stroke="#78716c" strokeWidth="0.8" rx="1" />
        {/* Wheels */}
        <circle cx="22" cy="88" r="8" fill="none" stroke="#57534e" strokeWidth="2.5" />
        <circle cx="22" cy="88" r="2" fill="#57534e" />
        <circle cx="48" cy="88" r="8" fill="none" stroke="#57534e" strokeWidth="2.5" />
        <circle cx="48" cy="88" r="2" fill="#57534e" />
        {/* Spokes */}
        <line x1="22" y1="80" x2="22" y2="96" stroke="#57534e" strokeWidth="1" />
        <line x1="14" y1="88" x2="30" y2="88" stroke="#57534e" strokeWidth="1" />
        <line x1="48" y1="80" x2="48" y2="96" stroke="#57534e" strokeWidth="1" />
        <line x1="40" y1="88" x2="56" y2="88" stroke="#57534e" strokeWidth="1" />
        {/* Steam/smoke puff — suggests engine */}
        <circle cx="8" cy="50" r="5" fill="#a8a29e" opacity="0.3" />
        <circle cx="15" cy="42" r="7" fill="#a8a29e" opacity="0.2" />
        <circle cx="6" cy="38" r="4" fill="#a8a29e" opacity="0.15" />
        {/* Compass rose — exploration */}
        <circle cx="100" cy="40" r="18" fill="none" stroke="#d97706" strokeWidth="1.5" />
        <line x1="100" y1="22" x2="100" y2="58" stroke="#d97706" strokeWidth="1" />
        <line x1="82" y1="40" x2="118" y2="40" stroke="#d97706" strokeWidth="1" />
        <polygon points="100,24 97,35 103,35" fill="#dc2626" />
        <polygon points="100,56 97,45 103,45" fill="#a8a29e" />
        <text x="98" y="21" fontSize="7" fill="#d97706" fontWeight="bold">N</text>
      </svg>
    ),
    hist_invention: (
      <svg width="130" height="110" viewBox="0 0 130 110">
        {/* Gear outer */}
        <circle cx="65" cy="50" r="28" fill="none" stroke="#a8a29e" strokeWidth="5" />
        {/* Gear teeth */}
        {[0,45,90,135,180,225,270,315].map(a => (
          <rect key={a} x="62" y="17" width="6" height="10" fill="#a8a29e" transform={`rotate(${a} 65 50)`} rx="1" />
        ))}
        {/* Inner circle */}
        <circle cx="65" cy="50" r="14" fill="#78716c" opacity="0.3" />
        <circle cx="65" cy="50" r="6" fill="#57534e" />
        {/* Lightbulb accent */}
        <circle cx="65" cy="48" r="8" fill="#fbbf24" opacity="0.15" />
        <path d="M61,42 Q65,32 69,42" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6" />
        {/* Sparks */}
        <line x1="100" y1="25" x2="108" y2="18" stroke="#fbbf24" strokeWidth="1.5" opacity="0.5" />
        <line x1="105" y1="35" x2="115" y2="33" stroke="#fbbf24" strokeWidth="1.5" opacity="0.4" />
        <line x1="25" y1="30" x2="18" y2="22" stroke="#fbbf24" strokeWidth="1.5" opacity="0.4" />
      </svg>
    ),
    hist_daily_life: (
      <svg width="130" height="110" viewBox="0 0 130 110">
        {/* Pottery vase */}
        <path d="M45,30 Q42,30 40,35 Q35,50 38,65 Q40,80 50,85 L80,85 Q90,80 92,65 Q95,50 90,35 Q88,30 85,30 Z" fill="#c2410c" stroke="#92400e" strokeWidth="1.5" />
        {/* Vase neck */}
        <rect x="50" y="22" width="30" height="10" fill="#c2410c" stroke="#92400e" strokeWidth="1.5" rx="2" />
        <rect x="47" y="18" width="36" height="6" fill="#c2410c" stroke="#92400e" strokeWidth="1.5" rx="2" />
        {/* Decorative bands */}
        <path d="M40,45 Q65,42 90,45" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
        <path d="M38,60 Q65,57 92,60" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
        {/* Pattern */}
        <path d="M50,50 L55,55 L60,50 L65,55 L70,50 L75,55 L80,50" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.7" />
        {/* Shadow */}
        <ellipse cx="65" cy="90" rx="30" ry="4" fill="#78716c" opacity="0.2" />
      </svg>
    ),
    hist_religion: (
      <svg width="130" height="110" viewBox="0 0 130 110">
        {/* Candle */}
        <rect x="55" y="40" width="20" height="50" fill="#fef3c7" stroke="#d97706" strokeWidth="1" rx="2" />
        {/* Flame */}
        <path d="M65,15 Q60,28 58,35 Q62,42 65,42 Q68,42 72,35 Q70,28 65,15" fill="#f59e0b" />
        <path d="M65,22 Q63,30 62,35 Q64,39 65,39 Q66,39 68,35 Q67,30 65,22" fill="#fbbf24" />
        {/* Glow */}
        <circle cx="65" cy="30" r="12" fill="#fbbf24" opacity="0.1" />
        <circle cx="65" cy="30" r="20" fill="#fbbf24" opacity="0.05" />
        {/* Wick */}
        <line x1="65" y1="38" x2="65" y2="42" stroke="#57534e" strokeWidth="1" />
        {/* Base */}
        <rect x="50" y="88" width="30" height="6" fill="#d97706" rx="2" />
        <rect x="53" y="85" width="24" height="5" fill="#f59e0b" rx="1" />
      </svg>
    ),
    hist_society: (
      <svg width="130" height="110" viewBox="0 0 130 110">
        {/* Person 1 */}
        <circle cx="40" cy="35" r="12" fill="#d4a574" stroke="#a8a29e" strokeWidth="1" />
        <path d="M25,90 Q25,55 40,55 Q55,55 55,90" fill="#3b82f6" stroke="#2563eb" strokeWidth="1" />
        {/* Person 2 */}
        <circle cx="65" cy="30" r="12" fill="#8d6e4e" stroke="#a8a29e" strokeWidth="1" />
        <path d="M50,90 Q50,50 65,50 Q80,50 80,90" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" />
        {/* Person 3 */}
        <circle cx="90" cy="35" r="12" fill="#f5d5b8" stroke="#a8a29e" strokeWidth="1" />
        <path d="M75,90 Q75,55 90,55 Q105,55 105,90" fill="#16a34a" stroke="#15803d" strokeWidth="1" />
        {/* Connecting banner */}
        <path d="M25,95 Q65,100 105,95" fill="none" stroke="#fbbf24" strokeWidth="2" />
      </svg>
    ),
    hist_artefact: (
      <svg width="130" height="110" viewBox="0 0 130 110">
        {/* Scroll */}
        <rect x="30" y="25" width="70" height="60" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" rx="2" />
        {/* Scroll rolls top & bottom */}
        <ellipse cx="65" cy="23" rx="38" ry="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
        <ellipse cx="65" cy="87" rx="38" ry="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
        {/* Text lines */}
        <line x1="40" y1="38" x2="90" y2="38" stroke="#92400e" strokeWidth="1.5" opacity="0.4" />
        <line x1="40" y1="48" x2="85" y2="48" stroke="#92400e" strokeWidth="1.5" opacity="0.4" />
        <line x1="40" y1="58" x2="88" y2="58" stroke="#92400e" strokeWidth="1.5" opacity="0.4" />
        <line x1="40" y1="68" x2="75" y2="68" stroke="#92400e" strokeWidth="1.5" opacity="0.4" />
        {/* Wax seal */}
        <circle cx="82" cy="72" r="7" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" />
        <text x="79" y="75" fontSize="8" fill="#fef2f2" fontWeight="bold">✦</text>
      </svg>
    ),
    hist_scroll: (
      <svg width="130" height="110" viewBox="0 0 130 110">
        {/* Open scroll */}
        <path d="M20,20 Q15,55 20,90" fill="none" stroke="#d97706" strokeWidth="3" />
        <path d="M110,20 Q115,55 110,90" fill="none" stroke="#d97706" strokeWidth="3" />
        <rect x="22" y="20" width="86" height="70" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
        {/* Text lines */}
        <line x1="32" y1="35" x2="98" y2="35" stroke="#92400e" strokeWidth="1.5" opacity="0.35" />
        <line x1="32" y1="45" x2="92" y2="45" stroke="#92400e" strokeWidth="1.5" opacity="0.35" />
        <line x1="32" y1="55" x2="95" y2="55" stroke="#92400e" strokeWidth="1.5" opacity="0.35" />
        <line x1="32" y1="65" x2="80" y2="65" stroke="#92400e" strokeWidth="1.5" opacity="0.35" />
        <line x1="32" y1="75" x2="88" y2="75" stroke="#92400e" strokeWidth="1.5" opacity="0.35" />
        {/* Quill pen */}
        <path d="M105,95 Q100,80 90,70" fill="none" stroke="#57534e" strokeWidth="1.5" />
        <path d="M105,95 Q108,90 112,92 Q108,96 105,95" fill="#57534e" />
      </svg>
    ),
  };

  const svg = CONCEPT_SVGS[concept] || null;

  // Pick accent colour: amber for History concepts, emerald for Science
  const isHistConcept = concept?.startsWith("hist_");
  const accent = isHistConcept ? "#f59e0b" : T.emerald;
  const bg = isHistConcept ? "rgba(245,158,11,0.06)" : T.emeraldBg;
  const bd = isHistConcept ? "rgba(245,158,11,0.15)" : T.emeraldBd;

  return (
    <Panel accent={accent} bg={bg} bd={bd} ariaLabel={label}>
      <span style={{ fontSize: 11, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </span>
      {svg || (
        <div style={{ fontSize: 56, lineHeight: 1, textAlign: "center", padding: "8px 0" }}>
          {emoji || "🔬"}
        </div>
      )}
    </Panel>
  );
}

// ─── DOT CLUSTER ─────────────────────────────────────────────────────────────
function DotCluster({ count, color, bg, border, size = 20, label }) {
  const safe = Math.min(count, 15);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      {label != null && (
        <span style={{
          fontSize: 13, fontWeight: 800, color,
          letterSpacing: 0.5,
        }}>{label}</span>
      )}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 4,
        maxWidth: safe > 5 ? 130 : 80,
        justifyContent: "center",
      }}>
        {Array.from({ length: safe }).map((_, i) => (
          <Dot key={i} color={color} bg={bg} border={border} size={size} />
        ))}
      </div>
    </div>
  );
}

// ─── LABEL CHIP ──────────────────────────────────────────────────────────────
function Chip({ children, color, bg }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color, background: bg,
      borderRadius: 6, padding: "2px 7px",
      letterSpacing: 0.5,
    }}>
      {children}
    </span>
  );
}

// ─── OP SYMBOL ───────────────────────────────────────────────────────────────
function Op({ s }) {
  return (
    <span style={{ fontSize: 22, fontWeight: 700, color: T.slate, lineHeight: 1 }}>{s}</span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATHS VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

// ADDITION ────────────────────────────────────────────────────────────────────
function AdditionVis({ a, b, objectIcon }) {
  const bridges = a + b > 10;
  const hasIcon = objectIcon && CTX_ICONS[objectIcon];
  const iconSize = 28;
  const gap = iconSize + 4;
  const maxPerRow = 5;

  if (hasIcon) {
    // Contextual icon mode: show actual objects (books, apples, etc.)
    const renderIconCluster = (count, labelColor) => {
      const safe = Math.min(count, 12);
      const cols = Math.min(safe, maxPerRow);
      const rows = Math.ceil(safe / cols);
      const w = cols * gap + 8;
      const h = rows * gap + 24;
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: labelColor, letterSpacing: 0.5 }}>{count}</span>
          <svg width={w} height={h - 20} viewBox={`0 0 ${w} ${h - 20}`}>
            {Array.from({ length: safe }, (_, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              return <g key={i}><CtxIcon cx={8 + col * gap + iconSize / 2} cy={4 + row * gap + iconSize / 2} s={iconSize} iconKey={objectIcon} /></g>;
            })}
          </svg>
        </div>
      );
    };
    return (
      <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {renderIconCluster(a, T.indigo)}
          <Op s="+" />
          {renderIconCluster(b, T.nebula)}
        </div>
        {bridges && <Chip color={T.amber} bg={T.amberBg}>bridges 10</Chip>}
      </Panel>
    );
  }

  // Default: dot cluster mode
  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <DotCluster count={a} color={T.indigo} bg="#c7d2fe" border={T.indigo} label={a} />
        <Op s="+" />
        <DotCluster count={b} color={T.nebula} bg="#ddd6fe" border={T.nebula} label={b} />
      </div>
      {bridges && (
        <Chip color={T.amber} bg={T.amberBg}>bridges 10</Chip>
      )}
    </Panel>
  );
}

// SUBTRACTION — cross-out dots/icons, not colour-only ─────────────────────────
function SubtractionVis({ from, remove, objectIcon }) {
  const safe = Math.min(from, 15);
  const kept = safe - remove;
  const hasIcon = objectIcon && CTX_ICONS[objectIcon];
  const iconSize = 28;

  if (hasIcon) {
    const cols = Math.min(safe, 5);
    const rows = Math.ceil(safe / cols);
    const gap = iconSize + 6;
    const w = cols * gap + 8;
    const h = rows * gap + 8;
    return (
      <Panel accent={T.rose} bg={T.roseBg} bd={T.roseBd}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          {Array.from({ length: safe }, (_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = 8 + col * gap + iconSize / 2;
            const cy = 8 + row * gap + iconSize / 2;
            const removed = i >= kept;
            return (
              <g key={i} opacity={removed ? 0.3 : 1}>
                <CtxIcon cx={cx} cy={cy} s={iconSize} iconKey={objectIcon} />
                {removed && (
                  <line x1={cx - iconSize * 0.4} y1={cy + iconSize * 0.4}
                        x2={cx + iconSize * 0.4} y2={cy - iconSize * 0.4}
                        stroke={T.rose} strokeWidth={2.5} strokeLinecap="round" />
                )}
              </g>
            );
          })}
        </svg>
        <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 10, fontWeight: 600, color: T.text }}>
          <span>{kept} kept</span>
          <span style={{ color: T.rose }}>{remove} taken away</span>
        </div>
      </Panel>
    );
  }

  // Default: dot mode
  return (
    <Panel accent={T.rose} bg={T.roseBg} bd={T.roseBd}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxWidth: 210, justifyContent: "center" }}>
        {Array.from({ length: safe }).map((_, i) => (
          i < kept
            ? <Dot key={i} color={T.indigo} bg="#c7d2fe" border={T.indigo} size={22} />
            : <Dot key={i} color={T.textMid} bg="#f1f5f9" border="#cbd5e1" size={22} strikethrough />
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Dot color={T.indigo} bg="#c7d2fe" border={T.indigo} size={14} />
          <span style={{ fontSize: 10, color: T.text, fontWeight: 600 }}>kept</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Dot color={T.textMid} bg="#f1f5f9" border="#cbd5e1" size={14} strikethrough />
          <span style={{ fontSize: 10, color: T.text, fontWeight: 600 }}>taken away</span>
        </div>
      </div>
    </Panel>
  );
}

// PLACE VALUE — Dienes blocks (hundreds / tens / ones), accurate proportions ──
function PlaceValueVis({ hundreds = 0, tens = 0, ones = 0 }) {
  // clamp to realistic display limits
  const h = Math.min(hundreds, 9);
  const t = Math.min(tens, 9);
  const o = Math.min(ones, 9);
  const total = h * 100 + t * 10 + o;

  // Hundreds block: 56×56px square grid (10×10 cells inside)
  function HundredsBlock({ idx }) {
    const CELL = 4.6; // each unit cell inside the block
    const GAP  = 0.4;
    const OFF  = 3;   // inner padding
    return (
      <svg key={idx} width={56} height={56} viewBox="0 0 56 56" style={{ display: "block" }}>
        {/* outer border */}
        <rect x={1} y={1} width={54} height={54} rx={3}
          fill="#eef2ff" stroke={T.indigo} strokeWidth={2} />
        {/* 10×10 grid of unit cells */}
        {Array.from({ length: 10 }).map((_, row) =>
          Array.from({ length: 10 }).map((_, col) => (
            <rect key={`${row}-${col}`}
              x={OFF + col * (CELL + GAP)}
              y={OFF + row * (CELL + GAP)}
              width={CELL} height={CELL} rx={0.5}
              fill={T.indigo} opacity={0.72} />
          ))
        )}
      </svg>
    );
  }

  // Tens rod: 20×76px with 10 stacked unit squares inside
  function TensRod({ idx }) {
    return (
      <svg key={idx} width={20} height={76} viewBox="0 0 20 76" style={{ display: "block" }}>
        <rect x={1} y={1} width={18} height={74} rx={3}
          fill="#eef2ff" stroke={T.indigo} strokeWidth={2} />
        {Array.from({ length: 10 }).map((_, j) => (
          <rect key={j} x={3.5} y={3.5 + j * 6.8} width={13} height={5.8} rx={1}
            fill={T.indigo} opacity={0.72} />
        ))}
      </svg>
    );
  }

  // Ones unit: 22×22px square
  function OnesUnit({ idx }) {
    return (
      <div key={idx} style={{
        width: 22, height: 22,
        background: "#fffbeb",
        border: `2px solid ${T.amber}`,
        borderRadius: 4,
      }} />
    );
  }

  const hasHundreds = h > 0;
  const hasTens     = t > 0;
  const hasOnes     = o > 0;

  return (
    <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd}
      ariaLabel={`Place value: ${h} hundreds, ${t} tens, ${o} ones = ${total}`}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap", justifyContent: "center" }}>

        {/* HUNDREDS */}
        {hasHundreds && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", maxWidth: 180 }}>
              {Array.from({ length: h }).map((_, i) => <HundredsBlock key={i} idx={i} />)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Chip color={T.indigo} bg={T.indigoBg}>{h} × 100</Chip>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.indigo }}>=&nbsp;{h * 100}</span>
            </div>
          </div>
        )}

        {/* Divider between groups */}
        {hasHundreds && (hasTens || hasOnes) && (
          <div style={{ width: 1, height: 76, background: "#cbd5e1", alignSelf: "flex-end", marginBottom: 22 }} />
        )}

        {/* TENS */}
        {hasTens && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", maxWidth: 180 }}>
              {Array.from({ length: t }).map((_, i) => <TensRod key={i} idx={i} />)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Chip color={T.indigo} bg={T.indigoBg}>{t} × 10</Chip>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.indigo }}>=&nbsp;{t * 10}</span>
            </div>
          </div>
        )}

        {/* Divider between tens and ones */}
        {hasTens && hasOnes && (
          <div style={{ width: 1, height: 40, background: "#cbd5e1", alignSelf: "flex-end", marginBottom: 22 }} />
        )}

        {/* ONES */}
        {hasOnes && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 22px)", gap: 4 }}>
              {Array.from({ length: o }).map((_, i) => <OnesUnit key={i} idx={i} />)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Chip color={T.amber} bg={T.amberBg}>{o} × 1</Chip>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.amber }}>=&nbsp;{o}</span>
            </div>
          </div>
        )}
      </div>

      {/* Total banner */}
      {total > 0 && (
        <div style={{
          marginTop: 10,
          background: "white",
          border: `1.5px solid ${T.amberBd}`,
          borderRadius: 8,
          padding: "5px 12px",
          textAlign: "center",
          fontSize: 14,
          fontWeight: 800,
          color: "#1e293b",
          letterSpacing: "-0.2px",
        }}>
          {hasHundreds && <span style={{ color: T.indigo }}>{h}&nbsp;hundred{h > 1 ? "s" : ""}</span>}
          {hasHundreds && hasTens && <span style={{ color: T.slate }}> + </span>}
          {hasTens && <span style={{ color: T.indigo }}>{t}&nbsp;ten{t > 1 ? "s" : ""}</span>}
          {(hasHundreds || hasTens) && hasOnes && <span style={{ color: T.slate }}> + </span>}
          {hasOnes && <span style={{ color: T.amber }}>{o}&nbsp;one{o > 1 ? "s" : ""}</span>}
          <span style={{ color: T.slate }}> = </span>
          <span style={{ color: "#0f172a" }}>{total}</span>
        </div>
      )}
    </Panel>
  );
}

// MULTIPLICATION — SVG dot-grid with bracket annotations ──────────────────────
function MultiplicationVis({ rows, cols }) {
  const dispR = Math.min(rows, 10);
  const dispC = Math.min(cols, 10);
  const truncR = rows > dispR;
  const truncC = cols > dispC;
  const maxDim = Math.max(dispR, dispC);
  const cell  = maxDim > 8 ? 11 : maxDim > 6 ? 13 : maxDim > 4 ? 16 : 20;
  const gap   = 3;
  const r     = cell / 2;
  // Padding: left for row-bracket+label, top for col-bracket+label
  const PL = 34, PT = 28, PR = 10, PB = 10;
  const gridW = dispC * (cell + gap) - gap;
  const gridH = dispR * (cell + gap) - gap;
  const W = PL + gridW + PR + (truncC ? 14 : 0);
  const H = PT + gridH + PB + (truncR ? 12 : 0);

  // Bracket helpers: draws a [ shape
  const BK = 4; // bracket arm length
  const colBracketY  = PT - 14;
  const colBracketX1 = PL;
  const colBracketX2 = PL + gridW;
  const rowBracketX  = PL - 16;
  const rowBracketY1 = PT;
  const rowBracketY2 = PT + gridH;

  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd}
      ariaLabel={`${rows} rows of ${cols}`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible" }}>
        <defs>
          <radialGradient id="mv_cg" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#059669" />
          </radialGradient>
        </defs>

        {/* Column bracket (top) */}
        <line x1={colBracketX1} y1={colBracketY + BK} x2={colBracketX1} y2={colBracketY}
          stroke={T.emerald} strokeWidth={1.5} />
        <line x1={colBracketX1} y1={colBracketY} x2={colBracketX2} y2={colBracketY}
          stroke={T.emerald} strokeWidth={1.5} />
        <line x1={colBracketX2} y1={colBracketY} x2={colBracketX2} y2={colBracketY + BK}
          stroke={T.emerald} strokeWidth={1.5} />
        <text x={(colBracketX1 + colBracketX2) / 2} y={colBracketY - 3}
          textAnchor="middle" fontSize={9} fontWeight="700" fill={T.emerald}>
          {cols}{truncC ? "+" : ""} in each row
        </text>

        {/* Row bracket (left) */}
        <line x1={rowBracketX - BK} y1={rowBracketY1} x2={rowBracketX} y2={rowBracketY1}
          stroke={T.emerald} strokeWidth={1.5} />
        <line x1={rowBracketX} y1={rowBracketY1} x2={rowBracketX} y2={rowBracketY2}
          stroke={T.emerald} strokeWidth={1.5} />
        <line x1={rowBracketX} y1={rowBracketY2} x2={rowBracketX - BK} y2={rowBracketY2}
          stroke={T.emerald} strokeWidth={1.5} />
        <text
          x={rowBracketX - BK - 3}
          y={(rowBracketY1 + rowBracketY2) / 2}
          textAnchor="middle"
          fontSize={9} fontWeight="700" fill={T.emerald}
          transform={`rotate(-90, ${rowBracketX - BK - 3}, ${(rowBracketY1 + rowBracketY2) / 2})`}>
          {rows}{truncR ? "+" : ""} rows
        </text>

        {/* Dot grid */}
        {Array.from({ length: dispR }).map((_, ri) =>
          Array.from({ length: dispC }).map((_, ci) => {
            const cx = PL + ci * (cell + gap) + r;
            const cy = PT + ri * (cell + gap) + r;
            return (
              <circle key={`${ri}-${ci}`} cx={cx} cy={cy} r={r}
                fill="url(#mv_cg)" />
            );
          })
        )}

        {/* Truncation indicators */}
        {truncC && (
          <text x={PL + gridW + 6} y={PT + r + 3}
            fontSize={10} fontWeight="800" fill={T.emerald}>…</text>
        )}
        {truncR && (
          <text x={PL + r} y={PT + gridH + 11}
            fontSize={9} fontWeight="700" fill={T.emerald}>⋮ ({rows} rows total)</text>
        )}
      </svg>
      <Chip color={T.emerald} bg={T.emeraldBg}>{rows} × {cols} = ?</Chip>
    </Panel>
  );
}

// FRACTION — bar segments, labelled ──────────────────────────────────────────
function FractionVis({ numerator, denominator }) {
  const den = Math.min(denominator, 16), num = Math.min(numerator, den);
  // Decide which representation to lead with
  const usePie = den <= 12; // pie works well up to 12 slices

  // ── Pie/circle helper ────────────────────────────────────────────────────────
  const PieFraction = () => {
    const R = 54, cx = 70, cy = 62, SIZE = 140;
    const slices = Array.from({ length: den }, (_, i) => {
      const a0 = (i / den) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / den) * 2 * Math.PI - Math.PI / 2;
      const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
      const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
      const large = den === 1 ? 1 : 0;
      const filled = i < num;
      return { x0, y0, x1, y1, large, filled, a0, a1 };
    });
    // For den===1 use a full circle
    const fullCircle = den === 1;
    return (
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <radialGradient id="fracFill" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#a78bfa"/>
            <stop offset="100%" stopColor="#6d28d9"/>
          </radialGradient>
          <radialGradient id="fracEmpty" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#ede9fe"/>
            <stop offset="100%" stopColor="#ddd6fe"/>
          </radialGradient>
        </defs>
        {/* outer ring */}
        <circle cx={cx} cy={cy} r={R + 3} fill="none" stroke="#c4b5fd" strokeWidth={1.5}/>
        {fullCircle && num === 1
          ? <circle cx={cx} cy={cy} r={R} fill="url(#fracFill)" stroke="#6d28d9" strokeWidth={1.5}/>
          : fullCircle
            ? <circle cx={cx} cy={cy} r={R} fill="url(#fracEmpty)" stroke="#c4b5fd" strokeWidth={1.5}/>
            : slices.map((s, i) => (
                <path key={i}
                  d={`M${cx},${cy} L${s.x0},${s.y0} A${R},${R} 0 ${s.large},1 ${s.x1},${s.y1} Z`}
                  fill={s.filled ? "url(#fracFill)" : "url(#fracEmpty)"}
                  stroke={s.filled ? "#6d28d9" : "#c4b5fd"} strokeWidth={1.2}/>
              ))
        }
        {/* spoke lines */}
        {!fullCircle && slices.map((s, i) => (
          <line key={i} x1={cx} y1={cy} x2={s.x0} y2={s.y0}
            stroke={i < num ? "#6d28d9" : "#c4b5fd"} strokeWidth={1}/>
        ))}
        {/* centre dot */}
        <circle cx={cx} cy={cy} r={4} fill="#6d28d9"/>
        {/* fraction label inside or beside */}
        <text x={cx} y={cy + R + 16} textAnchor="middle" fontSize={10} fontWeight="800" fill="#6d28d9">
          {num}/{den} shaded
        </text>
      </svg>
    );
  };

  // ── Bar segments helper ──────────────────────────────────────────────────────
  const BarFraction = () => {
    const segW = Math.max(18, Math.min(34, 240 / den));
    return (
      <div style={{ display:"flex", gap:3, flexWrap:"wrap", justifyContent:"center" }}>
        {Array.from({ length: den }).map((_, i) => (
          <div key={i} style={{
            width: segW, height: 40, borderRadius: 6,
            background: i < num ? "#7c3aed" : "#ede9fe",
            border: `2px solid ${i < num ? "#6d28d9" : "#c4b5fd"}`,
            backgroundImage: i < num
              ? "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,0.18) 4px,rgba(255,255,255,0.18) 5px)"
              : "none",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            {den <= 8 && (
              <span style={{ fontSize:9, fontWeight:800, color: i < num ? "white" : "#8b5cf6" }}>{i+1}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Panel accent={T.nebula} bg={T.nebulaBg} bd={T.nebulaBd}>
      <div style={{ display:"flex", gap:12, alignItems:"center", justifyContent:"center", flexWrap:"wrap" }}>
        {/* Primary representation */}
        {usePie ? <PieFraction /> : <BarFraction />}

        {/* Secondary (bar always shown, pie shown for large denominators) */}
        {usePie && den > 1 && <BarFraction />}
        {!usePie && <PieFraction />}
      </div>

      {/* Fraction notation row */}
      <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0, lineHeight:1 }}>
          <span style={{ fontSize:30, fontWeight:900, color:T.nebula }}>{num}</span>
          <div style={{ width:22, height:3, background:T.nebula, borderRadius:2 }}/>
          <span style={{ fontSize:22, fontWeight:900, color:T.nebula }}>{den}</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:14, height:14, borderRadius:3, background:"#7c3aed", border:"2px solid #6d28d9",
              backgroundImage:"repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,0.2) 3px,rgba(255,255,255,0.2) 4px)" }}/>
            <span style={{ fontSize:10, color:T.textMid, fontWeight:600 }}>{num} shaded</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:14, height:14, borderRadius:3, background:"#ede9fe", border:"2px solid #c4b5fd" }}/>
            <span style={{ fontSize:10, color:T.textMid, fontWeight:600 }}>{den - num} unshaded</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// NUMBER BONDS — part-part-whole ─────────────────────────────────────────────
function NumberBondVis({ whole, partA, partB }) {
  const W = 240, H = 178;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto" }}>
      <defs>
        <linearGradient id="nb_whole" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="nb_parta" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2ff" />
          <stop offset="100%" stopColor="#c7d2fe" />
        </linearGradient>
        <linearGradient id="nb_partb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f3ff" />
          <stop offset="100%" stopColor="#ddd6fe" />
        </linearGradient>
        <filter id="nb_sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1e293b" floodOpacity="0.13" />
        </filter>
      </defs>
      {/* WHOLE label */}
      <text x={120} y={11} textAnchor="middle" dominantBaseline="central"
        fontSize={8} fontWeight={700} fill="#64748b" letterSpacing={1}>WHOLE</text>
      {/* Bezier branch connectors */}
      <path d="M 120 68 C 120 90 54 94 54 112" fill="none" stroke="#94a3b8" strokeWidth={2.5} strokeDasharray="5,3" />
      <path d="M 120 68 C 120 90 186 94 186 112" fill="none" stroke="#94a3b8" strokeWidth={2.5} strokeDasharray="5,3" />
      {/* WHOLE box */}
      <g filter="url(#nb_sh)">
        <rect x={93} y={18} width={54} height={50} rx={12} fill="url(#nb_whole)" stroke="#94a3b8" strokeWidth={2.5} />
        <rect x={98} y={22} width={22} height={9} rx={4.5} fill="white" opacity={0.65} />
      </g>
      <text x={120} y={43} textAnchor="middle" dominantBaseline="central"
        fontSize={24} fontWeight={900} fill={whole != null ? "#334155" : "#f59e0b"}>
        {whole != null ? whole : "?"}
      </text>
      {/* PART A box */}
      <g filter="url(#nb_sh)">
        <rect x={27} y={112} width={54} height={50} rx={12} fill="url(#nb_parta)" stroke={T.indigoBd} strokeWidth={2.5} />
        <rect x={32} y={116} width={22} height={9} rx={4.5} fill="white" opacity={0.6} />
      </g>
      <text x={54} y={137} textAnchor="middle" dominantBaseline="central"
        fontSize={24} fontWeight={900} fill={partA != null ? T.indigo : "#f59e0b"}>
        {partA != null ? partA : "?"}
      </text>
      <text x={54} y={170} textAnchor="middle" dominantBaseline="central"
        fontSize={8} fontWeight={700} fill={T.indigo} letterSpacing={1}>PART</text>
      {/* PART B box */}
      <g filter="url(#nb_sh)">
        <rect x={159} y={112} width={54} height={50} rx={12} fill="url(#nb_partb)" stroke={T.nebulaBd} strokeWidth={2.5} />
        <rect x={164} y={116} width={22} height={9} rx={4.5} fill="white" opacity={0.6} />
      </g>
      <text x={186} y={137} textAnchor="middle" dominantBaseline="central"
        fontSize={24} fontWeight={900} fill={partB != null ? T.nebula : "#f59e0b"}>
        {partB != null ? partB : "?"}
      </text>
      <text x={186} y={170} textAnchor="middle" dominantBaseline="central"
        fontSize={8} fontWeight={700} fill={T.nebula} letterSpacing={1}>PART</text>
    </svg>
  );
}

// COUNTING — dice face patterns ───────────────────────────────────────────────
const DICE = {
  1:[[50,50]],2:[[28,50],[72,50]],3:[[22,22],[50,50],[78,78]],
  4:[[25,28],[75,28],[25,72],[75,72]],5:[[25,28],[75,28],[50,50],[25,72],[75,72]],
  6:[[25,22],[75,22],[25,50],[75,50],[25,78],[75,78]],
};
function CountingVis({ count, objectIcon }) {
  const safe = Math.min(count, 25);
  const hasIcon = objectIcon && CTX_ICONS[objectIcon];

  // Contextual icon mode: show actual objects
  if (hasIcon) {
    const iconSize = safe <= 10 ? 30 : 24;
    const cols = Math.min(safe, 5);
    const rows = Math.ceil(safe / cols);
    const gap = iconSize + 6;
    const pad = 8;
    const w = pad * 2 + cols * gap;
    const h = pad * 2 + rows * gap;
    return (
      <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd}>
        <svg width={Math.min(w, 200)} height={Math.min(h, 160)} viewBox={`0 0 ${w} ${h}`}>
          <rect x={2} y={2} width={w - 4} height={h - 4} rx={12} fill="white" stroke={T.amberBd} strokeWidth={2} />
          {Array.from({ length: safe }, (_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            return <g key={i}><CtxIcon cx={pad + col * gap + iconSize / 2} cy={pad + row * gap + iconSize / 2} s={iconSize} iconKey={objectIcon} /></g>;
          })}
        </svg>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.amber, textAlign: "center", marginTop: 4 }}>
          Count them!
        </div>
      </Panel>
    );
  }

  const layout = safe <= 10 ? DICE[safe] : null;

  // For counts > 10, use a grid of dots
  if (!layout) {
    const cols = safe <= 15 ? 5 : 6;
    const rows = Math.ceil(safe / cols);
    const dotR = safe <= 15 ? 8 : 6;
    const gap = safe <= 15 ? 22 : 18;
    const pad = 10;
    const w = pad * 2 + cols * gap;
    const h = pad * 2 + rows * gap;
    return (
      <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd}>
        <svg width={Math.min(w, 160)} height={Math.min(h, 120)} viewBox={`0 0 ${w} ${h}`}>
          <rect x={2} y={2} width={w - 4} height={h - 4} rx={12}
            fill="white" stroke={T.amberBd} strokeWidth={2} />
          {Array.from({ length: safe }, (_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            return (
              <circle key={i} cx={pad + gap / 2 + col * gap} cy={pad + gap / 2 + row * gap}
                r={dotR} fill={T.amber} stroke={T.amber} strokeWidth={0.5} />
            );
          })}
        </svg>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.amber, textAlign: "center", marginTop: 4 }}>
          Count the dots
        </div>
      </Panel>
    );
  }

  return (
    <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd}>
      <svg width={88} height={88} viewBox="0 0 100 100">
        <rect x={3} y={3} width={94} height={94} rx={16}
          fill="white" stroke={T.amberBd} strokeWidth={2.5} />
        {layout.map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r={10}
            fill={T.amber} stroke={T.amber} strokeWidth={1} />
        ))}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECT GROUPS — coloured physical objects (bricks, beads, marbles, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
const OBJ_COLOUR_MAP = {
  red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308",
  orange: "#f97316", purple: "#a855f7", pink: "#ec4899", white: "#f1f5f9",
  black: "#1e293b", brown: "#92400e", grey: "#94a3b8", gray: "#94a3b8",
  striped: "#6366f1", spotted: "#f59e0b",
};
const OBJ_SHAPE_MAP = {
  brick: (cx, cy, r, fill) => <rect x={cx-r} y={cy-r*0.6} width={r*2} height={r*1.2} rx={3} fill={fill} stroke="#0002" strokeWidth={1} />,
  bead: (cx, cy, r, fill) => <><circle cx={cx} cy={cy} r={r} fill={fill} stroke="#0002" strokeWidth={1} /><ellipse cx={cx-r*0.25} cy={cy-r*0.25} rx={r*0.3} ry={r*0.2} fill="#fff4" /></>,
  marble: (cx, cy, r, fill) => <><circle cx={cx} cy={cy} r={r} fill={fill} stroke="#0002" strokeWidth={1} /><circle cx={cx-r*0.3} cy={cy-r*0.3} r={r*0.25} fill="#fff3" /></>,
  ball: (cx, cy, r, fill) => <><circle cx={cx} cy={cy} r={r} fill={fill} stroke="#0002" strokeWidth={1} /><ellipse cx={cx-r*0.25} cy={cy-r*0.25} rx={r*0.3} ry={r*0.2} fill="#fff4" /></>,
  star: (cx, cy, r, fill) => { const pts = Array.from({length:5},(_,i)=>{const a1=(i*72-90)*Math.PI/180;const a2=((i*72+36)-90)*Math.PI/180;const oR=r;const iR=r*0.4;return`${cx+oR*Math.cos(a1)},${cy+oR*Math.sin(a1)} ${cx+iR*Math.cos(a2)},${cy+iR*Math.sin(a2)}`;}).join(' '); return <polygon points={pts} fill={fill} stroke="#0002" strokeWidth={1}/>; },
};
const defaultObjShape = (cx, cy, r, fill) => <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#0002" strokeWidth={1} />;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXTUAL OBJECT ICONS — renders books/apples/cars etc. instead of dots
// ═══════════════════════════════════════════════════════════════════════════════
const CTX_ICONS = {
  book: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <rect x={1} y={2} width={s-2} height={s-4} rx={2} fill="#3b82f6" />
      <rect x={3} y={4} width={s-8} height={s-8} rx={1} fill="#dbeafe" />
      <line x1={s*0.3} y1={s*0.35} x2={s*0.7} y2={s*0.35} stroke="#3b82f6" strokeWidth={1} opacity={0.5} />
      <line x1={s*0.3} y1={s*0.5} x2={s*0.65} y2={s*0.5} stroke="#3b82f6" strokeWidth={1} opacity={0.4} />
    </g>
  ),
  apple: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <circle cx={s/2} cy={s*0.55} r={s*0.38} fill="#ef4444" />
      <ellipse cx={s/2} cy={s*0.55} rx={s*0.38} ry={s*0.35} fill="#ef4444" />
      <line x1={s/2} y1={s*0.15} x2={s/2} y2={s*0.3} stroke="#92400e" strokeWidth={1.5} />
      <ellipse cx={s*0.55} cy={s*0.2} rx={s*0.12} ry={s*0.08} fill="#22c55e" transform={`rotate(20 ${s*0.55} ${s*0.2})`} />
    </g>
  ),
  sweet: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <ellipse cx={s/2} cy={s/2} rx={s*0.3} ry={s*0.25} fill="#ec4899" />
      <path d={`M${s*0.2},${s/2} L${s*0.05},${s*0.35} L${s*0.05},${s*0.65} Z`} fill="#fbbf24" opacity={0.7} />
      <path d={`M${s*0.8},${s/2} L${s*0.95},${s*0.35} L${s*0.95},${s*0.65} Z`} fill="#fbbf24" opacity={0.7} />
    </g>
  ),
  pencil: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <rect x={s*0.35} y={s*0.1} width={s*0.3} height={s*0.65} rx={1} fill="#fbbf24" />
      <polygon points={`${s*0.35},${s*0.75} ${s*0.65},${s*0.75} ${s/2},${s*0.95}`} fill="#fde68a" />
      <rect x={s*0.35} y={s*0.1} width={s*0.3} height={s*0.12} rx={1} fill="#f472b6" />
      <circle cx={s/2} cy={s*0.93} r={s*0.03} fill="#1e293b" />
    </g>
  ),
  car: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <rect x={s*0.1} y={s*0.4} width={s*0.8} height={s*0.3} rx={3} fill="#3b82f6" />
      <path d={`M${s*0.25},${s*0.4} L${s*0.35},${s*0.2} L${s*0.65},${s*0.2} L${s*0.75},${s*0.4}`} fill="#60a5fa" />
      <circle cx={s*0.28} cy={s*0.72} r={s*0.09} fill="#1e293b" />
      <circle cx={s*0.72} cy={s*0.72} r={s*0.09} fill="#1e293b" />
    </g>
  ),
  toy: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <circle cx={s/2} cy={s*0.35} r={s*0.2} fill="#fbbf24" />
      <rect x={s*0.3} y={s*0.5} width={s*0.4} height={s*0.35} rx={3} fill="#ef4444" />
      <circle cx={s*0.4} cy={s*0.3} r={s*0.04} fill="#1e293b" />
      <circle cx={s*0.6} cy={s*0.3} r={s*0.04} fill="#1e293b" />
    </g>
  ),
  egg: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <ellipse cx={s/2} cy={s*0.52} rx={s*0.3} ry={s*0.38} fill="#fef3c7" stroke="#d97706" strokeWidth={1} />
    </g>
  ),
  coin: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <circle cx={s/2} cy={s/2} r={s*0.38} fill="#fbbf24" stroke="#d97706" strokeWidth={1.5} />
      <text x={s/2} y={s*0.58} textAnchor="middle" fontSize={s*0.3} fontWeight="bold" fill="#92400e">p</text>
    </g>
  ),
  flower: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <circle cx={s/2} cy={s/2} r={s*0.15} fill="#fbbf24" />
      {[0,60,120,180,240,300].map(a => (
        <ellipse key={a} cx={s/2} cy={s*0.25} rx={s*0.1} ry={s*0.16} fill="#ec4899" opacity={0.8} transform={`rotate(${a} ${s/2} ${s/2})`} />
      ))}
    </g>
  ),
  tree: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <rect x={s*0.42} y={s*0.6} width={s*0.16} height={s*0.35} fill="#92400e" />
      <circle cx={s/2} cy={s*0.38} r={s*0.32} fill="#22c55e" />
    </g>
  ),
  bird: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <ellipse cx={s/2} cy={s*0.5} rx={s*0.25} ry={s*0.2} fill="#60a5fa" />
      <circle cx={s*0.65} cy={s*0.4} r={s*0.1} fill="#60a5fa" />
      <polygon points={`${s*0.75},${s*0.4} ${s*0.9},${s*0.38} ${s*0.75},${s*0.44}`} fill="#f97316" />
      <circle cx={s*0.68} cy={s*0.38} r={s*0.03} fill="#1e293b" />
    </g>
  ),
  fish: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <ellipse cx={s/2} cy={s/2} rx={s*0.35} ry={s*0.2} fill="#f97316" />
      <polygon points={`${s*0.15},${s/2} ${s*0.0},${s*0.3} ${s*0.0},${s*0.7}`} fill="#f97316" />
      <circle cx={s*0.65} cy={s*0.45} r={s*0.04} fill="#1e293b" />
    </g>
  ),
  cat: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <circle cx={s/2} cy={s*0.5} r={s*0.28} fill="#f97316" />
      <polygon points={`${s*0.3},${s*0.3} ${s*0.35},${s*0.15} ${s*0.45},${s*0.3}`} fill="#f97316" />
      <polygon points={`${s*0.55},${s*0.3} ${s*0.65},${s*0.15} ${s*0.7},${s*0.3}`} fill="#f97316" />
      <circle cx={s*0.42} cy={s*0.47} r={s*0.04} fill="#1e293b" />
      <circle cx={s*0.58} cy={s*0.47} r={s*0.04} fill="#1e293b" />
    </g>
  ),
  dog: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <circle cx={s/2} cy={s*0.5} r={s*0.28} fill="#92400e" />
      <ellipse cx={s*0.32} cy={s*0.32} rx={s*0.1} ry={s*0.14} fill="#a16207" />
      <ellipse cx={s*0.68} cy={s*0.32} rx={s*0.1} ry={s*0.14} fill="#a16207" />
      <circle cx={s*0.42} cy={s*0.47} r={s*0.04} fill="#1e293b" />
      <circle cx={s*0.58} cy={s*0.47} r={s*0.04} fill="#1e293b" />
      <ellipse cx={s/2} cy={s*0.58} rx={s*0.08} ry={s*0.06} fill="#1e293b" />
    </g>
  ),
  frog: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <ellipse cx={s/2} cy={s*0.55} rx={s*0.32} ry={s*0.25} fill="#22c55e" />
      <circle cx={s*0.35} cy={s*0.35} r={s*0.1} fill="#22c55e" />
      <circle cx={s*0.65} cy={s*0.35} r={s*0.1} fill="#22c55e" />
      <circle cx={s*0.35} cy={s*0.33} r={s*0.05} fill="#1e293b" />
      <circle cx={s*0.65} cy={s*0.33} r={s*0.05} fill="#1e293b" />
    </g>
  ),
  cookie: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <circle cx={s/2} cy={s/2} r={s*0.38} fill="#d97706" />
      <circle cx={s*0.4} cy={s*0.4} r={s*0.06} fill="#78350f" />
      <circle cx={s*0.6} cy={s*0.55} r={s*0.06} fill="#78350f" />
      <circle cx={s*0.45} cy={s*0.65} r={s*0.05} fill="#78350f" />
    </g>
  ),
  cake: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <rect x={s*0.2} y={s*0.4} width={s*0.6} height={s*0.45} rx={3} fill="#fbbf24" />
      <rect x={s*0.15} y={s*0.35} width={s*0.7} height={s*0.15} rx={3} fill="#ec4899" />
      <rect x={s*0.46} y={s*0.15} width={s*0.08} height={s*0.2} fill="#fbbf24" />
      <ellipse cx={s/2} cy={s*0.14} rx={s*0.04} ry={s*0.06} fill="#f97316" />
    </g>
  ),
  banana: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <path d={`M${s*0.3},${s*0.7} Q${s*0.15},${s*0.3} ${s*0.5},${s*0.2} Q${s*0.75},${s*0.15} ${s*0.7},${s*0.5}`} stroke="#eab308" strokeWidth={s*0.15} fill="none" strokeLinecap="round" />
    </g>
  ),
  orange: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <circle cx={s/2} cy={s*0.52} r={s*0.35} fill="#f97316" />
      <ellipse cx={s/2} cy={s*0.2} rx={s*0.08} ry={s*0.06} fill="#22c55e" />
    </g>
  ),
  strawberry: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <path d={`M${s/2},${s*0.9} Q${s*0.2},${s*0.5} ${s*0.35},${s*0.25} L${s*0.65},${s*0.25} Q${s*0.8},${s*0.5} ${s/2},${s*0.9}`} fill="#ef4444" />
      <ellipse cx={s/2} cy={s*0.2} rx={s*0.15} ry={s*0.08} fill="#22c55e" />
    </g>
  ),
  person: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <circle cx={s/2} cy={s*0.25} r={s*0.15} fill="#fbbf24" />
      <rect x={s*0.32} y={s*0.42} width={s*0.36} height={s*0.35} rx={3} fill="#3b82f6" />
      <line x1={s*0.4} y1={s*0.78} x2={s*0.4} y2={s*0.95} stroke="#1e293b" strokeWidth={2} />
      <line x1={s*0.6} y1={s*0.78} x2={s*0.6} y2={s*0.95} stroke="#1e293b" strokeWidth={2} />
    </g>
  ),
  shell: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <ellipse cx={s/2} cy={s*0.55} rx={s*0.35} ry={s*0.3} fill="#fde68a" stroke="#d97706" strokeWidth={1} />
      <path d={`M${s*0.25},${s*0.55} Q${s/2},${s*0.25} ${s*0.75},${s*0.55}`} fill="none" stroke="#d97706" strokeWidth={0.8} />
    </g>
  ),
  cup: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <rect x={s*0.25} y={s*0.2} width={s*0.5} height={s*0.55} rx={3} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} />
      <path d={`M${s*0.75},${s*0.35} Q${s*0.92},${s*0.35} ${s*0.92},${s*0.5} Q${s*0.92},${s*0.65} ${s*0.75},${s*0.65}`} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
    </g>
  ),
  balloon: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <ellipse cx={s/2} cy={s*0.38} rx={s*0.28} ry={s*0.32} fill="#ef4444" />
      <line x1={s/2} y1={s*0.7} x2={s/2} y2={s*0.95} stroke="#94a3b8" strokeWidth={1} />
    </g>
  ),
  sock: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <path d={`M${s*0.4},${s*0.1} L${s*0.4},${s*0.6} Q${s*0.4},${s*0.85} ${s*0.65},${s*0.85} L${s*0.75},${s*0.85} Q${s*0.75},${s*0.65} ${s*0.6},${s*0.6} L${s*0.6},${s*0.1}`} fill="#ec4899" stroke="#be185d" strokeWidth={1} />
    </g>
  ),
  hat: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <rect x={s*0.15} y={s*0.6} width={s*0.7} height={s*0.12} rx={2} fill="#1e293b" />
      <rect x={s*0.3} y={s*0.2} width={s*0.4} height={s*0.42} rx={3} fill="#1e293b" />
    </g>
  ),
  crayon: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <rect x={s*0.35} y={s*0.2} width={s*0.3} height={s*0.55} rx={2} fill="#ef4444" />
      <polygon points={`${s*0.35},${s*0.75} ${s*0.65},${s*0.75} ${s/2},${s*0.92}`} fill="#ef4444" />
      <rect x={s*0.35} y={s*0.2} width={s*0.3} height={s*0.08} fill="#1e293b" opacity={0.2} />
    </g>
  ),
  lego: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <rect x={s*0.15} y={s*0.35} width={s*0.7} height={s*0.5} rx={3} fill="#ef4444" />
      <circle cx={s*0.35} cy={s*0.32} r={s*0.1} fill="#dc2626" />
      <circle cx={s*0.65} cy={s*0.32} r={s*0.1} fill="#dc2626" />
    </g>
  ),
  sticker: (cx, cy, s) => {
    const pts = Array.from({length:5},(_,i)=>{const a1=(i*72-90)*Math.PI/180;const a2=((i*72+36)-90)*Math.PI/180;const oR=s*0.38;const iR=s*0.17;return`${s/2+oR*Math.cos(a1)},${s/2+oR*Math.sin(a1)} ${s/2+iR*Math.cos(a2)},${s/2+iR*Math.sin(a2)}`;}).join(' ');
    return (
      <g transform={`translate(${cx - s/2},${cy - s/2})`}>
        <polygon points={pts} fill="#fbbf24" stroke="#d97706" strokeWidth={1} />
      </g>
    );
  },
  spider: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <ellipse cx={s/2} cy={s/2} rx={s*0.2} ry={s*0.15} fill="#1e293b" />
      {[-1,1].map(d => [0.3,0.5,0.7].map((y,i) => (
        <line key={`${d}-${i}`} x1={s/2} y1={s*y} x2={s*(0.5+d*0.4)} y2={s*(y+d*0.08*(i-1))} stroke="#1e293b" strokeWidth={1} />
      )))}
    </g>
  ),
  butterfly: (cx, cy, s) => (
    <g transform={`translate(${cx - s/2},${cy - s/2})`}>
      <ellipse cx={s*0.35} cy={s*0.45} rx={s*0.2} ry={s*0.28} fill="#a855f7" opacity={0.8} />
      <ellipse cx={s*0.65} cy={s*0.45} rx={s*0.2} ry={s*0.28} fill="#ec4899" opacity={0.8} />
      <rect x={s*0.47} y={s*0.25} width={s*0.06} height={s*0.5} rx={2} fill="#1e293b" />
    </g>
  ),
};

// Maps question-text nouns → icon key. Plural forms handled by stripping trailing "s"
const NOUN_TO_ICON = {
  book: "book", notebook: "book", textbook: "book",
  apple: "apple",
  sweet: "sweet", candy: "sweet", lollipop: "sweet", chocolate: "sweet",
  pencil: "pencil", pen: "pencil",
  car: "car", van: "car", bus: "car", truck: "car", lorry: "car",
  toy: "toy", teddy: "toy", bear: "toy", doll: "toy",
  egg: "egg",
  coin: "coin", penny: "coin", pound: "coin", pence: "coin",
  flower: "flower", daisy: "flower", rose: "flower", tulip: "flower",
  tree: "tree",
  bird: "bird", robin: "bird", sparrow: "bird", pigeon: "bird", parrot: "bird",
  fish: "fish",
  cat: "cat", kitten: "cat",
  dog: "dog", puppy: "dog",
  frog: "frog", toad: "frog",
  cookie: "cookie", biscuit: "cookie",
  cake: "cake", cupcake: "cake", muffin: "cake",
  banana: "banana",
  orange: "orange",
  strawberry: "strawberry", berry: "strawberry",
  child: "person", children: "person", student: "person", pupil: "person", friend: "person", boy: "person", girl: "person", person: "person", people: "person",
  shell: "shell", seashell: "shell",
  cup: "cup", mug: "cup", glass: "cup", bottle: "cup",
  balloon: "balloon",
  sock: "sock",
  hat: "hat", cap: "hat",
  crayon: "crayon",
  lego: "lego", block: "lego",
  sticker: "sticker", stamp: "sticker",
  spider: "spider", ant: "spider", bug: "spider",
  butterfly: "butterfly",
  marble: "coin", button: "coin", counter: "coin",
  star: "sticker",
  packet: "sweet", bag: "sweet", box: "lego",
};

/** Extract the first recognisable object noun from question text. Returns icon key or null. */
function extractObjectFromQuestion(questionStr) {
  if (!questionStr) return null;
  const q = questionStr.toLowerCase();
  // Try to match known nouns (longest match first to prefer "butterfly" over "but")
  const sortedNouns = Object.keys(NOUN_TO_ICON).sort((a, b) => b.length - a.length);
  for (const noun of sortedNouns) {
    // Match singular or plural (noun + optional "s"/"es"/"ies")
    const rx = new RegExp(`\\b${noun}(?:s|es)?\\b`, "i");
    if (rx.test(q)) return NOUN_TO_ICON[noun];
  }
  return null;
}

/** Render a contextual icon at SVG coordinates (cx, cy) with size s. Falls back to circle. */
function CtxIcon({ cx, cy, s, iconKey, fallbackColor }) {
  const renderer = iconKey ? CTX_ICONS[iconKey] : null;
  if (renderer) return renderer(cx, cy, s);
  return <circle cx={cx} cy={cy} r={s * 0.4} fill={fallbackColor || T.indigo} stroke="#0002" strokeWidth={1} />;
}

function ObjectGroupsVis({ groups, total, operation }) {
  if (!groups || groups.length === 0) return null;
  const maxPerRow = 6;
  const dotR = total <= 10 ? 10 : total <= 15 ? 8 : 6;
  const gap = dotR * 2.6;
  const groupPad = 12;
  // Layout each group side by side
  let globalX = groupPad;
  const renderedGroups = groups.map((g, gi) => {
    const cols = Math.min(g.count, maxPerRow);
    const rows = Math.ceil(g.count / maxPerRow);
    const gw = cols * gap;
    const gh = rows * gap;
    const x0 = globalX;
    globalX += gw + groupPad;
    const fill = OBJ_COLOUR_MAP[g.color] || "#6366f1";
    const shapeFn = OBJ_SHAPE_MAP[g.object] || defaultObjShape;
    const items = Array.from({ length: g.count }, (_, i) => {
      const col = i % maxPerRow;
      const row = Math.floor(i / maxPerRow);
      const cx = x0 + gap / 2 + col * gap;
      const cy = groupPad + gap / 2 + row * gap;
      return <g key={`${gi}-${i}`}>{shapeFn(cx, cy, dotR, fill)}</g>;
    });
    const labelX = x0 + gw / 2;
    const labelY = groupPad + rows * gap + 14;
    return (
      <g key={gi}>
        {items}
        <text x={labelX} y={labelY} textAnchor="middle" fontSize={9} fontWeight={700} fill={fill}>
          {g.count} {g.color}
        </text>
      </g>
    );
  });
  const maxRows = Math.max(...groups.map(g => Math.ceil(g.count / maxPerRow)));
  const svgW = globalX;
  const svgH = groupPad + maxRows * gap + 24;
  const opLabel = operation === "add" ? `${groups.map(g => g.count).join(" + ")} = ?`
    : operation === "subtract" ? `${groups[0]?.count} − ${groups[1]?.count} = ?`
    : `${total} objects`;
  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}>
      <svg width={Math.min(svgW, 260)} height={Math.min(svgH, 140)} viewBox={`0 0 ${svgW} ${svgH}`}>
        {renderedGroups}
        {operation === "add" && groups.length >= 2 && (
          <text x={svgW / 2} y={svgH - 2} textAnchor="middle" fontSize={10} fontWeight={800} fill={T.indigo}>+</text>
        )}
      </svg>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.indigo, textAlign: "center", marginTop: 2 }}>
        {opLabel}
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NVR VISUAL — shape sequences
// ═══════════════════════════════════════════════════════════════════════════════

// Renders a sequence of SVG shapes with a "?" at the end
// Parses patterns like: rotation, size progression, shape alternation, fill alternation
const NVR_SHAPES = {
  circle:   (cx,cy,r,fill,stroke) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
  square:   (cx,cy,r,fill,stroke) => `<rect x="${cx-r}" y="${cy-r}" width="${r*2}" height="${r*2}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
  triangle: (cx,cy,r,fill,stroke) => `<polygon points="${cx},${cy-r} ${cx+r*0.87},${cy+r*0.5} ${cx-r*0.87},${cy+r*0.5}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
  diamond:  (cx,cy,r,fill,stroke) => `<polygon points="${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
  cross:    (cx,cy,r,fill,stroke) => `<line x1="${cx-r}" y1="${cy}" x2="${cx+r}" y2="${cy}" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/><line x1="${cx}" y1="${cy-r}" x2="${cx}" y2="${cy+r}" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>`,
  star:     (cx,cy,r,fill,stroke) => {
    const pts = Array.from({length:5},(_,i)=>{
      const a1=(i*72-90)*Math.PI/180, a2=((i*72+36)-90)*Math.PI/180;
      const or=r, ir=r*0.4;
      return `${cx+or*Math.cos(a1)},${cy+or*Math.sin(a1)} ${cx+ir*Math.cos(a2)},${cy+ir*Math.sin(a2)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER (core)
// ═══════════════════════════════════════════════════════════════════════════════
function parseVisual(topicStr, questionStr, subject, yearLevel, question) {
  const t    = (topicStr || "").toLowerCase();
  const q    = (questionStr || "").toLowerCase();
  const subj = (subject || "").toLowerCase();
  const nums = ((questionStr || "").match(RX_NUM) || []).map(Number);

  // ── NVR ──────────────────────────────────────────────────────────────────
  if ((subj.includes("verbal") && subj.includes("non")) || subj === "nvr" || t.includes("nvr") || t.includes("non_verbal")) {

    // ── Geometry/property questions (single shape) ─────────────────────────
    // "How many sides does a triangle have?" / "What shape has 6 sides?" etc.
    const SHAPE_NAMES = ["triangle","square","rectangle","pentagon","hexagon","octagon","circle","diamond"];
    const geoQ = /how many sides|how many corners|how many edges|how many vertices|what shape|which shape|name.*shape|sides does|corners does/i.test(questionStr);
    const shapeMentioned = SHAPE_NAMES.find(s => new RegExp(`\\b${s}`, "i").test(questionStr));

    if (geoQ && shapeMentioned) {
      return { type: "shape_property", shapeName: shapeMentioned };
    }
    // Also fire if topic is about shape properties and a shape is named
    if ((t.includes("shape") || t.includes("polygon") || t.includes("geometry") || t.includes("2d")) && shapeMentioned) {
      return { type: "shape_property", shapeName: shapeMentioned };
    }

    // ── Sequence questions (need ≥ 2 shapes to make a sequence meaningful) ──
    const shapeMatch = (questionStr || "").match(/\b(circle|square|triangle|diamond|star|cross)s?\b/gi);
    if (shapeMatch && shapeMatch.length >= 2) {
      const shapes = shapeMatch.map(s => s.toLowerCase());
      const fillCycle = ["white", T.indigoBg, "#c7d2fe", T.nebulaBg];
      const strokeCycle = [T.indigo, T.nebula, T.slate, T.emerald];
      const rotateCycle = [0, 90, 180, 270];
      const sequence = shapes.slice(0, 3).map((shape, i) => ({
        shape, size: 14,
        fill: fillCycle[i % fillCycle.length],
        stroke: strokeCycle[i % strokeCycle.length],
        rotate: t.includes("rotat") ? rotateCycle[i] : 0,
      }));
      sequence.push({ isQuestion: true });
      return { type: "nvr", sequence };
    }
    // Size sequence: growing/shrinking
    if (/grow|shrink|larger|smaller|bigger/i.test(questionStr)) {
      const shape = "circle";
      const sequence = [
        { shape, size: 8,  fill: T.indigoBg, stroke: T.indigo },
        { shape, size: 12, fill: T.indigoBg, stroke: T.indigo },
        { shape, size: 16, fill: T.indigoBg, stroke: T.indigo },
        { isQuestion: true },
      ];
      return { type: "nvr", sequence };
    }
    // Fill alternation
    if (/alternate|pattern|fill/i.test(questionStr)) {
      const shape = "square";
      const sequence = [
        { shape, size: 14, fill: T.indigo, stroke: T.indigo },
        { shape, size: 14, fill: "white", stroke: T.indigo },
        { shape, size: 14, fill: T.indigo, stroke: T.indigo },
        { isQuestion: true },
      ];
      return { type: "nvr", sequence };
    }
    
    // ── Reflection / mirror ─────────────────────────────────────────────────
    if (/reflect|mirror|flip/i.test(questionStr)) {
      const letterM = questionStr.match(/(?:letter|the)\s+[''""]?([A-Za-z])[''""]?/i)
                   || questionStr.match(/reflection of\s+[''""]?([A-Za-z])[''""]?/i)
                   || questionStr.match(/[''""]([A-Za-z])[''""] is (?:reflected|mirrored|flipped)/i);
      if (letterM) {
        return { type: "nvr_reflection", letter: letterM[1].toUpperCase() };
      }
      const shapeM = questionStr.match(/(flag|arrow|triangle|square|circle|star|cross|L.shape|T.shape)/i);
      if (shapeM) {
        const shape = shapeM[1].toLowerCase();
        const isHorizontal = /horizontal|across a horizontal/i.test(questionStr);
        const direction = questionStr.match(/pointing\s+(right|left|up|down)/i)?.[1]?.toLowerCase() || "right";
        return { type: "nvr_shape_reflection", shape, horizontal: isHorizontal, direction };
      }
      return { type: "nvr_reflection", letter: "F" };
    }

    // ── 3D nets / folding ────────────────────────────────────────────────────
    if (/net|fold|cube|cuboid|prism|pyramid|3d shape/i.test(questionStr)) {
      const shape3d = /pyramid/i.test(questionStr) ? "pyramid"
                    : /prism/i.test(questionStr)   ? "prism"
                    : "cube";
      return { type: "nvr_net", shape3d };
    }

    // ── Rotation / transformation ───────────────────────────────────────────
    if (/rotat|turn|clockwise|anti.clockwise|degrees?/i.test(questionStr)) {
      const degM  = (questionStr || "").match(/(\d+)\s*degrees?/i);
      const deg   = degM ? parseInt(degM[1]) : 90;
      const cw    = !/anti.clockwise|counter.clockwise/i.test(questionStr);
      return { type: "nvr_rotation", degrees: deg, clockwise: cw };
    }

    // ── Odd one out / classification ────────────────────────────────────────
    if (/odd one out|which.*different|does not belong/i.test(questionStr)) {
      return { type: "nvr_oddoneout" };
    }
  }

  // ── PHYSICS ──────────────────────────────────────────────────────────────
  if (subj.includes("physics") || (subj.includes("science") && (/\bforce/.test(t) || t.includes("velocit") || /\bspeed/.test(t) || /\bmotion/.test(t)))) {

    // Velocity / speed
    if (t.includes("velocit") || /\bspeed/.test(t) || /\bmotion/.test(t) || /m\/s|km\/h|mph/i.test(questionStr)) {
      const speeds = nums.filter(n => n > 0 && n < 1000);
      if (speeds.length >= 1) {
        const unit = /km\/h/i.test(questionStr) ? "km/h" : /mph/i.test(questionStr) ? "mph" : "m/s";
        return {
          type: "velocity",
          v1: speeds[0],
          v2: speeds[1] ?? null,
          label1: /initial|start|begin|u\s*=/i.test(questionStr) ? "initial (u)" : "velocity",
          label2: /final|end|v\s*=/i.test(questionStr) ? "final (v)" : "new velocity",
          unit,
        };
      }
    }

    // Forces
    if (/\bforce/.test(t) || t.includes("newton") || /\d+\s*n\b/i.test(questionStr)) {
      const forces = nums.filter(n => n <= 1000);
      if (forces.length >= 2) {
        return {
          type: "forces",
          force1: Math.max(forces[0], forces[1]),
          force2: Math.min(forces[0], forces[1]),
          label1: /push/i.test(questionStr) ? "Push" : "Force A",
          label2: /friction|resist/i.test(questionStr) ? "Friction" : "Force B",
        };
      }
    }
  }

  // ── BIOLOGY ──────────────────────────────────────────────────────────────
  if (subj.includes("biology") || (subj.includes("science") && (t.includes("food_chain") || t.includes("ecosystem")))) {
    if (/food chain|eats|→|->/.test(q) || t.includes("food_chain")) {
      const EMOJI = { grass:"🌿",plant:"🌱",wheat:"🌾",algae:"🟢",rabbit:"🐰",mouse:"🐭",
        insect:"🐛",fox:"🦊",hawk:"🦅",snake:"🐍",wolf:"🐺",owl:"🦉" };
      const ROLE = { grass:"producer",plant:"producer",algae:"producer",
        rabbit:"primary consumer",mouse:"primary consumer",insect:"primary consumer",
        fox:"secondary consumer",hawk:"predator",snake:"secondary consumer" };
      const match = (questionStr || "").match(/([a-zA-Z ]{2,18})\s*(?:→|->)\s*([a-zA-Z ]{2,18})(?:\s*(?:→|->)\s*([a-zA-Z ]{2,18}))?/i);
      if (match) {
        const chain = [match[1],match[2],match[3]].filter(Boolean)
          .map(s => s.trim().toLowerCase())
          .map(name => ({
            name,
            emoji: Object.entries(EMOJI).find(([k]) => name.includes(k))?.[1] || "🔵",
            role:  Object.entries(ROLE).find(([k]) => name.includes(k))?.[1] || "",
          }));
        if (chain.length >= 2) return { type: "food_chain", chain };
      }
    }
  }

  // ── MATHS ────────────────────────────────────────────────────────────────
  if (!subj.includes("math")) return null;

  // ── KS1 OBJECT GROUPS — "4 red bricks and 5 blue bricks", "5 green beads and 4 yellow beads" ──
  // Must run BEFORE counting detection to avoid "4 bricks" → counting=4
  const COLOURS = "red|blue|green|yellow|orange|purple|pink|white|black|brown|grey|gray|striped|spotted";
  const OBJECTS = "brick|bead|marble|ball|sweet|sweet|button|block|cube|counter|stone|sticker|flower|apple|banana|car|toy|star|shell|coin|lego|pencil|crayon|egg|sock|bear|fish|bird|frog|bug|ant|spider|butterfly|ladybird|cat|dog";
  const objGroupRx = new RegExp(`(\\d+)\\s+(?:${COLOURS})\\s+(?:${OBJECTS})s?`, "gi");
  const objGroups = [...(questionStr || "").matchAll(objGroupRx)];
  if (objGroups.length >= 2 && yearLevel <= 4) {
    // Extract color and object from each match
    const colRx = new RegExp(`(${COLOURS})`, "i");
    const objRx = new RegExp(`(${OBJECTS})s?`, "i");
    const groups = objGroups.map(m => ({
      count: parseInt(m[1]),
      color: (m[0].match(colRx) || [])[1]?.toLowerCase() || "blue",
      object: (m[0].match(objRx) || [])[1]?.toLowerCase() || "brick",
    }));
    const total = groups.reduce((s, g) => s + g.count, 0);
    const isAddition = /altogether|total|in all|how many|add/i.test(questionStr);
    const isSubtraction = /more than|fewer|less than|difference|take away|left/i.test(questionStr);
    return {
      type: "object_groups",
      groups,
      total,
      operation: isSubtraction ? "subtract" : isAddition ? "add" : "show",
    };
  }

  // ── EXPLICIT ADDITION (with + symbol) ───────────────────────────────────
  const addMatch = (questionStr || "").match(/(\d+)\s*[+＋]\s*(\d+)/);
  if (addMatch) {
    const a = parseInt(addMatch[1]), b = parseInt(addMatch[2]);
    if (a + b <= 20 && yearLevel <= 2) return { type: "addition", a, b };
  }

  // ── COUNTING (only when NOT a word problem with 2+ numbers) ─────────────
  // Triggers on:
  //   • topic contains "count" or "number_recog"
  //   • "how many", "count the", "count the dots"  — classic KS1/KS2 counting stems
  //   • "total number of dots/objects shown" — visual counting without count keyword
  //   • "number of dots/objects/items shown/displayed/in the picture/image"
  const isCountingQ = (
    /\bcount/.test(t) ||
    t.includes("number_recog") ||
    /how many|count the/i.test(questionStr) ||
    // "What is the total number of dots shown?" — dots visible in image, no number in text
    /total\s+(?:number\s+of\s+)?dots?|number\s+of\s+(?:dots?|objects?|items?|shapes?|balls?|circles?)\s+(?:shown|displayed|visible|in\s+the\s+(?:picture|image|diagram))/i.test(questionStr) ||
    // "How many dots are there?" / "Count the dots"
    /how\s+many\s+(?:dots?|objects?|items?|shapes?|balls?|circles?)|dots?\s+(?:are\s+there|shown|visible|can\s+you\s+see)/i.test(questionStr)
  );
  if (isCountingQ && yearLevel <= 4) {
    // Skip counting if this looks like an addition/subtraction word problem
    const hasMultipleNums = nums.length >= 2;
    const isWordProblem = /altogether|total|in all|more|left|take away|add|join/i.test(questionStr);
    if (!hasMultipleNums || !isWordProblem) {
      const n = nums[0];
      if (n && n <= 25) return { type: "counting", count: n };
      // No number in question text (dots are in the image) — derive count from correct answer
      if (!n && question?.opts?.length) {
        const correctIdx = question?.a ?? 0;
        const ansNum = parseInt(question.opts[correctIdx], 10);
        if (ansNum && ansNum <= 25) return { type: "counting", count: ansNum };
        // Last resort: use the largest option as an upper-bound guide
        const maxOpt = Math.max(...question.opts.map(o => parseInt(o, 10)).filter(Boolean));
        if (maxOpt && maxOpt <= 25) return { type: "counting", count: maxOpt };
      }
    }
  }
  if (t.includes("number_bond") && nums.length >= 1) {
    const whole = Math.max(...nums.slice(0,3));
    const parts = nums.filter(n => n < whole);
    if (parts.length >= 1) {
      return { type: "number_bond", whole, partA: parts[0], partB: null };
    }
    return { type: "number_bond", whole, partA: null, partB: null };
  }

  // ── SEQUENCE / ORDERING — "which number comes after/before", "what comes next", "order these",
  // "immediately next to X on the right/left side", "number line" topic with adjacency question
  const isSequenceQ = (
    // Classic "comes after/before/next" phrasing
    /(?:comes?\s+(?:immediately\s+)?(?:after|before|next|between))/i.test(questionStr) ||
    /(?:what\s+(?:comes?|is)\s+(?:next|after|before))/i.test(questionStr) ||
    /(?:order|arrange|sort|sequence|ascending|descending|(?:smallest|largest|biggest)\s+to\s+(?:smallest|largest|biggest))/i.test(questionStr) ||
    // "immediately next to X on the right/left side" — adjacency on a number line
    /immediately\s+next\s+to|(?:number|value)\s+(?:immediately\s+)?(?:to\s+the\s+)?(?:right|left)(?:\s+side)?(?:\s+of)?/i.test(questionStr) ||
    // "on the number line" in question text — always a sequence/line visual
    /on\s+the\s+number\s+line/i.test(questionStr) ||
    // topic slug is number_line
    t.includes("number_line")
  );
  const isChartDisplayQ = /(?:chart|list|table|sequence|pattern)\s+(?:displays?|shows?|contains?|has)/i.test(questionStr);
  // For number_line topic / adjacency questions we can work with fewer numbers
  const minNums = (t.includes("number_line") || /number\s+line|immediately\s+next\s+to/i.test(questionStr)) ? 1 : 3;
  if ((isSequenceQ || isChartDisplayQ) && nums.length >= minNums) {
    const sorted = [...nums].sort((a, b) => a - b);
    const lo = sorted[0], hi = sorted[sorted.length - 1];

    // Detect uniform step from the most common difference between question numbers.
    // When the question only has 1 number (e.g. "next to 8 on the right side"),
    // fall back to the smallest gap between sorted answer options to find the step.
    const diffs = sorted.slice(1).map((v, i) => v - sorted[i]);
    let step = diffs.length > 0 ? Math.min(...diffs.filter(d => d > 0)) || 1 : 1;

    if (sorted.length <= 1 && question?.opts?.length) {
      // Infer step from option values — e.g. options [4, 12, 16, 20] → smallest gap = 4
      const optNums = (question.opts || []).map(o => parseInt(o, 10)).filter(Boolean).sort((a, b) => a - b);
      const optDiffs = optNums.slice(1).map((v, i) => v - optNums[i]).filter(d => d > 0);
      if (optDiffs.length > 0) step = Math.min(...optDiffs);
    }

    // Detect missing gap value if question asks for "next"/"before"/"after"/"right"/"left"
    let missingSeq = null;
    const hasMissingMarker = /\?|___|blank|missing|next|before|after|right\s+side|left\s+side/i.test(questionStr);
    if (hasMissingMarker) {
      // Look for the biggest gap — the missing value sits in the middle
      let maxGapIdx = 0, maxGap = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1] - sorted[i];
        if (gap > maxGap) { maxGap = gap; maxGapIdx = i; }
      }
      if (maxGap > step) {
        missingSeq = (sorted[maxGapIdx] + sorted[maxGapIdx + 1]) / 2;
      } else if (/next|after|right\s+side/i.test(questionStr)) {
        missingSeq = hi + step;
      } else if (/before|left\s+side/i.test(questionStr)) {
        missingSeq = lo - step;
      }
    }

    return {
      type: "number_line",
      min: Math.max(0, lo - step * 2),
      max: (missingSeq != null ? Math.max(hi, missingSeq) : hi) + step * 2,
      known: nums,
      missing: missingSeq ?? undefined,
      label: isSequenceQ ? "Number sequence" : "Numbers shown",
    };
  }

  const subMatch = (questionStr || "").match(/(\d+)\s*[−\-–]\s*(\d+)/)
    || (questionStr || "").match(/(\d+)\s*minus\s*(\d+)/i);
  if (subMatch) {
    const from = parseInt(subMatch[1]), remove = parseInt(subMatch[2]);
    if (from <= 15) return { type: "subtraction", from, remove };
  }

  // ── WORD PROBLEM DETECTION (Y1/Y2) ────────────────────────────────────────
  const isComparisonQ = /which is greater|which is (?:bigger|larger|more|less|smaller)|greater than|less than|compare|more than|fewer than/i.test(questionStr);
  // Allow word problems even when isChartDisplayQ matched but had <3 numbers (so sequence didn't fire)
  const chartBlockedByNums = isChartDisplayQ && nums.length < 3;
  if (!isComparisonQ && !isSequenceQ && (!isChartDisplayQ || chartBlockedByNums) && yearLevel <= 2 && nums.length >= 2) {
    const a = nums[0], b = nums[1];
    const takeAwayMatch = (questionStr || "").match(/take away\s+(\d+)\s+from\s+(\d+)/i)
      || (questionStr || "").match(/subtract\s+(\d+)\s+from\s+(\d+)/i);
    if (takeAwayMatch) {
      const remove = parseInt(takeAwayMatch[1]), from = parseInt(takeAwayMatch[2]);
      if (from > 0 && remove > 0 && from >= remove && from <= 15) {
        return { type: "subtraction", from, remove };
      }
    }
    const isSubWord = /eat|ate|take away|taken away|fly away|flew away|fall(?:s)? off|lost|left|fewer|less|remove|gives? away|gave away|burst|popped|used|spent|sold|broken|stolen/i.test(q);
    if (isSubWord && a > 0 && b > 0 && a >= b && a <= 15) {
      return { type: "subtraction", from: a, remove: b };
    }
    if (isSubWord && a > 0 && b > 0 && b > a && b <= 15) {
      return { type: "subtraction", from: b, remove: a };
    }
    const isAddWord = /more|gets?|got|add|join|arrive[sd]?|come[s]?|found|buy|bought|pick(?:s|ed)?|collect(?:s|ed)?|together|total|altogether|in all/i.test(q);
    const isAddWordProblem = /Real World|Challenge:|£|€|\$|per week|per day|costs?|saves?|earns?/i.test(q);
    if (isAddWord && !isAddWordProblem && a + b <= 20) {
      return { type: "addition", a, b };
    }
    const mulWordMatch = (questionStr || "").match(/(\d+)\s*(?:bags?|boxes?|groups?|rows?|plates?|baskets?|packs?|sets?)\s*(?:of|with|each\s+(?:has|have|containing))\s*(\d+)/i)
      || (questionStr || "").match(/(\d+)\s*(?:children|students|friends|people)\s+(?:each\s+)?(?:get|have|gets|receives?|got)\s+(\d+)/i);
    if (mulWordMatch) {
      const r = parseInt(mulWordMatch[1]), c = parseInt(mulWordMatch[2]);
      if (r <= 6 && c <= 8 && r > 0 && c > 0) return { type: "multiplication", rows: r, cols: c };
    }
  }

  // ── MISSING VALUE (12 × ? = 36, ? + 5 = 11) ──────────────────────────────
  if (subj.includes("math") && /\?|__+/.test(questionStr)) {
    const eqNum = (questionStr || "").match(/=\s*(\d+)/);
    const missingMul = (questionStr || "").match(/(\d+)\s*[×x\*]\s*\?/i) || (questionStr || "").match(/\?\s*[×x\*]\s*(\d+)/i);
    const missingAdd = (questionStr || "").match(/(\d+)\s*\+\s*\?/i) || (questionStr || "").match(/\?\s*\+\s*(\d+)/i);
    if (eqNum && (missingMul || missingAdd)) {
      const result = parseInt(eqNum[1]);
      const known  = parseInt((missingMul || missingAdd)[1]);
      if (result > 0 && known > 0 && result <= 100) {
        return { type: "number_line", min: 0, max: result, marked: known, label: "Find the missing value" };
      }
    }
  }

  // ── NUMBER LINE: "X more/less than N" (works with negatives) ──────────────────
  const moreMatch = (questionStr || "").match(/(\d+)\s*more\s+than\s+(-?\d+)/i);
  const lessMatch = (questionStr || "").match(/(\d+)\s*(?:less|fewer)\s+than\s+(-?\d+)/i);
  if (moreMatch || lessMatch) {
    const m    = moreMatch || lessMatch;
    const diff = parseInt(m[1]);
    const base = parseInt(m[2]);
    const ans  = moreMatch ? base + diff : base - diff;
    const lo   = Math.min(base, ans) - 2;
    const hi   = Math.max(base, ans) + 2;
    return { type: "number_line", min: lo, max: hi,
      start: base, steps: diff, direction: moreMatch ? "right" : "left",
      label: moreMatch ? `Start at ${base}, count ${diff} right` : `Start at ${base}, count ${diff} left` };
  }

  const hasDecimalOperand = /\d+\.\d+\s*[×x\*]|[×x\*]\s*\d+\.\d+/.test(questionStr || "");

  // ── DIVISION: X ÷ Y — number line with grouping jumps ─────────────────────
  const divMatch = (questionStr || "").match(/(\d+)\s*(?:÷|divided\s*by)\s*(\d+)/i);
  if (divMatch) {
    const total = parseInt(divMatch[1]), divisor = parseInt(divMatch[2]);
    if (divisor >= 2 && total > 0 && total <= 200) {
      const groups = Math.floor(total / divisor);
      return {
        type: "number_line", min: 0, max: total,
        start: 0, jumps: Math.min(groups, 10), jumpSize: divisor,
        label: `${total} ÷ ${divisor} = ?  (${Math.min(groups, 10)} jumps of ${divisor})`
      };
    }
  }

  const mulMatch = !hasDecimalOperand && (questionStr || "").match(/(\d+)\s*(?:[×x\*]|times|multiplied\s*by)\s*(\d+)/i);
  const grpMatch = (questionStr || "").match(/(\d+)\s*groups?\s*of\s*(\d+)/i);
  if (mulMatch || grpMatch) {
    const m = mulMatch || grpMatch;
    const r = parseInt(m[1]), c = parseInt(m[2]);
    if (r > 0 && c > 0) {
      if (r <= 6 && c <= 6) return { type: "multiplication", rows: r, cols: c };
      if (r <= 12 && c <= 12) return {
        type: "number_line", min: 0, max: r * c + 2,
        start: 0, jumps: r, jumpSize: c,
        label: `${r} × ${c} = ?  (${r} jumps of ${c})`
      };
    }
  }

  const fracMatch = (questionStr || "").match(/(\d+)\s*\/\s*(\d+)/);
  if (t.includes("fraction") || fracMatch) {
    if (fracMatch && /number line|line.*fraction|fraction.*line|add.*fraction|fraction.*add/i.test(questionStr)) {
      const num = parseInt(fracMatch[1]), den = parseInt(fracMatch[2]);
      if (den >= 2 && den <= 12 && num <= den * 2) {
        const mulFrac = (questionStr || "").match(/(\d+)\s*[×x\*]\s*(\d+)\s*\/\s*(\d+)/i);
        if (mulFrac) {
          const multiplier = parseInt(mulFrac[1]);
          const fracNum = parseInt(mulFrac[2]);
          const fracDen = parseInt(mulFrac[3]);
          return {
            type: "number_line", min: 0, max: Math.ceil(multiplier * fracNum / fracDen) + 1,
            start: 0, jumps: multiplier, jumpSize: fracNum / fracDen,
            fractionDenom: fracDen,
            label: `${multiplier} × ${fracNum}/${fracDen} = ?`
          };
        }
        return {
          type: "number_line", min: 0, max: Math.max(1, Math.ceil(num / den)),
          fractionDenom: den, label: `${num}/${den} on a number line`
        };
      }
    }
    if (fracMatch) return { type: "fraction", numerator: parseInt(fracMatch[1]), denominator: parseInt(fracMatch[2]) };
    if (/half/i.test(questionStr))    return { type: "fraction", numerator: 1, denominator: 2 };
    if (/quarter/i.test(questionStr)) return { type: "fraction", numerator: 1, denominator: 4 };
    if (/third/i.test(questionStr))   return { type: "fraction", numerator: 1, denominator: 3 };
    // Infer from "divided into N equal parts" + "eat/take/remove M part(s)"
    const partsMatch = (questionStr || "").match(/(?:divided|split|cut)\s+(?:into\s+)?(\d+)\s+equal\s+parts?/i);
    if (partsMatch) {
      const den = parseInt(partsMatch[1]);
      const takenMatch = (questionStr || "").match(/(?:eat|take|remove|give|shade|colour|color)\s+(\d+)\s+part/i);
      const taken = takenMatch ? parseInt(takenMatch[1]) : 1;
      // If question asks what's LEFT, show remainder; if asks what was taken, show taken
      const isLeft = /left|remain|have\s+left/i.test(questionStr);
      const num = isLeft ? den - taken : taken;
      if (den >= 2 && den <= 12) return { type: "fraction", numerator: num, denominator: den };
    }
    // Fallback: try to parse fraction from the correct answer option (e.g. "3/4")
    if (question?.opts?.length) {
      const correctIdx = question?.a ?? 0;
      const answerFrac = String(question.opts[correctIdx] || "").match(/^(\d+)\s*\/\s*(\d+)$/);
      if (answerFrac) return { type: "fraction", numerator: parseInt(answerFrac[1]), denominator: parseInt(answerFrac[2]) };
    }
  }

  if (t.includes("place_value")) {
    const big = nums.find(n => n >= 10 && n <= 99);
    if (big) return { type: "place_value", tens: Math.floor(big/10), ones: big%10 };
    const tm = (questionStr||"").match(/(\d+)\s*tens?/i);
    const om = (questionStr||"").match(/(\d+)\s*ones?/i);
    if (tm||om) return { type:"place_value", tens: tm?parseInt(tm[1]):0, ones: om?parseInt(om[1]):0 };
  }

  if (isComparisonQ && yearLevel <= 4 && nums.length >= 2) {
    return { type: "comparison", a: nums[0], b: nums[1] };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW VISUAL COMPONENTS — TIER 3
// ═══════════════════════════════════════════════════════════════════════════════

// ── Clock / Telling Time ──────────────────────────────────────────────────────
function ClockVis({ hours, minutes, label }) {
  const SIZE = 180;
  const cx = SIZE / 2, cy = SIZE / 2;
  const R = 82;          // face radius
  const toXY = (angleDeg, len) => ({
    x: cx + len * Math.cos((angleDeg * Math.PI) / 180),
    y: cy + len * Math.sin((angleDeg * Math.PI) / 180),
  });

  const minAngle = (minutes / 60) * 360 - 90;
  const hrAngle  = ((hours % 12) / 12 + minutes / 720) * 360 - 90;

  // 60 minute ticks + 12 hour ticks
  const minuteTicks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * 360 - 90;
    const isHour  = i % 5 === 0;
    const isQtr   = i % 15 === 0;
    const inner = toXY(a, isQtr ? R - 14 : isHour ? R - 10 : R - 5);
    const outer = toXY(a, R - 1);
    return { inner, outer, isHour, isQtr, idx: i };
  });

  // Hour number positions
  const hourNums = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 360 - 90;
    const pos = toXY(a, R - 22);
    return { x: pos.x, y: pos.y, num: i === 0 ? 12 : i };
  });

  // Hand end points
  const minTip  = toXY(minAngle, R - 10);
  const hrTip   = toXY(hrAngle,  R - 28);

  // Minute hand tail (slightly past centre for balance)
  const minTail = toXY(minAngle + 180, 10);
  const hrTail  = toXY(hrAngle  + 180, 8);

  // 5-minute labels ring
  const fiveLabels = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 360 - 90;
    const pos = toXY(a, R + 12);
    return { x: pos.x, y: pos.y, num: i * 5 };
  });

  const minLabel  = String(minutes).padStart(2, "0");
  const hrDisplay = hours % 12 === 0 ? 12 : hours % 12;
  const ampm      = hours < 12 ? "am" : "pm";

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}
      ariaLabel={`Clock showing ${hrDisplay}:${minLabel} ${ampm}`}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <svg width={SIZE + 32} height={SIZE + 32}
          viewBox={`${-16} ${-16} ${SIZE + 32} ${SIZE + 32}`}
          style={{ width: "min(220px, 90vw)", height: "auto" }}>

          {/* Outer ring for minute labels */}
          <circle cx={cx} cy={cy} r={R + 18} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1.5} />

          {/* 5-minute labels outside the face */}
          {fiveLabels.map((fl, i) => (
            <text key={i} x={fl.x} y={fl.y} textAnchor="middle" dominantBaseline="central"
              fontSize={9} fill="#94a3b8" fontWeight="600">{fl.num}</text>
          ))}

          {/* Clock face */}
          <circle cx={cx} cy={cy} r={R} fill="white" stroke={T.indigo} strokeWidth={3} />

          {/* Minute ticks */}
          {minuteTicks.map((tk) => (
            <line key={tk.idx}
              x1={tk.inner.x} y1={tk.inner.y} x2={tk.outer.x} y2={tk.outer.y}
              stroke={tk.isQtr ? T.indigo : tk.isHour ? "#475569" : "#cbd5e1"}
              strokeWidth={tk.isQtr ? 2.5 : tk.isHour ? 2 : 1}
              strokeLinecap="round" />
          ))}

          {/* Hour numerals */}
          {hourNums.map((hn, i) => (
            <text key={i} x={hn.x} y={hn.y} textAnchor="middle" dominantBaseline="central"
              fontSize={12} fontWeight="700"
              fill={hn.num === hrDisplay ? T.indigo : "#334155"}>{hn.num}</text>
          ))}

          {/* Hour hand — thick, dark, short */}
          <line x1={hrTail.x} y1={hrTail.y} x2={hrTip.x} y2={hrTip.y}
            stroke="#1e293b" strokeWidth={6} strokeLinecap="round" />

          {/* Minute hand — thinner, longer, indigo */}
          <line x1={minTail.x} y1={minTail.y} x2={minTip.x} y2={minTip.y}
            stroke={T.indigo} strokeWidth={3.5} strokeLinecap="round" />

          {/* Centre boss */}
          <circle cx={cx} cy={cy} r={6} fill={T.indigo} />
          <circle cx={cx} cy={cy} r={2.5} fill="white" />
        </svg>

        {/* Digital readout */}
        <div style={{
          display: "flex", alignItems: "baseline", gap: 6,
          background: "white", border: `1.5px solid ${T.indigoBd}`,
          borderRadius: 8, padding: "4px 14px",
        }}>
          <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "0.05em" }}>
            {hrDisplay}:{minLabel}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.indigo, textTransform: "uppercase" }}>{ampm}</span>
        </div>

        {label && (
          <span style={{ fontSize: 12, color: T.slate, fontWeight: 600, textAlign: "center" }}>{label}</span>
        )}
      </div>
    </Panel>
  );
}

// ── Money / Coins ─────────────────────────────────────────────────────────────
function MoneyVis({ coins, total }) {
  // metal: "gold" | "silver" | "copper"
  const COIN_DATA = {
    "£2":  { metal:"gold",   size:44, label:"£2",  pence:200 },
    "£1":  { metal:"gold",   size:40, label:"£1",  pence:100 },
    "50p": { metal:"silver", size:36, label:"50p", pence:50  },
    "20p": { metal:"silver", size:32, label:"20p", pence:20  },
    "10p": { metal:"gold",   size:30, label:"10p", pence:10  },
    "5p":  { metal:"silver", size:27, label:"5p",  pence:5   },
    "2p":  { metal:"copper", size:25, label:"2p",  pence:2   },
    "1p":  { metal:"copper", size:22, label:"1p",  pence:1   },
  };

  // Metallic gradient stops per metal type
  const METAL_STOPS = {
    gold:   { hi:"#ffe680", mid:"#d4a017", lo:"#8a6000", edge:"#b8860b", text:"#3d2700" },
    silver: { hi:"#f0f0f0", mid:"#a8b0b8", lo:"#606870", edge:"#7a8490", text:"#1a2030" },
    copper: { hi:"#f0b080", mid:"#c06830", lo:"#7a3810", edge:"#a05020", text:"#3a1000" },
  };

  // SVG coin component
  function CoinSVG({ label, metal, size }) {
    const R = size / 2;
    const cx = R, cy = R;
    const gidFill = `cmFill_${label.replace(/[^a-z0-9]/gi, "_")}`;
    const gidRim  = `cmRim_${label.replace(/[^a-z0-9]/gi, "_")}`;
    const s = METAL_STOPS[metal];
    // font sizing: large labels (£2, £1) get bigger text
    const fSize = size >= 40 ? 11 : size >= 34 ? 10 : size >= 28 ? 9 : 8;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ display:"block", filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.35))" }}>
        <defs>
          {/* Radial gradient: bright highlight top-left → dark bottom-right */}
          <radialGradient id={gidFill} cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor={s.hi}  />
            <stop offset="45%"  stopColor={s.mid} />
            <stop offset="100%" stopColor={s.lo}  />
          </radialGradient>
          {/* Rim ring gradient (slightly darker than face) */}
          <radialGradient id={gidRim} cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor={s.mid}  />
            <stop offset="100%" stopColor={s.edge} />
          </radialGradient>
        </defs>

        {/* Outer rim (slightly larger circle = 1.5px rim) */}
        <circle cx={cx} cy={cy} r={R - 0.5} fill={`url(#${gidRim})`} />

        {/* Inner face */}
        <circle cx={cx} cy={cy} r={R - 2.5} fill={`url(#${gidFill})`} />

        {/* Milled edge — thin concentric ring */}
        <circle cx={cx} cy={cy} r={R - 1.5} fill="none"
          stroke={s.edge} strokeWidth={1} strokeOpacity={0.6}
          strokeDasharray="2,2" />

        {/* Denomination text */}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fontSize={fSize} fontWeight="800" fill={s.text}
          style={{ letterSpacing: label.length > 2 ? "-0.4px" : "0px" }}>
          {label}
        </text>

        {/* Specular highlight arc — top-left */}
        <ellipse cx={cx - R * 0.18} cy={cy - R * 0.28}
          rx={R * 0.28} ry={R * 0.15}
          fill="white" fillOpacity={0.28}
          transform={`rotate(-30, ${cx - R * 0.18}, ${cy - R * 0.28})`} />
      </svg>
    );
  }

  const totalPence = total !== undefined
    ? total
    : coins.reduce((sum, c) => sum + (COIN_DATA[c]?.pence ?? 0), 0);

  const totalLabel = totalPence >= 100
    ? `£${(totalPence / 100).toFixed(2)}`
    : `${totalPence}p`;

  // Group identical coins together with a count badge for tidiness
  const groups = coins.reduce((acc, c) => {
    const last = acc[acc.length - 1];
    if (last && last.coin === c) { last.count++; }
    else acc.push({ coin: c, count: 1 });
    return acc;
  }, []);

  return (
    <Panel accent={T.amber} bg="#fffbeb" bd="#fde68a"
      ariaLabel={`Coins totalling ${totalLabel}`}>
      {/* coin row */}
      <div style={{
        display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center",
        alignItems:"flex-end", padding:"4px 0",
      }}>
        {groups.map(({ coin, count }, i) => {
          const d = COIN_DATA[coin] || COIN_DATA["1p"];
          return (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <CoinSVG label={d.label} metal={d.metal} size={d.size} />
              {count > 1 && (
                <span style={{
                  fontSize:10, fontWeight:700,
                  background:T.amber, color:"#78350f",
                  borderRadius:8, padding:"1px 5px",
                  lineHeight:1.4,
                }}>×{count}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* total readout */}
      <div style={{
        display:"flex", alignItems:"center", gap:6,
        background:"white", border:`1.5px solid #fde68a`,
        borderRadius:8, padding:"4px 14px", alignSelf:"center",
        boxShadow:"inset 0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <span style={{ fontSize:11, fontWeight:600, color:"#92400e", textTransform:"uppercase", letterSpacing:"0.05em" }}>Total</span>
        <span style={{ fontFamily:"monospace", fontSize:20, fontWeight:800, color:"#78350f" }}>{totalLabel}</span>
      </div>
    </Panel>
  );
}

// ── Division Grouping — SVG plates with gradient dots ─────────────────────────
function DivisionVis({ total, groups }) {
  const perGroup = Math.floor(total / groups);
  const remainder = total % groups;
  const maxGroupsShown = Math.min(groups, 5);
  const truncGroups = groups > maxGroupsShown;

  // Each group i gets perGroup+1 if i < remainder, else perGroup
  const groupCounts = Array.from({ length: maxGroupsShown }, (_, g) =>
    g < remainder ? perGroup + 1 : perGroup
  );

  const PLATE_COLORS = [T.indigo, T.nebula, T.emerald, "#d97706", "#0891b2"];
  const dotR = 4, dotGap = 3, COLS = 3, padX = 9, padY = 8;
  const maxCount = Math.max(...groupCounts, 1);
  const dotsInPlate = Math.min(maxCount, 10);
  const numRows = Math.ceil(dotsInPlate / COLS);
  const innerH = numRows * (dotR * 2) + Math.max(0, numRows - 1) * dotGap;
  const plateH = padY * 2 + innerH;
  const plateW = padX * 2 + COLS * (dotR * 2) + (COLS - 1) * dotGap; // = 48
  const plateSep = 10;

  const BADGE_H = 16;
  const usedW = maxGroupsShown * (plateW + plateSep) - plateSep;
  const W = usedW + 8 + (truncGroups ? 20 : 0);
  const H = plateH + BADGE_H + 6;

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}
      ariaLabel={`Division: ${total} shared into ${groups} groups`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible" }}>
        <defs>
          <radialGradient id="dv_dg" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#4338ca" />
          </radialGradient>
          <filter id="dv_sh" x="-25%" y="-25%" width="150%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity="0.13" />
          </filter>
        </defs>

        {groupCounts.map((count, g) => {
          const x0 = 4 + g * (plateW + plateSep);
          const col = PLATE_COLORS[g % PLATE_COLORS.length];
          const dotsToShow = Math.min(count, 10);
          const truncDots = count > 10;

          return (
            <g key={g}>
              {/* Plate shadow + fill */}
              <rect x={x0} y={0} width={plateW} height={plateH}
                rx={8} fill="white" stroke={col} strokeWidth={2}
                filter="url(#dv_sh)" />

              {/* Dots */}
              {Array.from({ length: dotsToShow }).map((_, d) => {
                const dc = d % COLS;
                const dr = Math.floor(d / COLS);
                const cx = x0 + padX + dc * (dotR * 2 + dotGap) + dotR;
                const cy = padY + dr * (dotR * 2 + dotGap) + dotR;
                return (
                  <circle key={d} cx={cx} cy={cy} r={dotR}
                    fill="url(#dv_dg)" />
                );
              })}

              {/* Over-limit indicator */}
              {truncDots && (
                <text x={x0 + plateW / 2} y={plateH - 3}
                  textAnchor="middle" fontSize={8} fontWeight="700" fill={col}>
                  +{count - 10}
                </text>
              )}

              {/* "? each" badge */}
              <rect x={x0 + 5} y={plateH + 3} width={plateW - 10} height={BADGE_H - 3}
                rx={6} fill={col} opacity={0.18} />
              <text x={x0 + plateW / 2} y={plateH + BADGE_H - 2}
                textAnchor="middle" fontSize={9} fontWeight="800" fill={col}>
                ? ea.
              </text>
            </g>
          );
        })}

        {/* More groups indicator */}
        {truncGroups && (
          <text x={4 + maxGroupsShown * (plateW + plateSep)} y={plateH / 2 + 4}
            fontSize={12} fontWeight="800" fill={T.textMid}>…</text>
        )}
      </svg>
      <Chip color={T.indigo} bg={T.indigoBg}>{total} ÷ {groups} = ?</Chip>
    </Panel>
  );
}

// ── Division Equation (large numbers — bar model, no answer revealed) ──────────
function DivisionEquationVis({ total, groups }) {
  const PAD_L = 12, PAD_R = 12, PAD_T = 36, PAD_B = 24;
  const barH = 32;
  const showSeg = Math.min(groups, 10);
  const trunc = groups > showSeg;
  const barW = 216;
  const W = PAD_L + barW + PAD_R + (trunc ? 26 : 0);
  const H = PAD_T + barH + PAD_B;
  const BK = 5;
  const bx = PAD_L, by = PAD_T;
  const segW = barW / showSeg;

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}
      ariaLabel={`Division: ${total} divided into ${groups} equal groups`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="dev_bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c7d2fe" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>

        {/* Total bracket above bar */}
        <line x1={bx} y1={by - BK} x2={bx} y2={by - 1}
          stroke={T.indigo} strokeWidth={1.5} />
        <line x1={bx} y1={by - BK} x2={bx + barW} y2={by - BK}
          stroke={T.indigo} strokeWidth={1.5} />
        <line x1={bx + barW} y1={by - BK} x2={bx + barW} y2={by - 1}
          stroke={T.indigo} strokeWidth={1.5} />
        <text x={bx + barW / 2} y={by - BK - 5}
          textAnchor="middle" fontSize={11} fontWeight="800" fill={T.indigo}>{total}</text>

        {/* Full bar */}
        <rect x={bx} y={by} width={barW} height={barH} rx={6} fill="url(#dev_bg)" />

        {/* Segment dividers + "?" labels */}
        {Array.from({ length: showSeg }, (_, i) => {
          const sx = bx + i * segW;
          return (
            <g key={i}>
              {i > 0 && (
                <line x1={sx} y1={by + 3} x2={sx} y2={by + barH - 3}
                  stroke="white" strokeWidth={1.5} opacity={0.75} />
              )}
              <text x={sx + segW / 2} y={by + barH / 2 + 4}
                textAnchor="middle" fontSize={11} fontWeight="800" fill="white">?</text>
            </g>
          );
        })}

        {/* Truncation */}
        {trunc && (
          <text x={bx + barW + 7} y={by + barH / 2 + 4}
            fontSize={13} fontWeight="800" fill={T.textMid}>…</text>
        )}

        {/* "N equal groups" label below bar */}
        <text x={bx + barW / 2} y={by + barH + 17}
          textAnchor="middle" fontSize={10} fontWeight="600" fill={T.textMid}>
          {groups} equal group{groups !== 1 ? "s" : ""}
        </text>
      </svg>
      <Chip color={T.indigo} bg={T.indigoBg}>Share {total} equally into {groups} groups</Chip>
    </Panel>
  );
}

function RatioVis({ partA, partB, labelA, labelB }) {
  const total = partA + partB;
  // Cap display at 20 units per side to keep blocks legible; show scale note if exceeded
  const MAX_UNITS = 20;
  const scale = Math.max(1, Math.ceil(Math.max(partA, partB) / MAX_UNITS));
  const dispA = Math.round(partA / scale);
  const dispB = Math.round(partB / scale);
  const BLOCK = 22; // px per unit block
  const GAP   = 3;
  const totalW = (dispA + dispB) * (BLOCK + GAP) - GAP;
  const svgW   = Math.min(totalW + 24, 300);
  const svgH   = 68;
  const offsetX = (svgW - totalW) / 2;

  const lA = labelA || "A";
  const lB = labelB || "B";

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}>
      {/* unit-block bar */}
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        <defs>
          <linearGradient id="ratioA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8"/>
            <stop offset="100%" stopColor="#4f46e5"/>
          </linearGradient>
          <linearGradient id="ratioB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c084fc"/>
            <stop offset="100%" stopColor="#9333ea"/>
          </linearGradient>
        </defs>

        {/* Part A blocks */}
        {Array.from({ length: dispA }).map((_, i) => {
          const x = offsetX + i * (BLOCK + GAP);
          return (
            <g key={`a${i}`}>
              <rect x={x} y={8} width={BLOCK} height={BLOCK} rx={5}
                fill="url(#ratioA)" stroke="#4338ca" strokeWidth={1.2}/>
              <text x={x + BLOCK/2} y={8 + BLOCK/2 + 4} textAnchor="middle"
                fontSize={9} fontWeight="800" fill="white">{scale > 1 ? scale : i + 1}</text>
            </g>
          );
        })}

        {/* Part B blocks */}
        {Array.from({ length: dispB }).map((_, i) => {
          const x = offsetX + (dispA + i) * (BLOCK + GAP);
          return (
            <g key={`b${i}`}>
              <rect x={x} y={8} width={BLOCK} height={BLOCK} rx={5}
                fill="url(#ratioB)" stroke="#7e22ce" strokeWidth={1.2}/>
              <text x={x + BLOCK/2} y={8 + BLOCK/2 + 4} textAnchor="middle"
                fontSize={9} fontWeight="800" fill="white">{scale > 1 ? scale : i + 1}</text>
            </g>
          );
        })}

        {/* brace labels below */}
        {/* Part A brace */}
        {dispA > 0 && (() => {
          const x1 = offsetX;
          const x2 = offsetX + dispA * (BLOCK + GAP) - GAP;
          const mid = (x1 + x2) / 2;
          const y = 36;
          return (
            <g>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke={T.indigo} strokeWidth={1.5}/>
              <line x1={x1} y1={y} x2={x1} y2={y+5} stroke={T.indigo} strokeWidth={1.5}/>
              <line x1={x2} y1={y} x2={x2} y2={y+5} stroke={T.indigo} strokeWidth={1.5}/>
              <text x={mid} y={y+14} textAnchor="middle" fontSize={9} fontWeight="700" fill={T.indigo}>
                {lA} ({partA})
              </text>
            </g>
          );
        })()}

        {/* Part B brace */}
        {dispB > 0 && (() => {
          const x1 = offsetX + dispA * (BLOCK + GAP);
          const x2 = offsetX + (dispA + dispB) * (BLOCK + GAP) - GAP;
          const mid = (x1 + x2) / 2;
          const y = 36;
          return (
            <g>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="#9333ea" strokeWidth={1.5}/>
              <line x1={x1} y1={y} x2={x1} y2={y+5} stroke="#9333ea" strokeWidth={1.5}/>
              <line x1={x2} y1={y} x2={x2} y2={y+5} stroke="#9333ea" strokeWidth={1.5}/>
              <text x={mid} y={y+14} textAnchor="middle" fontSize={9} fontWeight="700" fill="#9333ea">
                {lB} ({partB})
              </text>
            </g>
          );
        })()}
      </svg>

      <div style={{ display:"flex", gap:6, alignItems:"center", justifyContent:"center", flexWrap:"wrap" }}>
        {/* colour key + ratio statement */}
        <div style={{ display:"flex", alignItems:"center", gap:3 }}>
          <div style={{ width:10, height:10, borderRadius:2, background:"#4f46e5" }}/>
          <span style={{ fontSize:10, fontWeight:700, color:T.indigo }}>{lA}</span>
        </div>
        <span style={{ fontSize:10, color:T.textMid }}>:</span>
        <div style={{ display:"flex", alignItems:"center", gap:3 }}>
          <div style={{ width:10, height:10, borderRadius:2, background:"#9333ea" }}/>
          <span style={{ fontSize:10, fontWeight:700, color:"#9333ea" }}>{lB}</span>
        </div>
        <Chip color={T.indigo} bg="white">{partA}:{partB} &nbsp;·&nbsp; Total: {total}</Chip>
        {scale > 1 && <span style={{ fontSize:9, color:T.textMid }}>each block = {scale}</span>}
      </div>
    </Panel>
  );
}

// ── VR Alphabet Strip ─────────────────────────────────────────────────────────
function AlphabetStripVis({ highlighted, offset }) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const hiSet = new Set((highlighted || []).map(c => c.toUpperCase()));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"center" }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:2, justifyContent:"center" }}>
        {alpha.map((c, i) => {
          const isHi = hiSet.has(c);
          return (
            <div key={c} style={{
              width:18, height:22, borderRadius:4,
              background: isHi ? T.indigo : T.indigoBg,
              border: `1.5px solid ${isHi ? T.indigo : "#e0e7ff"}`,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              color: isHi ? "white" : T.slate, fontWeight: isHi ? 800 : 500, fontSize:8.5,
            }}>
              <span>{c}</span>
              <span style={{ fontSize:6.5, opacity:0.7 }}>{i+1}</span>
            </div>
          );
        })}
      </div>
      {offset && (
        <div style={{ fontSize:11, color:T.slate, fontWeight:600 }}>
          +{offset} positions forward
        </div>
      )}
    </div>
  );
}

// ── English / Grammar Visualiser ─────────────────────────────────────────────
function parseEnglish(topicStr, questionStr, yearLevel, question) {
  const t = (topicStr || "").toLowerCase();
  const q = (questionStr || "").toLowerCase();
 
  // Sentence structure / clauses
  if (t.includes("clause") || t.includes("sentence_type") || t.includes("sentence_structure") ||
      /main clause|subordinate clause|relative clause|compound sentence|complex sentence|simple sentence/i.test(questionStr)) {
    const parts = [];
    const sentenceMatch = (questionStr || "").match(/['"]([^'"]{10,80})['"]/);
    if (sentenceMatch) {
      const sentence = sentenceMatch[1];
      const conjunctions = /\b(because|although|when|while|if|since|after|before|until|unless|so|but|and|which|who|that)\b/i;
      const splitParts = sentence.split(conjunctions);
      splitParts.forEach((part, i) => {
        const trimmed = part.trim();
        if (!trimmed) return;
        if (conjunctions.test(trimmed)) {
          parts.push({ text: trimmed, type: "conjunction" });
        } else if (i === 0) {
          parts.push({ text: trimmed, type: "main" });
        } else {
          parts.push({ text: trimmed, type: "subordinate" });
        }
      });
    }
    if (parts.length >= 2) return { type: "sentence_structure", parts };
    return { type: "sentence_structure", parts: [
      { text: "The dog barked", type: "main" },
      { text: "because", type: "conjunction" },
      { text: "it heard a noise", type: "subordinate" },
    ]};
  }
 
  // Spelling patterns — DISABLED: masked visuals (generic ? boxes) provide zero pedagogical
  // value for phonics/spelling questions. The visual doesn't show actual letters (to avoid
  // leaking the answer), so scholars see only blank boxes with no useful information.
  // Return null to let the question render without a misleading visual panel.
  // TODO: Re-enable when we have concept-card-backed visuals that teach specific spelling
  // rules (e.g., "magic e makes the vowel say its name") without revealing the answer.
  // if (t.includes("spelling") || t.includes("phonics") || ...) { ... }
 
  // Punctuation
  if (t.includes("punctuation") || t.includes("apostrophe") || t.includes("comma") ||
      /punctuation|comma|apostrophe|speech marks|quotation|colon|semicolon|exclamation|question mark/i.test(questionStr)) {
    const sentenceMatch = (questionStr || "").match(/['"]([^'"]{8,60})['"]/);
    const sentence = sentenceMatch?.[1] || "";
    if (sentence) {
      const marks = [];
      sentence.split("").forEach((ch, i) => {
        if (ch === ",") marks.push({ pos: i, type: "comma" });
        if (ch === "'") marks.push({ pos: i, type: "apostrophe" });
        if (ch === "!") marks.push({ pos: i, type: "exclamation" });
        if (ch === "?") marks.push({ pos: i, type: "question_mark" });
        if (ch === ":") marks.push({ pos: i, type: "colon" });
        if (ch === ";") marks.push({ pos: i, type: "semicolon" });
      });
      return { type: "punctuation", sentence, marks, missingPos: -1 };
    }
  }
 
  // Word classes
  if (t.includes("word_class") || t.includes("parts_of_speech") || t.includes("noun_phrase") ||
      /word class|parts of speech|noun phrase|verb phrase|identify the noun|identify the verb|identify the adjective/i.test(questionStr)) {
    const phraseMatch = (questionStr || "").match(/['"]([^'"]{5,40})['"]/);
    if (phraseMatch) {
      const phrase = phraseMatch[1];
      const wordList = phrase.split(/\s+/).map(w => {
        const lw = w.toLowerCase().replace(/[^a-z]/g, "");
        const determiners = ["the","a","an","this","that","these","those","my","your","his","her","its","our","their"];
        const prepositions = ["in","on","at","to","for","with","by","from","of","about","into","through","over","under"];
        const conjunctions = ["and","but","or","so","yet","because","although","when","while","if"];
        const pronouns = ["i","me","you","he","she","it","we","they","him","her","us","them"];
        if (determiners.includes(lw)) return { word: w, cls: "determiner" };
        if (prepositions.includes(lw)) return { word: w, cls: "preposition" };
        if (conjunctions.includes(lw)) return { word: w, cls: "conjunction" };
        if (pronouns.includes(lw)) return { word: w, cls: "pronoun" };
        if (/ly$/.test(lw)) return { word: w, cls: "adverb" };
        if (/ing$|ed$|es$|s$/.test(lw) && lw.length > 3) return { word: w, cls: "verb" };
        if (/ful$|ous$|ive$|al$|ish$|less$|able$/.test(lw)) return { word: w, cls: "adjective" };
        return { word: w, cls: "noun" };
      });
      return { type: "word_class", words: wordList };
    }
  }
 
  return null;
}

// ── NVR (3D shapes, rotations, codes) ─────────────────────────────────────────
function parseNVRExt(topicStr, questionStr, yearLevel) {
  const t = (topicStr || "").toLowerCase();
  const q = (questionStr || "").toLowerCase();
 
  // Actual shape rotation (enhanced — replaces generic NVRRotationVis)
  if (/rotat.*\d+\s*degree|turn.*\d+\s*degree|\d+\s*degree.*rotat/i.test(questionStr)) {
    const degMatch = (questionStr || "").match(/(\d+)\s*degree/i);
    const degrees = degMatch ? parseInt(degMatch[1]) : 90;
    const clockwise = !/anti|counter/i.test(questionStr);
    const SHAPES = ["triangle","square","pentagon","hexagon","circle","rectangle","arrow"];
    const shape = SHAPES.find(s => q.includes(s)) || "triangle";
    return { type: "nvr_shape_rotation", shape, degrees, clockwise };
  }
 
  // Letter/number codes
  if (/code|cipher|A\s*=\s*1|letter.*number|number.*letter|decode|encode/i.test(questionStr) &&
      (/\bcode\b|\bcipher\b/.test(t) || t.includes("verbal") || t.includes("nvr"))) {
    const encodedMatch = (questionStr || "").match(/['"]([A-Z0-9\s-]{2,20})['"]/);
    const encoded = encodedMatch?.[1] || "";
    return { type: "nvr_code", encoded, decoded: "", codeType: "a1" };
  }
 
  // Plan and elevation
  if (/plan view|elevation|front view|side view|bird.*eye|3d.*2d|2d.*3d/i.test(questionStr) ||
      /\bplan_view\b|\bplan\b/.test(t) || t.includes("elevation")) {
    const shapes = { cuboid: "cuboid", cylinder: "cylinder", "l-shape": "l-shape", "l shape": "l-shape",
                     "triangular prism": "triangular_prism", prism: "triangular_prism" };
    let shape3d = "cuboid";
    for (const [name, val] of Object.entries(shapes)) {
      if (q.includes(name)) { shape3d = val; break; }
    }
    return { type: "nvr_plan_elevation", shape3d };
  }
 
  return null;
}

// ── VR Word Analogy ───────────────────────────────────────────────────────────
function AnalogyVis({ wordA, wordB, wordC, relationship }) {
  const Box = ({ word, color }) => (
    <div style={{
      padding:"6px 12px", background:color + "22", border:`2px solid ${color}`,
      borderRadius:8, fontSize:13, fontWeight:700, color,
      minWidth:52, textAlign:"center",
    }}>{word}</div>
  );
  const Arrow = ({ label }) => (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
      <span style={{ fontSize:9, color:T.slate, fontWeight:600 }}>{label}</span>
      <span style={{ fontSize:16, color:T.slate }}>→</span>
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"center" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
        <Box word={wordA} color={T.indigo} />
        <Arrow label={relationship || "relates to"} />
        <Box word={wordB} color={T.indigo} />
      </div>
      <div style={{ fontSize:11, color:T.slate, fontWeight:600 }}>same as</div>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
        <Box word={wordC} color={T.nebula} />
        <Arrow label={relationship || "relates to"} />
        <div style={{
          padding:"6px 12px", background:T.nebulaBg, border:`2px dashed ${T.nebula}`,
          borderRadius:8, fontSize:13, fontWeight:700, color:T.nebula,
          minWidth:52, textAlign:"center",
        }}>?</div>
      </div>
    </div>
  );
}

// ── VR Number Sequence ────────────────────────────────────────────────────────
function NumberSequenceVis({ sequence, gapIndex, rule }) {
  const BOX = 44, ARROW = 22, PAD = 12;
  const n = sequence.length;
  const W = 2 * PAD + n * BOX + (n - 1) * ARROW;
  const H = 20 + BOX + (rule ? 26 : 10);
  const midY = 20 + BOX / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 380, display: "block", margin: "0 auto" }}>
      <defs>
        <linearGradient id="nsq_normal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2ff" />
          <stop offset="100%" stopColor="#c7d2fe" />
        </linearGradient>
        <linearGradient id="nsq_gap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdf4ff" />
          <stop offset="100%" stopColor="#e9d5ff" />
        </linearGradient>
        <filter id="nsq_sh" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#1e293b" floodOpacity="0.11" />
        </filter>
        <marker id="nsq_arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <polygon points="0 1.5, 6 3.5, 0 5.5" fill="#94a3b8" />
        </marker>
      </defs>
      {sequence.map((val, i) => {
        const isGap = i === gapIndex;
        const bx = PAD + i * (BOX + ARROW);
        return (
          <g key={i}>
            {i < n - 1 && (
              <line
                x1={bx + BOX + 4} y1={midY}
                x2={bx + BOX + ARROW - 6} y2={midY}
                stroke="#94a3b8" strokeWidth={1.8}
                markerEnd="url(#nsq_arr)"
              />
            )}
            <g filter="url(#nsq_sh)">
              <rect x={bx} y={20} width={BOX} height={BOX} rx={9}
                fill={isGap ? "url(#nsq_gap)" : "url(#nsq_normal)"}
                stroke={isGap ? "#a855f7" : T.indigo} strokeWidth={2.2}
                strokeDasharray={isGap ? "5,3" : undefined} />
              {!isGap && (
                <rect x={bx + 5} y={25} width={18} height={8} rx={4} fill="white" opacity={0.55} />
              )}
            </g>
            <text x={bx + BOX / 2} y={midY} textAnchor="middle" dominantBaseline="central"
              fontSize={isGap ? 20 : 17} fontWeight={900}
              fill={isGap ? "#7c3aed" : T.indigo}>
              {isGap ? "?" : val}
            </text>
          </g>
        );
      })}
      {rule && (
        <text x={W / 2} y={20 + BOX + 17} textAnchor="middle" dominantBaseline="central"
          fontSize={10} fontWeight={600} fill="#64748b" fontStyle="italic">
          Rule: {rule}
        </text>
      )}
    </svg>
  );
}

// ── NVR Matrix (2×2 pattern) ──────────────────────────────────────────────────
function GrammarVis({ sentence, labels }) {
  const POS_COLORS = {
    noun:        { bg:"#dbeafe", border:"#3b82f6", text:"#1d4ed8" },
    verb:        { bg:"#dcfce7", border:"#22c55e", text:"#15803d" },
    adjective:   { bg:"#fef9c3", border:"#eab308", text:"#854d0e" },
    adverb:      { bg:"#fce7f3", border:"#ec4899", text:"#9d174d" },
    preposition: { bg:"#f3e8ff", border:"#a855f7", text:"#6b21a8" },
    article:     { bg:"#f1f5f9", border:"#94a3b8", text:"#475569" },
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
        {labels.map((item, i) => {
          const c = POS_COLORS[item.pos] || POS_COLORS.article;
          return (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <div style={{
                padding:"4px 10px", background:c.bg, border:`2px solid ${c.border}`,
                borderRadius:6, fontSize:13, fontWeight:700, color:c.text,
              }}>{item.word}</div>
              <span style={{ fontSize:9, color:c.text, fontWeight:600, textTransform:"uppercase" }}>{item.pos}</span>
            </div>
          );
        })}
      </div>
      <div style={{
        padding:"6px 10px", background:T.indigoBg, borderRadius:8,
        fontSize:11, color:T.slate, textAlign:"center", fontStyle:"italic",
      }}>{sentence}</div>
    </div>
  );
}

// ── Synonym Strength Ladder ───────────────────────────────────────────────────
function SynonymLadderVis({ words, concept }) {
  const sorted = [...words].sort((a, b) => a.strength - b.strength);
  const W = 270, ROW_H = 30, BAR_X = 88, BAR_MAX_W = 116, BAR_H = 14;
  const DOT_START_X = 212, DOT_R = 3.5, DOT_GAP = 9;
  const TOP_PAD = concept ? 24 : 6;
  const n = sorted.length;
  const H = TOP_PAD + n * ROW_H + 18;
  const tierGrad = s => s <= 2 ? "url(#sl_mild)" : s === 3 ? "url(#sl_med)" : "url(#sl_str)";
  const tierCol  = s => s <= 2 ? T.indigo : s === 3 ? "#f59e0b" : "#7c3aed";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth:300, display:"block", margin:"0 auto" }}>
      <defs>
        <linearGradient id="sl_mild" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c7d2fe" /><stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="sl_med" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="sl_str" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ddd6fe" /><stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <filter id="sl_sh" x="-20%" y="-100%" width="140%" height="300%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#1e293b" floodOpacity="0.10" />
        </filter>
      </defs>
      {concept && (
        <text x={W / 2} y={13} textAnchor="middle" dominantBaseline="central"
          fontSize={9} fontWeight={700} fill="#64748b" letterSpacing={0.5}>
          MEANING STRENGTH: {concept.toUpperCase()}
        </text>
      )}
      {/* track background line */}
      <line x1={BAR_X} y1={TOP_PAD + n * ROW_H - ROW_H / 2}
            x2={BAR_X} y2={TOP_PAD + ROW_H / 2}
            stroke="#e2e8f0" strokeWidth={1} />
      {sorted.map((item, i) => {
        const midY = TOP_PAD + i * ROW_H + ROW_H / 2;
        const barW  = Math.max(BAR_H, (item.strength / 5) * BAR_MAX_W);
        const grad  = tierGrad(item.strength);
        const col   = tierCol(item.strength);
        return (
          <g key={i}>
            {/* word label */}
            <text x={84} y={midY} textAnchor="end" dominantBaseline="central"
              fontSize={11} fontWeight={700} fill={col}>{item.word}</text>
            {/* bar track */}
            <rect x={BAR_X} y={midY - BAR_H / 2} width={BAR_MAX_W} height={BAR_H}
              rx={BAR_H / 2} fill="#e2e8f0" />
            {/* filled bar */}
            <g filter="url(#sl_sh)">
              <rect x={BAR_X} y={midY - BAR_H / 2} width={barW} height={BAR_H}
                rx={BAR_H / 2} fill={grad} />
            </g>
            {/* strength dots */}
            {[0,1,2,3,4].map(j => (
              <circle key={j}
                cx={DOT_START_X + j * DOT_GAP} cy={midY} r={DOT_R}
                fill={j < item.strength ? col : "none"}
                stroke={col} strokeWidth={1.4}
                opacity={j < item.strength ? 1 : 0.3} />
            ))}
          </g>
        );
      })}
      {/* axis labels */}
      <text x={BAR_X} y={H - 4} textAnchor="start" fontSize={8} fontWeight={600} fill="#94a3b8">mild</text>
      <text x={BAR_X + BAR_MAX_W} y={H - 4} textAnchor="end" fontSize={8} fontWeight={600} fill="#94a3b8">strong</text>
    </svg>
  );
}

// ── Prefix / Suffix Word Builder ──────────────────────────────────────────────
function WordBuilderVis({ prefix, root, suffix }) {
  const BOX_W = 76, BOX_H = 52, CONN_W = 30, PAD = 14, PILL_H = 28, LABEL_H = 14;
  const parts = [
    prefix ? { text: prefix, label: "prefix", grad: "url(#wb_pre)", col: "#7c3aed", border: "#a78bfa" } : null,
    { text: root, label: "root word", grad: "url(#wb_root)", col: T.indigo, border: "#818cf8" },
    suffix ? { text: suffix, label: "suffix", grad: "url(#wb_suf)", col: "#059669", border: "#34d399" } : null,
  ].filter(Boolean);
  const n = parts.length;
  const blocksW = n * BOX_W + (n - 1) * CONN_W;
  const W = blocksW + 2 * PAD;
  const combined = (prefix || "") + root + (suffix || "");
  const pillW = Math.max(80, combined.length * 8.5 + 28);
  const FULL_W = Math.max(W, pillW + 2 * PAD);
  const H = BOX_H + LABEL_H + 10 + PILL_H + 10;
  return (
    <svg viewBox={`0 0 ${FULL_W} ${H}`} width="100%"
      style={{ maxWidth: 340, display:"block", margin:"0 auto" }}>
      <defs>
        {/* box gradients */}
        <linearGradient id="wb_pre" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f3ff" /><stop offset="100%" stopColor="#ede9fe" />
        </linearGradient>
        <linearGradient id="wb_root" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2ff" /><stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
        <linearGradient id="wb_suf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ecfdf5" /><stop offset="100%" stopColor="#d1fae5" />
        </linearGradient>
        {/* connector gradient */}
        <linearGradient id="wb_conn" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c7d2fe" /><stop offset="100%" stopColor="#a5f3d0" />
        </linearGradient>
        {/* pill gradient */}
        <linearGradient id="wb_pill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="wb_sh" x="-15%" y="-30%" width="130%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1e293b" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* blocks + connectors */}
      {parts.map((p, i) => {
        const offsetX = PAD + (FULL_W - W) / 2 + i * (BOX_W + CONN_W);
        const cx = offsetX + BOX_W / 2;
        return (
          <g key={i}>
            {/* connector line + plus circle between boxes */}
            {i > 0 && (() => {
              const lineX1 = offsetX - CONN_W;
              const lineX2 = offsetX;
              const midX   = (lineX1 + lineX2) / 2;
              const midY   = BOX_H / 2;
              return (
                <g>
                  <line x1={lineX1} y1={midY} x2={lineX2} y2={midY}
                    stroke="#c7d2fe" strokeWidth={2} strokeDasharray="3 2" />
                  <circle cx={midX} cy={midY} r={9} fill="url(#wb_conn)" filter="url(#wb_sh)" />
                  <text x={midX} y={midY} textAnchor="middle" dominantBaseline="central"
                    fontSize={11} fontWeight={900} fill="#fff">+</text>
                </g>
              );
            })()}
            {/* box */}
            <g filter="url(#wb_sh)">
              <rect x={offsetX} y={0} width={BOX_W} height={BOX_H}
                rx={8} fill={p.grad} stroke={p.border} strokeWidth={2} />
            </g>
            {/* word text */}
            <text x={cx} y={BOX_H / 2} textAnchor="middle" dominantBaseline="central"
              fontSize={14} fontWeight={800} fill={p.col} fontFamily="monospace">{p.text}</text>
            {/* label below box */}
            <text x={cx} y={BOX_H + 10} textAnchor="middle" dominantBaseline="hanging"
              fontSize={8} fontWeight={700} fill={p.col} letterSpacing={0.6}>
              {p.label.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* combined word pill */}
      {(() => {
        const pillX = (FULL_W - pillW) / 2;
        const pillY = BOX_H + LABEL_H + 14;
        return (
          <g filter="url(#wb_sh)">
            <rect x={pillX} y={pillY} width={pillW} height={PILL_H}
              rx={PILL_H / 2} fill="url(#wb_pill)" />
            <text x={FULL_W / 2} y={pillY + PILL_H / 2} textAnchor="middle" dominantBaseline="central"
              fontSize={13} fontWeight={800} fill="#fff" letterSpacing={0.5}>{combined}</text>
          </g>
        );
      })()}
    </svg>
  );
}


// ─── Comparison Visual (greater/less than) ─────────────────────────────────────
function ComparisonVis({ a, b }) {
  const isAGreater = a > b;
  const isEqual    = a === b;
  const symbol     = isEqual ? "=" : isAGreater ? ">" : "<";
  const symCol     = isEqual ? "#64748b" : isAGreater ? "#059669" : "#7c3aed";
  const desc       = isEqual ? "Both are equal" : `${a} is ${isAGreater ? "greater" : "less"} than ${b}`;

  const useDots = a <= 12 && b <= 12;

  if (useDots) {
    // ── Dot mode ────────────────────────────────────────────────────────────
    const W = 300, COLS = 4, STEP = 16, DR = 5.5;
    const maxDots = Math.max(a, b);
    const rows = Math.ceil(maxDots / COLS);
    const gridW = COLS * STEP;
    const gridH = rows * STEP;
    const SIDE_X_A = 18, SIDE_X_B = 178, SYM_X = 150;
    const BADGE_Y = gridH + 14, BADGE_R = 14;
    const DESC_Y  = BADGE_Y + BADGE_R + 16;
    const H = DESC_Y + 16;

    const dotGrid = (count, colFill, colEmpty, ox) =>
      Array.from({ length: maxDots }, (_, idx) => {
        const col = idx % COLS, row = Math.floor(idx / COLS);
        const cx = ox + col * STEP + STEP / 2;
        const cy = row * STEP + STEP / 2;
        const filled = idx < count;
        return (
          <g key={idx}>
            <circle cx={cx} cy={cy} r={DR}
              fill={filled ? `url(#cmp_d${colFill})` : "none"}
              stroke={filled ? colFill : "#cbd5e1"} strokeWidth={1.5}
              opacity={filled ? 1 : 0.4} />
          </g>
        );
      });

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%"
        style={{ maxWidth:320, display:"block", margin:"0 auto" }}>
        <defs>
          <radialGradient id="cmp_d#6366f1" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#a5b4fc" /><stop offset="100%" stopColor="#4f46e5" />
          </radialGradient>
          <radialGradient id="cmp_d#7c3aed" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#c4b5fd" /><stop offset="100%" stopColor="#6d28d9" />
          </radialGradient>
          <filter id="cmp_sh" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1e293b" floodOpacity="0.14" />
          </filter>
        </defs>

        {/* A dots */}
        {dotGrid(a, "#6366f1", "#e0e7ff", SIDE_X_A)}
        {/* B dots */}
        {dotGrid(b, "#7c3aed", "#ede9fe", SIDE_X_B)}

        {/* A badge */}
        <g filter="url(#cmp_sh)">
          <rect x={SIDE_X_A + gridW / 2 - BADGE_R - 2} y={BADGE_Y - BADGE_R}
            width={BADGE_R * 2 + 4} height={BADGE_R * 2}
            rx={7} fill="#6366f1" />
        </g>
        <text x={SIDE_X_A + gridW / 2} y={BADGE_Y} textAnchor="middle" dominantBaseline="central"
          fontSize={14} fontWeight={900} fill="#fff">{a}</text>

        {/* B badge */}
        <g filter="url(#cmp_sh)">
          <rect x={SIDE_X_B + gridW / 2 - BADGE_R - 2} y={BADGE_Y - BADGE_R}
            width={BADGE_R * 2 + 4} height={BADGE_R * 2}
            rx={7} fill="#7c3aed" />
        </g>
        <text x={SIDE_X_B + gridW / 2} y={BADGE_Y} textAnchor="middle" dominantBaseline="central"
          fontSize={14} fontWeight={900} fill="#fff">{b}</text>

        {/* symbol */}
        <text x={SYM_X} y={gridH / 2} textAnchor="middle" dominantBaseline="central"
          fontSize={30} fontWeight={900} fill={symCol}>{symbol}</text>

        {/* description */}
        <text x={W / 2} y={DESC_Y} textAnchor="middle" dominantBaseline="central"
          fontSize={10} fontWeight={700} fill="#64748b">{desc}</text>
      </svg>
    );
  }

  // ── Bar mode (either value > 12) ──────────────────────────────────────────
  const W = 300, SIDE_W = 108, BAR_H = 34, MID_X = 150;
  const maxVal  = Math.max(a, b);
  const BAR_A_W = Math.round((a / maxVal) * SIDE_W);
  const BAR_B_W = Math.round((b / maxVal) * SIDE_W);
  const BAR_A_X = 20, BAR_B_X = MID_X + 22;
  const NUM_Y = 12, BAR_Y = NUM_Y + 8, SYM_Y = BAR_Y + BAR_H / 2, DESC_Y = BAR_Y + BAR_H + 18;
  const H = DESC_Y + 14;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%"
      style={{ maxWidth:320, display:"block", margin:"0 auto" }}>
      <defs>
        <linearGradient id="cmp_ba" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a5b4fc" /><stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="cmp_bb" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c4b5fd" /><stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <filter id="cmp_bsh" x="-10%" y="-30%" width="120%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1e293b" floodOpacity="0.13" />
        </filter>
      </defs>

      {/* A label */}
      <text x={BAR_A_X + SIDE_W / 2} y={NUM_Y} textAnchor="middle" dominantBaseline="auto"
        fontSize={18} fontWeight={900} fill="#4f46e5">{a}</text>
      {/* A bar track */}
      <rect x={BAR_A_X} y={BAR_Y} width={SIDE_W} height={BAR_H} rx={BAR_H / 2} fill="#e0e7ff" />
      {/* A bar fill */}
      <g filter="url(#cmp_bsh)">
        <rect x={BAR_A_X} y={BAR_Y} width={BAR_A_W} height={BAR_H} rx={BAR_H / 2} fill="url(#cmp_ba)" />
      </g>

      {/* B label */}
      <text x={BAR_B_X + SIDE_W / 2} y={NUM_Y} textAnchor="middle" dominantBaseline="auto"
        fontSize={18} fontWeight={900} fill="#6d28d9">{b}</text>
      {/* B bar track */}
      <rect x={BAR_B_X} y={BAR_Y} width={SIDE_W} height={BAR_H} rx={BAR_H / 2} fill="#ede9fe" />
      {/* B bar fill */}
      <g filter="url(#cmp_bsh)">
        <rect x={BAR_B_X} y={BAR_Y} width={BAR_B_W} height={BAR_H} rx={BAR_H / 2} fill="url(#cmp_bb)" />
      </g>

      {/* symbol centered */}
      <text x={MID_X} y={SYM_Y} textAnchor="middle" dominantBaseline="central"
        fontSize={26} fontWeight={900} fill={symCol}>{symbol}</text>

      {/* description */}
      <text x={W / 2} y={DESC_Y} textAnchor="middle" dominantBaseline="central"
        fontSize={10} fontWeight={700} fill="#64748b">{desc}</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER EXTENSIONS — Tier 3 (all use topicStr as first argument)
// ═══════════════════════════════════════════════════════════════════════════════

function parseTier3(topicStr, questionStr, subject, yearLevel) {
  const t = (topicStr || "").toLowerCase();
  const q = (questionStr || "").toLowerCase();
  const subj = (subject || "").toLowerCase();
  const nums = ((questionStr || "").match(RX_NUM) || []).map(Number);

  // ── TIME / CLOCK ───────────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("time") || t.includes("clock") || /o'clock|half past|quarter past|quarter to/i.test(questionStr))) {
    const oclockMatch  = (questionStr || "").match(/(\d{1,2})\s*o'?clock/i);
    const halfPast     = (questionStr || "").match(/half\s+past\s+(\d{1,2})/i);
    const quarterPast  = (questionStr || "").match(/quarter\s+past\s+(\d{1,2})/i);
    const quarterTo    = (questionStr || "").match(/quarter\s+to\s+(\d{1,2})/i);
    const colonTime    = (questionStr || "").match(/(\d{1,2}):(\d{2})/);
    if (oclockMatch)  return { type:"clock", hours:parseInt(oclockMatch[1]), minutes:0, label:`${oclockMatch[1]} o'clock` };
    if (halfPast)     return { type:"clock", hours:parseInt(halfPast[1]), minutes:30, label:`Half past ${halfPast[1]}` };
    if (quarterPast)  return { type:"clock", hours:parseInt(quarterPast[1]), minutes:15, label:`Quarter past ${quarterPast[1]}` };
    if (quarterTo)    { const h = parseInt(quarterTo[1]); return { type:"clock", hours:h-1, minutes:45, label:`Quarter to ${h}` }; }
    if (colonTime)    return { type:"clock", hours:parseInt(colonTime[1]), minutes:parseInt(colonTime[2]), label:`${colonTime[1]}:${colonTime[2]}` };
    if (nums[0] >= 1 && nums[0] <= 12) return { type:"clock", hours:nums[0], minutes:nums[1] || 0 };
  }

  // ── MONEY / COINS ──────────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("money") || t.includes("coin") || /pence|penny|pennies|£|\d+\s*p\b/i.test(questionStr))) {
    const coinPatterns = [
      { re: /£2\s*coin/gi, coin:"£2" },
      { re: /£1\s*coin/gi, coin:"£1" },
      { re: /50p?\s*coin/gi, coin:"50p" },
      { re: /20p?\s*coin/gi, coin:"20p" },
      { re: /10p?\s*coin/gi, coin:"10p" },
      { re: /5p?\s*coin/gi, coin:"5p" },
      { re: /2p?\s*coin/gi, coin:"2p" },
      { re: /1p?\s*coin/gi, coin:"1p" },
    ];
    const coins = [];
    for (const { re, coin } of coinPatterns) {
      const matches = (questionStr || "").match(re) || [];
      matches.forEach(() => coins.push(coin));
    }
    if (coins.length > 0) {
      const totalP = coins.reduce((s, c) => {
        const map = {"£2":200,"£1":100,"50p":50,"20p":20,"10p":10,"5p":5,"2p":2,"1p":1};
        return s + (map[c] || 0);
      }, 0);
      return { type:"money", coins, total:totalP };
    }
    const totalPMatch = (questionStr || "").match(/£(\d+)(?:\.(\d{2}))?/);
    const totalPences = (questionStr || "").match(/(\d+)\s*p\b/i);
    if (totalPMatch) {
      const p = parseInt(totalPMatch[1]) * 100 + parseInt(totalPMatch[2] || 0);
      if (p <= 500) {
        const coins = [];
        let rem = p;
        for (const [denom, coin] of [[200,"£2"],[100,"£1"],[50,"50p"],[20,"20p"],[10,"10p"],[5,"5p"],[2,"2p"],[1,"1p"]]) {
          while (rem >= denom && coins.length < 8) { coins.push(coin); rem -= denom; }
        }
        return { type:"money", coins, total:p };
      }
    }
    if (totalPences) {
      const p = parseInt(totalPences[1]);
      if (p <= 100) {
        const coins = [];
        let rem = p;
        for (const [denom, coin] of [[50,"50p"],[20,"20p"],[10,"10p"],[5,"5p"],[2,"2p"],[1,"1p"]]) {
          while (rem >= denom && coins.length < 8) { coins.push(coin); rem -= denom; }
        }
        return { type:"money", coins, total:p };
      }
    }
  }

  // ── DIVISION GROUPING ──────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("division") || t.includes("sharing") ||
      /share|divide|split|each get|equally|how many weeks|how many days|how many months|how many times|how many groups|÷|divided by/i.test(questionStr))) {
    const isWordProblem = /Real World|Challenge:|£|€|\$|per week|per day|per month|per year|costs?|saves?|earns?|spends?|charges?|buys?|sells?/i.test(questionStr);
    if (!isWordProblem && nums.length >= 2) {
      const total  = Math.max(...nums.slice(0, 3));
      const groups = nums.find(n => n !== total && n >= 2 && n <= 20);
      if (total && groups) {
        if (total <= 60) return { type:"division", total, groups };
        return { type: "division_equation", total, groups };
      }
    }
  }

  // ── RULER / MEASUREMENT ────────────────────────────────────────────────────
  const isShapeQuestion = /perimeter|area|hexagon|pentagon|triangle|rectangle|square|polygon|circle|circumference|octagon|shape/i.test(questionStr);
  if (subj.includes("math") && !isShapeQuestion && (t.includes("measure") || t.includes("length") || /\bcm\b|\bmm\b|centimetre|millimetre|ruler/i.test(questionStr))) {
    const cmMatch = (questionStr || "").match(/(\d+(?:\.\d+)?)\s*cm/i);
    if (cmMatch) {
      const cm = parseFloat(cmMatch[1]);
      if (cm > 0 && cm <= 18) return { type:"ruler", cm };
    }
  }

  // ── RATIO / PROPORTION ─────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("ratio") || t.includes("proportion") || /ratio|for every|:\s*\d/i.test(questionStr))) {
    const ratioMatch = (questionStr || "").match(/(\d+)\s*:\s*(\d+)/);
    if (ratioMatch) {
      const a = parseInt(ratioMatch[1]), b = parseInt(ratioMatch[2]);
      if (a <= 10 && b <= 10) {
        return { type:"ratio", partA:a, partB:b, labelA:"Part A", labelB:"Part B" };
      }
    }
  }

  // ── VERBAL REASONING: ALPHABET STRIP ──────────────────────────────────────
  if (subj.includes("verbal") && !subj.includes("non")) {
    const letterQ = (questionStr || "").match(/letter[s]?\s+(?:after|before|from|of)/i)
      || /alphabet|code|cipher|positions?/i.test(questionStr)
      || t.includes("letter_code") || t.includes("alphabet");
    if (letterQ) {
      const mentioned = ((questionStr || "").match(/\b([A-Z])\b/g) || []).filter((c, i, a) => a.indexOf(c) === i);
      const offsetM = (questionStr || "").match(/(\d+)\s*(?:letters?|places?|positions?)\s*(?:after|forward|on)/i);
      return { type:"alphabet_strip", highlighted: mentioned.slice(0, 4), offset: offsetM ? parseInt(offsetM[1]) : null };
    }

    const analogyM = (questionStr || "").match(/(\w+)\s+is\s+to\s+(\w+)\s+as\s+(\w+)\s+is\s+to/i);
    if (analogyM) {
      return { type:"analogy", wordA:analogyM[1], wordB:analogyM[2], wordC:analogyM[3] };
    }

    const seqNums = ((questionStr || "").match(/\d+/g) || []).map(Number);
    const hasGap  = /\?|__|___|\.\.\.|blank/i.test(questionStr);
    if (seqNums.length >= 3 && hasGap) {
      const diffs = seqNums.slice(1).map((n, i) => n - seqNums[i]);
      const isAP  = diffs.every(d => Math.abs(d - diffs[0]) < 1);
      const rule  = isAP ? (diffs[0] > 0 ? `+${diffs[0]} each time` : `${diffs[0]} each time`) : null;
      return { type:"number_sequence", sequence:seqNums, gapIndex:seqNums.length, rule };
    }
  }

  // ── NVR: MATRIX ───────────────────────────────────────────────────────────
  if ((subj.includes("verbal") && subj.includes("non")) || t.includes("matrix") || t.includes("nvr")) {
    if (t.includes("matrix") || /complete.*(?:grid|matrix|pattern)|which.*(?:fits|completes|goes)/i.test(questionStr)) {
      const shapes = ["circle","square","triangle","diamond"];
      const fills  = [T.indigoBg, T.nebulaBg, "#dcfce7", "#fef9c3"];
      const cells  = [
        { shape:"circle",   fill:fills[0], stroke:T.indigo,  rotate:0   },
        { shape:"square",   fill:fills[1], stroke:T.nebula,  rotate:0   },
        { shape:"triangle", fill:fills[2], stroke:T.emerald, rotate:0   },
        null, // question mark
      ];
      return { type:"nvr_matrix", cells };
    }
  }

  // ── ENGLISH: GRAMMAR ───────────────────────────────────────────────────────
  if (subj.includes("english")) {
    if (t.includes("grammar") || t.includes("noun") || t.includes("verb") || t.includes("adjective")
      || /parts? of speech|identify the (noun|verb|adjective|adverb)|which word is/i.test(questionStr)) {
      const sentM = (questionStr || "").match(/"([^"]{5,60})"/);
      if (sentM) {
        const words = sentM[1].split(/\s+/).slice(0, 6);
        const POS_HINTS = {
          noun:["dog","cat","ball","house","school","teacher","city","boy","girl","car","rain","sun","tree"],
          verb:["ran","runs","jumped","eating","played","is","was","said","went","bought","made","took","gave"],
          adjective:["big","small","red","blue","fast","slow","happy","old","new","bright","dark","long","short"],
          adverb:["quickly","slowly","very","really","always","never","often","happily","loudly","softly"],
        };
        const labels = words.map(w => {
          const clean = w.replace(/[^a-zA-Z]/g,"").toLowerCase();
          for (const [pos, hints] of Object.entries(POS_HINTS)) {
            if (hints.includes(clean)) return { word:w, pos };
          }
          if (/^(the|a|an)$/i.test(clean)) return { word:w, pos:"article" };
          return { word:w, pos:"noun" };
        });
        return { type:"grammar", sentence:sentM[1], labels };
      }
    }

    if (t.includes("prefix") || t.includes("suffix") || /prefix|suffix|root word|word family/i.test(questionStr)) {
      const prefixMap = { un:"happy", re:"write", pre:"view", dis:"agree", mis:"spell", over:"come", im:"possible", in:"visible" };
      const suffixMap = { ness:"happy", ful:"care", less:"hope", tion:"invent", ing:"play", ed:"play", er:"teach" };
      for (const [pre, root] of Object.entries(prefixMap)) {
        if (new RegExp(`\\b${pre}${root}\\b`, 'i').test(q) || new RegExp(`\\b${pre}\\b.*\\b${root}\\b`, 'i').test(q)) {
          return { type:"word_builder", prefix:pre, root, suffix:null };
        }
      }
      for (const [suf, root] of Object.entries(suffixMap)) {
        if (new RegExp(`\\b${root}${suf}\\b`, 'i').test(q) || new RegExp(`\\b${root}\\b.*\\b${suf}\\b`, 'i').test(q)) {
          return { type:"word_builder", prefix:null, root, suffix:suf };
        }
      }
    }

    const SYNONYM_SETS = {
      happy:  [{word:"content",strength:2},{word:"pleased",strength:3},{word:"delighted",strength:4},{word:"ecstatic",strength:5}],
      sad:    [{word:"unhappy",strength:2},{word:"gloomy",strength:3},{word:"miserable",strength:4},{word:"devastated",strength:5}],
      big:    [{word:"large",strength:2},{word:"huge",strength:3},{word:"enormous",strength:4},{word:"colossal",strength:5}],
      angry:  [{word:"annoyed",strength:2},{word:"irritated",strength:3},{word:"furious",strength:4},{word:"enraged",strength:5}],
      cold:   [{word:"cool",strength:2},{word:"chilly",strength:3},{word:"freezing",strength:4},{word:"arctic",strength:5}],
      fast:   [{word:"quick",strength:2},{word:"swift",strength:3},{word:"rapid",strength:4},{word:"lightning",strength:5}],
    };
    for (const [concept, words] of Object.entries(SYNONYM_SETS)) {
      if (q.includes(concept)) return { type:"synonym_ladder", words, concept:`words for "${concept}"` };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 4 — HIGHER SCIENCES + ACCOUNTING/COMMERCE
// ═══════════════════════════════════════════════════════════════════════════════

function parseTier4(topicStr, questionStr, subject, yearLevel) {
  const t = (topicStr || "").toLowerCase();
  const q = (questionStr || "").toLowerCase();
  const subj = (subject || "").toLowerCase();
  const nums = ((questionStr || "").match(RX_NUM) || []).map(Number);

  const isPhysics   = subj.includes("physics")   || (subj.includes("science") && (t.includes("force") || t.includes("wave") || t.includes("energy") || /\belectr(?:ic|on|omag)/.test(t)));
  const isChem      = subj.includes("chem")       || (subj.includes("science") && (t.includes("atom") || /\belement/.test(t) || /\breact(?:ion|iv|ing|ant)/.test(t) || t.includes("periodic") || /\bph\b|ph_scale/.test(t) || /\bstate(?:s)?_of_matter\b|states_matter/.test(t) || t.includes("molecul")));
  const isBio       = subj.includes("biol")       || (subj.includes("science") && (t.includes("cell") || /\bgene(?:tic|s|ration)?\b/.test(t) || /(?:^|[_\s])organs?(?:[_\s]|$)/i.test(t) || t.includes("punnett") || t.includes("inherit")));
  const isAccounting = /\baccount(?:ing|ancy)?\b/.test(subj) || subj.includes("commerce") || subj.includes("business") || subj.includes("economics") || subj.includes("econ");

  // ── PHYSICS ─────────────────────────────────────────────────────────────────

  if (isPhysics && (t.includes("wave") || /wavelength|amplitude|frequency|transverse|longitudinal/i.test(questionStr))) {
    const isLong = /longitudinal|sound|compression|rarefaction/i.test(questionStr);
    const amp = nums.find(n => n > 0 && n < 50) || 24;
    return { type:"wave", waveType: isLong ? "longitudinal" : "transverse", amplitude:amp,
      label: isLong ? "Longitudinal wave (e.g. sound)" : "Transverse wave (e.g. light)" };
  }

  if (isPhysics && (t.includes("electromagnetic") || t.includes("em_spectrum") || /electromagnetic spectrum|radio wave|microwave|infrared|ultraviolet|x.ray|gamma ray|visible light/i.test(questionStr))) {
    const BANDS = ["radio","microwave","infrared","visible","uv","ultraviolet","x-ray","x ray","gamma"];
    const found = BANDS.filter(b => q.includes(b));
    return { type:"em_spectrum", highlighted: found };
  }

  if (isPhysics && (t.includes("resultant") || t.includes("free_body") || /resultant force|free body|balanced force|unbalanced/i.test(questionStr))) {
    const directions = ["up","down","left","right"];
    const forces = [];
    const forceMatches = (questionStr || "").matchAll(/(\d+)\s*n\s*(?:acting\s+)?(?:to\s+the\s+)?(up|down|left|right|upward|downward)/gi);
    for (const m of forceMatches) {
      const dir = m[2].toLowerCase().replace("ward","");
      forces.push({ label:dir, value:parseInt(m[1]), direction:dir });
    }
    if (forces.length === 0) {
      forces.push({ label:"Weight", value:20, direction:"down" });
      forces.push({ label:"Normal", value:20, direction:"up" });
    }
    return { type:"free_body", forces };
  }

  if (isPhysics && (t.includes("energy") || /energy store|kinetic energy|potential energy|thermal energy|energy transfer/i.test(questionStr))) {
    const STORES = [
      { key:"kinetic",       patterns:/kinetic|moving/ },
      { key:"thermal",       patterns:/thermal|heat|temperature/ },
      { key:"chemical",      patterns:/chemical|fuel|food|battery/ },
      { key:"gravitational", patterns:/gravitational|potential|height/ },
      { key:"elastic",       patterns:/elastic|spring|stretched/ },
      { key:"sound",         patterns:/sound|acoustic/ },
    ];
    const found = STORES.filter(s => s.patterns.test(q)).map(s => ({ type:s.key, label:s.key.charAt(0).toUpperCase()+s.key.slice(1) }));
    if (found.length >= 2) {
      return { type:"energy_stores", stores:found.slice(0,4),
        transfers:[{ from:found[0].label, method:"transfer", to:found[1].label }] };
    }
  }

  if (isPhysics && (t.includes("light") || t.includes("optic") ||
      /reflection|refraction|mirror|lens|angle of incidence|normal line|light ray/i.test(questionStr))) {
    const isRefraction = /refraction|refract|bend|slow|boundary|glass|water/i.test(questionStr);
    const angleMatch = (questionStr || "").match(/(\d+)\s*(?:°|degrees?)/i);
    return {
      type: "light_diagram",
      scenario: isRefraction ? "refraction" : "reflection",
      angle: angleMatch ? parseInt(angleMatch[1]) : 45,
    };
  }
 
  if (isPhysics && (t.includes("circuit_symbol") || t.includes("electrical_symbol") ||
      /circuit symbol|electrical symbol|draw.*circuit|identify.*component/i.test(questionStr))) {
    const KNOWN = ["cell","battery","lamp","switch_open","resistor","ammeter","voltmeter"];
    const found = KNOWN.filter(c => questionStr.toLowerCase().includes(c.replace("_"," ")));
    return { type: "electrical_symbols", components: found.length > 0 ? found : KNOWN.slice(0, 5), highlighted: found[0] || "" };
  }
 
  if (isPhysics && (t.includes("magnet") || /magnet|magnetic|north pole|south pole|attract|repel|compass.*magnet/i.test(questionStr))) {
    const scenario = /attract/i.test(questionStr) ? "attract"
      : /repel/i.test(questionStr) ? "repel"
      : /field line|magnetic field/i.test(questionStr) ? "field_lines"
      : "bar";
    return { type: "magnet", scenario };
  }

  // ── CHEMISTRY ───────────────────────────────────────────────────────────────

  if (isChem && (t.includes("atom") || t.includes("electron") || /atomic structure|electron shell|bohr|proton|neutron|electron/i.test(questionStr))) {
    const ELEMENTS = {
      hydrogen:  { protons:1, neutrons:0, electrons:1, element:"H" },
      helium:    { protons:2, neutrons:2, electrons:2, element:"He" },
      lithium:   { protons:3, neutrons:4, electrons:3, element:"Li" },
      carbon:    { protons:6, neutrons:6, electrons:6, element:"C" },
      nitrogen:  { protons:7, neutrons:7, electrons:7, element:"N" },
      oxygen:    { protons:8, neutrons:8, electrons:8, element:"O" },
      fluorine:  { protons:9, neutrons:10, electrons:9, element:"F" },
      neon:      { protons:10, neutrons:10, electrons:10, element:"Ne" },
      sodium:    { protons:11, neutrons:12, electrons:11, element:"Na" },
      magnesium: { protons:12, neutrons:12, electrons:12, element:"Mg" },
      chlorine:  { protons:17, neutrons:18, electrons:17, element:"Cl" },
      calcium:   { protons:20, neutrons:20, electrons:20, element:"Ca" },
    };
    for (const [name, data] of Object.entries(ELEMENTS)) {
      if (q.includes(name)) return { type:"atom", ...data };
    }
    const pMatch = (questionStr||"").match(/(\d+)\s*protons?/i);
    const nMatch = (questionStr||"").match(/(\d+)\s*neutrons?/i);
    const eMatch = (questionStr||"").match(/(\d+)\s*electrons?/i);
    if (pMatch || nMatch) {
      const p = parseInt(pMatch?.[1] || "6");
      const n = parseInt(nMatch?.[1] || p.toString());
      const e = parseInt(eMatch?.[1] || p.toString());
      return { type:"atom", protons:p, neutrons:n, electrons:e };
    }
  }

  if (isChem && (t.includes("periodic") || t.includes("element") || /group \d|period \d|periodic table|noble gas|alkali metal|halogen|transition metal/i.test(questionStr))) {
    const ELEM_DB = {
      hydrogen:  { symbol:"H",  name:"Hydrogen",  atomicNumber:1,  atomicMass:"1",   group:1,  period:1, category:"non-metal" },
      helium:    { symbol:"He", name:"Helium",     atomicNumber:2,  atomicMass:"4",   group:18, period:1, category:"noble gas" },
      lithium:   { symbol:"Li", name:"Lithium",    atomicNumber:3,  atomicMass:"7",   group:1,  period:2, category:"alkali metal" },
      sodium:    { symbol:"Na", name:"Sodium",     atomicNumber:11, atomicMass:"23",  group:1,  period:3, category:"alkali metal" },
      potassium: { symbol:"K",  name:"Potassium",  atomicNumber:19, atomicMass:"39",  group:1,  period:4, category:"alkali metal" },
      magnesium: { symbol:"Mg", name:"Magnesium",  atomicNumber:12, atomicMass:"24",  group:2,  period:3, category:"alkaline earth" },
      calcium:   { symbol:"Ca", name:"Calcium",    atomicNumber:20, atomicMass:"40",  group:2,  period:4, category:"alkaline earth" },
      carbon:    { symbol:"C",  name:"Carbon",     atomicNumber:6,  atomicMass:"12",  group:14, period:2, category:"non-metal" },
      nitrogen:  { symbol:"N",  name:"Nitrogen",   atomicNumber:7,  atomicMass:"14",  group:15, period:2, category:"non-metal" },
      oxygen:    { symbol:"O",  name:"Oxygen",     atomicNumber:8,  atomicMass:"16",  group:16, period:2, category:"non-metal" },
      chlorine:  { symbol:"Cl", name:"Chlorine",   atomicNumber:17, atomicMass:"35.5",group:17, period:3, category:"halogen" },
      fluorine:  { symbol:"F",  name:"Fluorine",   atomicNumber:9,  atomicMass:"19",  group:17, period:2, category:"halogen" },
      neon:      { symbol:"Ne", name:"Neon",       atomicNumber:10, atomicMass:"20",  group:18, period:2, category:"noble gas" },
      argon:     { symbol:"Ar", name:"Argon",      atomicNumber:18, atomicMass:"40",  group:18, period:3, category:"noble gas" },
      iron:      { symbol:"Fe", name:"Iron",       atomicNumber:26, atomicMass:"56",  group:8,  period:4, category:"transition metal" },
      copper:    { symbol:"Cu", name:"Copper",     atomicNumber:29, atomicMass:"64",  group:11, period:4, category:"transition metal" },
      zinc:      { symbol:"Zn", name:"Zinc",       atomicNumber:30, atomicMass:"65",  group:12, period:4, category:"transition metal" },
      gold:      { symbol:"Au", name:"Gold",       atomicNumber:79, atomicMass:"197", group:11, period:6, category:"transition metal" },
      silver:    { symbol:"Ag", name:"Silver",     atomicNumber:47, atomicMass:"108", group:11, period:5, category:"transition metal" },
      aluminium: { symbol:"Al", name:"Aluminium",  atomicNumber:13, atomicMass:"27",  group:13, period:3, category:"metal" },
      silicon:   { symbol:"Si", name:"Silicon",    atomicNumber:14, atomicMass:"28",  group:14, period:3, category:"metalloid" },
    };
    for (const [name, data] of Object.entries(ELEM_DB)) {
      if (q.includes(name)) return { type:"periodic_element", ...data };
    }
  }

  if (isChem && (/\bstate(?:s)?(?:_of)?(?:_matter)?\b/.test(t) || /melting|freezing|evaporation|condensation|sublimation|solid|liquid|gas|boiling/i.test(questionStr))) {
    const STATES = ["solid","liquid","gas"];
    const found = STATES.filter(s => q.includes(s));
    return { type:"state_changes", highlighted: found };
  }

  if (isChem && (t.includes("molecule") || t.includes("compound") || /\bH2O\b|\bCO2\b|\bCH4\b|\bO2\b|\bN2\b|\bHCl\b|\bNaCl\b/i.test(questionStr))) {
    const FORMULAS = ["H2O","CO2","CH4","O2","N2","HCl","NaCl"];
    const found = FORMULAS.find(f => new RegExp(`\\b${f}\\b`, "i").test(questionStr));
    if (found) return { type:"molecule", formula:found };
    if (/water/i.test(questionStr)) return { type:"molecule", formula:"H2O" };
    if (/carbon dioxide/i.test(questionStr)) return { type:"molecule", formula:"CO2" };
    if (/methane/i.test(questionStr)) return { type:"molecule", formula:"CH4" };
    if (/oxygen/i.test(questionStr) && !/carbon|water/i.test(questionStr)) return { type:"molecule", formula:"O2" };
    if (/sodium chloride|salt/i.test(questionStr)) return { type:"molecule", formula:"NaCl" };
  }

  if (isChem && (/\bph\b|ph_scale/.test(t) || /\bpH\b|acid|alkali|alkaline|neutral|indicator/i.test(questionStr))) {
    const phMatch = (questionStr||"").match(/pH\s*(?:of\s*)?(?:=\s*)?(\d+(?:\.\d+)?)/i);
    const SUBSTANCE_PH = {
      "lemon juice":3, "vinegar":3, "cola":4, "rain":6, "pure water":7, "water":7,
      "milk":7, "blood":7.4, "sea water":8, "baking soda":9, "bleach":13, "stomach acid":2,
    };
    let value = phMatch ? parseFloat(phMatch[1]) : null;
    let substance = null;
    for (const [sub, ph] of Object.entries(SUBSTANCE_PH)) {
      if (q.includes(sub)) { value = value ?? ph; substance = sub; break; }
    }
    if (value !== null) return { type:"ph_scale", value, substance };
    return { type:"ph_scale", value:7, substance:"neutral" };
  }

  // ── BIOLOGY ─────────────────────────────────────────────────────────────────

  if (isBio && (t.includes("cell") || /animal cell|plant cell|cell membrane|cell wall|nucleus|chloroplast|vacuole|mitochondria/i.test(questionStr))) {
    const isPlant = /plant/i.test(questionStr) || /chloroplast|cell wall|vacuole/i.test(questionStr);
    return { type:"cell", cellType: isPlant ? "plant" : "animal" };
  }

  if (isBio && (t.includes("punnett") || t.includes("inherit") || t.includes("genetic") || /dominant|recessive|allele|genotype|phenotype|cross.*\b[A-Z][a-z]\b/i.test(questionStr))) {
    const crossMatch = (questionStr||"").match(/\b([A-Z][a-z])\s*[×x]\s*([A-Z][a-z])\b/);
    const parent1 = crossMatch?.[1] || "Aa";
    const parent2 = crossMatch?.[2] || "Aa";
    const traitM  = (questionStr||"").match(/trait[:\s]+([^.?\n]{3,30})/i);
    return { type:"punnett", parent1, parent2, trait:traitM?.[1]?.trim() };
  }
  
  if (isBio && (t.includes("skeleton") || t.includes("digestive") || t.includes("circulat") ||
      t.includes("respirat") || t.includes("body_system") || /(?:^|[_\s])organs?(?:[_\s]|$)/i.test(t) ||
      /skeleton|skull|ribs|spine|femur|digestive|stomach|intestine|oesophagus|circulatory|heart|arteries|veins|respiratory|lungs|trachea|diaphragm/i.test(questionStr))) {
    const system = /digestive|stomach|intestine|oesophagus/i.test(questionStr + t) ? "digestive"
      : /circulat|heart|arter|vein|blood/i.test(questionStr + t) ? "circulatory"
      : /respirat|lung|trachea|diaphragm|bronch/i.test(questionStr + t) ? "respiratory"
      : "skeleton";
    const organs = ["skull","ribs","spine","femur","pelvis","stomach","intestine","heart","lungs","trachea","diaphragm"];
    const highlighted = organs.find(o => questionStr.toLowerCase().includes(o)) || "";
    return { type: "human_body", system, highlighted };
  }
 
  if ((isPhysics || isBio || subj.includes("science")) &&
      (t.includes("solar") || t.includes("planet") || /solar system|planet|mercury|venus|mars|jupiter|saturn/i.test(questionStr))) {
    const planets = ["mercury","venus","earth","mars","jupiter","saturn","uranus","neptune"];
    const highlighted = planets.find(p => questionStr.toLowerCase().includes(p)) || "";
    return { type: "solar_system", highlighted, showOrbits: true };
  }
 
  if (isBio && (t.includes("classif") || t.includes("kingdom") || t.includes("vertebrat") ||
      /classify|vertebrate|invertebrate|mammal|reptile|amphibian|fish|bird|insect|arachnid/i.test(questionStr))) {
    const groups = ["mammals","birds","reptiles","fish","amphibians","insects","arachnids","vertebrates","invertebrates"];
    const highlighted = groups.find(g => questionStr.toLowerCase().includes(g.replace(/s$/, ""))) || "";
    return { type: "classification_key", highlighted };
  }
 
  if (isBio && (t.includes("photosynthesis") || /photosynthesis|chloroplast|chlorophyll|plant.*energy|leaf.*sunlight/i.test(questionStr))) {
    const terms = ["sunlight","co₂","carbon dioxide","water","glucose","oxygen"];
    const highlighted = terms.find(t => questionStr.toLowerCase().includes(t)) || "";
    return { type: "photosynthesis", highlighted };
  }
 
  if (isBio && (t.includes("respirat") || /respiration|aerobic|anaerobic|glucose.*oxygen.*energy|mitochondria/i.test(questionStr))) {
    const isAnaerobic = /anaerobic|lactic acid|without oxygen/i.test(questionStr);
    return { type: "respiration", respType: isAnaerobic ? "anaerobic" : "aerobic" };
  }

  // ── BASIC SCIENCE CONCEPTS — simple inline SVG visuals for KS1/KS2 ─────────
  // Catches "plants and animals", leaf, root, stem, flower, seed, water cycle, etc.
  const isBasicSci = isBio || subj.includes("science") || subj.includes("basic_science");
  if (isBasicSci) {
    const BASIC_CONCEPTS = [
      { rx: /\bleaf\b|\bleaves\b|green.*makes food|chlorophyll|photosynthesis/i, concept: "leaf", label: "Leaf — makes food using sunlight", emoji: "🍃" },
      { rx: /root|roots.*absorb|water.*from.*soil/i, concept: "root", label: "Roots — absorb water and nutrients", emoji: "🌱" },
      { rx: /\bstem\b|\btrunk\b|\btransport\b.*\bwater\b|\bwater\b.*\btransport/i, concept: "stem", label: "Stem — supports and transports", emoji: "🌿" },
      { rx: /\bflower(?:s|ing)?\b|\bpetal(?:s)?\b|\bpollen\b|\bpollinat(?:ion|e|ed|ing)\b/i, concept: "flower", label: "Flower — makes seeds", emoji: "🌸" },
      { rx: /\bseed(?:s)?\b|germination|germinate/i, concept: "seed", label: "Seed — grows into a new plant", emoji: "🌰" },
      { rx: /plant.*parts|parts.*plant/i, concept: "plant_parts", label: "Parts of a Plant", emoji: "🪴" },
      { rx: /habitat|forest|pond|desert|ocean|savanna|arctic/i, concept: "habitat", label: "Habitats — where living things live", emoji: "🏞️" },
      { rx: /life.*cycle|egg.*larva|tadpole|caterpillar|metamorphosis/i, concept: "lifecycle", label: "Life Cycle", emoji: "🔄" },
      { rx: /food.*chain|predator|prey|\bproducer(?:s)?\b.*(?:consumer|food|chain|energy)|\bconsumer(?:s)?\b.*(?:producer|food|chain|energy|primary|secondary|tertiary)/i, concept: "food_chain", label: "Food Chain", emoji: "🔗" },
      { rx: /\bseason|\bwinter\b|\bspring\b.*(?:season|autumn|summer|weather)|\bsummer\b|\bautumn\b/i, concept: "seasons", label: "Seasons", emoji: "🍂" },
      { rx: /\bweather\b|\brain(?:fall|y|bow)?\b|\bcloud(?:s|y)?\b|\bwind(?:y|s)?\b|\bsun(?:ny|light|shine)?\b.*(?:weather|cloud|rain)|\btemperature\b/i, concept: "weather", label: "Weather", emoji: "🌦️" },
      { rx: /material(?:s)?\b.*(?:property|rough|smooth|transparent|opaque|waterproof)|\brought?\b|\bsmooth\b|\btransparent\b|\bopaque\b|\bwaterproof/i, concept: "materials", label: "Materials & Properties", emoji: "🧱" },
      { rx: /magnet|attract|repel|magnetic/i, concept: "magnet_basic", label: "Magnets", emoji: "🧲" },
      { rx: /\blight\b.*(?:shadow|opaque|reflect)|\bshadow\b|\btransparent\b|\bopaque\b/i, concept: "light_basic", label: "Light & Shadows", emoji: "💡" },
      { rx: /\bsound\b|\bloud\b|\bquiet\b|\bvibrat(?:e|ion|ing)\b|\bpitch\b.*(?:sound|high|low)/i, concept: "sound_basic", label: "Sound", emoji: "🔊" },
      { rx: /teeth|canine|molar|incisor/i, concept: "teeth", label: "Types of Teeth", emoji: "🦷" },
      { rx: /skeleton|bones|skull|ribs/i, concept: "skeleton_basic", label: "The Skeleton", emoji: "🦴" },
      { rx: /\binsect|\bbutterfl|\bbeetle|\bants?\b|\bspider|\bminibeasts?/i, concept: "insects", label: "Minibeasts & Insects", emoji: "🐛" },
      { rx: /\bbird(?:s)?\b|\bfeather(?:s)?\b|\bbeak(?:s)?\b|\bbird.*\bwing|\bfly\b.*\bbird/i, concept: "birds", label: "Birds", emoji: "🐦" },
      { rx: /\bfish\b|\bfins?\b|\bgills?\b/i, concept: "fish", label: "Fish", emoji: "🐟" },
      { rx: /\bmammal|\bfur\b.*\banimal|\bwarm.blooded/i, concept: "mammals", label: "Mammals", emoji: "🐾" },
    ];
    const combo = (questionStr || "") + " " + (t || "");
    for (const c of BASIC_CONCEPTS) {
      if (c.rx.test(combo)) {
        return { type: "basic_concept", concept: c.concept, label: c.label, emoji: c.emoji };
      }
    }
  }

  // ── KS1/KS2 COMMERCE — basic trade visual ──────────────────────────────────
  if (isAccounting && yearLevel <= 6 &&
      /trade|buy|sell|shop|market|goods|money|coins|price|spend|pay|cost|expensive|cheap|import|export/i.test(questionStr + " " + t)) {
    return { type: "basic_concept", concept: "trade_basic", label: "Trade & Money", emoji: "🛒" };
  }

  // ── ACCOUNTING / COMMERCE / ECONOMICS ────────────────────────────────────────

  if (isAccounting && (t.includes("t-account") || t.includes("t_account") || t.includes("double entry") || t.includes("debit") || t.includes("credit") || /\bdebit\b|\bcredit\b|ledger|journal/i.test(questionStr))) {
    const accountMatch = (questionStr||"").match(/(?:account(?:s?)|ledger)\s+(?:for\s+)?([A-Z][a-zA-Z\s]{2,20})/i);
    const debits  = [{ label:"Opening balance", amount:1000 }, { label:"Sales", amount:500 }];
    const credits = [{ label:"Purchases", amount:300 }, { label:"Expenses", amount:200 }];
    return { type:"t_account", account: accountMatch?.[1]?.trim() || "Account Name", debits, credits };
  }

  if (isAccounting && (t.includes("break") || t.includes("break_even") || /break.even|breakeven|fixed cost|variable cost|contribution/i.test(questionStr))) {
    const fcMatch  = (questionStr||"").match(/fixed costs?\s*(?:of|=|:)?\s*[£$]?(\d[\d,]*)/i);
    const vcMatch  = (questionStr||"").match(/variable costs?\s*(?:per unit)?\s*(?:of|=|:)?\s*[£$]?(\d+(?:\.\d+)?)/i);
    const spMatch  = (questionStr||"").match(/(?:selling price|price per unit|revenue per unit)\s*(?:of|=|:)?\s*[£$]?(\d+(?:\.\d+)?)/i);
    const fc  = fcMatch  ? parseInt(fcMatch[1].replace(",",""))  : 2000;
    const vc  = vcMatch  ? parseFloat(vcMatch[1])                 : 4;
    const sp  = spMatch  ? parseFloat(spMatch[1])                 : 8;
    const beq = sp > vc  ? Math.ceil(fc / (sp - vc))             : null;
    return { type:"break_even", fixedCost:fc, variableCostPerUnit:vc, pricePerUnit:sp, breakEvenQty:beq };
  }

  if (isAccounting && (t.includes("supply") || t.includes("demand") || t.includes("equilibrium") || /supply|demand|equilibrium|market price|price mechanism/i.test(questionStr))) {
    const pMatch = (questionStr||"").match(/price\s*(?:of|=|:)?\s*[£$₦]?(\d+)/i);
    const qMatch = (questionStr||"").match(/quantity\s*(?:of|=|:)?\s*(\d+)/i);
    return { type:"supply_demand", eqPrice: pMatch ? parseInt(pMatch[1]) : 50, eqQty: qMatch ? parseInt(qMatch[1]) : 50 };
  }

  // ── Profit & Loss / Income Statement ───────────────────────────────────────
  if (isAccounting && /profit|loss|income statement|revenue|cost of (goods|sales)|gross profit|net profit|operating expenses|cogs/i.test(questionStr + " " + t)) {
    const revM = (questionStr||"").match(/revenue\s*(?:of|=|:)?\s*[£$₦]?([\d,]+)/i);
    const cogsM = (questionStr||"").match(/(?:cost of (?:goods|sales)|cogs)\s*(?:of|=|:)?\s*[£$₦]?([\d,]+)/i);
    const expM = (questionStr||"").match(/(?:expenses?|operating costs?)\s*(?:of|=|:)?\s*[£$₦]?([\d,]+)/i);
    return { type:"profit_loss",
      revenue:  revM  ? parseInt(revM[1].replace(/,/g,""))  : 50000,
      cogs:     cogsM ? parseInt(cogsM[1].replace(/,/g,"")) : 20000,
      expenses: expM  ? parseInt(expM[1].replace(/,/g,""))  : 15000,
    };
  }

  // ── Distribution Channel / Trade Flow ──────────────────────────────────────
  if (isAccounting && /distribution|channel|middlemen|wholesal|retail|manufacturer|intermediar|auxiliar|import|export|international trade|shipping|customs/i.test(questionStr + " " + t)) {
    let flowType = "distribution";
    if (/international|import|export|customs|shipping/i.test(questionStr + " " + t)) flowType = "international";
    if (/bank|deposit|borrow|savings|interest/i.test(questionStr + " " + t)) flowType = "banking";
    return { type:"trade_flow", flowType };
  }

  // ── Business Organisation / Structure ──────────────────────────────────────
  if (isAccounting && /sole (trader|proprietor)|partnership|limited (company|liability)|plc|public limited|cooperat|forms? of business|business organi[sz]/i.test(questionStr + " " + t)) {
    let orgType = "sole_trader";
    if (/partnership/i.test(questionStr + " " + t)) orgType = "partnership";
    if (/limited (company|liability)|ltd\b/i.test(questionStr + " " + t)) orgType = "limited";
    if (/plc|public limited/i.test(questionStr + " " + t)) orgType = "plc";
    if (/cooperat/i.test(questionStr + " " + t)) orgType = "cooperative";
    return { type:"org_structure", orgType };
  }

  // ── Marketing Mix (4Ps) ────────────────────────────────────────────────────
  if (isAccounting && /marketing mix|four ps|4ps|\b(product|price|place|promotion)\b.*marketing|\bmarketing\b.*(product|price|place|promotion)/i.test(questionStr + " " + t)) {
    let highlight = null;
    if (/\bproduct\b/i.test(questionStr)) highlight = "Product";
    else if (/\bprice\b|\bpricing\b/i.test(questionStr)) highlight = "Price";
    else if (/\bplace\b|\bdistribut/i.test(questionStr)) highlight = "Place";
    else if (/\bpromotion\b|\badvert/i.test(questionStr)) highlight = "Promotion";
    return { type:"marketing_mix", highlight };
  }

  // ── Economics concepts ───────────────────────────────────────────────────
  if (isAccounting && /inflation|deflation|price.*level|cost.*push|demand.*pull/i.test(questionStr + " " + t)) {
    return { type: "economics", concept: "inflation" };
  }
  if (isAccounting && /gdp|gross.*domestic|national.*income|aggregate/i.test(questionStr + " " + t)) {
    return { type: "economics", concept: "gdp" };
  }
  if (isAccounting && /demand.*supply|supply.*demand|equilibrium|market.*force/i.test(questionStr + " " + t)) {
    return { type: "economics", concept: "demand_supply" };
  }

  return null;
}

function parseGeography(topicStr, questionStr, yearLevel) {
  const t = (topicStr || "").toLowerCase();
  const q = (questionStr || "").toLowerCase();
  const nums = ((questionStr || "").match(/\d+/g) || []).map(Number);

  // ── KS1/KS2 GEOGRAPHY — rich animated visuals ────────────────────────────
  if (yearLevel <= 6) {
    if (/continent|africa|asia|europe|north america|south america|antarctica|oceania|australasia|how many continents|world map|seven continents/i.test(questionStr + " " + t)) {
      return { type: "basic_concept", concept: "continents", label: "Continents of the World", emoji: "🌍" };
    }
  }

  if (t.includes("compass") || t.includes("direction") || t.includes("bearing") ||
      /north|south|east|west|bearing|compass|cardinal/i.test(questionStr)) {
    const bearingMatch = (questionStr || "").match(/(\d+)\s*(?:°|degrees?)/i);
    const dirMap = { northwest: 315, northeast: 45, southwest: 225, southeast: 135, north: 0, south: 180, east: 90, west: 270 };
    const abbrMap = { nw: 315, ne: 45, sw: 225, se: 135 };
    let bearing = bearingMatch ? parseInt(bearingMatch[1]) : 0;
    let label = "";
    for (const [name, deg] of Object.entries(dirMap)) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(q)) { bearing = deg; label = name.toUpperCase(); break; }
    }
    if (!label) {
      for (const [abbr, deg] of Object.entries(abbrMap)) {
        if (new RegExp(`\\b${abbr}\\b`, 'i').test(q)) { bearing = deg; label = abbr.toUpperCase(); break; }
      }
    }
    if (!label) {
      const singleMatch = q.match(/\b([NESW])\b(?=.*(?:bearing|direction|compass|°|degree))/i);
      if (singleMatch) { const d = { N:0, E:90, S:180, W:270 }; bearing = d[singleMatch[1].toUpperCase()] ?? 0; label = singleMatch[1].toUpperCase(); }
    }
    return { type: "compass", bearing, label: label || (bearing > 0 ? `${bearing}°` : "") };
  }
 
  if (t.includes("grid") || /grid reference|4.figure|6.figure|coordinate.*map|map.*reference/i.test(questionStr)) {
    const gridRefMatch = (questionStr || "").match(/\b([A-E])(\d)\b/i);
    const features = [];
    const featureWords = ["church", "school", "farm", "lake", "forest", "town", "bridge", "hill"];
    featureWords.forEach((fw, i) => {
      if (q.includes(fw)) features.push({ name: fw, row: (i % 4) + 1, col: i % 5 });
    });
    return {
      type: "map_grid",
      gridRef: gridRefMatch ? `${gridRefMatch[1].toUpperCase()}${gridRefMatch[2]}` : "",
      rows: 5, cols: 5, features,
    };
  }
 
  if (t.includes("climate") || t.includes("weather") || t.includes("rainfall") ||
      /climate graph|temperature.*rainfall|precipitation.*month/i.test(questionStr)) {
    const temps = nums.length >= 12 ? nums.slice(0, 12) : [4, 4, 6, 9, 12, 15, 17, 17, 14, 11, 7, 5];
    const rainfall = nums.length >= 24 ? nums.slice(12, 24) : [55, 40, 50, 45, 50, 55, 50, 60, 55, 60, 65, 60];
    const locationMatch = (questionStr || "").match(/(?:in|for|of)\s+([A-Z][a-zA-Z\s]{2,20})/);
    return { type: "climate_graph", location: locationMatch?.[1]?.trim() || "", temps, rainfall };
  }
 
  if (/water cycle|evaporation.*condensation|precipitation.*collection|transpiration/i.test(questionStr) ||
      t.includes("water_cycle")) {
    const stages = ["evaporation", "condensation", "precipitation", "collection", "transpiration"];
    const highlighted = stages.filter(s => q.includes(s));
    return { type: "water_cycle", highlighted };
  }
 
  if (/rock cycle|igneous|sedimentary|metamorphic/i.test(questionStr) || t.includes("rock")) {
    const highlighted = ["igneous", "sedimentary", "metamorphic"].find(r => q.includes(r)) || "";
    return { type: "layer_diagram", context: "rock_cycle", highlighted };
  }
  if (/earth.*layer|\bcrust\b|\bmantle\b|\bcore\b|inner core|outer core/i.test(questionStr) || t.includes("earth_layer")) {
    const highlighted = ["crust", "mantle", "outer core", "inner core"].find(l => q.includes(l)) || "";
    return { type: "layer_diagram", context: "earth", highlighted };
  }
  if (/soil.*layer|topsoil|subsoil|bedrock|humus/i.test(questionStr) || t.includes("soil")) {
    const highlighted = ["topsoil", "subsoil", "bedrock"].find(l => q.includes(l)) || "";
    return { type: "layer_diagram", context: "soil", highlighted };
  }
 
  if (/continent|which country|where is|capital.*of|locate.*map|map.*world/i.test(questionStr) ||
      t.includes("continent") || t.includes("country") || t.includes("capital")) {
    const COUNTRIES = {
      "england": "uk", "scotland": "uk", "wales": "uk", "northern ireland": "uk", "united kingdom": "uk", "uk": "uk",
      "france": "europe", "germany": "europe", "spain": "europe", "italy": "europe", "poland": "europe", "russia": "europe",
      "egypt": "africa", "nigeria": "africa", "kenya": "africa", "south africa": "africa", "congo": "africa",
      "north america": "world", "south america": "world", "asia": "world", "europe": "world", "africa": "world", "oceania": "world",
      "australia": "world", "china": "world", "india": "world", "brazil": "world", "canada": "world",
    };
    let region = "world", highlighted = "";
    for (const [country, reg] of Object.entries(COUNTRIES)) {
      if (q.includes(country)) { region = reg; highlighted = country; break; }
    }
    return { type: "map_region", region, highlighted };
  }
 
  return null;
}
 
function parseHistory(topicStr, questionStr, yearLevel) {
  const t = (topicStr || "").toLowerCase();
  const q = (questionStr || "").toLowerCase();
  const nums = ((questionStr || "").match(/\d{3,4}/g) || []).map(Number);

  // ── KS1/KS2 HISTORY — rich animated visuals ──────────────────────────────
  if (yearLevel <= 6) {
    // Ancient civilisations
    if (/egypt|pharaoh|pyramid|nile|hieroglyph|tutankhamun|mummy|sarcophagus/i.test(questionStr + " " + t)) {
      return { type: "basic_concept", concept: "ancient_civ", label: "Ancient Egypt", emoji: "🏛️", civilisation: "egypt" };
    }
    if (/\brome\b|\broman\b|\bgladiator|\bcolosseum\b|\bemperor\b|\bcenturion\b|\btoga\b|\blatin\b|\baqueduct\b/i.test(questionStr + " " + t)) {
      return { type: "basic_concept", concept: "ancient_civ", label: "Ancient Rome", emoji: "🏛️", civilisation: "rome" };
    }
    if (/\bgreece\b|\bgreek\b|\bathens\b|\bsparta\b|\bolymp|\bparthenon\b|\bzeus\b|\bmyth(?:s|ology|ological)?\b/i.test(questionStr + " " + t)) {
      return { type: "basic_concept", concept: "ancient_civ", label: "Ancient Greece", emoji: "🏛️", civilisation: "greece" };
    }
    if (/\bviking|norse|longship|\brune\b|scandinav|\braid(?:s|ed|ing)?\b|\bthor\b|\bodin\b|valhalla/i.test(questionStr + " " + t)) {
      return { type: "basic_concept", concept: "ancient_civ", label: "The Vikings", emoji: "⚔️", civilisation: "viking" };
    }
    // Cause and consequence
    if (/cause|consequence|because|led to|result|effect|why did|what happened/i.test(questionStr) && t.includes("histor")) {
      return { type: "basic_concept", concept: "cause_consequence", label: "Cause & Consequence", emoji: "🔗" };
    }
  }

  if (t.includes("timeline") || t.includes("chronolog") ||
      /what year|when did|order.*events|which came first|put.*order|century|decade|timeline/i.test(questionStr)) {
    const yearMatches = [...(questionStr || "").matchAll(/(\d{3,4})\s*[-–:]\s*([^,.\n]{3,40})/g)];
    let events = yearMatches.map(m => ({ year: parseInt(m[1]), label: m[2].trim() }));
    if (events.length < 2 && nums.length >= 2) {
      events = nums.slice(0, 5).map(y => ({ year: y, label: "" }));
    }
    const KNOWN_EVENTS = {
      1066: "Battle of Hastings", 1215: "Magna Carta", 1485: "Battle of Bosworth",
      1588: "Spanish Armada", 1666: "Great Fire of London", 1776: "American Independence",
      1815: "Battle of Waterloo", 1914: "WW1 begins", 1939: "WW2 begins", 1945: "WW2 ends",
      1969: "Moon landing", 1989: "Berlin Wall falls",
    };
    events = events.map(e => ({
      ...e,
      label: e.label || KNOWN_EVENTS[e.year] || `${e.year}`,
    }));
    if (events.length >= 2) {
      const highlighted = nums[0] || null;
      return { type: "timeline", events, highlighted };
    }
  }
 
  if (/source [A-Z]|primary source|secondary source|reliability|bias|provenance|how useful|how reliable/i.test(questionStr) ||
      t.includes("source") || t.includes("evidence")) {
    const isPrimary = /primary|diary|letter|photograph|artefact|eyewitness/i.test(questionStr);
    const origins = ["letter", "diary", "photograph", "newspaper", "speech", "painting", "artefact", "document"];
    const origin = origins.find(o => q.includes(o)) || "document";
    const dateMatch = (questionStr || "").match(/\b(\d{4})\b/);
    const authorMatch = (questionStr || "").match(/(?:by|from|written by)\s+([A-Z][a-zA-Z\s]{2,20})/);
    return {
      type: "source_analysis",
      sourceType: isPrimary ? "primary" : "secondary",
      origin,
      date: dateMatch?.[1] || "",
      author: authorMatch?.[1]?.trim() || "",
      reliability: null,
    };
  }
 
  if (/where.*happen|\bmap\b|\bempire\b|\binvasion\b|location.*battle|\broute\b/i.test(questionStr)) {
    return { type: "map_region", region: "europe", highlighted: "" };
  }

  // ── KEYWORD-BASED CATCH-ALL — detect common History nouns for visual matching ──
  const combo = (questionStr || "") + " " + (t || "");

  // Buildings & architecture
  if (/\b(?:building|church|cathedral|castle|palace|manor|monastery|abbey|fort|fortress|tower|house|cottage|hut|dwelling|temple|mosque|synagogue|chapel|barn|mill|windmill|lighthouse|bridge|wall|gate|arch|dome|column|pillar)\b/i.test(combo)) {
    return { type: "basic_concept", concept: "hist_building", label: "Historical Buildings", emoji: "🏰" };
  }
  // Battles, wars & conflict
  if (/\b(?:battle|war|siege|invasion|conquer|defeat|victory|trench|blitz|bomb|armada|armistice|treaty|surrender|conflict|rebellion|revolt|uprising)\b|civil war/i.test(combo)) {
    return { type: "basic_concept", concept: "hist_battle", label: "Battles & Conflict", emoji: "⚔️" };
  }
  // Royalty, rulers & leadership
  if (/\b(?:king|queen|prince|princess|monarch|reign|throne|crown|coronation|dynasty|royal|emperor|empress|pharaoh|chief|sultan|tsar|ruler)\b/i.test(combo)) {
    return { type: "basic_concept", concept: "hist_royalty", label: "Rulers & Royalty", emoji: "👑" };
  }
  // Transport & exploration
  if (/\b(?:ships?|longship|boat|sail|voyage|explorer|expedition|discovery|navigation|caravel|galleon|railway|locomotive|coach|carriage|canal|wagon|chariot|aircraft|aeroplane|airplane)\b|steam.*train|horse.*cart/i.test(combo)) {
    return { type: "basic_concept", concept: "hist_transport", label: "Transport & Exploration", emoji: "⛵" };
  }
  // Inventions & technology
  if (/\b(?:invent(?:ion|ed|or)?|discovery|telegraph|telephone|factory|industrial|revolution|machine|tool|weapon|gunpowder|compass|clock|wheel|plough|loom|electricity)\b|printing press|steam engine|spinning jenny/i.test(combo)) {
    return { type: "basic_concept", concept: "hist_invention", label: "Inventions & Discovery", emoji: "⚙️" };
  }
  // Daily life, clothing, food
  if (/\b(?:cloth(?:es|ing)?|costume|armour|armor|tunic|toga|fashion|dress|uniform|food|feast|banquet|diet|farming|harvest|crop|plough|market|trade|merchant|craft|pottery|weaving|cooking)\b/i.test(combo)) {
    return { type: "basic_concept", concept: "hist_daily_life", label: "Daily Life", emoji: "🏺" };
  }
  // Religion & beliefs
  if (/\b(?:religion|worship|gods?|goddess|belief|ritual|ceremony|sacrifice|prayer|pilgrim|crusade|missionary|bible|quran|torah|monastery|monk|nun|priest|temple|shrine)\b/i.test(combo)) {
    return { type: "basic_concept", concept: "hist_religion", label: "Religion & Beliefs", emoji: "🕯️" };
  }
  // People & society
  if (/\b(?:slave|slavery|abolition|emancipation|suffrage|vote|rights|protest|reform|parliament|democracy|law|justice|punishment|crime|peasant|noble|lord|lady|knight|soldier|warrior|gladiator|citizen)\b/i.test(combo)) {
    return { type: "basic_concept", concept: "hist_society", label: "People & Society", emoji: "👥" };
  }
  // Artefacts & archaeology
  if (/\b(?:artefact|artifact|fossil|archaeolog(?:y|ist|ical)?|excavat(?:e|ion|ed)?|tomb|burial|treasure|relic|museum|pottery|coin|jewel|scroll|manuscript|inscription|carving|statue|monument|memorial)\b/i.test(combo)) {
    return { type: "basic_concept", concept: "hist_artefact", label: "Artefacts & Archaeology", emoji: "🏺" };
  }
  // Generic history fallback — if the topic/subject clearly says "history" but nothing else matched
  if (/histor/i.test(t)) {
    return { type: "basic_concept", concept: "hist_scroll", label: "History", emoji: "📜" };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTING / COMPUTER SCIENCE
// ═══════════════════════════════════════════════════════════════════════════════

function parseComputing(topicStr, questionStr, yearLevel) {
  const t = (topicStr || "").toLowerCase();
  const q = (questionStr || "").toLowerCase();

  // ── FLOWCHART / ALGORITHM ────────────────────────────────────────────────
  if (t.includes("flowchart") || t.includes("algorithm") || t.includes("sequence") ||
      /flowchart|algorithm|step.*by.*step|instructions|decompos/i.test(questionStr)) {
    // Try to parse steps from the question
    const stepMatches = [...(questionStr || "").matchAll(/(?:step\s*\d+[:.]\s*|(?:\d+)[.)]\s*)([^.\n]{3,50})/gi)];
    const steps = stepMatches.length >= 2
      ? [
          { type: "terminal", text: "Start" },
          ...stepMatches.map(m => ({ type: "process", text: m[1].trim() })),
          { type: "terminal", text: "End" },
        ]
      : [];
    return { type: "flowchart", steps, title: t.includes("algorithm") ? "Algorithm" : "Flowchart" };
  }

  // ── SELECTION / IF-ELSE ─────────────────────────────────────────────────
  if (t.includes("selection") || t.includes("if_else") || t.includes("conditional") ||
      /\bif\b.*\bthen\b|selection|conditional|branch/i.test(questionStr)) {
    return { type: "code_block", concept: "selection", lines: [] };
  }

  // ── LOOPS ──────────────────────────────────────────────────────────────
  if (t.includes("loop") || t.includes("iteration") || t.includes("repeat") ||
      /\bfor\b.*loop|\bwhile\b.*loop|repeat|iteration|iterate/i.test(questionStr)) {
    return { type: "code_block", concept: "loop", lines: [] };
  }

  // ── VARIABLES / DATA TYPES ─────────────────────────────────────────────
  if (t.includes("variable") || t.includes("data_type") ||
      /variable|data type|integer|string|boolean|float|assign/i.test(questionStr)) {
    return { type: "code_block", concept: "variable", lines: [] };
  }

  // ── FUNCTIONS / PROCEDURES ─────────────────────────────────────────────
  if (t.includes("function") || t.includes("procedure") || t.includes("subroutine") ||
      /function|procedure|subroutine|parameter|argument|return/i.test(questionStr)) {
    return { type: "code_block", concept: "function", lines: [] };
  }

  // ── BINARY / NUMBER SYSTEMS ────────────────────────────────────────────
  if (t.includes("binary") || t.includes("denary") || t.includes("hexadecimal") ||
      /binary|base.?2|bit|byte|denary|convert.*decimal|decimal.*convert/i.test(questionStr)) {
    const numMatch = (questionStr || "").match(/\b(\d{1,3})\b/);
    const value = numMatch ? parseInt(numMatch[1]) : 42;
    const bits = value > 127 ? 8 : 8;
    return { type: "binary", value: Math.min(value, 255), bits };
  }

  // ── BOOLEAN LOGIC / LOGIC GATES ────────────────────────────────────────
  if (t.includes("boolean") || t.includes("logic_gate") || t.includes("logic") ||
      /\bAND\b|\bOR\b|\bNOT\b|\bXOR\b|\bNAND\b|logic gate|truth table|boolean/i.test(questionStr)) {
    const gates = ["AND", "OR", "NOT", "XOR", "NAND", "NOR"];
    const gate = gates.find(g => q.includes(g.toLowerCase())) || "AND";
    const aMatch = /input\s*A\s*[=:]\s*(true|false|1|0)/i.exec(questionStr);
    const bMatch = /input\s*B\s*[=:]\s*(true|false|1|0)/i.exec(questionStr);
    const inputA = aMatch ? (aMatch[1] === "true" || aMatch[1] === "1") : true;
    const inputB = bMatch ? (bMatch[1] === "true" || bMatch[1] === "1") : false;
    return { type: "boolean_logic", gate, inputA, inputB };
  }

  // ── NETWORKS / INTERNET ────────────────────────────────────────────────
  if (t.includes("network") || t.includes("internet") || t.includes("topology") ||
      /network|topology|server|router|LAN|WAN|switch|hub|IP address|protocol|packet|TCP|HTTP/i.test(questionStr)) {
    const topologies = ["star", "bus", "ring", "internet"];
    const topology = topologies.find(tp => q.includes(tp)) ||
      (/internet|http|tcp|ip|web|browser/i.test(questionStr) ? "internet" :
       /ring/i.test(questionStr) ? "ring" :
       /bus/i.test(questionStr) ? "bus" : "star");
    return { type: "network_diagram", topology, highlighted: "" };
  }

  // ── SORTING / SEARCHING ALGORITHMS ─────────────────────────────────────
  if (t.includes("sort") || t.includes("search") ||
      /bubble sort|selection sort|insertion sort|merge sort|linear search|binary search|sorting|searching/i.test(questionStr)) {
    const algorithms = { "bubble": "bubble", "selection": "selection", "insertion": "insertion", "merge": "merge", "linear search": "linear", "binary search": "binary" };
    let algorithm = "bubble";
    for (const [key, val] of Object.entries(algorithms)) {
      if (q.includes(key)) { algorithm = val; break; }
    }
    // Extract numbers from question if available
    const numMatches = (questionStr || "").match(/\b\d{1,2}\b/g);
    const values = numMatches ? numMatches.slice(0, 10).map(Number).filter(n => n > 0 && n <= 99) : [7, 3, 9, 1, 5, 8, 2, 6];
    return { type: "sorting", values: values.length >= 3 ? values : [7, 3, 9, 1, 5, 8, 2, 6], algorithm, highlightIdx: [] };
  }

  // ── DATABASES ──────────────────────────────────────────────────────────
  if (t.includes("database") || t.includes("sql") || t.includes("table") ||
      /database|table|field|record|primary key|SQL|query|SELECT|FROM|WHERE/i.test(questionStr)) {
    const tableMatch = (questionStr || "").match(/(?:table|database)\s+(?:called\s+)?["']?(\w+)["']?/i);
    return { type: "database_table", tableName: tableMatch?.[1] || "Students", fields: [], records: [] };
  }

  // ── WEB DEVELOPMENT / HTML / CSS ───────────────────────────────────────
  if (t.includes("html") || t.includes("css") || t.includes("web_dev") ||
      /\bHTML\b|\bCSS\b|web page|webpage|tag|element|<\w+>/i.test(questionStr)) {
    const tagMatch = (questionStr || "").match(/<(\w+)>/);
    return { type: "html_structure", tag: tagMatch?.[1] || "body", children: [] };
  }

  // ── PROGRAMMING (general) — pseudocode ─────────────────────────────────
  if (t.includes("program") || t.includes("python") || t.includes("coding") || t.includes("debug") ||
      /program|code|pseudocode|python|scratch|debug|output|print|input/i.test(questionStr)) {
    return { type: "code_block", concept: "sequence", lines: [] };
  }

  // ── CYBER SECURITY ─────────────────────────────────────────────────────
  if (t.includes("cyber") || t.includes("security") || t.includes("safety") ||
      /cyber|phishing|malware|virus|password|firewall|encryption|hacker/i.test(questionStr)) {
    // Use a flowchart to show security processes
    return {
      type: "flowchart",
      steps: [
        { type: "terminal", text: "Start" },
        { type: "decision", text: "Trusted source?" },
        { type: "process", text: "Check URL" },
        { type: "decision", text: "Secure (HTTPS)?" },
        { type: "terminal", text: "Safe to proceed" },
      ],
      title: "Cyber Security Check",
    };
  }

  // ── DATA REPRESENTATION (fallback for e.g. data_collecting_presenting) ─
  if (t.includes("data") || /data|chart|graph|represent/i.test(questionStr)) {
    return { type: "database_table", tableName: "Survey Data", fields: [], records: [] };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Humanities / vocational subject parser
// ═══════════════════════════════════════════════════════════════════════════════
function parseHumanities(subjectKey, topicStr, qLower) {
  const t = topicStr + " " + qLower;

  if (subjectKey === "civic") {
    if (/values|honesty|integrity|discipline|cooperation/i.test(t)) return { type: "civic_education", topic: "values" };
    if (/citizen|duty|obligations|national pledge/i.test(t)) return { type: "civic_education", topic: "citizenship" };
    return { type: "civic_education", topic: "rights" };
  }

  if (subjectKey === "government") {
    if (/legislature|executive|judiciary|arm|separation.*power/i.test(t)) return { type: "government", system: "three_arms" };
    if (/federal|state|local.*government|tier/i.test(t)) return { type: "government", system: "tiers" };
    if (/democracy|election|vote|rule.*law|democratic/i.test(t)) return { type: "government", system: "democracy" };
    return { type: "government", system: "three_arms" };
  }

  if (subjectKey === "religion") {
    if (/islam|muslim|quran|mosque|muhammad|pillar/i.test(t)) return { type: "religious_studies", religion: "islam" };
    if (/christ|bible|jesus|church|commandment|testament/i.test(t)) return { type: "religious_studies", religion: "christianity" };
    return { type: "religious_studies", religion: "overview" };
  }

  if (subjectKey === "design_tech") {
    if (/material|wood|metal|plastic|textile|ceramic|propert/i.test(t)) return { type: "design_tech", process: "materials" };
    if (/food|hygiene|nutrition|safety|cook/i.test(t)) return { type: "design_tech", process: "food_safety" };
    return { type: "design_tech", process: "design_cycle" };
  }

  if (subjectKey === "agriculture") {
    if (/crop.*rotation|rotate|fallow|intercrop/i.test(t)) return { type: "agriculture", topic: "crop_rotation" };
    if (/tool|cutlass|hoe|plough|tractor|harvester|implement/i.test(t)) return { type: "agriculture", topic: "farm_tools" };
    return { type: "agriculture", topic: "soil_types" };
  }

  if (subjectKey === "cultural_arts") {
    return { type: "topic_card", subject: "Creative Arts", topic: "Artistic Expression", color: "#f472b6" };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Layout hint map — tells quiz shells whether the visual needs width ('wide')
// or height ('tall').  'wide' → visual stacks on top of question.
//                     'tall' → visual sits beside the question (lg:flex-row).
// ═══════════════════════════════════════════════════════════════════════════════
const VISUAL_LAYOUT_MAP = {
  // ── Wide visuals (need horizontal space) → top/bottom stacked ───────────
  number_line:      'wide',
  bar_chart:        'wide',
  venn:             'wide',
  coordinate:       'wide',
  interactive_plot: 'wide',
  area_perimeter:   'wide',
  place_value:      'wide',
  array:            'wide',
  money:            'wide',
  table:            'wide',
  sequence:         'wide',
  pictogram:        'wide',
  tally_chart:      'wide',
  number_bond:      'wide',
  addition:         'wide',
  subtraction:      'wide',
  multiplication:   'wide',
  division:         'wide',
  division_equation:'wide',
  counting:         'wide',
  // ── Tall visuals (need vertical space) → left/right side-by-side ─────────
  right_triangle:   'tall',
  angle:            'tall',
  circle:           'tall',
  fraction_bar:     'tall',
  probability:      'tall',
  symmetry:         'tall',
  clock:            'tall',
  triangle:         'tall',
  shape:            'tall',
  geometry:         'tall',
  '3d_shape':       'tall',
  quadrilateral:    'tall',
  polygon:          'tall',
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — resolveVisual
// ═══════════════════════════════════════════════════════════════════════════════
function _resolveVisualInner(question, subject, yearLevel) {
  if (!question) return null;
  const subj = (subject || "").toLowerCase();
  const year = parseInt(yearLevel ?? question?.year_level ?? 99, 10);

  const isMaths    = subj.includes("math");
  const isScience  = subj.includes("science") || subj.includes("physics") || subj.includes("biology") || subj.includes("chemistry");
  const isNVR      = subj.includes("verbal") || subj.includes("nvr");
  const isEnglish  = subj.includes("english");
  const isCommerce   = /\baccount(?:ing|ancy)?\b/.test(subj) || subj.includes("commerce") || subj.includes("business") || subj.includes("econ");
  const isGeography  = subj.includes("geograph") || subj.includes("hass") || subj.includes("social_stud");
  const isHistory    = subj.includes("histor") || subj.includes("canadian_hist");
  const isComputing  = /\bcomput(?:er|ing|er_science)\b/.test(subj) || /\bdigital_(?:literacy|technology)\b/.test(subj) || subj === "ict";
  const isCivic      = subj.includes("civic") || subj.includes("citizenship");
  const isGovernment = subj.includes("government") || subj.includes("politic");
  const isReligion   = subj.includes("religi") || subj === "re" || subj === "religious_studies" || subj === "religious_education";
  const isDesignTech = (subj.includes("design") && subj.includes("tech")) || subj.includes("d&t") || subj.includes("pre_vocational");
  const isAgriculture = subj.includes("agric");
  const isCulturalArts = subj.includes("cultural") || subj.includes("creative_art") || subj.includes("art") || subj.includes("music");
  const isFurtherMaths = subj.includes("further_math");
  // Allow all subjects through — humanities get contextual visuals below
  const isKnown = isMaths || isScience || isNVR || isEnglish || isCommerce || isGeography ||
    isHistory || isComputing || isCivic || isGovernment || isReligion || isDesignTech ||
    isAgriculture || isCulturalArts || isFurtherMaths;
  if (!isKnown) return null;

  // ── Kenney sprite visuals (highest priority for matching questions) ──
  const kenneyVis = resolveKenneyVisual(question, subject, yearLevel);
  if (kenneyVis) return { type: "kenney_sprite", ...kenneyVis };

  let enrichedSubject = subject || "";
  if (subj === "science" || subj.includes("science")) {
    const q2 = (question.q || question.question_text || "").toLowerCase();
    const t2 = (question.topic || "").toLowerCase();
    if (/\bcell\b|mitochondria|photosynthesis|\borgan(?:s|ism|elle)?\b|\bplant\b|\banimal\b|\bdna\b|\bgene(?:tic|s)?\b|\binherit|chloroplast|vacuole|nucleus|ribosome|membrane/i.test(q2 + t2))
      enrichedSubject = "biology";
    else if (/\bforce\b|velocity|\bspeed\b|\bwave\b|circuit|\benergy\b|\belectric|magnet|\blight\b.*(?:shadow|reflect|refract|optic)|\bsound\b|pressure|gravity|\bmotion\b|newton/i.test(q2 + t2))
      enrichedSubject = "physics";
    else if (/\batom|\belement\b|compound|\breaction\b|\bacid\b|\balkali|periodic|\bmolecule|\bph\b|\bbond\b|oxidat|precipitat|dissolv|\bsolut/i.test(q2 + t2))
      enrichedSubject = "chemistry";
  }

  const topicStr    = (question.topic || question._anchorTopic || "").toLowerCase();
  const questionStr = question.q || question.question_text || "";
  const qLower      = questionStr.toLowerCase();
  const nums        = (questionStr.match(RX_NUM) || []).map(Number);

  const t4 = parseTier4(topicStr, questionStr, enrichedSubject, year);
  if (t4) return enrichWithObjectIcon(t4, questionStr);

  const t3 = parseTier3(topicStr, questionStr, enrichedSubject, year);
  if (t3) return enrichWithObjectIcon(t3, questionStr);

  if (isGeography || (isScience && /water cycle|rock cycle|soil|earth.*layer/i.test(questionStr + topicStr))) {
    const geo = parseGeography(topicStr, questionStr, year);
    if (geo) return geo;
  }
  if (isHistory) {
    const hist = parseHistory(topicStr, questionStr, year);
    if (hist) return hist;
  }
  if (isEnglish) {
    const engVis = parseEnglish(topicStr, questionStr, year, question);
    if (engVis) return engVis;
  }
  if (isNVR) {
    const nvrExt = parseNVRExt(topicStr, questionStr, year);
    if (nvrExt) return nvrExt;
  }
  if (isComputing) {
    const compVis = parseComputing(topicStr, questionStr, year);
    if (compVis) return compVis;
  }

  // ── Humanities & vocational subject routing ──────────────────────────────
  if (isCivic) return parseHumanities("civic", topicStr, qLower);
  if (isGovernment) return parseHumanities("government", topicStr, qLower);
  if (isReligion) return parseHumanities("religion", topicStr, qLower);
  if (isDesignTech) return parseHumanities("design_tech", topicStr, qLower);
  if (isAgriculture) return parseHumanities("agriculture", topicStr, qLower);
  if (isFurtherMaths) return null; // Uses main maths visuals via parseTier3/4
  if (isCulturalArts) return parseHumanities("cultural_arts", topicStr, qLower);

  // ── Cross-subject keyword fallback — try History keyword detection for any subject ──
  // Catches questions tagged under generic subjects that are actually about historical topics
  if (!isHistory) {
    const histFallback = parseHistory(topicStr, questionStr, year);
    if (histFallback) return histFallback;
  }

  // ── ExamStyle visuals — shared renderers from ExamRunner ──────────────────

  // Circle theorem (Maths KS3/KS4)
  if (isMaths && year >= 7 && (topicStr.includes("circle_theorem") || /circle theorem|tangent.*radius|angle.*centre|cyclic quadrilateral|alternate segment|angle in.*semicircle|inscribed angle|angle at.*circumference/i.test(qLower))) {
    let theorem = "tangent";
    if (/inscribed|angle.*centre|angle at the cent|angle.*circumference/i.test(qLower)) theorem = "inscribed";
    else if (/cyclic quadrilateral|opposite angles/i.test(qLower)) theorem = "cyclic_quadrilateral";
    else if (/alternate segment/i.test(qLower)) theorem = "alternate_segment";
    return { type: "circle_theorem", theorem };
  }

  // Number machine / function machine (Maths KS2-KS4)
  if (isMaths && (topicStr.includes("function_machine") || topicStr.includes("number_machine") || /function machine|number machine|input.*output.*rule|input.*operation/i.test(qLower))) {
    const opsMatch = [...questionStr.matchAll(/([+\-×x*÷/]\s*\d+)/g)];
    const ops = opsMatch.length ? opsMatch.map(m => m[1].trim()) : ["× 2", "+ 3"];
    const inputMatch = questionStr.match(/input[:\s]+(\d+|n|x)/i);
    const outputMatch = questionStr.match(/output[:\s]+(\d+|\?)/i);
    return { type: "number_machine", input: inputMatch?.[1] || "n", operations: ops.slice(0, 3), output: outputMatch?.[1] || "?" };
  }

  // Reaction profile / energy profile (Chemistry KS3/KS4)
  if ((isScience || enrichedSubject === "chemistry") && year >= 7 && (topicStr.includes("reaction_profile") || topicStr.includes("energy_profile") || /reaction profile|energy profile|activation energy|exothermic.*endothermic|energy diagram|enthalpy/i.test(qLower))) {
    const isExo = /exothermic/i.test(qLower);
    const showCat = /catalyst/i.test(qLower);
    return { type: "reaction_profile", profileType: isExo ? "exothermic" : /endothermic/i.test(qLower) ? "endothermic" : "exothermic", showCatalyst: showCat };
  }

  // Periodic table outline (Chemistry KS3/KS4)
  if ((isScience || enrichedSubject === "chemistry") && year >= 7 && (topicStr.includes("periodic_table") || /periodic table|group [1-70]|period [1-7]|alkali metal|noble gas|halogen|transition metal/i.test(qLower)) && !/element.*symbol|atomic number.*of/i.test(qLower)) {
    const elemMatch = [...questionStr.matchAll(/\b(H|He|Li|Be|B|C|N|O|F|Ne|Na|Mg|Al|Si|P|S|Cl|Ar)\b/g)];
    const highlighted = elemMatch.map(m => m[1]);
    return { type: "periodic_table_outline", highlighted };
  }

  // Pedigree chart (Biology KS3/KS4)
  if ((isScience || enrichedSubject === "biology") && year >= 7 && (topicStr.includes("pedigree") || topicStr.includes("inheritance") || /pedigree|family tree.*inherit|autosomal|carrier.*recessive|genetic.*cross.*family|inherited.*disorder/i.test(qLower))) {
    let pattern = "autosomal_recessive";
    if (/dominant/i.test(qLower)) pattern = "autosomal_dominant";
    if (/sex.linked|x.linked/i.test(qLower)) pattern = "x_linked";
    return { type: "pedigree_chart", generations: 3, affectedPattern: pattern };
  }

  // Petri dish / microbiology (Biology KS3/KS4)
  if ((isScience || enrichedSubject === "biology") && year >= 7 && (topicStr.includes("petri") || topicStr.includes("microbiol") || /petri dish|agar|bacterial colony|zone of inhibition|antibiotic.*disc|aseptic technique/i.test(qLower))) {
    const showInhibition = /inhibition|antibiotic|clear zone|disc/i.test(qLower);
    return { type: "petri_dish", showInhibition, colonies: 8 };
  }

  // Microscope diagram (Biology KS2-KS4)
  if ((isScience || enrichedSubject === "biology") && (topicStr.includes("microscop") || /microscope|eyepiece|objective lens|magnification.*lens|stage.*clip|coarse focus|fine focus/i.test(qLower))) {
    const hideLabels = /label|identify|name.*part/i.test(qLower);
    return { type: "microscope_diagram", hideLabels };
  }

  // Coordinate grid for transformations (Maths KS3/KS4)
  if (isMaths && year >= 7 && (topicStr.includes("transformation") || topicStr.includes("translation") || topicStr.includes("reflection") || topicStr.includes("rotation") || topicStr.includes("enlargement") || /translat|reflect.*line|rotat.*centre|enlarg.*scale.*factor|transform.*shape/i.test(qLower))) {
    const coordPairs = [...questionStr.matchAll(/\((-?\d+),\s*(-?\d+)\)/g)];
    const points = coordPairs.slice(0, 6).map(m => ({ x: parseInt(m[1]), y: parseInt(m[2]) }));
    return { type: "coordinate_grid", xRange: [-6, 6], yRange: [-6, 6], points, showGrid: true };
  }

  // Pie chart
  if (subj.includes("math") && (topicStr.includes("pie_chart") || topicStr.includes("pie") || /pie chart|pie graph|sector|slice/i.test(qLower))) {
    const labelValuePairs = [...questionStr.matchAll(/([A-Za-z][A-Za-z ]{0,12}):\s*(\d+)/g)];
    if (labelValuePairs.length >= 2) {
      return { type: "pie_chart", slices: labelValuePairs.slice(0, 6).map(m => ({ label: m[1].trim(), value: parseInt(m[2]) })) };
    }
    if (nums.length >= 2) {
      return { type: "pie_chart", slices: nums.slice(0, 4).map((n, i) => ({ label: `Part ${i + 1}`, value: n })) };
    }
  }

  // Pictogram
  if (subj.includes("math") && (topicStr.includes("pictogram") || /pictogram|picture graph|key.*represents/i.test(qLower))) {
    const pairs = [...questionStr.matchAll(/([A-Za-z][A-Za-z ]{0,12}):\s*(\d+)/g)];
    if (pairs.length >= 2) {
      const items = pairs.slice(0, 5).map(m => ({ label: m[1].trim(), count: parseInt(m[2]) }));
      const keyMatch = questionStr.match(/(?:key|represents?|stands? for|&=)\s*(\d+)/i);
      return { type: "pictogram", items, keyValue: keyMatch ? parseInt(keyMatch[1]) : 2 };
    }
  }

  // Line graph
  if (subj.includes("math") && (topicStr.includes("line_graph") || /line graph|plot.*points.*graph|trend.*graph/i.test(qLower))) {
    const pairs = [...questionStr.matchAll(/([A-Za-z][A-Za-z ]{0,10}):\s*(\d+)/g)];
    if (pairs.length >= 2) {
      return {
        type: "line_graph",
        points: pairs.slice(0, 8).map(m => ({ x: m[1].trim(), y: parseInt(m[2]) })),
        xLabel: "", yLabel: "", title: "",
      };
    }
  }

  // Thermometer / negative numbers
  if (subj.includes("math") && (topicStr.includes("temperature") || topicStr.includes("thermometer") ||
      /thermometer|degrees celsius|°C|temperature.*negative|below zero|below freezing/i.test(qLower))) {
    const tempMatch = questionStr.match(/(-?\d+)\s*(?:°C|degrees)/i);
    const value = tempMatch ? parseInt(tempMatch[1]) : 0;
    return { type: "thermometer", value, min: Math.min(value - 10, -10), max: Math.max(value + 10, 30) };
  }

  // Conversion ladder
  if (subj.includes("math") && (topicStr.includes("conversion") || topicStr.includes("convert") ||
      /convert|mm to cm|cm to m|m to km|g to kg|ml to l|kg to g|km to m|l to ml/i.test(qLower))) {
    if (/mm|cm|m|km/i.test(qLower) && /convert|change|how many/i.test(qLower)) {
      return { type: "conversion_ladder", units: ["km", "m", "cm", "mm"], factors: ["×1000", "×100", "×10"],
        highlighted: ["mm","cm","m","km"].find(u => qLower.includes(u)) || "" };
    }
    if (/\bg\b|\bkg\b/i.test(qLower)) {
      return { type: "conversion_ladder", units: ["kg", "g"], factors: ["×1000"],
        highlighted: ["kg","g"].find(u => qLower.includes(u)) || "" };
    }
    if (/\bml\b|\bl\b/i.test(qLower)) {
      return { type: "conversion_ladder", units: ["l", "ml"], factors: ["×1000"],
        highlighted: ["l","ml"].find(u => qLower.includes(u)) || "" };
    }
  }

  // Carroll diagram
  if (subj.includes("math") && (topicStr.includes("carroll") || /carroll diagram/i.test(qLower))) {
    const c1Match = questionStr.match(/(?:is |are )?(\w+)\s*(?:and|\/)\s*(?:is |are )?(\w+)/i);
    return {
      type: "carroll_diagram",
      criteria1: c1Match?.[1] || "Even",
      criteria2: c1Match?.[2] || "> 10",
      items: [],
    };
  }

  // Symmetry
  if (subj.includes("math") && (topicStr.includes("symmetr") || /line.*symmetry|lines? of symmetry|symmetrical/i.test(qLower))) {
    const SHAPES = ["square","rectangle","triangle","circle","pentagon","hexagon","octagon","kite","parallelogram"];
    const shape = SHAPES.find(s => qLower.includes(s)) || "square";
    return { type: "symmetry", shape };
  }

  // Probability — smart parsing of balls/marbles/counters/cards patterns
  if (subj.includes("math") && (topicStr.includes("probabil") || /chance|likely|unlikely|certain|impossible|spinner|dice|coin/i.test(qLower))) {
    const context = /dice|die/i.test(qLower) ? "dice" : /coin/i.test(qLower) ? "coin" : /card/i.test(qLower) ? "cards" : "spinner";

    // ── Pattern 1: "X red and Y blue [and Z green...]" — bag of items
    // Matches "3 red balls and 2 blue balls", "5 red, 4 blue and 1 green marble"
    const itemPattern = /(\d+)\s+(red|blue|green|yellow|white|black|pink|orange|purple|striped|spotted)/gi;
    const itemMatches = [...(questionStr || "").matchAll(itemPattern)];

    let total = 0, favourable = 0;
    let hideAnswer = false; // suppress probability display to avoid revealing answer

    if (itemMatches.length >= 2) {
      // Build colour → count map
      const colourCounts = {};
      for (const m of itemMatches) {
        const count = parseInt(m[1]);
        const colour = m[2].toLowerCase();
        colourCounts[colour] = (colourCounts[colour] || 0) + count;
      }
      total = Object.values(colourCounts).reduce((s, c) => s + c, 0);

      // Detect which colour is being asked about — "probability of picking a red"
      const askMatch = (questionStr || "").match(/(?:probability|chance|picking|drawing|selecting|getting|chosen?)\s+(?:a\s+)?(\w+)/i);
      const askedColour = askMatch ? askMatch[1].toLowerCase() : null;
      if (askedColour && colourCounts[askedColour]) {
        favourable = colourCounts[askedColour];
      } else {
        // Can't determine which colour is asked — show total items but hide answer
        favourable = Object.values(colourCounts)[0] || 1;
      }
      hideAnswer = true; // always hide for bag-of-items questions to avoid revealing answer
    } else if (/dice|die/i.test(qLower)) {
      // ── Pattern 2: Dice — "probability of rolling a 5"
      total = 6;
      const rollMatch = (questionStr || "").match(/(?:rolling|getting|landing)\s+(?:a\s+)?(\d)/i);
      favourable = rollMatch ? 1 : 1; // single face
      hideAnswer = true;
    } else if (/coin/i.test(qLower)) {
      // ── Pattern 3: Coin
      total = 2;
      favourable = 1;
      hideAnswer = true;
    } else if (/out of\s+(\d+)/i.test(qLower)) {
      // ── Pattern 4: "X out of Y" style
      const ooMatch = qLower.match(/(\d+)\s*out of\s*(\d+)/i);
      if (ooMatch) { favourable = parseInt(ooMatch[1]); total = parseInt(ooMatch[2]); }
      hideAnswer = true;
    } else {
      // ── Fallback: use first two distinct numbers from question
      total = nums.find(n => n > 1 && n <= 52) || 6;
      const allRelevant = nums.filter(n => n >= 1 && n <= total);
      favourable = allRelevant.length >= 2 ? allRelevant[1] : 1;
      hideAnswer = true;
    }

    // Clamp values
    if (total < 2) total = 6;
    if (favourable < 1) favourable = 1;
    if (favourable > total) favourable = total;

    return { type: "probability", total, favourable, context, hideAnswer };
  }

  // Percentage bar
  if (subj.includes("math") && (topicStr.includes("percent") || /%/.test(questionStr))) {
    const pct = nums.find(n => n > 0 && n <= 100);
    if (pct) return { type: "percentage_bar", value: pct };
  }

  // Tally chart
  if (subj.includes("math") && /tally|tallies/i.test(qLower)) {
    const pairs = [...questionStr.matchAll(/([A-Za-z][A-Za-z ]{0,12}):\s*(\d+)/g)];
    if (pairs.length >= 2) {
      return { type: "tally_chart", items: pairs.slice(0, 6).map(m => ({ label: m[1].trim(), count: parseInt(m[2]) })) };
    }
  }

  // Extended parser — handles number line, bar chart, coordinates, angles, data tables, etc.
  const ext = parseVisualExtended(topicStr, questionStr, enrichedSubject, year, question);
  if (ext) return enrichWithObjectIcon(ext, questionStr);

  return null;
}

// Post-process: enrich maths visual types with contextual object icons from question text
function enrichWithObjectIcon(visual, questionStr) {
  if (!visual) return visual;
  const ICON_TYPES = ["addition", "subtraction", "counting", "multiplication", "division", "division_equation", "number_bond"];
  if (ICON_TYPES.includes(visual.type) && !visual.objectIcon) {
    const icon = extractObjectFromQuestion(questionStr);
    if (icon) visual.objectIcon = icon;
  }
  return visual;
}

// Public resolveVisual — wraps inner resolver and annotates result with layout hint.
// layout: 'wide'  → visual stacks ABOVE the question (number lines, charts, sequences)
// layout: 'tall'  → visual sits BESIDE the question (circles, triangles, geometry)
export function resolveVisual(question, subject, yearLevel) {
  const result = _resolveVisualInner(question, subject, yearLevel);
  if (!result) return null;
  const layout = VISUAL_LAYOUT_MAP[result.type] ?? 'wide';
  return { ...result, layout };
}

export function canVisualise(question, subject, yearLevel) {
  return resolveVisual(question, subject, yearLevel) !== null;
}

export default function MathsVisualiser({ question, subject, yearLevel }) {
  const visual = useMemo(
    () => resolveVisual(question, subject, yearLevel),
    [question, subject, yearLevel]
  );

  if (!visual) return null;

  const ariaLabel = (() => {
    switch (visual.type) {
      case "addition":         return `Addition visual: ${visual.a} plus ${visual.b}`;
      case "subtraction":      return `Subtraction visual: ${visual.from} minus ${visual.remove}`;
      case "multiplication":   return `Multiplication grid: ${visual.rows} rows of ${visual.cols}`;
      case "division":         return `Division visual: ${visual.total} shared into groups of ${visual.groups}`;
      case "division_equation": return `Division: ${visual.total} ÷ ${visual.groups} = ?`;
      case "fraction":         return `Fraction diagram: ${visual.numerator} out of ${visual.denominator}`;
      case "number_bond":      return `Number bond: ${visual.whole} splits into ${visual.partA} and ${visual.partB}`;
      case "place_value":      return `Place value: ${visual.tens} tens and ${visual.ones} ones`;
      case "counting":         return `Counting visual: ${visual.count} objects`;
      case "object_groups":    return `${visual.groups?.map(g => `${g.count} ${g.color} ${g.object}s`).join(" and ")}${visual.operation === "add" ? " — how many altogether?" : ""}`;
      case "clock":            return `Clock showing ${visual.hours}:${String(visual.minutes||0).padStart(2,'0')}`;
      case "money":            return `Money visual: ${visual.total}p in coins`;
      case "ruler":            return `Ruler measuring ${visual.cm} centimetres`;
      case "ratio":            return `Ratio diagram: ${visual.partA} to ${visual.partB}`;
      case "area":             return `${visual.mode === "perimeter" ? "Perimeter" : "Area"} diagram: ${visual.width} by ${visual.height} rectangle`;
      case "angle":            return `Angle diagram showing ${visual.degrees} degrees`;
      case "comparison":       return `Comparison bar: ${visual.a} compared to ${visual.b}`;
      case "number_line":      return `Number line from ${visual.start} to ${visual.end}`;
      case "coordinate":       return `Coordinate grid showing point (${visual.x}, ${visual.y})`;
      case "venn":             return `Venn diagram: ${visual.labelA || "Set A"} and ${visual.labelB || "Set B"}`;
      case "bar_chart":        return `Bar chart with ${(visual.labels||[]).length} values`;
      case "probability":      return `Probability visual`;
      case "number_sequence":  return `Number sequence: ${(visual.sequence||[]).join(", ")}`;
      case "fraction_decimal_percent": return `Fraction, decimal and percentage equivalence diagram`;
      case "atom":             return `Atom diagram for ${visual.element || "element"}`;
      case "molecule":         return `Molecule diagram: ${visual.formula}`;
      case "ph_scale":         return `pH scale showing value ${visual.value}`;
      case "cell":             return `${visual.cellType || "Cell"} diagram`;
      case "state_changes":    return `States of matter diagram`;
      case "coordinate_graph": return `Coordinate graph with ${(visual.equations||[]).length} equations`;
      case "data_table":       return `Data table with ${(visual.rows||[]).length} rows`;
      case "long_multiplication": return `Long multiplication: ${visual.num1} × ${visual.num2}`;
      case "interactive_plot": return `Interactive coordinate grid for plotting points`;
      case "forces":           return `Forces diagram: ${visual.label1} and ${visual.label2}`;
      case "wave":             return `Wave diagram: ${visual.type} wave`;
      case "food_chain":       return `Food chain: ${(visual.chain||[]).join(" → ")}`;
      case "formula_triangle": return `Formula triangle: ${visual.title || ""}`;
      case "nvr":              return `Non-verbal reasoning pattern sequence`;
      case "nvr_reflection":   return `Mirror reflection visual`;
      case "nvr_shape_reflection": return `Shape reflection: ${visual.shape} reflected ${visual.horizontal ? "horizontally" : "vertically"}`;
      case "nvr_net":          return `3D net of a ${visual.shape3d}`;
      case "nvr_rotation":     return `Rotation ${visual.degrees} degrees ${visual.clockwise?"clockwise":"anti-clockwise"}`;
      case "nvr_oddoneout":    return `Odd one out visual`;
      case "nvr_matrix":       return `Non-verbal reasoning matrix`;
      case "nvr_paper_fold":   return `Paper fold puzzle: ${visual.foldType} fold`;
      case "alphabet_strip":   return `Alphabet strip`;
      case "analogy":          return `Word analogy: ${visual.wordA} is to ${visual.wordB}`;
      case "grammar":          return `Grammar labelling diagram`;
      case "synonym_ladder":   return `Synonym word ladder`;
      case "word_builder":     return `Word parts: prefix, root, suffix`;
      case "compass":         return `Compass showing ${visual.label || visual.bearing + "°"}`;
      case "map_grid":        return `Map grid${visual.gridRef ? ` — find ${visual.gridRef}` : ""}`;
      case "climate_graph":   return `Climate graph${visual.location ? ` for ${visual.location}` : ""}`;
      case "layer_diagram":   return `${visual.context} layers diagram`;
      case "water_cycle":     return `Water cycle diagram`;
      case "timeline":        return `Timeline with ${visual.events?.length || 0} events`;
      case "source_analysis": return `Historical ${visual.sourceType} source: ${visual.origin}`;
      case "map_region":      return `Map showing ${visual.region}${visual.highlighted ? ` — ${visual.highlighted}` : ""}`;
      case "human_body":          return `${visual.system} diagram${visual.highlighted ? ` — ${visual.highlighted}` : ""}`;
      case "solar_system":        return `Solar system${visual.highlighted ? ` — ${visual.highlighted}` : ""}`;
      case "classification_key":  return `Classification key${visual.highlighted ? ` — ${visual.highlighted}` : ""}`;
      case "light_diagram":       return `Light ${visual.scenario} diagram`;
      case "electrical_symbols":  return `Electrical circuit symbols`;
      case "magnet":              return `Magnet diagram: ${visual.scenario}`;
      case "photosynthesis":      return `Photosynthesis diagram`;
      case "respiration":         return `${visual.respType} respiration diagram`;
      case "circle_theorem":     return `Circle theorem: ${visual.theorem?.replace(/_/g, " ") || "tangent"}`;
      case "number_machine":     return `Number machine: input ${visual.input} → ${(visual.operations || []).join(" → ")} → output ${visual.output}`;
      case "reaction_profile":   return `${visual.profileType || "Exothermic"} reaction energy profile${visual.showCatalyst ? " with catalyst" : ""}`;
      case "periodic_table_outline": return `Periodic table${visual.highlighted?.length ? ` highlighting ${visual.highlighted.join(", ")}` : ""}`;
      case "pedigree_chart":     return `Pedigree chart: ${visual.affectedPattern?.replace(/_/g, " ") || "inheritance pattern"}`;
      case "petri_dish":         return `Petri dish${visual.showInhibition ? " with zone of inhibition" : " with bacterial colonies"}`;
      case "microscope_diagram": return `Microscope diagram${visual.hideLabels ? " — label the parts" : ""}`;
      case "coordinate_grid":    return `Coordinate grid for transformations${visual.points?.length ? ` with ${visual.points.length} points` : ""}`;
      // scene_3d shelved
      case "kenney_sprite":      return visual.ariaLabel || "Sprite visual";
      case "basic_concept":        return visual.label || "Science concept";
      case "pie_chart":           return `Pie chart with ${visual.slices?.length || 0} slices`;
      case "pictogram":           return `Pictogram with ${visual.items?.length || 0} items`;
      case "line_graph":          return `Line graph`;
      case "thermometer":         return `Thermometer showing ${visual.value}°C`;
      case "conversion_ladder":   return `Unit conversion: ${visual.units?.join(" → ")}`;
      case "carroll_diagram":     return `Carroll diagram: ${visual.criteria1} and ${visual.criteria2}`;
      case "sentence_structure": return `Sentence structure with ${visual.parts?.length || 0} clauses`;
      case "spelling_pattern":   return `Spelling pattern hint: ${visual.pattern ? visual.pattern.replace(/_/g, " ") : "look carefully"}`;
      case "punctuation":        return `Punctuation in: ${visual.sentence?.substring(0, 30)}`;
      case "word_class":         return `Word classes: ${visual.words?.map(w => w.word).join(" ")}`;
      case "nvr_shape_rotation": return `${visual.shape} rotated ${visual.degrees}° ${visual.clockwise ? "clockwise" : "anticlockwise"}`;
      case "nvr_code":           return `Code cipher: ${visual.encoded}`;
      case "nvr_plan_elevation": return `Plan and elevation of ${visual.shape3d}`;
      case "flowchart":          return `Flowchart: ${visual.title || "Algorithm"}`;
      case "binary":             return `Binary representation of ${visual.value}`;
      case "boolean_logic":      return `${visual.gate} logic gate`;
      case "network_diagram":    return `${visual.topology} network topology`;
      case "code_block":         return `Code: ${visual.concept || "pseudocode"}`;
      case "sorting":            return `${visual.algorithm} sorting visualisation`;
      case "database_table":     return `Database table: ${visual.tableName}`;
      case "html_structure":     return `HTML structure: ${visual.tag} element`;
      case "right_triangle":     return `Right-angled triangle${visual.sides ? `: sides ${visual.sides.filter(Boolean).join(", ")}` : ""}`;
      case "circle_diagram":     return `Circle diagram${visual.radius ? ` with radius ${visual.radius}` : ""}${visual.mode ? ` — ${visual.mode}` : ""}`;
      case "parallel_lines":     return `Parallel lines cut by a transversal${visual.angleType ? ` — ${visual.angleType} angles` : ""}`;
      default:                 return "Maths visual aid";
    }
  })();

  const inner = (() => {
    switch (visual.type) {
      case "addition":        return <AdditionVis       {...visual} objectIcon={visual.objectIcon} />;
      case "subtraction":     return <SubtractionVis    {...visual} objectIcon={visual.objectIcon} />;
      case "place_value":     return <PlaceValueVis     {...visual} />;
      case "multiplication":  return <MultiplicationVis  {...visual} />;
      case "fraction":        return <FractionVis       {...visual} />;
      case "number_bond":     return <NumberBondVis     {...visual} />;
      case "counting":        return <CountingVis       {...visual} objectIcon={visual.objectIcon} />;
      case "object_groups":   return <ObjectGroupsVis   {...visual} />;
      case "nvr":             return <NVRVis            {...visual} />;
      case "nvr_reflection":  return <NVRReflectionVis  {...visual} />;
      case "nvr_shape_reflection": return <NVRShapeReflectionVis shape={visual.shape} horizontal={visual.horizontal} direction={visual.direction} />;
      case "nvr_net":         return <NVRNetVis          {...visual} />;
      case "nvr_rotation":    return <NVRRotationVis     {...visual} />;
      case "nvr_oddoneout":   return <NVROddOneOutVis />;
      case "shape_property":  return <NVRShapePropertyVis {...visual} />;
      case "forces":          return <ForcesVis         {...visual} />;
      case "velocity":        return <VelocityVis       {...visual} />;
      case "food_chain":      return <FoodChainVis      {...visual} />;
      case "coordinate":      return <CoordinateVis     {...visual} />;
      case "number_line":     return <NumberLineVis     {...visual} />;
      case "venn":            return <VennVis           {...visual} />;
      case "bar_chart":       return <BarChartVis       {...visual} />;
      case "angle":           return <AngleVis          {...visual} />;
      case "area":            return <AreaVis           {...visual} />;
      case "formula_triangle":return <FormulaTriangleVis {...visual} />;
      case "motion_graph":    return <MotionGraphVis    {...visual} />;
      case "circuit":         return <CircuitVis        type={visual.circuitType} />;
      case "quadratic":       return <QuadraticVis      {...visual} />;
      case "element":         return <ElementVis        {...visual} />;
      case "clock":           return <ClockVis          {...visual} />;
      case "money":           return <MoneyVis          {...visual} />;
      case "division":        return <DivisionVis       {...visual} />;
      case "division_equation":return <DivisionEquationVis total={visual.total} groups={visual.groups} />;
      case "ruler":           return <RulerVis          {...visual} />;
      case "ratio":           return <RatioVis          {...visual} />;
      case "alphabet_strip":  return <AlphabetStripVis  {...visual} />;
      case "analogy":         return <AnalogyVis        {...visual} />;
      case "number_sequence": return <NumberSequenceVis {...visual} />;
      case "nvr_matrix":      return <NVRMatrixVis      {...visual} />;
      case "nvr_paper_fold":  return <NVRPaperFoldVis  foldType={visual.foldType} punchPositions={visual.punchPositions} />;
      case "grammar":         return <GrammarVis        {...visual} />;
      case "coordinate_graph": return <InteractiveGraph mode="equations" equations={visual.equations} points={visual.points} />;
      case "data_table":       return <DataTable headers={visual.headers} rows={visual.rows} title={visual.title} highlightCol={visual.highlightCol} highlightRow={visual.highlightRow} />;
      case "long_multiplication": return <LongMultiplication num1={visual.num1} num2={visual.num2} />;
      case "interactive_plot": return <InteractiveGraph mode="plot" />;
      case "comparison":      return <ComparisonVis     a={visual.a} b={visual.b} />;
      case "synonym_ladder":  return <SynonymLadderVis  {...visual} />;
      case "word_builder":    return <WordBuilderVis    {...visual} />;
      case "atom":            return <AtomVis             {...visual} />;
      case "periodic_element":return <PeriodicTableVis   {...visual} />;
      case "state_changes":   return <StateChangesVis    highlighted={visual.highlighted} />;
      case "molecule":        return <MoleculeVis         {...visual} />;
      case "ph_scale":        return <PHScaleVis          value={visual.value} substance={visual.substance} />;
      case "cell":            return <CellVis             cellType={visual.cellType} />;
      case "punnett":         return <PunnettVis          {...visual} />;
      case "wave":            return <WaveVis             type={visual.waveType} amplitude={visual.amplitude} label={visual.label} />;
      case "em_spectrum":     return <EMSpectrumVis       highlighted={visual.highlighted} />;
      case "free_body":       return <FreeBodyVis         forces={visual.forces} />;
      case "energy_stores":   return <EnergyStoresVis     stores={visual.stores} transfers={visual.transfers} />;
      case "t_account":       return <TAccountVis         {...visual} />;
      case "break_even":      return <BreakEvenVis        {...visual} />;
      case "supply_demand":   return <SupplyDemandVis     {...visual} />;
      case "profit_loss":     return <ProfitLossVis       {...visual} />;
      case "trade_flow":      return <TradeFlowVis        {...visual} />;
      case "org_structure":   return <OrgStructureVis     {...visual} />;
      case "marketing_mix":   return <MarketingMixVis     {...visual} />;

      // ── Humanities & vocational visuals ──────────────────────────────
      case "civic_education":    return <CivicEducationVis   {...visual} />;
      case "government":         return <GovernmentVis       {...visual} />;
      case "religious_studies":  return <ReligiousStudiesVis {...visual} />;
      case "design_tech":        return <DesignTechVis       {...visual} />;
      case "agriculture":        return <AgricultureVis      {...visual} />;
      case "economics":          return <EconomicsVis        {...visual} />;
      case "topic_card":         return <TopicCardVis        {...visual} />;
      case "compass":         return <CompassVis          {...visual} />;
      case "map_grid":        return <MapGridVis          {...visual} />;
      case "climate_graph":   return <ClimateGraphVis     {...visual} />;
      case "layer_diagram":   return <LayerDiagramVis     context={visual.context} highlighted={visual.highlighted} />;
      case "water_cycle":     return <WaterCycleVis       highlighted={visual.highlighted} />;
      case "timeline":        return <TimelineVis         events={visual.events} highlighted={visual.highlighted} />;
      case "source_analysis": return <SourceAnalysisVis   {...visual} />;
      case "map_region":      return <MapRegionVis        region={visual.region} highlighted={visual.highlighted} />;
      case "human_body":          return <HumanBodyVis system={visual.system} highlighted={visual.highlighted} />;
      case "solar_system":        return <SolarSystemVis highlighted={visual.highlighted} showOrbits={visual.showOrbits} />;
      case "classification_key":  return <ClassificationKeyVis highlighted={visual.highlighted} />;
      case "light_diagram":       return <LightDiagramVis scenario={visual.scenario} angle={visual.angle} />;
      case "electrical_symbols":  return <ElectricalSymbolsVis components={visual.components} highlighted={visual.highlighted} />;
      case "magnet":              return <MagnetVis scenario={visual.scenario} />;
      case "photosynthesis":      return <PhotosynthesisVis highlighted={visual.highlighted} />;
      case "respiration":         return <RespirationVis respType={visual.respType} />;
      case "kenney_sprite":        return <KenneyVisuals component={visual.component} {...visual} />;
      case "basic_concept":       return <BasicConceptVis concept={visual.concept} label={visual.label} emoji={visual.emoji} question={question} />;
      case "pie_chart":           return <PieChartVis slices={visual.slices} />;
      case "pictogram":           return <PictogramVis items={visual.items} keyValue={visual.keyValue} />;
      case "line_graph":          return <LineGraphVis points={visual.points} xLabel={visual.xLabel} yLabel={visual.yLabel} title={visual.title} />;
      case "thermometer":         return <ThermometerVis value={visual.value} min={visual.min} max={visual.max} />;
      case "conversion_ladder":   return <ConversionLadderVis units={visual.units} factors={visual.factors} highlighted={visual.highlighted} />;
      case "carroll_diagram":     return <CarrollDiagramVis criteria1={visual.criteria1} criteria2={visual.criteria2} items={visual.items} />;
      case "sentence_structure": return <SentenceStructureVis parts={visual.parts} />;
      case "spelling_pattern":   return <SpellingPatternVis word={visual.masked ? "" : visual.word} pattern={visual.pattern} highlighted={visual.highlighted} letterCount={visual.letterCount} masked={visual.masked} />;
      case "punctuation":        return <PunctuationVis sentence={visual.sentence} marks={visual.marks} missingPos={visual.missingPos} />;
      case "word_class":         return <WordClassVis words={visual.words} />;
      case "nvr_shape_rotation": return <NVRShapeRotationVis shape={visual.shape} degrees={visual.degrees} clockwise={visual.clockwise} />;
      case "nvr_code":           return <NVRCodeVis encoded={visual.encoded} decoded={visual.decoded} codeType={visual.codeType} />;
      case "nvr_plan_elevation": return <NVRPlanElevationVis shape3d={visual.shape3d} />;
      case "equation_solver":    return <EquationSolverVis steps={visual.steps} variable={visual.variable} />;
      case "probability_tree":   return <ProbabilityTreeVis branches={visual.branches} title={visual.title} />;
      case "graph_plotter":      return <GraphPlotterVis equation={visual.equation} points={visual.points} xRange={visual.xRange} yRange={visual.yRange} features={visual.features} />;
      case "animated_timeline":  return <AnimatedTimelineVis events={visual.events} title={visual.title} />;
      case "clock_face":         return <ClockFaceVis hours={visual.hours} minutes={visual.minutes} label={visual.label} />;
      case "tally_chart":        return <TallyChartVis items={visual.items} title={visual.title} />;
      case "percentage_bar":     return <PercentageBarVis value={visual.value} />;
      case "probability":        return <ProbabilityVis total={visual.total} favourable={visual.favourable} context={visual.context} hideAnswer={visual.hideAnswer} />;
      case "symmetry":           return <SymmetryVis shape={visual.shape} />;
      case "flowchart":          return <FlowchartVis steps={visual.steps} title={visual.title} />;
      case "binary":             return <BinaryVis value={visual.value} bits={visual.bits} />;
      case "boolean_logic":      return <BooleanLogicVis gate={visual.gate} inputA={visual.inputA} inputB={visual.inputB} />;
      case "network_diagram":    return <NetworkDiagramVis topology={visual.topology} highlighted={visual.highlighted} />;
      case "code_block":         return <CodeBlockVis lines={visual.lines} concept={visual.concept} />;
      case "sorting":            return <SortingVis values={visual.values} algorithm={visual.algorithm} highlightIdx={visual.highlightIdx} />;
      case "database_table":     return <DatabaseTableVis tableName={visual.tableName} fields={visual.fields} records={visual.records} />;
      case "html_structure":     return <HTMLStructureVis tag={visual.tag} children={visual.children} />;

      // ── ExamStyle shared visuals ────────────────────────────────────────
      case "circle_theorem":         return <CircleTheoremVis theorem={visual.theorem} />;
      case "number_machine":         return <NumberMachineVis input={visual.input} operations={visual.operations} output={visual.output} />;
      case "reaction_profile":       return <ReactionProfileVis type={visual.profileType} showCatalyst={visual.showCatalyst} />;
      case "periodic_table_outline": return <PeriodicTableOutlineVis highlighted={visual.highlighted} />;
      case "pedigree_chart":         return <PedigreeChartVis generations={visual.generations} affectedPattern={visual.affectedPattern} />;
      case "petri_dish":             return <PetriDishVis showInhibition={visual.showInhibition} colonies={visual.colonies} />;
      case "microscope_diagram":     return <MicroscopeDiagramVis hideLabels={visual.hideLabels} />;
      case "coordinate_grid":        return <CoordinateGridVis xRange={visual.xRange} yRange={visual.yRange} points={visual.points} showGrid={visual.showGrid} />;

      // ── KS3/KS4 geometry visual types ─────────────────────────────────
      case "right_triangle":     return <RightTriangleVis {...visual} />;
      case "circle_diagram":     return <CircleDiagramVis {...visual} />;
      case "parallel_lines":     return <ParallelLinesVis {...visual} />;

      // ── JSXGraph interactive visual types ──────────────────────────────
      case "jsxgraph":           return <JSXGraphBoard {...visual} ageBand={ageBand} />;
      case "jsxgraph_function":  return <JSXGraphBoard mode="function" functions={visual.functions || [{ expr: visual.equation || visual.expr }]} xRange={visual.xRange} yRange={visual.yRange} ageBand={ageBand} title={visual.title} readOnly={visual.readOnly} />;
      case "jsxgraph_quadratic": {
        const qp = createQuadraticGraphProps(visual.a ?? 1, visual.b ?? 0, visual.c ?? 0, { ageBand });
        return <JSXGraphBoard {...qp} title={visual.title} readOnly={visual.readOnly} />;
      }
      case "jsxgraph_trig": {
        const tp = createTrigGraphProps(visual.fnType || "sin", visual.amplitude ?? 1, visual.period ?? 1, { ageBand });
        return <JSXGraphBoard {...tp} title={visual.title} readOnly={visual.readOnly} />;
      }
      case "jsxgraph_geometry":  return <JSXGraphBoard mode="geometry" elements={visual.elements || []} xRange={visual.xRange} yRange={visual.yRange} ageBand={ageBand} title={visual.title} readOnly={visual.readOnly} />;
      case "jsxgraph_slider": {
        const sp = createSliderExplorerProps(visual.expr || visual.equation || "x^2", visual.sliders || [], { ageBand });
        return <JSXGraphBoard {...sp} title={visual.title} readOnly={visual.readOnly} />;
      }
      case "jsxgraph_simultaneous": {
        const fns = (visual.equations || []).map(eq => ({ expr: eq, label: eq }));
        return <JSXGraphBoard mode="function" functions={fns} xRange={visual.xRange || [-8, 8]} yRange={visual.yRange || [-8, 8]} ageBand={ageBand} title={visual.title || "Simultaneous Equations"} readOnly={visual.readOnly} />;
      }

      default:                return null;
    }
  })();

  if (!inner) return null;

  return (
    <div role="img" aria-label={ariaLabel}>
      <style>{`@keyframes lp-pulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>
      {inner}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KS3/KS4 GEOMETRY VISUALS — Right triangles, circles, parallel lines
// ═══════════════════════════════════════════════════════════════════════════════

function RightTriangleVis({ sides = [], unknownSide, angle, trigRatio, showFormula, label }) {
  const W = 240, H = 180, PAD = 36;
  // Triangle vertices: right angle at bottom-left — inset more for label room
  const Ax = PAD + 14, Ay = H - PAD - 6;      // bottom-left (right angle)
  const Bx = W - PAD - 8, By = H - PAD - 6;   // bottom-right
  const Cx = PAD + 14, Cy = PAD + 22;          // top-left

  const a = sides[0] || "a";   // opposite (vertical)
  const b = sides[1] || "b";   // adjacent (horizontal)
  const c = sides[2] || "c";   // hypotenuse

  const isUnknown = s => unknownSide && String(s).toLowerCase() === String(unknownSide).toLowerCase();

  // Hypotenuse midpoint — offset label perpendicular to the line so it never overlaps
  const hypMidX = (Bx + Cx) / 2;
  const hypMidY = (By + Cy) / 2;
  // Normal vector pointing outward (away from the right-angle vertex)
  const dx = Bx - Cx, dy = By - Cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len, ny = dx / len; // perpendicular
  const hypLabelX = hypMidX + nx * 14;
  const hypLabelY = hypMidY + ny * 14;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 300 }}>
      {/* Triangle fill */}
      <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="rgba(99,102,241,0.08)" stroke={T.indigo} strokeWidth={2} strokeLinejoin="round" />

      {/* Right-angle square — hidden when question asks to identify the triangle type */}
      {showFormula !== false && (
        <polyline points={`${Ax+12},${Ay} ${Ax+12},${Ay-12} ${Ax},${Ay-12}`} fill="none" stroke={T.indigo} strokeWidth={1.5} />
      )}

      {/* Side labels — positioned outside the triangle to avoid overlaps */}
      {/* Vertical (opposite) — left side, offset further left */}
      <text x={Ax - 16} y={(Ay + Cy) / 2 + 2} textAnchor="end" fontSize={11} fontWeight={isUnknown(a) ? "800" : "600"} fill={isUnknown(a) ? T.sun : T.indigo}>
        {isUnknown(a) ? "?" : a}
      </text>
      {/* Horizontal (adjacent) — bottom, below the line */}
      <text x={(Ax + Bx) / 2} y={Ay + 18} textAnchor="middle" fontSize={11} fontWeight={isUnknown(b) ? "800" : "600"} fill={isUnknown(b) ? T.sun : T.indigo}>
        {isUnknown(b) ? "?" : b}
      </text>
      {/* Hypotenuse — perpendicular offset from the diagonal line */}
      <text x={hypLabelX} y={hypLabelY} textAnchor="middle" fontSize={11} fontWeight={isUnknown(c) ? "800" : "600"} fill={isUnknown(c) ? T.sun : T.indigo}>
        {isUnknown(c) ? "?" : c}
      </text>

      {/* Angle arc if trigonometry — inside the bottom-right angle */}
      {angle && (
        <g>
          <path d={`M ${Bx - 26},${By} A 26,26 0 0,0 ${Bx - 18},${By - 18}`} fill="none" stroke={T.nebula} strokeWidth={1.5} />
          <text x={Bx - 40} y={By - 10} fontSize={10} fontWeight="700" fill={T.nebula}>
            {typeof angle === "number" ? `${angle}°` : "θ"}
          </text>
        </g>
      )}

      {/* Formula display — above the triangle, inside a subtle background */}
      {showFormula && (
        <g>
          <rect x={W / 2 - 52} y={2} width={104} height={16} rx={4} fill="rgba(99,102,241,0.08)" />
          <text x={W / 2} y={14} textAnchor="middle" fontSize={10} fontWeight="700" fill={T.textMid}>
            {trigRatio ? `${trigRatio}` : "a² + b² = c²"}
          </text>
        </g>
      )}

      {/* Label — below the triangle */}
      {label && (
        <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={9} fill={T.textMid} fontWeight="600">{label}</text>
      )}
    </svg>
  );
}

function CircleDiagramVis({ radius, mode, sectorAngle, label, theoremSubtype, knownAngles, arcAngles, chordLabels, intersectPoint }) {
  const W = 220, H = 220, CX = W / 2, CY = H / 2, R = 72;
  const displayR = radius || "r";
  const isSector = mode === "sector" && sectorAngle;
  const isTheorem = mode === "theorem";

  // Sector endpoint
  const angleRad = ((sectorAngle || 90) * Math.PI) / 180;
  const sx = CX + R * Math.cos(-angleRad);
  const sy = CY - R * Math.sin(-angleRad); // SVG y is inverted
  const largeArc = (sectorAngle || 90) > 180 ? 1 : 0;

  // Helper: point on circle at angle (degrees, 0 = right, clockwise in SVG)
  const ptOnCircle = (deg) => ({
    x: CX + R * Math.cos((deg * Math.PI) / 180),
    y: CY + R * Math.sin((deg * Math.PI) / 180),
  });

  // ── Intersecting chords visual ──
  const isIntersectingChords = theoremSubtype === "intersecting_chords";
  // Place 4 points on the circle for two chords
  const A = ptOnCircle(200);  // upper-left area
  const B = ptOnCircle(20);   // upper-right area
  const C = ptOnCircle(310);  // lower-right area
  const D = ptOnCircle(130);  // lower-left area
  // Intersection point of chords AB(A→B) and CD(C→D)
  const lineIntersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.001) return { x: CX, y: CY };
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  };
  const E = isIntersectingChords ? lineIntersect(A.x, A.y, B.x, B.y, D.x, D.y, C.x, C.y) : { x: CX, y: CY };
  const chordNames = chordLabels || ["AB", "CD"];
  const iPt = intersectPoint || "E";

  // Arc labels for intersecting chords
  const arc1 = (arcAngles && arcAngles[0]) || (knownAngles && knownAngles[0]);
  const arc2 = (arcAngles && arcAngles[1]) || (knownAngles && knownAngles[1]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 260 }}>
      {/* Main circle */}
      <circle cx={CX} cy={CY} r={R} fill="rgba(99,102,241,0.06)" stroke={T.indigo} strokeWidth={2} />

      {/* ── Non-theorem modes ── */}
      {!isTheorem && (
        <g>
          {/* Centre dot */}
          <circle cx={CX} cy={CY} r={3} fill={T.indigo} />
          {/* Radius line */}
          <line x1={CX} y1={CY} x2={CX + R} y2={CY} stroke={T.indigo} strokeWidth={1.5} strokeDasharray={mode === "circumference" ? "none" : "5,3"} />
          <text x={CX + R / 2} y={CY - 8} textAnchor="middle" fontSize={11} fontWeight="700" fill={T.indigo}>{displayR}</text>
        </g>
      )}

      {/* Circumference highlight */}
      {mode === "circumference" && (
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={T.nebula} strokeWidth={3} strokeDasharray="6,4" opacity={0.7} />
      )}

      {/* Area shading */}
      {mode === "area" && (
        <circle cx={CX} cy={CY} r={R} fill="rgba(168,85,247,0.12)" stroke="none" />
      )}

      {/* Sector */}
      {isSector && (
        <g>
          <path d={`M ${CX},${CY} L ${CX + R},${CY} A ${R},${R} 0 ${largeArc},0 ${sx},${sy} Z`} fill="rgba(251,191,36,0.2)" stroke={T.sun} strokeWidth={1.5} />
          <line x1={CX} y1={CY} x2={sx} y2={sy} stroke={T.indigo} strokeWidth={1.5} />
          <path d={`M ${CX + 20},${CY} A 20,20 0 ${largeArc},0 ${CX + 20 * Math.cos(-angleRad)},${CY - 20 * Math.sin(-angleRad)}`} fill="none" stroke={T.sun} strokeWidth={1.5} />
          <text x={CX + 28} y={CY - 6} fontSize={9} fontWeight="700" fill={T.sun}>{sectorAngle}°</text>
        </g>
      )}

      {/* ── Theorem: Intersecting Chords ── */}
      {isTheorem && isIntersectingChords && (
        <g>
          {/* Chord 1: A → B */}
          <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={T.indigo} strokeWidth={2} />
          {/* Chord 2: D → C */}
          <line x1={D.x} y1={D.y} x2={C.x} y2={C.y} stroke={T.nebula} strokeWidth={2} />

          {/* Points on circle */}
          {[A, B, C, D].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={i < 2 ? T.indigo : T.nebula} />
          ))}

          {/* Point labels */}
          <text x={A.x - 12} y={A.y + 4} textAnchor="middle" fontSize={11} fontWeight="800" fill={T.indigo}>{chordNames[0]?.[0] || "A"}</text>
          <text x={B.x + 12} y={B.y + 4} textAnchor="middle" fontSize={11} fontWeight="800" fill={T.indigo}>{chordNames[0]?.[1] || "B"}</text>
          <text x={C.x + 10} y={C.y + 12} textAnchor="middle" fontSize={11} fontWeight="800" fill={T.nebula}>{chordNames[1]?.[1] || "D"}</text>
          <text x={D.x - 10} y={D.y + 12} textAnchor="middle" fontSize={11} fontWeight="800" fill={T.nebula}>{chordNames[1]?.[0] || "C"}</text>

          {/* Intersection point */}
          <circle cx={E.x} cy={E.y} r={3.5} fill={T.sun} />
          <text x={E.x + 10} y={E.y - 6} fontSize={10} fontWeight="800" fill={T.sun}>{iPt}</text>

          {/* Arc angle labels — placed on arcs between points */}
          {arc1 && (
            <text x={CX} y={CY - R - 8} textAnchor="middle" fontSize={10} fontWeight="700" fill={T.sun}>
              {arc1}°
            </text>
          )}
          {arc2 && (
            <text x={CX} y={CY + R + 16} textAnchor="middle" fontSize={10} fontWeight="700" fill={T.sun}>
              {arc2}°
            </text>
          )}
        </g>
      )}

      {/* ── Theorem: Semicircle ── */}
      {isTheorem && theoremSubtype === "semicircle" && (
        <g>
          {/* Diameter */}
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke={T.indigo} strokeWidth={2} />
          {/* Point on circumference (top) */}
          <circle cx={CX} cy={CY - R} r={3.5} fill={T.sun} />
          <line x1={CX - R} y1={CY} x2={CX} y2={CY - R} stroke={T.nebula} strokeWidth={1.5} />
          <line x1={CX + R} y1={CY} x2={CX} y2={CY - R} stroke={T.nebula} strokeWidth={1.5} />
          {/* 90° square at top point */}
          <rect x={CX - 7} y={CY - R + 2} width={7} height={7} fill="none" stroke={T.sun} strokeWidth={1.2} />
          {/* Labels */}
          <text x={CX - R - 8} y={CY + 4} textAnchor="middle" fontSize={11} fontWeight="700" fill={T.indigo}>A</text>
          <text x={CX + R + 8} y={CY + 4} textAnchor="middle" fontSize={11} fontWeight="700" fill={T.indigo}>B</text>
          <text x={CX + 2} y={CY - R - 8} textAnchor="middle" fontSize={11} fontWeight="700" fill={T.sun}>C</text>
          <text x={CX} y={CY - R / 2 - 8} textAnchor="middle" fontSize={9} fontWeight="700" fill={T.sun}>90°</text>
        </g>
      )}

      {/* ── Theorem: Generic / Cyclic / Inscribed / Tangent / Alternate Segment ── */}
      {isTheorem && !isIntersectingChords && theoremSubtype !== "semicircle" && (
        <g>
          {/* Centre dot */}
          <circle cx={CX} cy={CY} r={3} fill={T.indigo} />
          <text x={CX + 8} y={CY - 6} fontSize={9} fontWeight="700" fill={T.textMid}>O</text>
          {/* Diameter line (dashed) */}
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke={T.nebula} strokeWidth={1.5} strokeDasharray="4,3" />
          {/* Known angles display */}
          {(knownAngles || []).map((deg, i) => (
            <text key={i} x={CX + (i === 0 ? -30 : 30)} y={CY + 30 + i * 14} textAnchor="middle" fontSize={10} fontWeight="700" fill={T.sun}>
              {deg}°
            </text>
          ))}
          {/* Tangent line if tangent theorem */}
          {theoremSubtype === "tangent" && (
            <g>
              <line x1={CX + R} y1={CY - 40} x2={CX + R} y2={CY + 40} stroke={T.sun} strokeWidth={1.5} />
              <line x1={CX} y1={CY} x2={CX + R} y2={CY} stroke={T.indigo} strokeWidth={1.5} />
              <rect x={CX + R - 8} y={CY - 8} width={8} height={8} fill="none" stroke={T.sun} strokeWidth={1.2} />
            </g>
          )}
        </g>
      )}

      {/* Formula / label */}
      <text x={CX} y={H - 6} textAnchor="middle" fontSize={9} fontWeight="600" fill={T.textMid}>
        {label || (mode === "area" ? `A = πr²` : mode === "circumference" ? `C = 2πr` : mode === "sector" ? `Sector` : "Circle")}
      </text>
    </svg>
  );
}

function ParallelLinesVis({ knownAngle, angleType, label }) {
  const W = 220, H = 160;
  const deg = knownAngle || 55;

  // Two horizontal parallel lines
  const L1y = 45, L2y = 115;
  const PAD = 15;

  // Transversal: crosses both lines at an angle
  const midX = W / 2;
  const dx = 60; // horizontal run for transversal
  const t1x = midX - dx, t1y = L1y - 25;
  const t2x = midX + dx, t2y = L2y + 25;

  // Intersection points
  const frac1 = (L1y - t1y) / (t2y - t1y);
  const ix1 = t1x + frac1 * (t2x - t1x);
  const frac2 = (L2y - t1y) / (t2y - t1y);
  const ix2 = t1x + frac2 * (t2x - t1x);

  // Angle arc helper
  const arcR = 18;
  const transAngle = Math.atan2(t2y - t1y, t2x - t1x); // angle of transversal
  const lineAngle = 0; // horizontal

  // Angle between transversal going "up-left" and line going "right"
  const startAng = -transAngle; // measured from +x axis
  const endAng = 0;
  const arcStartX = ix1 + arcR * Math.cos(lineAngle);
  const arcStartY = ix1 ? L1y - arcR * Math.sin(startAng) : L1y;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 280 }}>
      {/* Parallel line arrows */}
      <text x={PAD - 2} y={L1y - 6} fontSize={8} fill={T.textMid}>↔</text>
      <text x={PAD - 2} y={L2y - 6} fontSize={8} fill={T.textMid}>↔</text>

      {/* Parallel lines */}
      <line x1={PAD} y1={L1y} x2={W - PAD} y2={L1y} stroke={T.indigo} strokeWidth={2} />
      <line x1={PAD} y1={L2y} x2={W - PAD} y2={L2y} stroke={T.indigo} strokeWidth={2} />

      {/* Transversal */}
      <line x1={t1x} y1={t1y} x2={t2x} y2={t2y} stroke={T.nebula} strokeWidth={2} />

      {/* Known angle arc at top intersection */}
      <path d={`M ${ix1 + arcR},${L1y} A ${arcR},${arcR} 0 0,0 ${ix1 + arcR * Math.cos(-transAngle)},${L1y + arcR * Math.sin(-transAngle)}`} fill="rgba(251,191,36,0.15)" stroke={T.sun} strokeWidth={1.5} />
      <text x={ix1 + arcR + 6} y={L1y + 4} fontSize={10} fontWeight="700" fill={T.sun}>{deg}°</text>

      {/* Unknown angle at bottom intersection */}
      {angleType && (
        <g>
          {angleType === "alternate" && (
            <>
              <path d={`M ${ix2 - arcR},${L2y} A ${arcR},${arcR} 0 0,0 ${ix2 - arcR * Math.cos(-transAngle)},${L2y - arcR * Math.sin(-transAngle)}`} fill="rgba(99,102,241,0.12)" stroke={T.indigo} strokeWidth={1.5} />
              <text x={ix2 - arcR - 10} y={L2y - 2} fontSize={10} fontWeight="800" fill={T.indigo}>?</text>
            </>
          )}
          {angleType === "corresponding" && (
            <>
              <path d={`M ${ix2 + arcR},${L2y} A ${arcR},${arcR} 0 0,0 ${ix2 + arcR * Math.cos(-transAngle)},${L2y + arcR * Math.sin(-transAngle)}`} fill="rgba(99,102,241,0.12)" stroke={T.indigo} strokeWidth={1.5} />
              <text x={ix2 + arcR + 6} y={L2y + 4} fontSize={10} fontWeight="800" fill={T.indigo}>?</text>
            </>
          )}
          {angleType === "co-interior" && (
            <>
              <path d={`M ${ix2 + arcR},${L2y} A ${arcR},${arcR} 0 0,1 ${ix2 + arcR * Math.cos(transAngle)},${L2y - arcR * Math.sin(transAngle)}`} fill="rgba(99,102,241,0.12)" stroke={T.indigo} strokeWidth={1.5} />
              <text x={ix2 + arcR + 6} y={L2y - 4} fontSize={10} fontWeight="800" fill={T.indigo}>?</text>
            </>
          )}
          {!["alternate", "corresponding", "co-interior"].includes(angleType) && (
            <text x={ix2 + arcR + 6} y={L2y + 4} fontSize={10} fontWeight="800" fill={T.indigo}>?</text>
          )}
        </g>
      )}

      {/* Label */}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={9} fontWeight="600" fill={T.textMid}>
        {label || (angleType ? `${angleType.charAt(0).toUpperCase() + angleType.slice(1)} angles` : "Parallel lines & transversal")}
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 1 & 2 — NEW VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * NumberLineVis — Century Tech-style clean number line
 *
 * Props:
 *   min, max          — range endpoints
 *   missing           — the "?" position (arrow indicator pointing up from below axis)
 *   known             — array of highlighted positions (indigo dots)
 *   marked            — legacy: array or single number to highlight (falls back when no known/missing)
 *   label             — caption text
 *   start, steps, direction — for directed-jump variant
 *   jumps, jumpSize   — for repeated-jump variant
 *   fractionDenom     — for fraction number line
 */
function NumberLineVis({ min, max, missing, known, marked, label, start, steps, direction, jumps, jumpSize, fractionDenom }) {
  // Responsive viewBox: 320 wide, heights vary by variant
  const VW = 320;
  const AXIS_Y = 62;    // y-position of the axis — moved down to leave room for arcs above
  const PAD = 28;       // left/right padding
  const ARR = 12;       // arrowhead overhang
  const MAJOR_H = 11;   // tick half-height (was 6 — taller ticks for visibility)
  const AXIS_COL = "#1e293b";

  const range = (max - min) || 1;
  const toX = n => PAD + ((n - min) / range) * (VW - PAD * 2 - ARR);

  // ── Determine tick step for clean labels ────────────────────────────────────
  const calcStep = (lo, hi) => {
    const span = hi - lo;
    if (span === 0) return 1;
    const raw = span / 8;
    if (raw <= 1) return 1;
    if (raw <= 2) return 2;
    if (raw <= 5) return 5;
    if (raw <= 10) return 10;
    if (raw <= 20) return 20;
    if (raw <= 25) return 25;
    if (raw <= 50) return 50;
    return 100;
  };

  // ── Axis line with prominent double arrowheads ───────────────────────────────
  const axisLine = () => (
    <g>
      <line x1={PAD - 8} y1={AXIS_Y} x2={VW - ARR + 4} y2={AXIS_Y}
        stroke={AXIS_COL} strokeWidth={3} strokeLinecap="round"/>
      <polygon points={`${PAD - 15},${AXIS_Y} ${PAD - 5},${AXIS_Y - 5} ${PAD - 5},${AXIS_Y + 5}`} fill={AXIS_COL}/>
      <polygon points={`${VW - ARR + 10},${AXIS_Y} ${VW - ARR + 2},${AXIS_Y - 5} ${VW - ARR + 2},${AXIS_Y + 5}`} fill={AXIS_COL}/>
    </g>
  );

  // ── Pill-style label (indigo bg + white "?" text; light slate bg + dark text for known) ──
  const numLabel = (x, y, value, isMissing = false) => {
    const txt = isMissing ? "?" : String(value);
    const w = Math.max(24, txt.length * 8 + 12);
    const h = 20;
    return (
      <g>
        <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={5} ry={5}
          fill={isMissing ? T.indigo : "#f1f5f9"}
          stroke={isMissing ? T.indigo : "#cbd5e1"} strokeWidth={1}/>
        <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={11} fontWeight="700" fill={isMissing ? "#ffffff" : "#334155"}>
          {txt}
        </text>
      </g>
    );
  };

  // ── Pill label above an arc midpoint ("+N" jump label) ───────────────────────
  const arcPill = (mx, arcTop, txt, color, bgColor = "#ede9fe") => {
    const w = Math.max(28, txt.length * 7 + 14);
    const h = 18;
    const py = arcTop - h - 4;
    return (
      <g>
        <rect x={mx - w / 2} y={py} width={w} height={h} rx={5} ry={5}
          fill={bgColor} stroke={color} strokeWidth={1.5}/>
        <text x={mx} y={py + h / 2 + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={10} fontWeight="700" fill={color}>
          {txt}
        </text>
      </g>
    );
  };

  // ── Tick + label renderer — missing position gets dashed ring (no pill; STANDARD adds pill separately) ──
  const renderAxis = (step) => {
    const tickSet = new Set();
    tickSet.add(min);
    tickSet.add(max);
    const first = Math.ceil(min / step) * step;
    for (let v = first; v <= max; v += step) tickSet.add(v);

    return [...tickSet].sort((a, b) => a - b).map(v => {
      const tx = toX(v);
      const isMissing = missing != null && Math.abs(v - missing) < 0.0001;
      return (
        <g key={v}>
          <line x1={tx} y1={AXIS_Y - MAJOR_H} x2={tx} y2={AXIS_Y + MAJOR_H}
            stroke={isMissing ? "#94a3b8" : AXIS_COL}
            strokeWidth={isMissing ? 1.5 : 2}
            strokeDasharray={isMissing ? "3 2" : undefined}/>
          {isMissing
            ? (
              /* Dashed highlight ring centred on axis — draws attention to the gap */
              <circle cx={tx} cy={AXIS_Y} r={13}
                fill="#ede9fe" stroke={T.indigo} strokeWidth={1.5} strokeDasharray="3 2"/>
            )
            : numLabel(tx, AXIS_Y + MAJOR_H + 14, v)
          }
        </g>
      );
    });
  };

  // ── Tick renderer that skips tick+label at skipPos (JUMP/DIRECTION destination) ──
  const renderAxisCustom = (step, skipPos) => {
    const tickSet = new Set();
    tickSet.add(min);
    tickSet.add(max);
    const first = Math.ceil(min / step) * step;
    for (let v = first; v <= max; v += step) tickSet.add(v);

    return [...tickSet].sort((a, b) => a - b).map(v => {
      if (skipPos != null && Math.abs(v - skipPos) < 0.0001) return null;
      const tx = toX(v);
      return (
        <g key={v}>
          <line x1={tx} y1={AXIS_Y - MAJOR_H} x2={tx} y2={AXIS_Y + MAJOR_H}
            stroke={AXIS_COL} strokeWidth={2}/>
          {numLabel(tx, AXIS_Y + MAJOR_H + 14, v)}
        </g>
      );
    });
  };

  // ── FRACTION variant ─────────────────────────────────────────────────────────
  if (fractionDenom && fractionDenom > 0) {
    const den = fractionDenom;
    const VH = 108;
    const fracTicks = [];
    for (let i = 0; i <= Math.round(max * den); i++) {
      const val = i / den;
      if (val > max + 0.001) break;
      const fx = toX(val);
      const isMajor = i % den === 0;
      const mh = isMajor ? MAJOR_H : 6;
      fracTicks.push(
        <g key={i}>
          <line x1={fx} y1={AXIS_Y - mh} x2={fx} y2={AXIS_Y + mh}
            stroke={isMajor ? AXIS_COL : "#94a3b8"} strokeWidth={isMajor ? 2 : 1}/>
          {isMajor
            ? numLabel(fx, AXIS_Y + MAJOR_H + 14, Math.round(val))
            : (
              <text x={fx} y={AXIS_Y + mh + 12} textAnchor="middle"
                fontSize={9} fontWeight="600" fill="#64748b">
                {`${i % den}/${den}`}
              </text>
            )
          }
        </g>
      );
    }
    const jumpArcs = [];
    if (jumps && jumpSize) {
      let pos = start != null ? start : 0;
      for (let j = 0; j < jumps; j++) {
        const from = pos;
        const to = pos + jumpSize;
        const fx = toX(from);
        const tx2 = toX(to);
        const mx2 = (fx + tx2) / 2;
        const arcH = Math.min(30, Math.max(18, (tx2 - fx) * 0.5));
        const arcTop = AXIS_Y - arcH;
        jumpArcs.push(
          <g key={`arc-${j}`}>
            <path d={`M ${fx} ${AXIS_Y} Q ${mx2} ${arcTop} ${tx2} ${AXIS_Y}`}
              fill="none" stroke={T.indigo} strokeWidth={2.5} strokeLinecap="round"/>
            <polygon points={`${tx2},${AXIS_Y} ${tx2 - 5},${AXIS_Y - 8} ${tx2 - 5},${AXIS_Y}`} fill={T.indigo}/>
            {arcPill(mx2, arcTop, `+${jumpSize}`, T.indigo)}
          </g>
        );
        pos = to;
      }
      const destX = toX(pos);
      jumpArcs.push(
        <g key="dest">
          {/* Large solid circle at destination — unmissable "?" indicator */}
          <circle cx={destX} cy={AXIS_Y} r={14} fill={T.indigo} stroke="white" strokeWidth={2}/>
          <text x={destX} y={AXIS_Y + 1} textAnchor="middle" dominantBaseline="middle"
            fontSize={13} fontWeight="900" fill="white">?</text>
        </g>
      );
    }
    return (
      <Panel accent={T.indigo} bg="white" bd={T.slateBd}>
        <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
          <rect x={0} y={0} width={VW} height={VH} fill="white"/>
          {axisLine()}
          {fracTicks}
          {jumpArcs}
        </svg>
        {label && <Chip color={T.indigo} bg="white">{label}</Chip>}
      </Panel>
    );
  }

  // ── JUMP variant (repeated equal jumps) ─────────────────────────────────────
  if (jumps && jumpSize) {
    const VH = 108;
    const step = calcStep(min, max);
    const jumpArcs = [];
    let pos = start != null ? start : min;
    for (let j = 0; j < jumps; j++) {
      const from = pos;
      const to = pos + jumpSize;
      if (to > max + 0.001) break;
      const fx = toX(from);
      const tx2 = toX(to);
      const mx2 = (fx + tx2) / 2;
      const arcH = Math.min(30, Math.max(18, (tx2 - fx) * 0.5));
      const arcTop = AXIS_Y - arcH;
      jumpArcs.push(
        <g key={`j${j}`}>
          <path d={`M ${fx} ${AXIS_Y} Q ${mx2} ${arcTop} ${tx2} ${AXIS_Y}`}
            fill="none" stroke={T.indigo} strokeWidth={2.5} strokeLinecap="round"/>
          <polygon points={`${tx2},${AXIS_Y} ${tx2 - 5},${AXIS_Y - 8} ${tx2 - 5},${AXIS_Y}`} fill={T.indigo}/>
          {arcPill(mx2, arcTop, `+${jumpSize}`, T.indigo)}
        </g>
      );
      pos = to;
    }
    const startX = toX(start != null ? start : min);
    const endX = toX(pos);
    return (
      <Panel accent={T.indigo} bg="white" bd={T.slateBd}>
        <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
          <rect x={0} y={0} width={VW} height={VH} fill="white"/>
          {axisLine()}
          {/* Skip label at destination — the solid circle below covers that position */}
          {renderAxisCustom(step, pos)}
          {jumpArcs}
          {/* Start dot — solid indigo with white ring */}
          <circle cx={startX} cy={AXIS_Y} r={7} fill={T.indigo} stroke="white" strokeWidth={2}/>
          {/* Destination: large solid indigo circle ON axis — unmissable "?" indicator */}
          <circle cx={endX} cy={AXIS_Y} r={14} fill={T.indigo} stroke="white" strokeWidth={2}/>
          <text x={endX} y={AXIS_Y + 1} textAnchor="middle" dominantBaseline="middle"
            fontSize={13} fontWeight="900" fill="white">?</text>
        </svg>
        {label && <Chip color={T.indigo} bg="white">{label}</Chip>}
      </Panel>
    );
  }

  // ── DIRECTION variant (start + N steps right/left) ───────────────────────────
  if (start != null && steps != null && direction != null) {
    const VH = 108;
    const step = calcStep(min, max);
    const dest = direction === "right" ? start + steps : start - steps;
    const sx = toX(start);
    const dx = toX(dest);
    const midX = (sx + dx) / 2;
    const arcH = Math.min(34, Math.max(20, Math.abs(dx - sx) * 0.45));
    const arcTop = AXIS_Y - arcH;
    const arrowDir = direction === "right" ? 1 : -1;
    const stepLabel = direction === "right" ? `+${steps}` : `\u2212${steps}`;
    return (
      <Panel accent={T.indigo} bg="white" bd={T.slateBd}>
        <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
          <rect x={0} y={0} width={VW} height={VH} fill="white"/>
          {axisLine()}
          {/* Skip label at destination — the solid amber circle covers that position */}
          {renderAxisCustom(step, dest)}
          {/* Jump arc — amber dashed curve */}
          <path d={`M ${sx} ${AXIS_Y} Q ${midX} ${arcTop} ${dx} ${AXIS_Y}`}
            fill="none" stroke={T.amber} strokeWidth={2.5} strokeDasharray="5 3" strokeLinecap="round"/>
          <polygon points={`${dx},${AXIS_Y} ${dx - arrowDir * 6},${AXIS_Y - 8} ${dx - arrowDir * 6},${AXIS_Y}`} fill={T.amber}/>
          {arcPill(midX, arcTop, stepLabel, T.amber, "#fef3c7")}
          {/* Start dot — solid indigo with white ring */}
          <circle cx={sx} cy={AXIS_Y} r={7} fill={T.indigo} stroke="white" strokeWidth={2}/>
          {/* Destination: large solid amber circle ON axis — unmissable "?" indicator */}
          <circle cx={dx} cy={AXIS_Y} r={14} fill={T.amber} stroke="white" strokeWidth={2}/>
          <text x={dx} y={AXIS_Y + 1} textAnchor="middle" dominantBaseline="middle"
            fontSize={13} fontWeight="900" fill="white">?</text>
        </svg>
        {label && <Chip color={T.indigo} bg="white">{label}</Chip>}
      </Panel>
    );
  }

  // ── STANDARD variant — handles missing/known/marked ──────────────────────────
  const VH = 100;
  const step = calcStep(min, max);

  // Resolve known/marked highlighted positions
  const knownArr = known
    ? (Array.isArray(known) ? known : [known])
    : (Array.isArray(marked) ? marked : (marked != null ? [marked] : []));

  return (
    <Panel accent={T.indigo} bg="white" bd={T.slateBd}>
      <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
        <rect x={0} y={0} width={VW} height={VH} fill="white"/>
        {axisLine()}
        {/* Tick marks — missing position renders dashed ring instead of label */}
        {renderAxis(step)}
        {/* Known/marked positions — indigo dot with outer glow ring */}
        {knownArr.map((val, i) => {
          const kx = toX(val);
          return (
            <g key={`k${i}`}>
              <circle cx={kx} cy={AXIS_Y} r={10} fill="#e0e7ff" stroke={T.indigo} strokeWidth={1.5}/>
              <circle cx={kx} cy={AXIS_Y} r={5} fill={T.indigo}/>
            </g>
          );
        })}
        {/* Missing position — indigo "?" pill directly below the dashed ring */}
        {missing != null && (() => {
          const mx = toX(missing);
          return numLabel(mx, AXIS_Y + MAJOR_H + 14, missing, true);
        })()}
      </svg>
      {label && <Chip color={T.indigo} bg="white">{label}</Chip>}
    </Panel>
  );
}

function VennVis({ labelA, labelB, itemsA, itemsB, itemsBoth }) {
  const W = 280, H = 162;
  // r=56, d=84 → intersection x=140, y=46 (top) and y=120 (bottom)
  const r = 56, cx1 = 98, cx2 = 182, cy = 83;
  const ix = 140, iy1 = 46, iy2 = 120;
  const countA    = (itemsA    || []).length;
  const countB    = (itemsB    || []).length;
  const countBoth = (itemsBoth || []).length;

  const renderItems = (items, x) =>
    (items || []).slice(0, 3).map((it, i) => (
      <text key={i} x={x} y={68 + i * 14}
        textAnchor="middle" fontSize={9} fontWeight="600" fill={T.text}>
        {String(it).length > 7 ? String(it).slice(0, 6) + "…" : it}
      </text>
    ));

  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}
      ariaLabel={`Venn diagram: ${labelA} and ${labelB}`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="vv_both_g" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.38" />
          </linearGradient>
        </defs>

        {/* Circle fills */}
        <circle cx={cx1} cy={cy} r={r} fill={T.indigoBg} fillOpacity={0.78}
          stroke={T.indigo} strokeWidth={2} />
        <circle cx={cx2} cy={cy} r={r} fill={T.emeraldBg} fillOpacity={0.78}
          stroke={T.emerald} strokeWidth={2} />

        {/* Analytic lens — two arcs forming the intersection region */}
        <path
          d={`M ${ix} ${iy1} A ${r} ${r} 0 0 1 ${ix} ${iy2} A ${r} ${r} 0 0 0 ${ix} ${iy1} Z`}
          fill="url(#vv_both_g)" />

        {/* Labels inside circles near top (safely inside each non-overlapping region) */}
        <text x={cx1 - 10} y={32} textAnchor="middle" fontSize={9} fontWeight="800"
          fill={T.indigo}>{labelA}</text>
        <text x={cx2 + 10} y={32} textAnchor="middle" fontSize={9} fontWeight="800"
          fill={T.emerald}>{labelB}</text>

        {/* Items in each region */}
        {renderItems(itemsA,    66)}
        {renderItems(itemsBoth, ix)}
        {renderItems(itemsB,   214)}

        {/* Count badges at bottom of each region */}
        <rect x={54}      y={H - 19} width={24} height={14} rx={7} fill={T.indigo}  opacity={0.15} />
        <text x={66}      y={H -  8} textAnchor="middle" fontSize={9} fontWeight="800" fill={T.indigo}>{countA}</text>

        <rect x={ix - 14} y={H - 19} width={28} height={14} rx={7} fill="#6366f1" opacity={0.22} />
        <text x={ix}      y={H -  8} textAnchor="middle" fontSize={9} fontWeight="800" fill="#4338ca">{countBoth}</text>

        <rect x={202}     y={H - 19} width={24} height={14} rx={7} fill={T.emerald} opacity={0.15} />
        <text x={214}     y={H -  8} textAnchor="middle" fontSize={9} fontWeight="800" fill={T.emerald}>{countB}</text>
      </svg>
    </Panel>
  );
}

function BarChartVis({ bars, yLabel = "Frequency", title }) {
  // Palette: cycle through 5 harmonious colours
  const BAR_FILLS = [
    ["#6366f1","#4338ca"],  // indigo
    ["#8b5cf6","#6d28d9"],  // violet
    ["#10b981","#047857"],  // emerald
    ["#f59e0b","#b45309"],  // amber
    ["#ec4899","#be185d"],  // pink
  ];

  const W = 240, H = 150, PAD_L = 32, PAD_B = 38, PAD_T = 18, PAD_R = 10;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const n = bars.length;
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  // Nice round y-axis ceiling
  const niceMax = (() => {
    const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const steps = [1,2,4,5,10];
    for (const s of steps) { if (s * mag >= maxVal) return s * mag; }
    return maxVal;
  })();
  const numTicks = Math.min(niceMax, 5);
  const tickStep = niceMax / numTicks;
  const yTicks = Array.from({ length: numTicks + 1 }, (_, i) => Math.round(i * tickStep));

  const barW = Math.min(32, Math.max(14, (chartW / n) - 8));
  const totalBarWidth = n * barW;
  const spacing = (chartW - totalBarWidth) / (n + 1);
  const toY = v => PAD_T + chartH - (v / niceMax) * chartH;

  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}>
      {title && <Chip color={T.indigo} bg={T.indigoBg}>{title}</Chip>}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          {bars.map((_, i) => {
            const [top, bot] = BAR_FILLS[i % BAR_FILLS.length];
            return (
              <linearGradient key={i} id={`bar${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={top}/>
                <stop offset="100%" stopColor={bot}/>
              </linearGradient>
            );
          })}
        </defs>

        {/* horizontal grid lines */}
        {yTicks.map(v => {
          const sy = toY(v);
          return (
            <g key={v}>
              <line x1={PAD_L} y1={sy} x2={W - PAD_R} y2={sy}
                stroke={v === 0 ? T.slate : "#e2e8f0"} strokeWidth={v === 0 ? 1.5 : 1}
                strokeDasharray={v === 0 ? "none" : "3,3"}/>
              <text x={PAD_L - 4} y={sy + 3.5} textAnchor="end" fontSize={7.5} fill={T.textMid} fontWeight="600">{v}</text>
            </g>
          );
        })}

        {/* y-axis spine */}
        <line x1={PAD_L} y1={PAD_T - 4} x2={PAD_L} y2={H - PAD_B} stroke={T.slate} strokeWidth={1.5}/>
        {/* x-axis */}
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={T.slate} strokeWidth={1.5}/>

        {/* bars */}
        {bars.map((b, i) => {
          const bx = PAD_L + spacing + i * (barW + spacing);
          const by = toY(b.value);
          const bh = H - PAD_B - by;
          const [topC] = BAR_FILLS[i % BAR_FILLS.length];
          const label = String(b.label || "");
          // break long labels at spaces
          const words = label.split(" ");
          return (
            <g key={i}>
              {/* bar body with rounded top corners */}
              <path
                d={`M${bx},${H-PAD_B} L${bx},${by+4} Q${bx},${by} ${bx+4},${by} L${bx+barW-4},${by} Q${bx+barW},${by} ${bx+barW},${by+4} L${bx+barW},${H-PAD_B} Z`}
                fill={`url(#bar${i})`} stroke={topC} strokeWidth={1}/>
              {/* value label above bar */}
              <text x={bx + barW/2} y={by - 4} textAnchor="middle"
                fontSize={8.5} fontWeight="800" fill={topC}>{b.value}</text>
              {/* x-axis label — wrap if two words */}
              {words.length === 1
                ? <text x={bx + barW/2} y={H-PAD_B+12} textAnchor="middle" fontSize={7.5} fill={T.text} fontWeight="600">{label}</text>
                : words.map((w, wi) => (
                    <text key={wi} x={bx + barW/2} y={H-PAD_B+11+(wi*9)} textAnchor="middle" fontSize={7} fill={T.text} fontWeight="600">{w}</text>
                  ))
              }
            </g>
          );
        })}

        {/* y-axis label */}
        <text x={8} y={PAD_T + chartH/2} textAnchor="middle" fontSize={7.5} fill={T.textMid}
          transform={`rotate(-90, 8, ${PAD_T + chartH/2})`}>{yLabel}</text>
      </svg>
    </Panel>
  );
}

// ── ANGLES ───────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// EXTENDED PARSER
// ═══════════════════════════════════════════════════════════════════════════════
function parseVisualExtended(topic, questionStr, subject, yearLevel, question) {
  const t    = (topic || "").toLowerCase();
  const q    = (questionStr || "").toLowerCase();
  const subj = (subject || "").toLowerCase();
  const nums = ((questionStr || "").match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

  // ── SIMULTANEOUS EQUATIONS / COORDINATE GRAPH ────────────────────────────
  // Triggers: "simultaneous", "y = mx + c", "graph of", "plot the line"
  if (t.includes("simultaneous") || t.includes("linear_graph") || t.includes("graphs_linear") ||
      /simultaneous|solve.*graphically|plot.*(?:y\s*=)|graph.*(?:y\s*=)/i.test(questionStr)) {
    const eqMatches = [...(questionStr || "").matchAll(/y\s*=\s*[+-]?\d*\.?\d*\s*x\s*[+-]?\s*\d+\.?\d*/gi)];
    if (eqMatches.length >= 1) {
      return { type: "coordinate_graph", equations: eqMatches.map(m => m[0].trim()) };
    }
  }

  // ── DATA TABLE — "the table shows", "use the table", "from the table" ──
  if (/table.*shows|use.*table|from.*table|read.*table|following table/i.test(questionStr)) {
    // Try to extract tabular data from question text (e.g., "Day | Mon | Tue | Wed")
    const lines = (questionStr || "").split(/\n/).filter(l => l.includes('|'));
    if (lines.length >= 2) {
      const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
      const rows = lines.slice(1).map(l => l.split('|').map(c => c.trim()).filter(Boolean));
      if (headers.length >= 2 && rows.length >= 1) {
        return { type: "data_table", headers, rows };
      }
    }
    // Fallback: detect common data patterns
    const labelPattern = (questionStr || "").match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|January|February|March|April|May|June|Week \d|Class \d|Group [A-Z])/gi);
    if (labelPattern && labelPattern.length >= 2 && nums.length >= labelPattern.length) {
      return {
        type: "data_table",
        headers: ["Category", "Value"],
        rows: labelPattern.map((l, i) => [l, nums[i] !== undefined ? String(nums[i]) : "?"]),
      };
    }
  }

  // ── LONG MULTIPLICATION — "multiply 234 × 56", "long multiplication" ───
  if (t.includes("long_multiplication") || t.includes("multiplication_2digit") || t.includes("multiplication_3digit") ||
      /long multiplication|partial products|column multiplication/i.test(questionStr)) {
    const mulMatch = (questionStr || "").match(/(\d{2,4})\s*[×x]\s*(\d{2,4})/i);
    if (mulMatch) {
      return { type: "long_multiplication", num1: mulMatch[1], num2: mulMatch[2] };
    }
    if (nums.length >= 2 && nums[0] >= 10 && nums[1] >= 10) {
      return { type: "long_multiplication", num1: String(nums[0]), num2: String(nums[1]) };
    }
  }

  // ── JSXGraph TRIGONOMETRIC — "sin", "cos", "tan", "trigonometric graph" ─
  if (/trigonometric.*graph|graph.*(?:sin|cos|tan)|sketch.*(?:sin|cos|tan)|y\s*=\s*\d*\s*(?:sin|cos|tan)\s*\(?/i.test(questionStr) ||
      t.includes("trig") && /graph|sketch|plot|draw/i.test(questionStr)) {
    const fnMatch = (questionStr || "").match(/(?:sin|cos|tan)/i);
    const fnType = fnMatch ? fnMatch[0].toLowerCase() : "sin";
    const ampMatch = (questionStr || "").match(/(\d+)\s*(?:sin|cos|tan)/i);
    const amplitude = ampMatch ? parseFloat(ampMatch[1]) : 1;
    const perMatch = (questionStr || "").match(/(?:sin|cos|tan)\s*\(?\s*(\d+)/i);
    const period = perMatch ? parseFloat(perMatch[1]) : 1;
    return { type: "jsxgraph_trig", fnType, amplitude, period, title: `y = ${amplitude === 1 ? "" : amplitude}${fnType}(${period === 1 ? "" : period}x)` };
  }

  // ── JSXGraph QUADRATIC (interactive) — "y = ax² + bx + c", "sketch the parabola" ─
  if (/sketch.*(?:parabola|quadratic)|interactive.*quadratic|drag.*(?:vertex|parabola)|explore.*quadratic/i.test(questionStr) ||
      (t.includes("quadratic") && /sketch|graph|plot|draw|explore/i.test(questionStr))) {
    const coeffMatch = (questionStr || "").match(/(-?\d*\.?\d*)x\s*[²^2]+\s*([+-]\s*\d*\.?\d*)x?\s*([+-]\s*\d+\.?\d*)?/i);
    let a = 1, b = 0, c = 0;
    if (coeffMatch) {
      a = coeffMatch[1] ? parseFloat(coeffMatch[1].replace(/\s/g, "")) : 1;
      b = coeffMatch[2] ? parseFloat(coeffMatch[2].replace(/\s/g, "")) : 0;
      c = coeffMatch[3] ? parseFloat(coeffMatch[3].replace(/\s/g, "")) : 0;
    }
    return { type: "jsxgraph_quadratic", a, b, c };
  }

  // ── JSXGraph GEOMETRY CONSTRUCTION — "construct", "bisect", "perpendicular" ─
  if (/construct.*(?:triangle|perpendicular|bisector|circle)|bisect.*angle|locus|geometric.*construction/i.test(questionStr) ||
      (t.includes("construction") || t.includes("loci")) && subj.includes("math")) {
    const elems = [];
    const coordPairs = [...(questionStr || "").matchAll(/\((-?\d+),\s*(-?\d+)\)/g)];
    coordPairs.forEach((m, i) => {
      elems.push({ type: "point", coords: [parseFloat(m[1]), parseFloat(m[2])], name: String.fromCharCode(65 + i), draggable: true });
    });
    if (coordPairs.length >= 3) {
      elems.push({ type: "polygon", vertices: coordPairs.map((_, i) => String.fromCharCode(65 + i)) });
    }
    return { type: "jsxgraph_geometry", elements: elems.length ? elems : [
      { type: "point", coords: [-3, -2], name: "A", draggable: true },
      { type: "point", coords: [3, -2], name: "B", draggable: true },
      { type: "point", coords: [0, 3], name: "C", draggable: true },
      { type: "polygon", vertices: ["A", "B", "C"] },
    ]};
  }

  // ── JSXGraph SLIDER EXPLORER — "explore how a/b/c changes the graph" ──
  if (/explore.*(?:parameter|slider|coefficient)|how.*(?:changing|varying).*(?:a|b|c|m|k).*affect/i.test(questionStr) ||
      t.includes("graph_transform") || t.includes("function_transform")) {
    const expr = (questionStr || "").match(/y\s*=\s*([^,.\n]+)/i)?.[1]?.trim() || "a*x^2 + b*x + c";
    return {
      type: "jsxgraph_slider",
      expr,
      sliders: [
        { name: "a", min: -5, max: 5, value: 1 },
        { name: "b", min: -5, max: 5, value: 0 },
        { name: "c", min: -10, max: 10, value: 0 },
      ],
    };
  }

  // ── JSXGraph SIMULTANEOUS (interactive upgrade) — already coordinate_graph but if interactive requested ─
  if (/interactive.*simultaneous|drag.*(?:intersection|line)|simultaneous.*interactive/i.test(questionStr)) {
    const eqMatches = [...(questionStr || "").matchAll(/y\s*=\s*[+-]?\d*\.?\d*\s*x\s*[+-]?\s*\d+\.?\d*/gi)];
    if (eqMatches.length >= 1) {
      return { type: "jsxgraph_simultaneous", equations: eqMatches.map(m => m[0].trim()) };
    }
  }

  // ── INTERACTIVE PLOT — "plot the coordinates", "plot these points" ──────
  if (/plot.*(?:point|coordinate)|place.*(?:point|coordinate).*grid|mark.*point.*grid/i.test(questionStr)) {
    return { type: "interactive_plot", equation: null };
  }

  // ── COORDINATES ────────────────────────────────────────────────────────────
  if (t.includes("coord") || t.includes("plot") || /\(\s*-?\d+\s*,\s*-?\d+\s*\)/.test(questionStr)) {
    const ptMatches = [...(questionStr||"").matchAll(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g)];
    if (ptMatches.length) {
      const points = ptMatches.map(m => ({ x: parseInt(m[1]), y: parseInt(m[2]) }));
      const xs = points.map(p=>p.x), ys = points.map(p=>p.y);
      const pad = 2;
      const xRange = [Math.min(-1,...xs)-pad, Math.max(1,...xs)+pad];
      const yRange = [Math.min(-1,...ys)-pad, Math.max(1,...ys)+pad];
      return { type: "coordinate", points, xRange, yRange };
    }
  }

  // ── NUMBER LINE ────────────────────────────────────────────────────────────
  if (t.includes("number_line") || t.includes("rounding") || t.includes("round") ||
      /round.*nearest|nearest.*\d+|number line/i.test(questionStr)) {

    // Helper: detect the "missing" query value from question text
    // Returns the missing number if a gap can be inferred, otherwise null
    const detectMissingNL = (str, knownNums) => {
      // Explicit ? or blank in question text near a number pattern like "__, 6, 9"
      if (/\?\s*,|\?$|___|\[.*\?.*\]|blank/i.test(str)) {
        // Try to find an arithmetic gap in knownNums sorted order
        if (knownNums.length >= 2) {
          const sorted = [...knownNums].sort((a, b) => a - b);
          // Detect uniform step from first two known values
          const diffs = sorted.slice(1).map((v, i) => v - sorted[i]);
          const step = diffs[0];
          if (step > 0 && diffs.every(d => d === step)) {
            // All gaps uniform — infer missing = sorted[last] + step (after the sequence)
            return sorted[sorted.length - 1] + step;
          }
          // Find the biggest gap — the missing value is in the middle of that gap
          let maxGapIdx = 0, maxGap = 0;
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i + 1] - sorted[i] > maxGap) {
              maxGap = sorted[i + 1] - sorted[i];
              maxGapIdx = i;
            }
          }
          if (maxGap > 1) {
            return (sorted[maxGapIdx] + sorted[maxGapIdx + 1]) / 2;
          }
        }
      }
      return null;
    };

    // "number line from X to Y" — explicit range in question text
    const rangeMatch = (questionStr || "").match(/number line.*?(-?\d+)\s*to\s*(-?\d+)/i)
                    || (questionStr || "").match(/from\s+(-?\d+)\s+to\s+(-?\d+)/i);
    if (rangeMatch) {
      const lo = parseInt(rangeMatch[1]), hi = parseInt(rangeMatch[2]);
      const inRange = nums.filter(n => n >= lo && n <= hi);
      const missing = detectMissingNL(questionStr || "", inRange);
      const known = inRange.filter(n => n !== missing);
      return {
        type: "number_line",
        min: lo, max: hi,
        known: known.length ? known : undefined,
        missing: missing ?? undefined,
        label: `${lo} to ${hi}`,
      };
    }

    // Rounding — show value on number line between its two rounding bounds
    if (/round|nearest/i.test(questionStr)) {
      if (nums.length >= 1) {
        const val  = nums[0];
        const step = Math.abs(val) >= 1000 ? 1000 : Math.abs(val) >= 100 ? 100 :
                     Math.abs(val) >= 50   ? 10   : Math.abs(val) >= 10  ? 10  : 1;
        const mn   = Math.floor(val / step) * step;
        const mx   = mn + step;
        return {
          type: "number_line",
          min: mn - step, max: mx + step,
          known: [mn, mx],   // the two nearest round numbers
          missing: val,       // triangle indicator at the value being rounded
          label: `nearest ${step}`,
        };
      }
    }

    // Two or more numbers mentioned — use span as range, detect missing
    // GUARD: Only generate number_line for maths subjects AND only when the question is
    // genuinely about number placement/comparison/ordering — NOT multi-step word problems.
    const isMathsSubject = subj.includes("math") || subj.includes("number") || subj.includes("arithmetic");
    const isMultiStepWordProblem = nums.length >= 3 &&
      /sold|bought|received|gave away|eaten|taken|removed|left|remaining|more than|fewer|lost|spent|added|scored|collected/i.test(questionStr);
    const isNumberPlacement = /number line|position|order|arrange|sequence|between|place value|rounding|compare|greater|less than|ascending|descending|sort/i.test(questionStr);

    if (isMathsSubject && !isMultiStepWordProblem && nums.length >= 2) {
      const lo = Math.min(...nums), hi = Math.max(...nums);
      if (hi - lo <= 200 && hi - lo >= 2 && isNumberPlacement) {
        const missing = detectMissingNL(questionStr || "", nums);
        const known = nums.filter(n => n !== missing);
        return {
          type: "number_line",
          min: lo, max: hi,
          known: known.length ? known : undefined,
          missing: missing ?? undefined,
          label: `${lo} to ${hi}`,
        };
      }
    }

    // Single number — show its context neighbourhood
    // GUARD: Only for maths, and only when the question explicitly asks about number placement
    if (isMathsSubject && !isMultiStepWordProblem && nums.length >= 1 && isNumberPlacement) {
      const val  = nums[0];
      const step = Math.abs(val) >= 100 ? 100 : Math.abs(val) >= 10 ? 10 : 1;
      const mn   = Math.floor(val / step) * step - step;
      const mx   = Math.ceil(val / step) * step  + step;
      return {
        type: "number_line",
        min: mn, max: mx,
        missing: val,
        label: `Find the position`,
      };
    }
  }

  // ── VENN DIAGRAM ──────────────────────────────────────────────────────────
  if (t.includes("venn") || t.includes("set") || /factors? of|multiples? of|venn/i.test(questionStr)) {
    // Multiples/factors Venn: "factors of 12 and factors of 18"
    const factorMatch = (questionStr||"").match(/factors? of (\d+) and factors? of (\d+)/i);
    const multipleMatch = (questionStr||"").match(/multiples? of (\d+) and multiples? of (\d+)/i);
    if (factorMatch || multipleMatch) {
      const m = factorMatch || multipleMatch;
      const a = parseInt(m[1]), b = parseInt(m[2]);
      const type = factorMatch ? "factor" : "multiple";
      const getFactors = n => Array.from({length:n},(_, i)=>i+1).filter(x=>n%x===0);
      const getMultiples = (n, max=40) => Array.from({length:Math.floor(max/n)},(_,i)=>(i+1)*n).filter(x=>x<=max);
      const setA = type==="factor" ? getFactors(a) : getMultiples(a);
      const setB = type==="factor" ? getFactors(b) : getMultiples(b);
      const both = setA.filter(x=>setB.includes(x));
      const onlyA = setA.filter(x=>!setB.includes(x)).slice(0,4);
      const onlyB = setB.filter(x=>!setA.includes(x)).slice(0,4);
      return { type:"venn", labelA:`${type}s of ${a}`, labelB:`${type}s of ${b}`,
        itemsA: onlyA.map(String), itemsB: onlyB.map(String), itemsBoth: both.map(String) };
    }
  }

  // ── BAR CHART ──────────────────────────────────────────────────────────────
  if (t.includes("bar_chart") || t.includes("pictogram") || t.includes("statistics") || t.includes("tally") ||
      /bar chart|how many more|frequency/i.test(questionStr)) {
    // Try to parse: "Mon: 5, Tue: 8, Wed: 3" or "apples: 6, bananas: 4"
    const barMatch = [...(questionStr||"").matchAll(/([A-Za-z][A-Za-z ]{0,10}):\s*(\d+)/g)];
    if (barMatch.length >= 2) {
      const bars = barMatch.slice(0,6).map(m => ({ label: m[1].trim(), value: parseInt(m[2]) }));
      return { type: "bar_chart", bars };
    }
  }

  // ── KS1 CHART WITH COLOURED OBJECTS — "chart shows 5 green beads and 4 yellow beads" ──
  if (/chart|tally|pictogram/i.test(questionStr) && nums.length >= 2 && nums.length < 3) {
    const COLOURS = "red|blue|green|yellow|orange|purple|pink|white|black|brown";
    const colourRx = new RegExp(`(\\d+)\\s+(${COLOURS})\\s+(\\w+)`, "gi");
    const colourGroups = [...(questionStr || "").matchAll(colourRx)];
    if (colourGroups.length >= 2) {
      const bars = colourGroups.slice(0, 6).map(m => ({
        label: `${m[2]} ${m[3]}`.trim(), value: parseInt(m[1]),
      }));
      return { type: "bar_chart", bars };
    }
    // Fallback: just use the numbers with generic labels
    if (nums.length === 2) {
      return { type: "bar_chart", bars: [
        { label: "Group 1", value: nums[0] },
        { label: "Group 2", value: nums[1] },
      ]};
    }
  }

  // ── PYTHAGORAS THEOREM ─────────────────────────────────────────────────────
  // Guard: if the question asks "what type/kind of triangle", suppress labels that
  // reveal it's a right triangle — the scholar should work that out themselves.
  const isIdentifyQ = /what\s+(?:type|kind)\s+of|identify|name\s+(?:the|this)\s+(?:triangle|shape)|classify/i.test(questionStr);
  if (subj.includes("math") && (t.includes("pythag") || /pythagoras|pythagorean|hypotenuse/i.test(questionStr))) {
    const sideNums = ((questionStr || "").match(/\b(\d+(?:\.\d+)?)\s*(?:cm|m|mm|km|units?)?\b/gi) || [])
      .map(s => parseFloat(s)).filter(n => n > 0 && n < 1000);
    const sides = sideNums.slice(0, 3);
    const isFind = /find|calculat|what is|work out|length of the other|missing/i.test(questionStr);
    const unknownSide = /hypotenuse/i.test(questionStr) ? "c" : "a";
    return {
      type: "right_triangle",
      sides: sides.length >= 2 ? sides : [3, 4, 5],
      unknownSide: isFind ? unknownSide : null,
      showFormula: !isIdentifyQ,
      label: isIdentifyQ ? "Triangle" : "Pythagoras' Theorem: a² + b² = c²",
    };
  }

  // ── TRIGONOMETRY / SOHCAHTOA ──────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("trig") || t.includes("sohcahtoa") || t.includes("sine_rule") || t.includes("cosine_rule") ||
      /\bsin\b|\bcos\b|\btan\b|sohcahtoa|opposite|adjacent|trigonometr/i.test(questionStr))) {
    // Don't match trig GRAPH questions (handled separately)
    if (/graph|sketch|plot|draw.*curve/i.test(questionStr)) { /* fall through */ }
    else {
      const angleMatch = (questionStr || "").match(/(\d+(?:\.\d+)?)\s*(?:°|degrees?)/i);
      const angle = angleMatch ? parseFloat(angleMatch[1]) : 30;
      const sideNums = ((questionStr || "").match(/\b(\d+(?:\.\d+)?)\s*(?:cm|m|mm|km)?\b/gi) || [])
        .map(s => parseFloat(s)).filter(n => n > 0 && n < 1000 && n !== angle);
      const ratio = /\bsin\b|opposite.*hyp/i.test(questionStr) ? "sin"
        : /\bcos\b|adjacent.*hyp/i.test(questionStr) ? "cos"
        : /\btan\b|opposite.*adj/i.test(questionStr) ? "tan" : "sin";
      return {
        type: "right_triangle",
        sides: sideNums.length >= 1 ? sideNums : [10],
        angle,
        trigRatio: isIdentifyQ ? null : ratio,
        showFormula: !isIdentifyQ,
        label: isIdentifyQ ? "Triangle" : ratio === "sin" ? "sin θ = opp / hyp" : ratio === "cos" ? "cos θ = adj / hyp" : "tan θ = opp / adj",
      };
    }
  }

  // ── CIRCLE — area, circumference, arc, sector ────────────────────────────
  if (subj.includes("math") && (t.includes("circle") || t.includes("circumference") ||
      /circumference|radius|diameter|\bπ\b|pi\b|arc length|sector area/i.test(questionStr))) {
    // Skip circle theorems — those need a different visual
    if (t.includes("theorem")) { /* fall through */ }
    else {
      const radiusMatch = (questionStr || "").match(/radius[^\d]*(\d+(?:\.\d+)?)/i);
      const diamMatch = (questionStr || "").match(/diameter[^\d]*(\d+(?:\.\d+)?)/i);
      const radius = radiusMatch ? parseFloat(radiusMatch[1]) : diamMatch ? parseFloat(diamMatch[1]) / 2 : 5;
      const mode = /circumference|perimeter/i.test(questionStr + t) ? "circumference"
        : /sector/i.test(questionStr + t) ? "sector"
        : /arc/i.test(questionStr + t) ? "arc" : "area";
      const angleMatch = (questionStr || "").match(/(\d+)\s*(?:°|degrees?)/i);
      return {
        type: "circle_diagram",
        radius,
        mode,
        sectorAngle: angleMatch ? parseInt(angleMatch[1]) : null,
        label: mode === "circumference" ? `C = 2πr` : mode === "area" ? `A = πr²` : `${mode}`,
      };
    }
  }

  // ── ANGLES ON PARALLEL LINES ──────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("parallel") || /parallel lines|alternate|co-?interior|corresponding|transversal|allied angle/i.test(questionStr))) {
    const allDegs = [...(questionStr || "").matchAll(/(\d+)\s*(?:°|degrees?)/gi)].map(m => parseInt(m[1]));
    const angleType = /alternate/i.test(questionStr) ? "alternate"
      : /co-?interior|allied/i.test(questionStr) ? "co-interior"
      : "corresponding";
    return {
      type: "parallel_lines",
      knownAngle: allDegs[0] || 65,
      angleType,
      label: `${angleType} angles`,
    };
  }

  // ── SPEED / DISTANCE / TIME (for maths, not just physics) ─────────────────
  if (subj.includes("math") && (t.includes("speed") || t.includes("distance") || t.includes("rate") ||
      /speed.*distance.*time|distance.*time|average speed|how long.*travel|how far.*travel/i.test(questionStr))) {
    const unknown = /find.*speed|what.*speed|calculat.*speed|average speed/i.test(questionStr) ? "top"
      : /find.*distance|what.*distance|how far/i.test(questionStr) ? "left"
      : /find.*time|what.*time|how long/i.test(questionStr) ? "right" : null;
    return { type: "formula_triangle", top: "S", left: "D", right: "T", unknown, title: "Speed = Distance ÷ Time" };
  }

  // ── ALGEBRA: Solving equations ─────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("algebra_solving") || t.includes("linear_equation") ||
      /solve.*(?:for|=)|find.*value.*(?:x|y|n)|(?:x|y)\s*[+=]/i.test(questionStr))) {
    const eqMatch = (questionStr || "").match(/([^.?!]+=[^.?!]+)/);
    const eq = eqMatch ? eqMatch[1].trim() : null;
    if (eq) {
      const variable = (eq.match(/\b([a-z])\b/i) || ["", "x"])[1];
      return {
        type: "equation_solver",
        steps: [{ label: "Equation", value: eq }],
        variable,
      };
    }
  }

  // ── PROBABILITY TREE DIAGRAMS ──────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("tree_diagram") || t.includes("probability_tree") ||
      /tree diagram|two events|first.*then.*probability|without replacement/i.test(questionStr))) {
    const eventA = (questionStr || "").match(/(?:probability of|P\()([^)=]+)/i)?.[1]?.trim() || "Event A";
    return {
      type: "probability_tree",
      branches: [
        { label: eventA, p: "p", children: [
          { label: "Success", p: "p" },
          { label: "Fail", p: "1-p" },
        ]},
        { label: `Not ${eventA}`, p: "1-p", children: [
          { label: "Success", p: "p" },
          { label: "Fail", p: "1-p" },
        ]},
      ],
      title: "Probability Tree",
    };
  }

  // ── QUADRATIC EQUATIONS (non-graph) ────────────────────────────────────────
  if (subj.includes("math") && (t.includes("quadratic") && !t.includes("graph")) &&
      /solve|factoris|root|x²|x\^2/i.test(questionStr)) {
    const eqMatch = (questionStr || "").match(/([\dx²\s+\-=]+)/i);
    return {
      type: "equation_solver",
      steps: [{ label: "Quadratic", value: eqMatch ? eqMatch[1].trim() : "ax² + bx + c = 0" }],
      variable: "x",
    };
  }

  // ── STANDARD FORM ──────────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("standard_form") || /standard form|×\s*10\^|×\s*10\s*\d/i.test(questionStr))) {
    const sfMatch = (questionStr || "").match(/(\d+(?:\.\d+)?)\s*×\s*10\s*[⁰¹²³⁴⁵⁶⁷⁸⁹^]+\s*(-?\d+)/i);
    const value = sfMatch ? parseFloat(sfMatch[1]) * Math.pow(10, parseInt(sfMatch[2])) : 3.5e4;
    return { type: "number_line", min: 0, max: value * 2, marked: [value], label: "Standard form" };
  }

  // ── VECTORS ────────────────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("vector") || /\bvector\b|column vector|magnitude.*direction/i.test(questionStr))) {
    const vecMatch = (questionStr || "").match(/\(\s*(-?\d+)\s*[,\\]\s*(-?\d+)\s*\)/);
    const vx = vecMatch ? parseInt(vecMatch[1]) : 3;
    const vy = vecMatch ? parseInt(vecMatch[2]) : 4;
    return {
      type: "coordinate",
      points: [{ x: 0, y: 0 }, { x: vx, y: vy }],
      xRange: [Math.min(-2, vx - 2), Math.max(2, vx + 2)],
      yRange: [Math.min(-2, vy - 2), Math.max(2, vy + 2)],
      arrows: true,
    };
  }

  // ── INDICES / POWERS ───────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("indic") || t.includes("power") || t.includes("exponent") ||
      /\d+\s*[⁰¹²³⁴⁵⁶⁷⁸⁹^]+\s*\d+|index law|power rule/i.test(questionStr))) {
    const baseMatch = (questionStr || "").match(/(\d+)\s*[⁰¹²³⁴⁵⁶⁷⁸⁹^]+\s*(\d+)/);
    const base = baseMatch ? parseInt(baseMatch[1]) : 2;
    const exp = baseMatch ? parseInt(baseMatch[2]) : 3;
    return {
      type: "equation_solver",
      steps: [
        { label: "Expression", value: `${base}^${exp}` },
        { label: "Expanded", value: Array(exp).fill(base).join(" × ") },
        { label: "Result", value: `${Math.pow(base, exp)}` },
      ],
      variable: null,
    };
  }

  // ── PERCENTAGE INCREASE / DECREASE ─────────────────────────────────────────
  if (subj.includes("math") && (t.includes("percent") || /percentage.*(?:increase|decrease|change|profit|loss)|%.*(?:increase|decrease|off|discount)/i.test(questionStr))) {
    const pctMatch = (questionStr || "").match(/(\d+(?:\.\d+)?)\s*%/);
    const pct = pctMatch ? parseFloat(pctMatch[1]) : 25;
    return { type: "percentage_bar", value: pct };
  }

  // ── HISTOGRAM / BOX PLOT / SCATTER (KS3/KS4 statistics) ───────────────────
  if (subj.includes("math") && (t.includes("histogram") || /histogram|frequency density/i.test(questionStr))) {
    return { type: "bar_chart", bars: [
      { label: "0-10", value: 3 }, { label: "10-20", value: 7 },
      { label: "20-30", value: 12 }, { label: "30-40", value: 8 }, { label: "40-50", value: 4 },
    ]};
  }

  if (subj.includes("math") && (t.includes("box_plot") || /box plot|box.*whisker|median.*quartile/i.test(questionStr))) {
    return { type: "number_line", min: 0, max: 100, marked: nums.length >= 5 ? nums.slice(0, 5) : [10, 25, 45, 65, 90],
      label: "Box plot: min, Q1, median, Q3, max" };
  }

  if (subj.includes("math") && (t.includes("scatter") || /scatter.*diagram|scatter.*graph|correlation|line of best fit/i.test(questionStr))) {
    return { type: "coordinate", points: [
      { x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 4 },
      { x: 5, y: 7 }, { x: 6, y: 6 }, { x: 7, y: 8 },
    ], xRange: [0, 8], yRange: [0, 10] };
  }

  // ── SURDS ──────────────────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("surd") || /√|simplify.*surd|rationalis/i.test(questionStr))) {
    const surdMatch = (questionStr || "").match(/√\s*(\d+)/);
    const n = surdMatch ? parseInt(surdMatch[1]) : 12;
    return {
      type: "equation_solver",
      steps: [
        { label: "Surd", value: `√${n}` },
        { label: "Simplify", value: `Find largest square factor of ${n}` },
      ],
      variable: null,
    };
  }

  // ── TRANSFORMATIONS — enlargement, rotation, reflection, translation ──────
  if (subj.includes("math") && (t.includes("transform") || t.includes("enlargement") || t.includes("translation") ||
      /scale factor|enlarge|translate|reflect.*(?:in|across)|rotation.*(?:about|around)/i.test(questionStr))) {
    const coordPairs = [...(questionStr || "").matchAll(/\((-?\d+),\s*(-?\d+)\)/g)];
    if (coordPairs.length >= 2) {
      return {
        type: "coordinate",
        points: coordPairs.map(m => ({ x: parseInt(m[1]), y: parseInt(m[2]) })),
        xRange: [-8, 8],
        yRange: [-8, 8],
      };
    }
    return { type: "coordinate", points: [
      { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 1, y: 3 },
    ], xRange: [-6, 6], yRange: [-6, 6] };
  }

  // ── CIRCLE THEOREMS ────────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("circle_theorem") || /circle theorem|inscribed angle|angle.*semicircle|cyclic quadrilateral|tangent.*radius|intersect.*chord|chord.*intersect|arc.*measure|arc.*angle/i.test(questionStr))) {
    const allDegs = [...(questionStr || "").matchAll(/(\d+)\s*(?:°|degrees?)/gi)].map(m => parseInt(m[1]));
    const qLow = (questionStr || "").toLowerCase();

    // Detect theorem sub-type for richer visual
    const isIntersectingChords = /intersect.*chord|chord.*intersect|chord.*cross|chords?.*meet|point.*intersection.*chord/i.test(questionStr);
    const isSemicircle = /semicircle|angle.*semicircle/i.test(questionStr);
    const isTangent = /tangent/i.test(questionStr);
    const isCyclic = /cyclic/i.test(questionStr);
    const isInscribed = /inscribed angle|angle.*inscribed|angle.*circle.*arc|subtend/i.test(questionStr);
    const isAlternateSegment = /alternate segment/i.test(questionStr);

    // Parse arc measures — "arcs of 100° and 40°" or "arc AB = 100° and arc CD = 40°"
    const arcMatches = [...(questionStr || "").matchAll(/arc\s*[A-Z]*\s*(?:=|is|measures?)?\s*(\d+)\s*°/gi)].map(m => parseInt(m[1]));
    const arcAngles = arcMatches.length >= 2 ? arcMatches : allDegs.length >= 2 ? allDegs : [];

    // Parse chord labels — "chords AB and CD"
    const chordLabels = [...(questionStr || "").matchAll(/chord\s*([A-Z]{2})/gi)].map(m => m[1]);

    // Intersecting point label — "intersect at E" / "meet at point P"
    const pointMatch = (questionStr || "").match(/(?:intersect|meet|cross)\s+(?:at\s+)?(?:point\s+)?([A-Z])/i);
    const intersectPoint = pointMatch ? pointMatch[1] : "E";

    let theoremSubtype = "generic";
    let theoremLabel = "Circle theorem";
    if (isIntersectingChords) {
      theoremSubtype = "intersecting_chords";
      theoremLabel = "Intersecting chords theorem";
    } else if (isSemicircle) {
      theoremSubtype = "semicircle";
      theoremLabel = "Angle in semicircle = 90°";
    } else if (isTangent) {
      theoremSubtype = "tangent";
      theoremLabel = "Tangent ⊥ radius";
    } else if (isCyclic) {
      theoremSubtype = "cyclic";
      theoremLabel = "Opposite angles = 180°";
    } else if (isInscribed) {
      theoremSubtype = "inscribed";
      theoremLabel = "Inscribed angle theorem";
    } else if (isAlternateSegment) {
      theoremSubtype = "alternate_segment";
      theoremLabel = "Alternate segment theorem";
    }

    return {
      type: "circle_diagram",
      mode: "theorem",
      theoremSubtype,
      knownAngles: allDegs,
      arcAngles,
      chordLabels: chordLabels.length >= 2 ? chordLabels : ["AB", "CD"],
      intersectPoint,
      label: theoremLabel,
    };
  }

  // ── SIMULTANEOUS EQUATIONS (non-graph, algebraic) ──────────────────────────
  if (subj.includes("math") && (t.includes("simultaneous") && !/graph/i.test(questionStr))) {
    const eqs = [...(questionStr || "").matchAll(/([^.?!\n]*?=\s*[^.?!\n]+)/g)].map(m => m[1].trim()).slice(0, 2);
    if (eqs.length >= 2) {
      return {
        type: "equation_solver",
        steps: eqs.map((eq, i) => ({ label: `Equation ${i + 1}`, value: eq })),
        variable: "x, y",
      };
    }
  }

  // ── ANGLES ────────────────────────────────────────────────────────────────
  if (t.includes("angle") || t.includes("geometry") ||
      /acute|obtuse|reflex|right angle|\d+\s*°|\d+\s*degrees/i.test(questionStr)) {

    // Multi-angle scenarios — "angles on a straight line"
    if (/straight line|supplementary/i.test(questionStr)) {
      const allDegs = [...(questionStr||"").matchAll(/(\d+)\s*(?:°|degrees?)/gi)].map(m => parseInt(m[1]));
      if (allDegs.length >= 1) return { type: "angle", scenario: "straight_line", knownAngles: allDegs, unknownLabel: "?" };
    }
    // Angles in a triangle
    if (/triangle|three angles/i.test(questionStr)) {
      const allDegs = [...(questionStr||"").matchAll(/(\d+)\s*(?:°|degrees?)/gi)].map(m => parseInt(m[1]));
      if (allDegs.length >= 1 && allDegs.length <= 2) return { type: "angle", scenario: "triangle", knownAngles: allDegs, unknownLabel: "?" };
    }
    // Angles at a point
    if (/at a point|around a point|full turn/i.test(questionStr)) {
      const allDegs = [...(questionStr||"").matchAll(/(\d+)\s*(?:°|degrees?)/gi)].map(m => parseInt(m[1]));
      if (allDegs.length >= 1) return { type: "angle", scenario: "at_point", knownAngles: allDegs, unknownLabel: "?" };
    }
    // Vertically opposite
    if (/vertically opposite|vert.*opp/i.test(questionStr)) {
      const allDegs = [...(questionStr||"").matchAll(/(\d+)\s*(?:°|degrees?)/gi)].map(m => parseInt(m[1]));
      if (allDegs.length >= 1) return { type: "angle", scenario: "vertically_opposite", knownAngles: allDegs, unknownLabel: "?" };
    }

    // Single angle (original behaviour)
    const degMatch = (questionStr||"").match(/(\d+)\s*(?:°|degrees?)/i);
    if (degMatch) {
      const deg = parseInt(degMatch[1]);
      if (deg > 0 && deg < 360) return { type: "angle", degrees: deg };
    }
    if (/right angle/i.test(questionStr)) return { type:"angle", degrees: 90 };
    if (/acute/i.test(questionStr))       return { type:"angle", degrees: 55 };
    if (/obtuse/i.test(questionStr))      return { type:"angle", degrees: 120 };
    if (/reflex/i.test(questionStr))      return { type:"angle", degrees: 210 };
  }

  // ── PAPER FOLDS (NVR) ──────────────────────────────────────────────────────
  if (/paper.*fold|fold.*paper|punch.*hole|hole.*punch|unfold/i.test(questionStr)) {
    const foldType = /diagonal/i.test(questionStr) ? "diagonal"
      : /quarter/i.test(questionStr) ? "quarter"
      : /horizontal/i.test(questionStr) ? "half_horizontal"
      : "half_vertical";

      // NVR enhanced visuals
  if (isNVR) {
    const nvrExt = parseNVRExt(t, questionStr, year);
    if (nvrExt) return nvrExt;
  }

    // Generate punch positions based on question content
    const punches = /corner/i.test(questionStr) ? [[0.8, 0.2]]
      : /centre|center|middle/i.test(questionStr) ? [[0.5, 0.5]]
      : /edge|side/i.test(questionStr) ? [[0.5, 0.2]]
      : [[0.3, 0.4]];
    return { type: "nvr_paper_fold", foldType, punchPositions: punches };
  }

  // ── AREA / PERIMETER ──────────────────────────────────────────────────────
  // Fire on topic tag OR question text mentioning shapes + area/perimeter keywords.
  // This must stay BEFORE the quadratic detector so "rectangular garden" questions
  // never fall through to a parabola graph.
  const areaPerimTextMatch = subj.includes("math") &&
    /rectangle|rectangular|garden|field|room|floor|wall|fence|playground|pool/i.test(questionStr) &&
    /area|perimeter|fence|fencing|surround|border|cover/i.test(questionStr);
  if (((t.includes("area") || t.includes("perimeter")) && subj.includes("math")) || areaPerimTextMatch) {
    // Match "5cm × 6cm", "5 by 6", "5x6", "3m × 4m" — allow optional unit suffix on first number
    const byMatch = (questionStr||"").match(/(\d+)\s*(?:cm|m{1,2}|km|in|ft)?\s*(?:by|×|x)\s*(\d+)/i);
    const lwMatch = (questionStr||"").match(/length[^\d]*(\d+)[^\d]*width[^\d]*(\d+)/i);
    const wlMatch = (questionStr||"").match(/width[^\d]*(\d+)[^\d]*height[^\d]*(\d+)/i);
    // Also match "10m and width of 8m" or "length is 10m, width is 8m" patterns
    const andMatch = (questionStr||"").match(/(\d+)\s*(?:cm|m{1,2}|km|in|ft)?\s*(?:and|,)\s*(?:a\s+)?(?:width|breadth|height)\s*(?:of|is|=)?\s*(\d+)/i);
    const isMatch = (questionStr||"").match(/(?:length|side)\s*(?:of|is|=)\s*(\d+)\s*(?:cm|m{1,2}|km|in|ft)?[^.]*?(?:width|breadth|height)\s*(?:of|is|=)\s*(\d+)/i);
    const m = byMatch || lwMatch || wlMatch || andMatch || isMatch;
    if (m) {
      const w = parseInt(m[1]), h = parseInt(m[2]);
      // Cap at 12×10 so the grid stays renderable
      if (w<=12 && h<=10 && w>0 && h>0)
        return { type:"area", width:w, height:h, mode: /perim|fence|fencing|surround|border/i.test(questionStr+t) ? "perimeter" : "area" };
    }
    // Even if dimensions are too large for grid, still show a labelled rectangle
    const anyW = (questionStr||"").match(/(\d+)\s*(?:cm|m{1,2}|km|in|ft)/);
    const anyH = (questionStr||"").match(/(?:width|breadth|height|shorter)[^\d]*(\d+)/i);
    if (anyW && anyH) {
      return { type:"area", width: Math.min(parseInt(anyW[1]),12), height: Math.min(parseInt(anyH[1]),10),
        mode: /perim|fence|fencing|surround|border/i.test(questionStr+t) ? "perimeter" : "area" };
    }
  }

  // ── FORMULA TRIANGLE ──────────────────────────────────────────────────────
  if (subj.includes("physics") || subj.includes("science") || subj.includes("chemistry")) {
    // Speed/distance/time
    if (/speed|distance|time|v\s*=|s\s*=|d\s*=|t\s*=/.test(q) && t.includes("speed") || t.includes("distance") || t.includes("velocity")) {
      const unknown = /find.*speed|what.*speed|calculat.*speed/i.test(questionStr) ? "top"
        : /find.*distance|what.*distance/i.test(questionStr) ? "left"
        : /find.*time|what.*time/i.test(questionStr) ? "right" : null;
      return { type:"formula_triangle", top:"v", left:"d", right:"t", unknown, title:"Speed = Distance ÷ Time" };
    }
    // Force = mass × acceleration
    if (/force|mass|acceleration|f\s*=|m\s*=|a\s*=/.test(q) && (t.includes("f_ma") || t.includes("newton"))) {
      const unknown = /find.*force/i.test(questionStr) ? "top"
        : /find.*mass/i.test(questionStr) ? "left"
        : /find.*accel/i.test(questionStr) ? "right" : null;
      return { type:"formula_triangle", top:"F", left:"m", right:"a", unknown, title:"F = m × a" };
    }
    // Power = current × voltage
    if (/power|current|voltage|p\s*=|i\s*=|v\s*=/.test(q) && t.includes("power")) {
      const unknown = /find.*power/i.test(questionStr) ? "top"
        : /find.*current/i.test(questionStr) ? "left"
        : /find.*voltage/i.test(questionStr) ? "right" : null;
      return { type:"formula_triangle", top:"P", left:"I", right:"V", unknown, title:"P = I × V" };
    }
    // Density = mass / volume
    if (/density|mass|volume/.test(q) && t.includes("density")) {
      const unknown = /find.*density/i.test(questionStr) ? "top"
        : /find.*mass/i.test(questionStr) ? "left"
        : /find.*volume/i.test(questionStr) ? "right" : null;
      return { type:"formula_triangle", top:"ρ", left:"m", right:"V", unknown, title:"Density = mass ÷ volume" };
    }
  }

  // ── MOTION GRAPH ──────────────────────────────────────────────────────────
  if ((subj.includes("physics") || subj.includes("science")) &&
      (t.includes("distance_time") || t.includes("velocity_time") || t.includes("motion_graph") ||
       /distance.time graph|velocity.time graph|d-t graph|v-t graph/i.test(questionStr))) {
    const motionType = /velocity.time|v.t graph/i.test(questionStr) ? "velocity_time" : "distance_time";
    const curveType = /constant speed|uniform/i.test(questionStr) ? "constant"
      : /speed(ing)? up|accelerat|increasing/i.test(questionStr) ? "accelerating"
      : /slow(ing)? down|deceler/i.test(questionStr) ? "decelerating"
      : /stationary|not moving|at rest/i.test(questionStr) ? "stationary"
      : "constant";
    return { type:"motion_graph", motionType, curveType };
  }

  // ── CIRCUIT ───────────────────────────────────────────────────────────────
  if ((subj.includes("physics") || subj.includes("science")) &&
      (t.includes("circuit") || /series circuit|parallel circuit|bulb|battery/i.test(questionStr))) {
    const circType = /parallel/i.test(questionStr) ? "parallel" : "series";
    return { type:"circuit", circuitType: circType };
  }

  // ── QUADRATIC ─────────────────────────────────────────────────────────────
  // Guard: skip if the question is really about a physical shape's area/perimeter
  const isPhysicalShapeQ = /rectangle|rectangular|garden|field|room|floor|wall|fence|playground|pool/i.test(questionStr) &&
    /area|perimeter|fence|fencing|surround|border|cover|length.*width|width.*height/i.test(questionStr);
  if (subj.includes("math") && !isPhysicalShapeQ && (t.includes("quadratic") || t.includes("parabola") ||
      /x²|x\^2|ax²|roots? of|discriminant/i.test(questionStr))) {
    // Parse ax² + bx + c = 0
    const coeffMatch = (questionStr||"").match(/(-?\d*)\s*x[²\^2]\s*([+\-]\s*\d*)\s*x\s*([+\-]\s*\d+)/);
    if (coeffMatch) {
      const a = parseInt(coeffMatch[1]||"1")||1;
      const b = parseInt(coeffMatch[2].replace(/\s/g,""))||0;
      const c = parseInt(coeffMatch[3].replace(/\s/g,""))||0;
      const disc = b*b - 4*a*c;
      if (disc >= 0) {
        const vx = -b/(2*a), vy = -(disc)/(4*a);
        const r1 = (-b - Math.sqrt(disc))/(2*a);
        const r2 = (-b + Math.sqrt(disc))/(2*a);
        return { type:"quadratic", a, roots: disc>0?[+r1.toFixed(1),+r2.toFixed(1)]:null,
          vertex:{x:+vx.toFixed(1),y:+vy.toFixed(1)} };
      }
    }
    // Fallback: show shape only
    return { type:"quadratic", a:1, roots:[-2,2], vertex:{x:0,y:-4} };
  }

  // ── PERIODIC TABLE ELEMENT ────────────────────────────────────────────────
  if ((subj.includes("chemistry") || subj.includes("science")) &&
      (t.includes("periodic") || t.includes("element") || t.includes("atom"))) {
    const ELEMENTS = {
      H:  {name:"Hydrogen",  n:1,  mass:"1.008",  group:1,  period:1, groupType:"nonmetal"},
      He: {name:"Helium",    n:2,  mass:"4.003",  group:18, period:1, groupType:"noble"},
      Li: {name:"Lithium",   n:3,  mass:"6.941",  group:1,  period:2, groupType:"alkali"},
      C:  {name:"Carbon",    n:6,  mass:"12.011", group:14, period:2, groupType:"nonmetal"},
      N:  {name:"Nitrogen",  n:7,  mass:"14.007", group:15, period:2, groupType:"nonmetal"},
      O:  {name:"Oxygen",    n:8,  mass:"15.999", group:16, period:2, groupType:"nonmetal"},
      F:  {name:"Fluorine",  n:9,  mass:"18.998", group:17, period:2, groupType:"halogen"},
      Ne: {name:"Neon",      n:10, mass:"20.180", group:18, period:2, groupType:"noble"},
      Na: {name:"Sodium",    n:11, mass:"22.990", group:1,  period:3, groupType:"alkali"},
      Mg: {name:"Magnesium", n:12, mass:"24.305", group:2,  period:3, groupType:"alkaline"},
      Al: {name:"Aluminium", n:13, mass:"26.982", group:13, period:3, groupType:"metalloid"},
      Si: {name:"Silicon",   n:14, mass:"28.086", group:14, period:3, groupType:"metalloid"},
      Cl: {name:"Chlorine",  n:17, mass:"35.453", group:17, period:3, groupType:"halogen"},
      Ar: {name:"Argon",     n:18, mass:"39.948", group:18, period:3, groupType:"noble"},
      K:  {name:"Potassium", n:19, mass:"39.098", group:1,  period:4, groupType:"alkali"},
      Ca: {name:"Calcium",   n:20, mass:"40.078", group:2,  period:4, groupType:"alkaline"},
      Fe: {name:"Iron",      n:26, mass:"55.845", group:8,  period:4, groupType:"transition"},
      Cu: {name:"Copper",    n:29, mass:"63.546", group:11, period:4, groupType:"transition"},
      Zn: {name:"Zinc",      n:30, mass:"65.38",  group:12, period:4, groupType:"transition"},
      Br: {name:"Bromine",   n:35, mass:"79.904", group:17, period:4, groupType:"halogen"},
      Ag: {name:"Silver",    n:47, mass:"107.868",group:11, period:5, groupType:"transition"},
      Au: {name:"Gold",      n:79, mass:"196.967",group:11, period:6, groupType:"transition"},
    };
    // Try to find element symbol mentioned in question
    const symMatch = Object.keys(ELEMENTS).find(sym =>
      new RegExp(`\\b${sym}\\b`).test(questionStr) ||
      new RegExp(ELEMENTS[sym].name,"i").test(questionStr)
    );
    if (symMatch) {
      const el = ELEMENTS[symMatch];
      return { type:"element", symbol:symMatch, name:el.name, atomicNumber:el.n,
        mass:el.mass, group:el.group, period:el.period, groupType:el.groupType };
    }
  }

  // ── PERCENTAGE BAR ─────────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("percent") || /%/.test(questionStr) || /percent/i.test(questionStr))) {
    const pctMatch = (questionStr || "").match(/(\d+)\s*%\s*(?:of\s*)?(\d+)/i)
      || (questionStr || "").match(/(\d+)\s*percent(?:\s+of)?\s+(\d+)/i);
    if (pctMatch) {
      const pct = parseInt(pctMatch[1]), whole = parseInt(pctMatch[2]);
      if (pct > 0 && pct <= 100 && whole > 0 && whole <= 200) {
        return { type: "comparison", a: Math.round(whole * pct / 100), b: whole };
      }
    }
  }

  // ── HCF / LCM ──────────────────────────────────────────────────────────────
  if (subj.includes("math") && /hcf|lcm|highest common factor|lowest common multiple|common factor|common multiple/i.test(questionStr)) {
    const twoNums = (questionStr || "").match(/(\d+)\s*and\s*(\d+)/i);
    if (twoNums) {
      const a = parseInt(twoNums[1]), b = parseInt(twoNums[2]);
      if (a > 0 && b > 0 && a <= 100 && b <= 100) {
        const factorsA = Array.from({length:a},(_,i)=>i+1).filter(n=>a%n===0);
        const factorsB = Array.from({length:b},(_,i)=>i+1).filter(n=>b%n===0);
        const common   = factorsA.filter(n=>factorsB.includes(n));
        return { type:"venn",
          setA: factorsA.filter(n=>!common.includes(n)).slice(0,4),
          setB: factorsB.filter(n=>!common.includes(n)).slice(0,4),
          intersection: common.slice(0,4),
          labelA:`Factors of ${a}`, labelB:`Factors of ${b}` };
      }
    }
  }

  // ── MEAN / AVERAGE ─────────────────────────────────────────────────────────
  if (subj.includes("math") && /\bmean\b|\baverage\b|\bmode\b|\bmedian\b/i.test(questionStr)) {
    const allNums = (questionStr || "").match(/\d+/g);
    if (allNums && allNums.length >= 3) {
      const values = allNums.map(Number).filter(n=>n>0&&n<=100);
      if (values.length >= 3) {
        return { type:"bar_chart", labels:values.map((_,i)=>`v${i+1}`), values, title:"Data set", yLabel:"" };
      }
    }
  }

  // ── EQUATION SOLVER — "solve", "find x", algebraic equations ───────────────
  if (subj.includes("math") && (t.includes("algebra") || t.includes("equation") || t.includes("solve") ||
      /solve|find\s*(?:the\s+value\s+of\s+)?[xyz]|what is [xyz]/i.test(questionStr))) {
    const eqLine = (questionStr || "").match(/\d+[xyz]\s*[+\-]\s*\d+\s*=\s*\d+/i) ||
                   (questionStr || "").match(/[xyz]\s*[+\-]\s*\d+\s*=\s*\d+/i);
    if (eqLine) {
      return { type: "equation_solver", steps: [
        { equation: eqLine[0].trim(), operation: "Given equation" },
      ], variable: /[xyz]/i.exec(eqLine[0])?.[0] || "x" };
    }
  }

  // ── PROBABILITY TREE — "probability", "tree diagram", "outcomes" ────────────
  if (subj.includes("math") && (t.includes("probability") || t.includes("tree") ||
      /probability|tree diagram|outcome|coin.*dice|dice.*coin|heads.*tails/i.test(questionStr))) {
    if (/tree diagram|draw.*tree|show.*outcomes/i.test(questionStr)) {
      return { type: "probability_tree", branches: [
        { label: "Outcome A", probability: "" },
        { label: "Outcome B", probability: "" },
      ], title: "Probability Tree" };
    }
  }

  // ── PLACE VALUE — "place value", "hundreds tens units", "value of the digit" ─
  if (subj.includes("math") && (t.includes("place_value") || t.includes("place value") ||
      /place value|value of the digit|hundreds.*tens|tens.*units|what does the \d+ represent/i.test(questionStr))) {
    const pvNum = nums.find(n => n >= 10 && n <= 9999);
    if (pvNum) {
      return { type: "place_value", number: pvNum };
    }
  }

  // ── CLOCK FACE — "time", "clock", "quarter past", "half past" ───────────────
  if (subj.includes("math") && (t.includes("time") || t.includes("clock") ||
      /what time|quarter past|half past|o'clock|minutes past|minutes to|analogue|clock/i.test(questionStr))) {
    const timeMatch = (questionStr || "").match(/(\d{1,2}):(\d{2})/);
    const pastMatch = (questionStr || "").match(/(\d{1,2})\s*(?:o'clock|oclock)/i);
    const quarterPast = /quarter past (\d{1,2})/i.exec(questionStr);
    const halfPast = /half past (\d{1,2})/i.exec(questionStr);
    if (timeMatch) {
      return { type: "clock_face", hours: parseInt(timeMatch[1]), minutes: parseInt(timeMatch[2]) };
    }
    if (pastMatch) {
      return { type: "clock_face", hours: parseInt(pastMatch[1]), minutes: 0 };
    }
    if (quarterPast) {
      return { type: "clock_face", hours: parseInt(quarterPast[1]), minutes: 15 };
    }
    if (halfPast) {
      return { type: "clock_face", hours: parseInt(halfPast[1]), minutes: 30 };
    }
  }

  // ── TALLY CHART — "tally", data with counts ─────────────────────────────────
  if (subj.includes("math") && (t.includes("tally") ||
      /tally|how many.*votes|count.*tally/i.test(questionStr))) {
    const tallyMatch = [...(questionStr || "").matchAll(/([A-Za-z][\w ]{0,12}):\s*(\d+)/g)];
    if (tallyMatch.length >= 2) {
      return { type: "tally_chart", items: tallyMatch.slice(0, 6).map(m => ({
        label: m[1].trim(), count: parseInt(m[2]),
      })), title: "Tally Chart" };
    }
  }

  // Fallback to original parser
  return parseVisual(topic, questionStr, subject, yearLevel, question);
}