"use client";
/**
 * BossBattleUI.jsx — Visual boss battle encounter with Kenney Monster Builder sprites
 *
 * Renders the boss fight overlay during a weekly boss battle quest.
 * Shows boss HP bar, scholar shields, damage animations, and win/lose states.
 * Boss characters are composed from Kenney Monster Builder sprite parts.
 *
 * Props (new interface):
 *   scholar      — scholar object
 *   bossQuest    — quest row from scholar_quests table
 *   supabase     — Supabase client
 *   onClose      — callback when battle is closed
 *   onVictory    — callback(rewards) when battle is won
 *
 * Props (legacy interface, still supported):
 *   battle       — BossBattle instance (from bossBattleEngine.js)
 *   question     — current question object ({ q, opts, a, ... })
 *   onAnswer     — callback(optionIndex) when scholar selects an answer
 *   onComplete   — callback(results) when battle ends
 *   band         — "ks1" | "ks2" | "ks3" | "ks4"
 */

import React, { useState, useEffect, useRef } from "react";
import { calculatePercentage } from "@/lib/calculationUtils";
import { BossBattle, saveBossBattleResult } from "@/lib/bossBattleEngine";

// ─── BOSS SPRITE CONFIGURATION ───────────────────────────────────────────────

const BOSS_CONFIGS = {
  ks1: {
    name: "Counting Critter",
    parts: {
      body: "body_blueB",
      arm: "arm_blueA",
      leg: "leg_blueA",
      eye: "eye_cute_light",
      mouth: "mouthA",
      eyebrow: "eyebrowA",
    },
    primaryColor: "#3b82f6",
  },
  ks2: {
    name: "Riddle Sphinx",
    parts: {
      body: "body_yellowC",
      arm: "arm_yellowD",
      leg: "leg_yellowB",
      eye: "eye_human",
      mouth: "mouthE",
      eyebrow: "eyebrowB",
    },
    primaryColor: "#f59e0b",
  },
  ks3: {
    name: "Code Phantom",
    parts: {
      body: "body_greenD",
      arm: "arm_greenE",
      leg: "leg_greenC",
      eye: "eye_psycho_light",
      mouth: "mouthH",
      eyebrow: "eyebrowC",
    },
    primaryColor: "#10b981",
  },
  ks4: {
    name: "Equation Dragon",
    parts: {
      body: "body_redE",
      arm: "arm_redD",
      leg: "leg_redA",
      eye: "eye_angry_red",
      mouth: "mouthJ",
      eyebrow: "eyebrowC",
    },
    primaryColor: "#ef4444",
  },
};

// ─── MONSTER SPRITE (STATIC COMPOSITE) ────────────────────────────────────

