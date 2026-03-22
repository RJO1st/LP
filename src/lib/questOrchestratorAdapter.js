/**
 * questOrchestratorAdapter.js
 * Deploy to: src/lib/questOrchestratorAdapter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Adapter that connects ageBandConfig to QuestOrchestrator.
 *
 * Instead of modifying QuestOrchestrator directly (which is large and fragile),
 * this adapter provides helper functions that the orchestrator calls at key points.
 *
 * INTEGRATION (add to QuestOrchestrator.jsx):
 *
 *   import { getQuestFrame, getTimerConfig, getTaraConfig,
 *            getSubmitLabel, getRewardLabel } from '@/lib/questOrchestratorAdapter';
 *
 *   // At component mount:
 *   const frame = getQuestFrame(student.year_level, subject, topic);
 *   const timer = getTimerConfig(student.year_level);
 *   const tara  = getTaraConfig(student.year_level);
 *
 *   // In JSX:
 *   <h2>{frame.prefix}</h2>                    // "Help the unicorn!" or "Commander, incoming!"
 *   <Timer duration={timer.duration} ... />     // 45s or 30s
 *   <button>{getSubmitLabel(yr, selected !== null)}</button>
 *   <RewardBadge label={getRewardLabel(yr, 10)} />  // "+10 Stars" or "+10 Stardust"
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getAgeBand, getBandConfig, getQuestNarrative } from './ageBandConfig';

/**
 * Get question framing for the quest header.
 * @param {number} yearLevel
 * @param {string} subject
 * @param {string} topic
 * @returns {{ prefix, label, narrative, mascot }}
 */
export function getQuestFrame(yearLevel, subject, topic) {
  const band   = getAgeBand(yearLevel);
  const config = getBandConfig(band);
  const topicLabel = (topic || '').replace(/_/g, ' ');
  const subjectLabel = (subject || '').replace(/_/g, ' ');

  return {
    prefix:    config.questionPrefix(topic),
    label:     `${config.questLabel} · ${subjectLabel}`,
    narrative: getQuestNarrative(band, subject, topic),
    mascot:    config.mascot,
    band,
  };
}

/**
 * Get timer configuration for the quest.
 * @param {number} yearLevel
 * @returns {{ duration, style, showNumbers }}
 */
export function getTimerConfig(yearLevel) {
  const band   = getAgeBand(yearLevel);
  const config = getBandConfig(band);
  return { ...config.timer, band };
}

/**
 * Get Tara's configuration for feedback messages.
 * @param {number} yearLevel
 * @returns {{ name, icon, tone, emojiUse, maxWords, correctPhrases, incorrectPhrases, showMeMode, band }}
 */
export function getTaraConfig(yearLevel) {
  const band   = getAgeBand(yearLevel);
  const config = getBandConfig(band);
  return { ...config.tara, band };
}

/**
 * Get submit button label based on state.
 * @param {number} yearLevel
 * @param {boolean} hasSelection — whether an option is selected
 * @returns {string}
 */
export function getSubmitLabel(yearLevel, hasSelection) {
  const band   = getAgeBand(yearLevel);
  const config = getBandConfig(band);
  return hasSelection ? config.submitLabel.ready : config.submitLabel.waiting;
}

/**
 * Get next button label.
 * @param {number} yearLevel
 * @param {boolean} isLast — whether this is the last question
 * @returns {string}
 */
export function getNextLabel(yearLevel, isLast) {
  const band   = getAgeBand(yearLevel);
  const config = getBandConfig(band);
  return isLast ? config.completeLabel : config.nextLabel;
}

/**
 * Get reward label for XP display.
 * @param {number} yearLevel
 * @param {number} amount
 * @returns {{ icon, text }}
 */
export function getRewardLabel(yearLevel, amount) {
  const band   = getAgeBand(yearLevel);
  const config = getBandConfig(band);
  return {
    icon: config.xpIcon,
    text: `+${amount} ${config.xpName}`,
  };
}

/**
 * Get a random Tara feedback message (local fallback).
 * @param {number} yearLevel
 * @param {boolean} isCorrect
 * @param {string} scholarName
 * @returns {string}
 */
export function getTaraFeedback(yearLevel, isCorrect, scholarName) {
  const band   = getAgeBand(yearLevel);
  const config = getBandConfig(band);
  const pool   = isCorrect ? config.tara.correctPhrases : config.tara.incorrectPhrases;
  let msg = pool[Math.floor(Math.random() * pool.length)];
  // Replace name placeholders
  msg = msg.replace(/Commander\s*/g, scholarName ? `Commander ${scholarName}` : 'Commander');
  return msg;
}

/**
 * Get the full theme colours for styled components.
 * @param {number} yearLevel
 * @returns {object} — full colours object from ageBandConfig
 */
export function getQuestColours(yearLevel) {
  const band   = getAgeBand(yearLevel);
  const config = getBandConfig(band);
  return { ...config.colours, band, fonts: config.fonts, radius: config.radius };
}

/**
 * Get option button style config.
 * @param {number} yearLevel
 * @returns {{ style, size, radius }}
 */
export function getOptionStyle(yearLevel) {
  const band   = getAgeBand(yearLevel);
  const config = getBandConfig(band);
  return {
    style: config.optionStyle,
    size:  config.buttonSize,
    radius: config.radius.button,
    band,
  };
}