/**
 * bossBattleEngine.js — Weekly boss battle system
 *
 * A weekly challenge presented as a boss fight where answering questions
 * correctly deals damage. Each boss has HP, a weakness subject, and
 * special mechanics tied to the scholar's learning gaps.
 *
 * Integration:
 *   - Boss battles are assigned weekly via cron (like weekly quests)
 *   - Uses scholar_quests table with quest_type = "boss_battle"
 *   - Questions are fetched from the regular questions table
 *   - Rewards use existing coins/XP/badge infrastructure
 *
 * Flow:
 *   1. Weekly cron assigns a boss based on scholar's weakest subject
 *   2. Scholar enters boss battle from dashboard
 *   3. Each correct answer deals damage (based on difficulty tier)
 *   4. Wrong answers let the boss attack (lose a shield/life)
 *   5. Beat the boss → big XP/coin reward + special badge progress
 *
 * Usage:
 *   import { assignBossBattle, BossBattle } from '@/lib/bossBattleEngine';
 */

import { getSubjectLabel, getSubjectColor } from "./subjectDisplay";
import { calculatePercentage } from "./calculationUtils";

// ─── BOSS DEFINITIONS ────────────────────────────────────────────────────────
// Each boss is themed around a subject area and has scaling HP.

const BOSS_TEMPLATES = [
  {
    id: "number_kraken",
    name: "The Number Kraken",
    subjects: ["mathematics", "maths", "further_mathematics"],
    icon: "🐙",
    description: "A tentacled beast that feeds on unsolved equations!",
    baseHp: 100,
    attackPower: 15,
    weaknessBonus: 1.5,
    colour: "#4f46e5",
  },
  {
    id: "grammar_golem",
    name: "The Grammar Golem",
    subjects: ["english", "english_studies", "ela", "literature"],
    icon: "🗿",
    description: "A stone giant powered by misplaced apostrophes!",
    baseHp: 90,
    attackPower: 12,
    weaknessBonus: 1.5,
    colour: "#e11d48",
  },
  {
    id: "science_serpent",
    name: "The Science Serpent",
    subjects: ["science", "basic_science", "physics", "chemistry", "biology"],
    icon: "🐍",
    description: "A venomous snake from the depths of the periodic table!",
    baseHp: 110,
    attackPower: 14,
    weaknessBonus: 1.5,
    colour: "#059669",
  },
  {
    id: "history_hydra",
    name: "The History Hydra",
    subjects: ["history", "social_studies", "canadian_history"],
    icon: "🐉",
    description: "Every wrong answer grows a new head from a forgotten era!",
    baseHp: 80,
    attackPower: 10,
    weaknessBonus: 1.5,
    colour: "#d97706",
  },
  {
    id: "geo_guardian",
    name: "The Geo Guardian",
    subjects: ["geography", "hass"],
    icon: "🌋",
    description: "A volcanic sentinel protecting the world's secrets!",
    baseHp: 85,
    attackPower: 11,
    weaknessBonus: 1.5,
    colour: "#0d9488",
  },
  {
    id: "code_phantom",
    name: "The Code Phantom",
    subjects: ["computing", "computer_science", "basic_digital_literacy"],
    icon: "👻",
    description: "A digital ghost hiding in corrupted code!",
    baseHp: 95,
    attackPower: 13,
    weaknessBonus: 1.5,
    colour: "#6366f1",
  },
  {
    id: "civic_cyclops",
    name: "The Civic Cyclops",
    subjects: ["civic_education", "government", "citizenship"],
    icon: "👁️",
    description: "A one-eyed giant who has forgotten the rules of governance!",
    baseHp: 75,
    attackPower: 10,
    weaknessBonus: 1.5,
    colour: "#0891b2",
  },
  {
    id: "shadow_sphinx",
    name: "The Shadow Sphinx",
    subjects: ["verbal_reasoning", "nvr"],
    icon: "🦁",
    description: "Answer its riddles or be turned to stone!",
    baseHp: 100,
    attackPower: 15,
    weaknessBonus: 1.5,
    colour: "#7c3aed",
  },
];

/** Fallback boss for subjects without a specific template */
const DEFAULT_BOSS = {
  id: "knowledge_knight",
  name: "The Knowledge Knight",
  subjects: [],
  icon: "⚔️",
  description: "A fearsome warrior of forgotten knowledge!",
  baseHp: 90,
  attackPower: 12,
  weaknessBonus: 1.3,
  colour: "#64748b",
};

