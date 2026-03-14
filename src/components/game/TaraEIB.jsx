"use client";
/**
 * TaraEIB.jsx
 * Deploy to: src/components/game/TaraEIB.jsx
 *
 * Tara's "Explain It Back" challenge — shown after a wrong answer.
 * Scholar must articulate why the correct answer is right before proceeding.
 * After Tara's first reply, scholars can ask one follow-up question.
 *
 * Exports:
 *   default  TaraEIB    — the challenge widget
 *   named    useTaraGate — hook to track whether the challenge is complete
 */

import React, { useState, useCallback } from "react";
import { Zap, MessageCircle } from "lucide-react";

// ─── PROFANITY GUARD ─────────────────────────────────────────────────────────
// Client-side first line of defence. API/system prompt handles edge cases.
const BLOCKED_WORDS = [
  "fuck","shit","bitch","bastard","asshole","cunt","dick","cock","pussy",
  "nigger","nigga","faggot","retard","whore","slut","damn","hell","ass",
  "bollocks","wanker","twat","piss","arse","crap",
];
const containsProfanity = (text) => {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g, " ");
  return BLOCKED_WORDS.some(w => lower.split(/\s+/).includes(w));
};

// ─── LOCAL FALLBACK FEEDBACK ─────────────────────────────────────────────────
const LOCAL_FEEDBACK = (text, subject, scholarName, scholarYear) => {
  const name   = scholarName || "Cadet";
  const lower  = (text || "").toLowerCase();
  const minLen = scholarYear <= 2 ? 5 : scholarYear <= 4 ? 10 : 15;

  if ((text || "").trim().length < minLen) {
    return scholarYear <= 2
      ? `Tara: Good try, ${name}! Can you add one more word to explain? 🌟`
      : `Tara: Copy that, ${name}. Can you explain *why* that answer is correct? 🤔`;
  }

  const keywords = {
    maths:      ["add","total","units","tens","carry","subtract","equals","because","calculate","divide","multiply","fraction","percent","factor","multiple","prime","square","ratio","place","value","hundred","thousand"],
    english:    ["verb","noun","adjective","adverb","action","describes","word","sentence","because","grammar","clause","prefix","suffix","tense","metaphor","simile","synonym","antonym"],
    verbal:     ["pattern","sequence","opposite","similar","letter","next","because","odd","order","skip","code","analogy","alphabet","relationship","category"],
    nvr:        ["shape","pattern","colour","color","rotate","flip","size","odd","different","same","repeat","mirror","reflect","symmetr","transform"],
    science:    ["element","atom","force","energy","gravity","cell","organism","reaction","compound","velocity","mass","current","photosynthesis","friction","pressure","density"],
    physics:    ["force","energy","gravity","velocity","mass","acceleration","newton","joule","watt","circuit","voltage","current","wave","frequency","pressure"],
    chemistry:  ["element","atom","molecule","reaction","compound","mixture","oxidation","acid","base","bond","electron","proton","neutron","dissolve"],
    biology:    ["cell","organism","photosynthesis","evolution","habitat","ecosystem","dna","gene","respiration","nutrient","organ","tissue","enzyme","species"],
    geography:  ["climate","region","population","migration","erosion","continent","latitude","longitude","urban","rural","river","mountain","economic","sustainable"],
    history:    ["century","decade","era","empire","revolution","conflict","treaty","evidence","source","cause","consequence","change","chronology","significant"],
    economics:  ["supply","demand","price","market","cost","profit","trade","gdp","inflation","tax","budget","goods","services","capital"],
    government: ["law","constitution","government","democracy","election","parliament","policy","rights","citizen","sovereignty"],
  };

  const subKey = (subject in keywords) ? subject
    : subject === "basic_science" ? "science"
    : subject === "social_studies" || subject === "hass" ? "geography"
    : subject === "business_studies" || subject === "commerce" || subject === "financial_accounting" ? "economics"
    : subject === "basic_technology" ? "science"
    : "maths";

  const hasKeyword = keywords[subKey]?.some(k => lower.includes(k));

  const positives = {
    maths:      [`Tara: Affirmative, ${name}! That's Commander-level reasoning! 🚀`, `Tara: Excellent step-by-step thinking, ${name}! 🏆`],
    english:    [`Tara: Spot on, ${name}! Explaining *why* shows real understanding! 🌟`, `Tara: Roger that, ${name}! You identified the rule correctly! 📡`],
    verbal:     [`Tara: Superb, ${name}! You spotted the pattern! 🔍`, `Tara: Brilliant decoding, ${name}! 🧩`],
    nvr:        [`Tara: Excellent, ${name}! Describing what changes is the strategy! 👁️`, `Tara: Target acquired, ${name}! 🌟`],
    science:    [`Tara: Outstanding scientific thinking, ${name}! 🔬`, `Tara: Excellent — evidence-based reasoning is key! ⚗️`],
    physics:    [`Tara: Perfect, ${name}! You applied the physical law correctly! ⚡`, `Tara: Excellent, ${name}! Textbook physics! 🔭`],
    chemistry:  [`Tara: Superb chemistry, ${name}! You understand the reaction! ⚗️`, `Tara: Brilliant, ${name}! The atomic structure is clear to you! 🔬`],
    biology:    [`Tara: Excellent biology thinking, ${name}! 🌿`, `Tara: Outstanding, ${name}! You understand the living world! 🧬`],
    geography:  [`Tara: Excellent spatial thinking, ${name}! 🌍`, `Tara: Mission accomplished, ${name}! Top-tier geographical reasoning! 🗺️`],
    history:    [`Tara: Brilliant historical reasoning, ${name}! ⚔️`, `Tara: Superb, ${name}! You're thinking like a historian! 📜`],
    economics:  [`Tara: Excellent economic analysis, ${name}! 📈`, `Tara: Sharp thinking, ${name}! You understand markets! 💰`],
    government: [`Tara: Excellent civic thinking, ${name}! 🏛️`, `Tara: Outstanding, ${name}! You understand governance! 📋`],
  };

  const nudges = {
    maths:      `Tara: Almost, ${name}! Try explaining using words like 'place value', 'hundreds', or 'because'. 🔢`,
    english:    `Tara: Good attempt! Try naming the grammar rule — noun, verb, tense, etc. 📖`,
    verbal:     `Tara: Nearly there! Describe the pattern or relationship you see. 🔍`,
    nvr:        `Tara: Good try! Describe what shape, colour, or transformation makes it different. 👁️`,
    science:    `Tara: Almost, ${name}! Try using scientific terms like 'energy', 'force', or 'cell'. 🔬`,
    physics:    `Tara: Almost! Try using terms like force, energy, velocity, or mass. ⚡`,
    chemistry:  `Tara: Almost! Use terms like atom, molecule, reaction, or bond. ⚗️`,
    biology:    `Tara: Almost! Try terms like cell, organism, photosynthesis, or habitat. 🌿`,
    geography:  `Tara: Almost, ${name}! Try using terms like climate, migration, erosion, or region. 🌍`,
    history:    `Tara: Good start! Try using terms like cause, consequence, evidence, or era. 📜`,
    economics:  `Tara: Almost, ${name}! Try using terms like supply, demand, cost, or market. 📊`,
    government: `Tara: Good attempt! Try using terms like rights, democracy, law, or policy. 🏛️`,
  };

  const posArr = positives[subKey] || positives.maths;
  if (hasKeyword) return posArr[Math.floor(Math.random() * posArr.length)];
  return nudges[subKey] || nudges.maths;
};

