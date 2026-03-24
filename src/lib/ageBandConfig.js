/**
 * ageBandConfig.js
 * Deploy to: src/lib/ageBandConfig.js
 *
 * Single source of truth for age-adaptive theming across LaunchPard.
 * Every component reads from this config to adapt visuals, tone, and interaction.
 *
 * USAGE:
 *   import { getAgeBand, getBandConfig } from '@/lib/ageBandConfig';
 *   const band = getAgeBand(scholar.year_level);
 *   const theme = getBandConfig(band);
 */

export function getAgeBand(yearLevel, curriculum) {
  const c = (curriculum || '').toLowerCase();
  
  // Nigerian JSS is always KS3 (ages 12-14)
  if (c === 'ng_jss') return 'ks3';
  // Nigerian SSS is always KS4 (ages 15-17)  
  if (c === 'ng_sss') return 'ks4';
  // Nigerian Primary is KS1/KS2 based on year
  if (c === 'ng_primary') return yearLevel <= 2 ? 'ks1' : 'ks2';
  
  // Default year-based mapping
  const yr = Number(yearLevel || 4);
  if (yr <= 2) return 'ks1';
  if (yr <= 6) return 'ks2';
  if (yr <= 9) return 'ks3';
  return 'ks4';
}

export function getBandConfig(band) {
  return BAND_CONFIGS[band] ?? BAND_CONFIGS.ks2;
}

export function getConfigForYear(yearLevel, curriculum = '') {
  return getBandConfig(getAgeBand(yearLevel, curriculum));
}