// ─── DAMAGE CALCULATION ──────────────────────────────────────────────────────

/** Damage dealt per correct answer, scaled by difficulty tier */
const BASE_DAMAGE = 10;
const TIER_MULTIPLIERS = { 1: 0.8, 2: 1.0, 3: 1.2, 4: 1.5, 5: 2.0 };

/** Boss HP scales with scholar's year level */
const YEAR_HP_SCALE = {
  1: 0.6, 2: 0.7, 3: 0.8, 4: 0.9, 5: 1.0,
  6: 1.0, 7: 1.1, 8: 1.2, 9: 1.3, 10: 1.4, 11: 1.5,
};

// ─── BOSS SELECTION ──────────────────────────────────────────────────────────

/**
 * Find the best boss for a scholar based on their weakest subject.
 * @param {string} weakestSubject — subject key
 * @param {number} yearLevel
 * @returns {object} Boss config with scaled HP
 */
export function selectBoss(weakestSubject, yearLevel = 6) {
  const subjectLower = (weakestSubject || "").toLowerCase();

  const matched = BOSS_TEMPLATES.find((b) =>
    b.subjects.includes(subjectLower)
  ) || DEFAULT_BOSS;

  const hpScale = YEAR_HP_SCALE[yearLevel] || 1.0;
  const scaledHp = Math.round(matched.baseHp * hpScale);

  return {
    ...matched,
    hp: scaledHp,
    maxHp: scaledHp,
    weaknessSubject: weakestSubject,
    yearLevel,
  };
}

/**
 * Assign a weekly boss battle to a scholar.
 * Analyses mastery to pick the boss matching their weakest area.
 *
 * @param {string} scholarId
 * @param {object} supabaseClient
 * @returns {Promise<object|null>} Inserted quest row, or null
 */
export async function assignBossBattle(scholarId, supabaseClient) {
  // Check if scholar already has an active boss battle this week
  const { data: existing } = await supabaseClient
    .from("scholar_quests")
    .select("id")
    .eq("scholar_id", scholarId)
    .eq("quest_type", "boss_battle")
    .eq("status", "active")
    .limit(1);

  if (existing?.length > 0) return null; // Already has one

  // Find weakest subject from mastery data
  const { data: mastery } = await supabaseClient
    .from("scholar_mastery")
    .select("subject, mastery_score")
    .eq("scholar_id", scholarId)
    .order("mastery_score", { ascending: true })
    .limit(3);

  const { data: scholar } = await supabaseClient
    .from("scholars")
    .select("year_level")
    .eq("id", scholarId)
    .single();

  const yearLevel = scholar?.year_level || 6;
  const weakestSubject = mastery?.[0]?.subject || "mathematics";

  const boss = selectBoss(weakestSubject, yearLevel);

  // Expires end of week
  const expiresAt = new Date();
  const daysUntilSunday = 7 - expiresAt.getDay();
  expiresAt.setDate(expiresAt.getDate() + (daysUntilSunday || 7));
  expiresAt.setHours(23, 59, 59, 999);

  const questRow = {
    scholar_id: scholarId,
    quest_type: "boss_battle",
    quest_id: `boss_${boss.id}_${Date.now()}`,
    quest_name: `Boss Battle: ${boss.name}`,
    quest_description: boss.description,
    target_value: boss.hp,
    current_progress: 0,
    xp_reward: 250,
    coin_reward: 75,
    status: "active",
    expires_at: expiresAt.toISOString(),
    metadata: JSON.stringify({
      bossId: boss.id,
      bossName: boss.name,
      bossIcon: boss.icon,
      bossColour: boss.colour,
      maxHp: boss.maxHp,
      attackPower: boss.attackPower,
      weaknessSubject: boss.weaknessSubject,
      weaknessBonus: boss.weaknessBonus,
      yearLevel,
    }),
  };

  const { data, error } = await supabaseClient
    .from("scholar_quests")
    .insert(questRow)
    .select()
    .single();

  if (error) {
    console.error("Failed to assign boss battle:", error.message);
    return null;
  }

  return data;
}

// ─── BOSS BATTLE SESSION (CLIENT-SIDE) ───────────────────────────────────────

/**
 * Manages a live boss battle session in the browser.
 * Tracks damage, shields, and determines win/lose.
 */