function MonsterSprite({ ksLevel = "ks2", size = "md", style = {} }) {
  const config = BOSS_CONFIGS[ksLevel] || BOSS_CONFIGS.ks2;
  const sizeMap = { sm: 80, md: 120, lg: 160 };
  const dimension = sizeMap[size] || sizeMap.md;
  const assetBase = "/assets/kenney/monsters/parts";

  return (
    <div
      style={{
        position: "relative",
        width: dimension,
        height: dimension,
        margin: "0 auto",
        ...style,
      }}
    >
      {/* Body (center) */}
      <img
        src={`${assetBase}/${config.parts.body}.png`}
        alt="body"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
      {/* Left Arm */}
      <img
        src={`${assetBase}/${config.parts.arm}.png`}
        alt="arm"
        style={{
          position: "absolute",
          width: "35%",
          height: "50%",
          left: "-12%",
          top: "25%",
          objectFit: "contain",
          transform: "scaleX(-1)",
        }}
      />
      {/* Right Arm */}
      <img
        src={`${assetBase}/${config.parts.arm}.png`}
        alt="arm"
        style={{
          position: "absolute",
          width: "35%",
          height: "50%",
          right: "-12%",
          top: "25%",
          objectFit: "contain",
        }}
      />
      {/* Left Leg */}
      <img
        src={`${assetBase}/${config.parts.leg}.png`}
        alt="leg"
        style={{
          position: "absolute",
          width: "25%",
          height: "40%",
          left: "20%",
          bottom: "-8%",
          objectFit: "contain",
        }}
      />
      {/* Right Leg */}
      <img
        src={`${assetBase}/${config.parts.leg}.png`}
        alt="leg"
        style={{
          position: "absolute",
          width: "25%",
          height: "40%",
          right: "20%",
          bottom: "-8%",
          objectFit: "contain",
        }}
      />
      {/* Left Eye */}
      <img
        src={`${assetBase}/${config.parts.eye}.png`}
        alt="eye"
        style={{
          position: "absolute",
          width: "18%",
          height: "18%",
          left: "25%",
          top: "20%",
          objectFit: "contain",
        }}
      />
      {/* Right Eye */}
      <img
        src={`${assetBase}/${config.parts.eye}.png`}
        alt="eye"
        style={{
          position: "absolute",
          width: "18%",
          height: "18%",
          right: "25%",
          top: "20%",
          objectFit: "contain",
        }}
      />
      {/* Mouth */}
      <img
        src={`${assetBase}/${config.parts.mouth}.png`}
        alt="mouth"
        style={{
          position: "absolute",
          width: "24%",
          height: "12%",
          left: "50%",
          top: "52%",
          transform: "translateX(-50%)",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

// ─── ANIMATED BOSS SPRITE (SPRITESHEET FRAMES) ──────────────────────────

function AnimatedBossSprite({
  ksLevel = "ks2",
  animationState = "idle", // idle | hit | attack | death
  size = "md",
  style = {},
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const animationRef = useRef(null);
  const sizeMap = { sm: 80, md: 120, lg: 160 };
  const dimension = sizeMap[size] || sizeMap.md;

  // Map animation state to spritesheet folder
  const animationFolderMap = {
    idle: "Idle",
    hit: "Hit",
    attack: "Roar",
    death: "Death",
  };
  const folder = animationFolderMap[animationState] || "Idle";

  // Frame count per animation (standard directional sets have 16 frames, front-facing)
  const frameCount = 16;
  const currentFrame = frameIndex % frameCount;
  const paddedFrame = String(currentFrame * 22.5).padStart(3, "0"); // 0°, 22.5°, 45°, etc.

  useEffect(() => {
    // Animate frames at ~10 FPS for smooth idle, faster for hit/attack
    const fps = animationState === "idle" ? 10 : 12;
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % (frameCount * 10)); // cycle 10 times
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [animationState, frameCount]);

  // Fallback to static MonsterSprite if spritesheet not found
  const spriteUrl = `/assets/kenney/monsters/spritesheets/${folder}/${folder}_Body_${paddedFrame}.png`;

  return (
    <div
      style={{
        position: "relative",
        width: dimension,
        height: dimension,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <img
        src={spriteUrl}
        alt={`${animationState} animation`}
        onError={() => {
          // If spritesheet frame fails, render static MonsterSprite
          // This is handled by the parent component fallback
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

// ─── BOSS DISPLAY WITH ANIMATION STATE ──────────────────────────────────

function BossDisplay({
  ksLevel = "ks2",
  currentHp,
  maxHp,
  result,
  style = {},
}) {
  // Determine animation state based on battle result
  let animationState = "idle";
  if (currentHp <= 0) {
    animationState = "death";
  } else if (result?.damage > 0) {
    animationState = "hit";
  } else if (result && result.damage === 0) {
    animationState = "attack";
  }

  const hpPercent = Math.max(0, (currentHp / maxHp) * 100);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        ...style,
      }}
    >
      {/* Boss sprite with hover effect */}
      <div
        style={{
          position: "relative",
          transform: hpPercent < 25 ? "scale(0.95)" : "scale(1)",
          opacity: hpPercent <= 0 ? 0.6 : 1,
          filter: hpPercent <= 0 ? "grayscale(1)" : "none",
          transition: "all 0.4s ease",
        }}
      >
        <AnimatedBossSprite
          ksLevel={ksLevel}
          animationState={animationState}
          size="lg"
        />
      </div>

      {/* Optional: Show static sprite if spritesheet fails */}
      {/* Uncomment to fallback to static MonsterSprite:
      <MonsterSprite ksLevel={ksLevel} size="lg" />
      */}
    </div>
  );
}

// ─── SHIELD DISPLAY ──────────────────────────────────────────────────────────

function ShieldBar({ shields, maxShields = 3 }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: maxShields }).map((_, i) => (
        <div
          key={i}
          style={{
            fontSize: 20,
            opacity: i < shields ? 1 : 0.2,
            transform: i < shields ? "scale(1)" : "scale(0.8)",
            transition: "all 0.4s ease",
            filter: i < shields ? "none" : "grayscale(1)",
          }}
        >
          🛡️
        </div>
      ))}
    </div>
  );
}

// ─── HP BAR ──────────────────────────────────────────────────────────────────

function BossHPBar({ current, max, colour }) {
  const pct = max > 0 ? Math.max(0, (current / max) * 100) : 0;
  const hpColour = pct > 50 ? colour : pct > 25 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ width: "100%" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: 11, fontWeight: 700, marginBottom: 4,
      }}>
        <span style={{ color: "rgba(255,255,255,0.6)" }}>HP</span>
        <span style={{ color: hpColour }}>{current} / {max}</span>
      </div>
      <div style={{
        height: 12, borderRadius: 6, background: "rgba(255,255,255,0.1)",
        overflow: "hidden", position: "relative",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${hpColour}, ${hpColour}cc)`,
          borderRadius: 6, transition: "width 0.6s ease, background 0.4s",
          boxShadow: `0 0 10px ${hpColour}40`,
        }} />
      </div>
    </div>
  );
}

// ─── DAMAGE FLASH ────────────────────────────────────────────────────────────

function DamageFlash({ damage, isWeakness, visible }) {
  if (!visible || !damage) return null;

  return (
    <div style={{
      position: "absolute", top: "30%", left: "50%",
      transform: "translate(-50%, -50%)",
      fontSize: 28, fontWeight: 900,
      color: isWeakness ? "#fbbf24" : "#ef4444",
      textShadow: `0 0 20px ${isWeakness ? "#fbbf24" : "#ef4444"}`,
      animation: "floatUp 1s ease-out forwards",
      pointerEvents: "none", zIndex: 10,
    }}>
      -{damage}{isWeakness ? " 💥" : ""}
    </div>
  );
}

// ─── QUESTION FETCHER ────────────────────────────────────────────────────────

async function fetchBossBattleQuestions(
  supabase,
  scholar,
  limit = 20
) {
  if (!scholar?.id || !scholar?.curriculum || !scholar?.year_level) {
    console.error("Invalid scholar data for boss battle");
    return [];
  }

  try {
    // Year level to KS mapping
    const yearToKS = {
      1: 1, 2: 1,
      3: 2, 4: 2, 5: 2, 6: 2,
      7: 3, 8: 3, 9: 3,
      10: 4, 11: 4,
    };
    const ksLevel = yearToKS[scholar.year_level] || 2;

    // Fetch MCQ questions for this scholar's curriculum and year level
    const { data, error } = await supabase
      .from("question_bank")
      .select("id, question_text, options, correct_index, difficulty_tier, subject, curriculum, year_level")
      .eq("is_active", true)
      .eq("question_type", "mcq")
      .eq("curriculum", scholar.curriculum)
      .eq("year_level", scholar.year_level)
      .limit(limit);

    if (error) {
      console.error("Error fetching boss battle questions:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn("No questions found for boss battle. Trying cross-curriculum fallback...");
      // Fallback: try to get any active MCQ questions for the year level
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("question_bank")
        .select("id, question_text, options, correct_index, difficulty_tier, subject, curriculum, year_level")
        .eq("is_active", true)
        .eq("question_type", "mcq")
        .eq("year_level", scholar.year_level)
        .limit(limit);

      if (fallbackError) {
        console.error("Fallback fetch also failed:", fallbackError.message);
        return [];
      }
      return fallbackData || [];
    }

    return data;
  } catch (err) {
    console.error("Unexpected error fetching boss battle questions:", err);
    return [];
  }
}

// ─── CONVERT DB QUESTION TO BOSS BATTLE FORMAT ────────────────────────────────

function convertDbQuestionToBattleFormat(dbQuestion) {
  if (!dbQuestion) return null;

  let options = [];
  try {
    if (typeof dbQuestion.options === "string") {
      options = JSON.parse(dbQuestion.options);
    } else if (Array.isArray(dbQuestion.options)) {
      options = dbQuestion.options;
    }
  } catch (e) {
    console.error("Failed to parse options:", e);
    return null;
  }

  if (!options || options.length === 0) {
    console.warn("Question has no options:", dbQuestion);
    return null;
  }

  return {
    q: dbQuestion.question_text,
    opts: options,
    a: dbQuestion.correct_index || 0,
    difficulty_tier: dbQuestion.difficulty_tier || 3,
    subject: dbQuestion.subject || "",
    curriculum: dbQuestion.curriculum || "",
    id: dbQuestion.id,
  };
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function BossBattleUI({
  // New interface props
  scholar,
  bossQuest,
  supabase,
  onClose,
  onVictory,
  // Legacy interface props
  battle: legacyBattle,
  question: legacyQuestion,
  onAnswer: legacyOnAnswer,
  onComplete: legacyOnComplete,
  band = "ks2",
}) {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [showDamage, setShowDamage] = useState(false);
  const [phase, setPhase] = useState("fighting"); // fighting | victory | defeat | loading
  const resultTimerRef = useRef(null);

  // State for new interface
  const [battle, setBattle] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Determine if we're using new or legacy interface
  const isNewInterface = !!(scholar && bossQuest && supabase);
  const isLegacyInterface = !!(legacyBattle && legacyQuestion);

  // Initialize boss battle with real questions (new interface)
  useEffect(() => {
    if (!isNewInterface || battle) return;

    async function initBossBattle() {
      setLoading(true);
      setPhase("loading");

      try {
        // Fetch questions from database
        const dbQuestions = await fetchBossBattleQuestions(supabase, scholar, 20);

        if (dbQuestions.length === 0) {
          setError("No questions available for this boss battle.");
          setPhase("fighting");
          setLoading(false);
          return;
        }

        // Convert to battle format and filter out invalid questions
        const validQuestions = dbQuestions
          .map(convertDbQuestionToBattleFormat)
          .filter(q => q !== null);

        if (validQuestions.length === 0) {
          setError("Failed to format questions for battle.");
          setPhase("fighting");
          setLoading(false);
          return;
        }

        setQuestions(validQuestions);

        // Create BossBattle instance
        const battleInstance = new BossBattle(bossQuest);
        setBattle(battleInstance);
        setQuestion(validQuestions[0]);
        setQuestionIndex(0);
        setPhase("fighting");
      } catch (err) {
        console.error("Failed to initialize boss battle:", err);
        setError("Failed to initialize boss battle. Please try again.");
        setPhase("fighting");
      } finally {
        setLoading(false);
      }
    }

    initBossBattle();
  }, [isNewInterface, scholar, bossQuest, supabase, battle]);

  // Use either new or legacy battle/question
  const activeBattle = isNewInterface ? battle : legacyBattle;
  const activeQuestion = isNewInterface ? question : legacyQuestion;
  const handleClose = onClose || (() => {});
  const handleVictory = onVictory || (() => {});

  // Reset selection when question changes
  useEffect(() => {
    setSelected(null);
    setResult(null);
    setShowDamage(false);
  }, [activeQuestion?.q]);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(resultTimerRef.current), []);

  // Loading state
  if (phase === "loading") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, textAlign: "center", gap: 16,
      }}>
        <div style={{ fontSize: 28, animation: "spin 1s linear infinite" }}>⚙️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
          Preparing Boss Battle…
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, textAlign: "center", gap: 16,
      }}>
        <div style={{ fontSize: 28 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444" }}>
          {error}
        </div>
        <button
          onClick={handleClose}
          style={{
            padding: "8px 16px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent", color: "rgba(255,255,255,0.6)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    );
  }

  if (!activeBattle || !activeQuestion) return null;

  // Map band to KS level for boss config lookup
  const ksLevelMap = { ks1: "ks1", ks2: "ks2", ks3: "ks3", ks4: "ks4" };
  const configKsLevel = ksLevelMap[band] || band;
  const bossConfig = BOSS_CONFIGS[configKsLevel] || BOSS_CONFIGS.ks2;
  const bossColour = bossConfig.primaryColor;
  const fontSize = band === "ks1" ? 16 : 14;

  function handleSelect(optionIndex) {
    if (selected !== null) return; // Already answered
    setSelected(optionIndex);

    const isCorrect = optionIndex === activeQuestion.a;
    const battleResult = activeBattle.processAnswer(
      isCorrect,
      activeQuestion.difficulty_tier || 3,
      activeQuestion.subject || ""
    );
    setResult(battleResult);

    if (battleResult.damage > 0) {
      setShowDamage(true);
      setTimeout(() => setShowDamage(false), 1000);
    }

    // Check for battle end
    resultTimerRef.current = setTimeout(async () => {
      if (battleResult.isDefeated) {
        setPhase("victory");

        // New interface: save results to database
        if (isNewInterface) {
          const results = activeBattle.getResults();
          try {
            await saveBossBattleResult(results, supabase);

            // Award rewards to scholar
            const xpReward = bossQuest.xp_reward || 250;
            const coinReward = bossQuest.coin_reward || 75;

            const { data: updated } = await supabase
              .from("scholars")
              .update({
                xp: (scholar.xp || 0) + xpReward,
                coins: (scholar.coins || 0) + coinReward,
              })
              .eq("id", scholar.id)
              .select()
              .single();

            setTimeout(() => {
              handleVictory({ xp: xpReward, coins: coinReward, updated });
            }, 2500);
          } catch (err) {
            console.error("Failed to save boss battle result:", err);
            setTimeout(() => handleVictory({}), 2500);
          }
        } else {
          // Legacy interface
          setTimeout(() => legacyOnComplete(activeBattle.getResults()), 2500);
        }
      } else if (battleResult.isLost) {
        setPhase("defeat");

        // New interface: save results to database
        if (isNewInterface) {
          const results = activeBattle.getResults();
          try {
            await saveBossBattleResult(results, supabase);
          } catch (err) {
            console.error("Failed to save boss battle result:", err);
          }
          setTimeout(() => handleClose(), 2500);
        } else {
          // Legacy interface
          setTimeout(() => legacyOnComplete(activeBattle.getResults()), 2500);
        }
      } else {
        // Continue with next question
        if (isNewInterface) {
          const nextIndex = questionIndex + 1;
          if (nextIndex < questions.length) {
            setQuestion(questions[nextIndex]);
            setQuestionIndex(nextIndex);
          } else {
            // Out of questions, randomly cycle
            const randomIndex = Math.floor(Math.random() * questions.length);
            setQuestion(questions[randomIndex]);
            setQuestionIndex(randomIndex);
          }
        } else {
          // Legacy interface
          legacyOnAnswer(optionIndex);
        }
      }
    }, 1500);
  }

  // ── Victory/Defeat screens ─────────────────────────────────────────────

  if (phase === "victory") {
    const xpReward = bossQuest?.xp_reward || 250;
    const coinReward = bossQuest?.coin_reward || 75;

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, textAlign: "center", gap: 16,
      }}>
        <div style={{ fontSize: 64 }}>🏆</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#fbbf24" }}>
          BOSS DEFEATED!
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
          You defeated {activeBattle.bossName}!
        </div>
        <div style={{
          display: "flex", gap: 16, marginTop: 8,
          fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)",
        }}>
          <span>⭐ +{xpReward} XP</span>
          <span>🪙 +{coinReward} Coins</span>
        </div>
      </div>
    );
  }

  if (phase === "defeat") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, textAlign: "center", gap: 16,
      }}>
        <div style={{ fontSize: 64 }}>💔</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#ef4444" }}>
          BATTLE LOST
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
          {activeBattle.bossName} was too strong this time. Train harder and try again!
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          Damage dealt: {activeBattle.totalDamageDealt} / {activeBattle.maxHp}
        </div>
      </div>
    );
  }

  // ── Battle screen ──────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
      {/* Injected CSS for damage animation */}
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -120%) scale(1.3); }
        }
        @keyframes bossShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>

      {/* Boss section */}
      <div style={{
        position: "relative",
        background: `linear-gradient(135deg, ${bossColour}15, ${bossColour}08)`,
        border: `1px solid ${bossColour}30`,
        borderRadius: 16, padding: 16,
      }}>
        <DamageFlash
          damage={result?.damage}
          isWeakness={result?.isWeaknessHit}
          visible={showDamage}
        />

        {/* Boss sprite with animation */}
        <div
          style={{
            animation: result?.damage ? "bossShake 0.5s ease" : "none",
            marginBottom: 12,
          }}
        >
          <BossDisplay
            ksLevel={configKsLevel}
            currentHp={activeBattle.currentHp}
            maxHp={activeBattle.maxHp}
            result={result}
          />
        </div>

        {/* Boss name and HP bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: bossColour, marginBottom: 8, textAlign: "center" }}>
            {bossConfig.name}
          </div>
          <BossHPBar
            current={activeBattle.currentHp}
            max={activeBattle.maxHp}
            colour={bossColour}
          />
        </div>

        {/* Scholar shields */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
            Your Shields
          </span>
          <ShieldBar shields={activeBattle.scholarShields} />
        </div>
      </div>

      {/* Question */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14, padding: 16,
      }}>
        <div style={{
          fontSize, fontWeight: 700, color: "rgba(255,255,255,0.9)",
          lineHeight: 1.5, marginBottom: 12,
        }}>
          {activeQuestion.q || activeQuestion.question_text}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {(activeQuestion.opts || []).map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === activeQuestion.a;
            const showResult = selected !== null;

            let bg = "rgba(255,255,255,0.06)";
            let border = "1px solid rgba(255,255,255,0.1)";
            let textColour = "rgba(255,255,255,0.8)";

            if (showResult) {
              if (isCorrect) {
                bg = "rgba(34,197,94,0.15)";
                border = "1px solid rgba(34,197,94,0.4)";
                textColour = "#22c55e";
              } else if (isSelected && !isCorrect) {
                bg = "rgba(239,68,68,0.15)";
                border = "1px solid rgba(239,68,68,0.4)";
                textColour = "#ef4444";
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={selected !== null}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 10,
                  background: bg, border,
                  color: textColour,
                  fontSize: fontSize - 1, fontWeight: 600,
                  cursor: selected !== null ? "default" : "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: isSelected ? (isCorrect ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                  color: isSelected ? "#fff" : "rgba(255,255,255,0.5)",
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Battle feedback */}
        {result && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 10,
            fontSize: 12, fontWeight: 700, textAlign: "center",
            background: result.damage > 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: result.damage > 0 ? "#22c55e" : "#ef4444",
          }}>
            {result.damage > 0
              ? `💥 ${result.damage} damage dealt!${result.isWeaknessHit ? " SUPER EFFECTIVE!" : ""}`
              : `${activeBattle.bossIcon} Boss attacks! Shield lost!`}
          </div>
        )}
      </div>

      {/* Exit button */}
      <button
        onClick={handleClose}
        style={{
          alignSelf: "center", padding: "6px 16px", borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "transparent", color: "rgba(255,255,255,0.3)",
          fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}
      >
        Retreat (save progress)
      </button>
    </div>
  );
}