export const BAND_CONFIGS = {
  ks1: {
    id:'ks1', label:'KS1', ages:'5–7', years:[1,2], metaphor:'Magical Adventure',
    fonts: { display:"'Fredoka',sans-serif", body:"'Nunito',sans-serif", mono:"'Fredoka',monospace" },
    fontWeight: { normal:600, bold:700, black:800 },
    colours: {
      bg:"linear-gradient(135deg,#fefce8 0%,#fef9c3 50%,#fff7ed 100%)", bgSolid:"#fefce8",
      card:"#ffffff", cardBorder:"#fde68a",
      accent:"#f59e0b", accentDark:"#d97706", accentLight:"#fef3c7",
      success:"#22c55e", successBg:"#dcfce7", error:"#ef4444", errorBg:"#fee2e2",
      text:"#1e293b", textMuted:"#64748b", textOnAccent:"#ffffff",
    },
    radius: { card:28, button:999, input:20, chip:999 },
    spacing: { cardPad:28, optionGap:12, sectionGap:24 },
    shadow: "0 6px 24px rgba(245,158,11,.18)",
    timer: { style:'caterpillar', duration:45, showNumbers:false },
    buttonSize:'xl', optionStyle:'pill',
    mascot:'🦄', xpName:'Stars', xpIcon:'⭐', questLabel:'Adventure',
    questionPrefix: (topic) => 'Help the unicorn! 🦄',
    submitLabel: { ready:'Check my answer! ✨', waiting:'Tap an answer first' },
    nextLabel:'Next adventure →', completeLabel:'Finish the story!',
    tara: {
      name:'Tara the Star', icon:'🌟', tone:'warm_playful', emojiUse:'heavy', maxWords:30,
      correctPhrases:["Wow, you're a superstar! ⭐","Amazing! You got it right! 🎉","Brilliant work! The unicorn is so happy! 🦄"],
      incorrectPhrases:["Almost! Let me show you… 🌟","Good try! Let's look together! 👀","Not quite — but you're so close! 💛"],
      showMeMode:true,
    },
    dashboard: {
      layout:'storybook', showScores:false, showStreak:true, streakVisual:'sticker',
      skillMapStyle:'treasure_map', progressLabel:'Adventures completed',
      questJournal:true, dailyAdventure:true,
    },
    encouragement: {
      frequency:'every_5_correct', style:'celebration',
      messages:["🌟 You've collected {n} stars this week! Keep going!","🦄 The unicorn says: you're only {n} away from a new sticker!","⭐ Wow! {n} adventures completed! You're amazing!"],
    },
  },

  ks2: {
    id:'ks2', label:'KS2', ages:'8–11', years:[3,4,5,6], metaphor:'Space Explorer',
    fonts: { display:"'Nunito',sans-serif", body:"'Nunito',sans-serif", mono:"'DM Mono',monospace" },
    fontWeight: { normal:600, bold:800, black:900 },
    colours: {
      bg:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 60%,#312e81 100%)", bgSolid:"#0f172a",
      card:"rgba(30,27,75,.7)", cardBorder:"rgba(129,140,248,.2)",
      accent:"#818cf8", accentDark:"#6366f1", accentLight:"rgba(129,140,248,.15)",
      success:"#34d399", successBg:"rgba(34,197,94,.15)", error:"#f87171", errorBg:"rgba(239,68,68,.12)",
      text:"#f1f5f9", textMuted:"#94a3b8", textOnAccent:"#ffffff",
    },
    radius: { card:20, button:16, input:14, chip:999 },
    spacing: { cardPad:24, optionGap:8, sectionGap:20 },
    shadow: "0 8px 32px rgba(99,102,241,.25)",
    timer: { style:'rocket_fuel', duration:45, showNumbers:true },
    buttonSize:'lg', optionStyle:'rounded',
    mascot:'🚀', xpName:'Stardust', xpIcon:'✨', questLabel:'Mission',
    questionPrefix: (topic) => 'Commander, incoming transmission! 📡',
    submitLabel: { ready:'Launch Answer 🚀', waiting:'Select an option' },
    nextLabel:'Next mission →', completeLabel:'Mission complete!',
    tara: {
      name:'Tara', icon:'📡', tone:'encouraging_bold', emojiUse:'moderate', maxWords:50,
      correctPhrases:["Mission complete, Commander! 🚀","Excellent work! Your logic is clear for liftoff! ⭐","Flight path confirmed! Step by step is the right approach! 🏆"],
      incorrectPhrases:["Not quite — let's review the mission data. 📡","Close! Check the numbers one more time. 🔍","Almost, Commander! Here's the correct approach… 💡"],
      showMeMode:false,
    },
    dashboard: {
      layout:'galaxy', showScores:true, showStreak:true, streakVisual:'flame',
      skillMapStyle:'galaxy_map', progressLabel:'Missions completed',
      questJournal:true, dailyAdventure:false,
      careerLinks: true, showMasteryPct:true, showTimeSpent:true,
    },
    encouragement: {
      frequency:'every_10_correct', style:'badge_flash',
      messages:["✨ {n} Stardust earned this week! Commander status rising!","🚀 You're on a {streak}-day streak! Keep the engines burning!","🏆 Only {n} questions to master {topic}! You've got this!"],
    },
    careerPopups: {
  forces: "Engineers use forces to design bridges, rockets, and roller coasters.",
  percentages: "Finance analysts use percentages every day to track market performance.",
  algebra: "Software developers use algebra to write algorithms that power apps.",
  persuasive_writing: "Lawyers use persuasive writing to win cases in court.",
  probability: "Game designers use probability to balance difficulty and rewards.",
  genetics: "Doctors use genetics to diagnose conditions and develop treatments.",
  data_handling: "Data scientists use statistics to find patterns in millions of records.",
  electricity: "Electrical engineers design the circuits in your phone and laptop.",
  chemical_reactions: "Pharmacists use chemistry to develop medicines that save lives.",
  ecology: "Environmental scientists study ecosystems to protect endangered species.",
  multiplication: "Game designers use multiplication to calculate damage, loot drops, and XP scaling.",
  fractions: "Chefs use fractions every day — half a cup, quarter teaspoon, two-thirds of a recipe.",
  addition: "Shopkeepers use addition to count money and give the right change.",
  subtraction: "Pilots use subtraction to calculate how much fuel is left for landing.",
  division: "Pizza chefs use division to cut pizzas into equal slices for everyone.",
  shapes: "Architects use shapes to design buildings, bridges, and skyscrapers.",
  time: "Train drivers use time to make sure trains arrive and depart on schedule.",
  money: "Bank managers use money skills to help people save and grow their savings.",
  measurement: "Scientists use measurement to run experiments and make discoveries.",
},
  },

  ks3: {
    id:'ks3', label:'KS3', ages:'12–14', years:[7,8,9], metaphor:'Career Simulator',
    fonts: { display:"'DM Sans',sans-serif", body:"'DM Sans',sans-serif", mono:"'DM Mono',monospace" },
    fontWeight: { normal:500, bold:600, black:700 },
    colours: {
      bg:"linear-gradient(160deg,#f8fafc 0%,#e2e8f0 100%)", bgSolid:"#f8fafc",
      card:"#ffffff", cardBorder:"#e2e8f0",
      accent:"#0ea5e9", accentDark:"#0284c7", accentLight:"#e0f2fe",
      success:"#22c55e", successBg:"#f0fdf4", error:"#ef4444", errorBg:"#fef2f2",
      text:"#0f172a", textMuted:"#475569", textOnAccent:"#ffffff",
    },
    radius: { card:14, button:10, input:10, chip:20 },
    spacing: { cardPad:22, optionGap:8, sectionGap:18 },
    shadow: "0 4px 16px rgba(14,165,233,.10)",
    timer: { style:'bar', duration:30, showNumbers:true },
    buttonSize:'md', optionStyle:'compact',
    mascot:'🔭', xpName:'XP', xpIcon:'⚡', questLabel:'Challenge',
    questionPrefix: (topic) => `Challenge · ${(topic||'').replace(/_/g,' ')}`,
    submitLabel: { ready:'Submit', waiting:'Choose an answer' },
    nextLabel:'Next →', completeLabel:'Complete',
    tara: {
      name:'Tara', icon:'💡', tone:'respectful_direct', emojiUse:'minimal', maxWords:60,
      correctPhrases:["Nice work. Here's why that's right:","Correct. Let's break down the method:","Spot on. This is a key technique for exams:"],
      incorrectPhrases:["Not this time. Here's the approach:","Close — let's look at where it went wrong:","Not quite. The key step is:"],
      showMeMode:false,
    },
    dashboard: {
      layout:'data_grid', showScores:true, showStreak:true, streakVisual:'counter',
      skillMapStyle:'node_graph', progressLabel:'Topics mastered',
      questJournal:false, dailyAdventure:false,
      careerLinks:true, showMasteryPct:true, showTimeSpent:true,
    },
    encouragement: {
      frequency:'every_20_correct', style:'subtle_toast',
      messages:["⚡ {n} XP this week. Top 20% in your year group.","📈 {topic} mastery: {pct}%. {n} more to reach Secure.","🔥 {streak}-day streak. Consistency is what separates good from great."],
    },
    careerPopups: {
      forces:"Engineers use forces to design bridges, rockets, and roller coasters.",
      percentages:"Finance analysts use percentages every day to track market performance.",
      algebra:"Software developers use algebra to write algorithms that power apps.",
      persuasive_writing:"Lawyers use persuasive writing to win cases in court.",
      probability:"Game designers use probability to balance difficulty and rewards.",
      genetics:"Doctors use genetics to diagnose conditions and develop treatments.",
      data_handling:"Data scientists use statistics to find patterns in millions of records.",
      electricity:"Electrical engineers design the circuits in your phone and laptop.",
      chemical_reactions:"Pharmacists use chemistry to develop medicines that save lives.",
      ecology:"Environmental scientists study ecosystems to protect endangered species.",
      multiplication:"Game designers use multiplication to calculate damage, loot drops, and XP scaling.",
      fractions:"Chefs use fractions every day — half a cup, quarter teaspoon, two-thirds of a recipe.",
    },
  },

  ks4: {
    id:'ks4', label:'KS4', ages:'15–17', years:[10,11,12,13], metaphor:'Zenith Station',
    fonts: { display:"'DM Sans','Inter',sans-serif", body:"'DM Sans','Inter',sans-serif", mono:"'DM Mono',monospace" },
    fontWeight: { normal:500, bold:700, black:800 },
    colours: {
      bg:"linear-gradient(165deg,#f8f7ff 0%,#f3f0ff 30%,#ede9fe 60%,#f5f3ff 100%)", bgSolid:"#f8f7ff",
      card:"rgba(255,255,255,0.82)", cardBorder:"rgba(124,58,237,0.12)",
      accent:"#7c3aed", accentDark:"#6d28d9", accentLight:"rgba(124,58,237,0.06)",
      success:"#10b981", successBg:"rgba(16,185,129,0.08)", error:"#ef4444", errorBg:"rgba(239,68,68,0.08)",
      text:"#1e1b4b", textMuted:"rgba(30,27,75,0.45)", textOnAccent:"#ffffff",
    },
    radius: { card:16, button:12, input:10, chip:20 },
    spacing: { cardPad:22, optionGap:6, sectionGap:16 },
    shadow: "0 4px 20px rgba(167,139,250,.08)",
    timer: { style:'ring', duration:30, showNumbers:true },
    buttonSize:'md', optionStyle:'compact',
    mascot:'📐', xpName:'Points', xpIcon:'◆', questLabel:'Practice',
    questionPrefix: (topic) => (topic||'').replace(/_/g,' '),
    submitLabel: { ready:'Check', waiting:'Select' },
    nextLabel:'Next', completeLabel:'Finish',
    tara: {
      name:'Tara', icon:'🤖', tone:'efficient_precise', emojiUse:'none', maxWords:80,
      correctPhrases:["Correct.","Right. Key method:","Yes. Mark scheme note:"],
      incorrectPhrases:["Incorrect. The working:","Wrong. Common mistake — here's why:","Not quite. The examiner expects:"],
      showMeMode:false,
    },
    dashboard: {
      layout:'command', showScores:true, showStreak:true, streakVisual:'minimal',
      skillMapStyle:'heatmap', progressLabel:'Exam readiness',
      questJournal:false, dailyAdventure:false, careerLinks:false,
      showMasteryPct:true, showTimeSpent:true,
      showPredictedGrade:true, showExamCountdown:true, showRevisionPlan:true,
    },
    encouragement: {
      frequency:'milestone_only', style:'inline',
      messages:["◆ {topic}: {pct}% mastery. {n} marks above average.","Predicted grade: {grade}. {n} topics left to secure an A.","Mock score: {score}/{total}. Up {delta} from last attempt."],
    },
  },
};