export class BossBattle {
  /**
   * @param {object} questRow — from scholar_quests with parsed metadata
   */
  constructor(questRow) {
    const meta = typeof questRow.metadata === "string"
      ? JSON.parse(questRow.metadata)
      : questRow.metadata || {};

    this.questId = questRow.id;
    this.bossName = meta.bossName || "Boss";
    this.bossIcon = meta.bossIcon || "⚔️";
    this.bossColour = meta.bossColour || "#64748b";
    this.maxHp = meta.maxHp || 100;
    this.currentHp = this.maxHp - (questRow.current_progress || 0);
    this.attackPower = meta.attackPower || 12;
    this.weaknessSubject = meta.weaknessSubject || "";
    this.weaknessBonus = meta.weaknessBonus || 1.3;

    this.scholarShields = 3;  // Lives/shields
    this.totalDamageDealt = questRow.current_progress || 0;
    this.questionsAnswered = 0;
    this.correctAnswers = 0;
    this.isDefeated = false;
    this.isLost = false;
  }

  /**
   * Process a scholar's answer against the boss.
   * @param {boolean} isCorrect
   * @param {number} difficultyTier — 1-5
   * @param {string} questionSubject — subject of the question
   * @returns {{ damage: number, bossAttack: boolean, shieldsLeft: number, bossHp: number, isDefeated: boolean, isLost: boolean }}
   */
  processAnswer(isCorrect, difficultyTier = 3, questionSubject = "") {
    this.questionsAnswered += 1;

    if (isCorrect) {
      this.correctAnswers += 1;

      // Calculate damage
      let damage = BASE_DAMAGE * (TIER_MULTIPLIERS[difficultyTier] || 1.0);

      // Weakness bonus: extra damage if question matches boss's weak subject
      const isWeakness = this.weaknessSubject &&
        questionSubject.toLowerCase() === this.weaknessSubject.toLowerCase();
      if (isWeakness) {
        damage = Math.round(damage * this.weaknessBonus);
      } else {
        damage = Math.round(damage);
      }

      this.currentHp = Math.max(0, this.currentHp - damage);
      this.totalDamageDealt += damage;

      if (this.currentHp <= 0) {
        this.isDefeated = true;
      }

      return {
        damage,
        bossAttack: false,
        shieldsLeft: this.scholarShields,
        bossHp: this.currentHp,
        bossHpPercent: calculatePercentage(this.currentHp, this.maxHp),
        isDefeated: this.isDefeated,
        isLost: false,
        isWeaknessHit: isWeakness,
      };
    }

    // Wrong answer: boss attacks
    this.scholarShields -= 1;
    this.isLost = this.scholarShields <= 0;

    return {
      damage: 0,
      bossAttack: true,
      bossAttackDamage: this.attackPower,
      shieldsLeft: this.scholarShields,
      bossHp: this.currentHp,
      bossHpPercent: calculatePercentage(this.currentHp, this.maxHp),
      isDefeated: false,
      isLost: this.isLost,
      isWeaknessHit: false,
    };
  }

  /**
   * Get battle results for saving.
   * @returns {object}
   */
  getResults() {
    return {
      questId: this.questId,
      bossName: this.bossName,
      isDefeated: this.isDefeated,
      isLost: this.isLost,
      totalDamageDealt: this.totalDamageDealt,
      questionsAnswered: this.questionsAnswered,
      correctAnswers: this.correctAnswers,
      accuracy: calculatePercentage(this.correctAnswers, this.questionsAnswered),
      shieldsRemaining: this.scholarShields,
      bossHpRemaining: this.currentHp,
    };
  }
}

/**
 * Save boss battle results to the quest row.
 * @param {object} results — from BossBattle.getResults()
 * @param {object} supabaseClient
 */
export async function saveBossBattleResult(results, supabaseClient) {
  const status = results.isDefeated ? "completed" : results.isLost ? "failed" : "active";

  await supabaseClient
    .from("scholar_quests")
    .update({
      current_progress: results.totalDamageDealt,
      status,
      completed_at: results.isDefeated ? new Date().toISOString() : null,
    })
    .eq("id", results.questId);
}

/**
 * Get all available boss templates (for UI display).
 * @returns {Array}
 */
export function getAllBossTemplates() {
  return BOSS_TEMPLATES.map((b) => ({
    id: b.id,
    name: b.name,
    icon: b.icon,
    description: b.description,
    colour: b.colour,
    subjects: b.subjects.map((s) => getSubjectLabel(s)),
  }));
}