const LOCAL_FOLLOWUP_FEEDBACK = (scholarName) => {
  const name = scholarName || "Cadet";
  return `Tara: Great question, ${name}! Keep that curiosity — it's what makes great learners. You've got this! 🚀`;
};

// ─── TARA EIB COMPONENT ───────────────────────────────────────────────────────
export default function TaraEIB({ student, subject, currentQ, correctAnswer, scholarAnswer, onFeedbackReceived }) {
  const [text,          setText]          = useState("");
  const [feedback,      setFeedback]      = useState("");
  const [loading,       setLoading]       = useState(false);
  const [locked,        setLocked]        = useState(false);
  const [profanityWarn, setProfanityWarn] = useState(false);

  // Follow-up state
  const [followUpText,     setFollowUpText]     = useState("");
  const [followUpFeedback, setFollowUpFeedback] = useState("");
  const [followUpLoading,  setFollowUpLoading]  = useState(false);
  const [followUpLocked,   setFollowUpLocked]   = useState(false);
  const [followUpWarn,     setFollowUpWarn]     = useState(false);

  const scholarYear = parseInt(student?.year_level || student?.year || 4);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || locked) return;

    if (containsProfanity(text)) {
      setProfanityWarn(true);
      setText("");
      return;
    }
    setProfanityWarn(false);
    setLoading(true);

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch("/api/tara", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  controller.signal,
        body:    JSON.stringify({
          text, subject, correctAnswer, scholarAnswer,
          scholarName: student?.name,
          scholarYear,
          question: currentQ,
        }),
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.feedback) throw new Error("Empty feedback");
      setFeedback(data.feedback);
    } catch {
      clearTimeout(timeout);
      setFeedback(LOCAL_FEEDBACK(text, subject, student?.name, scholarYear));
    } finally {
      setLoading(false);
      setLocked(true);
      onFeedbackReceived?.();
    }
  }, [text, locked, subject, correctAnswer, currentQ, student, scholarYear, onFeedbackReceived]);

  const handleFollowUp = useCallback(async () => {
    if (!followUpText.trim() || followUpLocked) return;

    if (containsProfanity(followUpText)) {
      setFollowUpWarn(true);
      setFollowUpText("");
      return;
    }
    setFollowUpWarn(false);
    setFollowUpLoading(true);

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch("/api/tara", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  controller.signal,
        body:    JSON.stringify({
          text:        followUpText,
          subject,
          correctAnswer,
          scholarAnswer,
          scholarName: student?.name,
          scholarYear,
          question:    currentQ,
          mode:        "followup",
          context:     feedback,
        }),
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.feedback) throw new Error("Empty");
      setFollowUpFeedback(data.feedback);
    } catch {
      clearTimeout(timeout);
      setFollowUpFeedback(LOCAL_FOLLOWUP_FEEDBACK(student?.name));
    } finally {
      setFollowUpLoading(false);
      setFollowUpLocked(true);
    }
  }, [followUpText, followUpLocked, subject, correctAnswer, currentQ, student, scholarYear, feedback]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !locked) { e.preventDefault(); handleSubmit(); }
  };

  const handleFollowUpKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !followUpLocked) { e.preventDefault(); handleFollowUp(); }
  };

  return (
    <div className="bg-amber-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-200 mb-3">

      {/* ── Challenge prompt ── */}
      <p className="text-amber-800 font-bold text-xs sm:text-sm mb-2 sm:mb-3">
        <span className="font-black">Tara's Challenge:</span>{" "}
        {scholarAnswer && scholarAnswer !== correctAnswer ? (
          <>You chose <span className="underline">{scholarAnswer}</span>, but the correct answer is{" "}
          <span className="underline font-black">{correctAnswer}</span>. Can you explain why?</>
        ) : (
          <>Why is <span className="underline font-black">{correctAnswer}</span> the correct answer?</>
        )}
      </p>

      {/* ── Profanity warning ── */}
      {profanityWarn && (
        <p className="text-red-600 font-bold text-xs mb-2 bg-red-50 border border-red-200 rounded-lg p-2">
          ⚠️ Let's keep it respectful! Rephrase your answer and try again.
        </p>
      )}

      {/* ── Main input ── */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={locked}
        rows={2}
        placeholder="Type your reasoning and press Enter…"
        className="w-full p-2 sm:p-3 rounded-lg sm:rounded-xl border border-amber-200 font-bold text-xs sm:text-sm bg-white mb-2 resize-none focus:outline-none focus:border-amber-400 disabled:opacity-60"
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || loading || locked}
        className="w-full bg-amber-500 text-white font-black py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs uppercase tracking-widest border-b-2 border-amber-700 disabled:opacity-50 flex items-center justify-center gap-1 transition-all active:border-b-0 active:translate-y-0.5"
      >
        <Zap size={12} /> {loading ? "Thinking…" : "Tell Tara ✨"}
      </button>

      {/* ── Tara's first response ── */}
      {feedback && (
        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-amber-100 text-amber-900 font-bold italic text-xs sm:text-sm leading-relaxed">
          {feedback}
        </div>
      )}

      {/* ── Follow-up section (only shown after Tara's first reply) ── */}
      {feedback && !followUpFeedback && (
        <div className="mt-3 border-t border-amber-100 pt-3">
          <p className="text-amber-700 font-bold text-xs mb-2 flex items-center gap-1">
            <MessageCircle size={12} />
            Still curious? Ask Tara a follow-up question
          </p>

          {followUpWarn && (
            <p className="text-red-600 font-bold text-xs mb-2 bg-red-50 border border-red-200 rounded-lg p-2">
              ⚠️ Let's keep it respectful! Rephrase and try again.
            </p>
          )}

          <textarea
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            onKeyDown={handleFollowUpKeyDown}
            disabled={followUpLocked}
            rows={2}
            placeholder={`e.g. "Can you explain more?" or "What about...?"`}
            className="w-full p-2 sm:p-3 rounded-lg sm:rounded-xl border border-amber-200 font-bold text-xs sm:text-sm bg-white mb-2 resize-none focus:outline-none focus:border-amber-400 disabled:opacity-60"
          />
          <button
            onClick={handleFollowUp}
            disabled={!followUpText.trim() || followUpLoading || followUpLocked}
            className="w-full bg-white text-amber-700 font-black py-2 rounded-lg text-xs uppercase tracking-widest border-2 border-amber-300 hover:bg-amber-50 disabled:opacity-40 flex items-center justify-center gap-1 transition-all"
          >
            <MessageCircle size={12} /> {followUpLoading ? "Tara is thinking…" : "Ask Tara →"}
          </button>
        </div>
      )}

      {/* ── Tara's follow-up response ── */}
      {followUpFeedback && (
        <div className="mt-3 border-t border-amber-100 pt-3">
          <p className="text-amber-700 font-bold text-xs mb-1 flex items-center gap-1">
            <MessageCircle size={12} /> Your follow-up
          </p>
          <p className="text-amber-600 text-xs italic mb-2">"{followUpText}"</p>
          <div className="p-2 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-amber-100 text-amber-900 font-bold italic text-xs sm:text-sm leading-relaxed">
            {followUpFeedback}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── useTaraGate ──────────────────────────────────────────────────────────────
export function useTaraGate() {
  const [taraComplete, setTaraComplete] = useState(false);
  const onFeedbackReceived = useCallback(() => setTaraComplete(true), []);
  const resetTara          = useCallback(() => setTaraComplete(false), []);
  return { taraComplete, onFeedbackReceived, resetTara };
}