// ─── UTILITY EXPORTS ─────────────────────────────────────────────────────────

export function getTaraSystemPrompt(band) {
  const c = getBandConfig(band);
  const toneMap = {
    warm_playful:     "You are Tara, a warm and playful learning friend for a young child (age 5-7). Use simple words (1-2 syllables max). Add emojis to every sentence. Be enthusiastic and encouraging. Keep responses under 30 words. Use exclamation marks. Never use technical terms.",
    encouraging_bold: "You are Tara, an encouraging space-themed tutor for a child (age 8-11). Use the metaphor of space missions. Be bold and energetic. Use moderate emojis. Keep responses under 50 words. Call the student 'Commander'.",
    respectful_direct:"You are Tara, a respectful study partner for a teenager (age 12-14). Be direct and concise. Minimal emojis. Connect answers to real-world applications and careers. Keep responses under 60 words. Treat them as a young adult.",
    efficient_precise:"You are Tara, an efficient exam-prep assistant for a student (age 15-17). Be precise and clinical. No emojis. Reference mark schemes and exam technique. Keep responses under 80 words. Focus on method and common errors.",
  };
  return toneMap[c.tara.tone] ?? toneMap.encouraging_bold;
}

export function getQuestNarrative(band, subject, topic) {
  const c = getBandConfig(band);
  if (!c.dashboard.questJournal && !c.dashboard.dailyAdventure) return null;
  const topicLabel = (topic || '').replace(/_/g, ' ');
  const subj = (subject || '').toLowerCase();

  if (band === 'ks1') {
    const stories = {
      mathematics: [
        `The friendly owl needs help with ${topicLabel}! Solve these puzzles to help it fly home! 🦉`,
        `Oh no! The little astronaut's ${topicLabel} machine is broken! Can you fix it? 🧑‍🚀`,
        `The star fairy is building a ${topicLabel} bridge. Answer correctly to add each plank! ✨`,
      ],
      english: [
        `The story fairy has lost some ${topicLabel} words! Help find them! 🧚`,
        `The magic quill needs your ${topicLabel} skills to write a new adventure! ✍️`,
        `The bookworm is stuck on a ${topicLabel} puzzle. Can you help? 📚`,
      ],
      science: [
        `The curious fox found something strange about ${topicLabel}! Help it investigate! 🦊`,
        `Professor Owl's ${topicLabel} experiment needs a helper! That's you! 🦉`,
        `The garden has a ${topicLabel} mystery — can you solve it? 🌿`,
      ],
      history: [
        `A time traveller needs your help with ${topicLabel}! Fix the timeline! ⏳`,
        `Ancient scrolls about ${topicLabel} have been found! Can you read them? 📜`,
      ],
      geography: [
        `The explorer's ${topicLabel} map is incomplete! Help fill in the gaps! 🗺️`,
        `Where in the world is ${topicLabel}? Answer questions to find out! 🌍`,
      ],
      computing: [
        `The robot's ${topicLabel} code has a bug! Debug it to save the day! 🤖`,
      ],
      verbal_reasoning: [
        `The puzzle master set a ${topicLabel} challenge! Can you crack it? 🧩`,
      ],
    };
    const pool = stories[subj] || stories.mathematics;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  if (band === 'ks2') {
    const narratives = {
      mathematics: [
        `You've arrived at the Planet of ${topicLabel}. The inhabitants need your help to solve a crisis!`,
        `Mission briefing: The ${topicLabel} sector is under threat. Only a Commander with your skills can save it.`,
        `Incoming transmission from the ${topicLabel} Galaxy. They need backup — are you ready?`,
      ],
      english: [
        `A coded message about ${topicLabel} has been intercepted from the Word Galaxy. Decode it, Commander!`,
        `The ship's library has a corrupted ${topicLabel} archive. Your language skills are needed to restore it.`,
      ],
      science: [
        `The Science Sector has detected a ${topicLabel} anomaly. Investigate and report your findings!`,
        `A specimen from the ${topicLabel} nebula needs analysis. Apply your knowledge, Commander.`,
      ],
      history: [
        `A time rift to the ${topicLabel} era has opened. Step through and uncover what happened!`,
        `The History Halls have a ${topicLabel} mystery. Your research skills are needed.`,
      ],
      geography: [
        `The Geo Sphere's ${topicLabel} data is corrupted. Use your mapping skills to restore it!`,
        `A new planet with ${topicLabel} terrain has been discovered. Chart its features, Commander.`,
      ],
      physics: [
        `The ship's ${topicLabel} systems are malfunctioning. Use physics to diagnose the problem!`,
      ],
      chemistry: [
        `A ${topicLabel} reaction in the lab is out of control. Balance the equation to stabilise it!`,
      ],
      biology: [
        `Life signs related to ${topicLabel} detected on the surface. Study the organisms!`,
      ],
      computing: [
        `The Cyber Core's ${topicLabel} module has a bug. Debug it to get systems online!`,
      ],
      verbal_reasoning: [
        `An alien cipher about ${topicLabel} has been intercepted. Crack the word patterns!`,
      ],
    };
    const pool = narratives[subj] || narratives.mathematics;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return null;
}

export function getEncouragement(band, data = {}) {
  const c = getBandConfig(band);
  let msg = c.encouragement.messages[Math.floor(Math.random() * c.encouragement.messages.length)];
  for (const [key, val] of Object.entries(data)) msg = msg.replace(`{${key}}`, String(val));
  msg = msg.replace(/\{[a-z_]+\}/g, '');
  return { text: msg, style: c.encouragement.style };
}

export function getCareerPopup(band, topic) {
  if (band !== 'ks3') return null;
  const c = getBandConfig(band);
  const key = (topic||'').toLowerCase().replace(/\s+/g,'_');
  return c.careerPopups?.[key] ?? null;
}