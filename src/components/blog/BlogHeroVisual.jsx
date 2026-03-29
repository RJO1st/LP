"use client";

/**
 * BlogHeroVisual — branded SVG hero illustrations for each blog article.
 * Uses LaunchPard brand palette: indigo-500, purple-500, space-black, starlight.
 * Each slug gets a unique themed scene with CSS animation.
 */

const scenes = {
  /* ── 1. Personalised Learning Paths ─────────────────────────────── */
  "personalised-learning-paths": {
    bg: "from-indigo-600 via-indigo-700 to-purple-800",
    label: "Learning Science",
    scene: (
      <>
        <svg viewBox="0 0 420 220" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Background stars */}
          {[...Array(20)].map((_, i) => (
            <circle key={i} cx={20 + (i * 137.5) % 400} cy={10 + (i * 73.5) % 200} r="1.5" fill="white" opacity="0.2" />
          ))}
          {/* Main path trunk */}
          <path d="M50 185 Q100 160 140 130 Q160 115 185 110" stroke="white" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
          {/* Branch 1 - top (Amina) */}
          <path d="M215 100 Q250 72 300 55 Q330 46 350 48" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" />
          {/* Branch 2 - middle (David) */}
          <path d="M215 110 Q260 110 300 112 Q330 114 350 110" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" />
          {/* Branch 3 - bottom (Sophie) */}
          <path d="M215 120 Q250 148 300 165 Q330 174 350 172" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" />
          {/* Start node — child figure */}
          <circle cx="50" cy="160" r="8" fill="white" opacity="0.9" />
          <rect x="45" y="168" width="10" height="14" rx="3" fill="white" opacity="0.9" />
          <circle cx="50" cy="188" r="10" fill="#6366f1" stroke="white" strokeWidth="2" />
          <text x="50" y="192" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Start</text>
          {/* Junction node — LaunchPard pill */}
          <rect x="155" y="94" width="60" height="32" rx="10" fill="#8b5cf6" stroke="white" strokeWidth="2" />
          <text x="185" y="114" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">LaunchPard</text>
          {/* End node 1 — Amina (larger rounded rect) */}
          <rect x="345" y="26" width="60" height="44" rx="12" fill="#34d399" stroke="white" strokeWidth="2" />
          <text x="375" y="43" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Amina</text>
          <text x="375" y="62" textAnchor="middle" fontSize="14">⭐</text>
          {/* End node 2 — David (larger rounded rect) */}
          <rect x="345" y="88" width="60" height="44" rx="12" fill="#6366f1" stroke="white" strokeWidth="2" />
          <text x="375" y="105" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">David</text>
          <text x="375" y="124" textAnchor="middle" fontSize="14">🚀</text>
          {/* End node 3 — Sophie (larger rounded rect) */}
          <rect x="345" y="150" width="60" height="44" rx="12" fill="#f472b6" stroke="white" strokeWidth="2" />
          <text x="375" y="167" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Sophie</text>
          <text x="375" y="186" textAnchor="middle" fontSize="14">🏆</text>
          {/* Progress markers on middle path */}
          {[240, 270, 300, 330].map((x, i) => (
            <circle key={i} cx={x} cy={110 + (i % 2 === 0 ? 2 : -2)} r="3" fill="#c4b5fd" opacity={0.5 + i * 0.15} />
          ))}
          {/* Tagline */}
          <text x="210" y="215" textAnchor="middle" fill="white" fontSize="9" opacity="0.5">Every scholar, their own path</text>
        </svg>
      </>
    ),
  },

  /* ── 2. Child Falling Behind ────────────────────────────────────── */
  "child-falling-behind": {
    bg: "from-rose-600 via-rose-700 to-indigo-800",
    label: "Parenting",
    scene: (
      <svg viewBox="0 0 400 220" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background subtle dots */}
        {[...Array(15)].map((_, i) => (
          <circle key={i} cx={20 + (i * 97) % 380} cy={12 + (i * 59) % 200} r="1.2" fill="white" opacity="0.15" />
        ))}

        {/* LEFT SIDE — The struggle (before) */}
        {/* Worried child figure */}
        <g transform="translate(55, 40)">
          <circle cx="20" cy="0" r="14" fill="#fca5a5" opacity="0.9" />
          <circle cx="15" cy="-3" r="1.5" fill="#7f1d1d" />
          <circle cx="25" cy="-3" r="1.5" fill="#7f1d1d" />
          <path d="M14 5 Q20 1 26 5" stroke="#7f1d1d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <rect x="10" y="14" width="20" height="22" rx="6" fill="#fca5a5" opacity="0.9" />
        </g>
        {/* Falling grades */}
        <g transform="translate(20, 100)">
          {["C", "D", "D-"].map((g, i) => (
            <g key={g} transform={`translate(${i * 28}, ${i * 14})`}>
              <rect width="24" height="20" rx="4" fill="white" opacity="0.1" stroke="#fca5a5" strokeWidth="1" />
              <text x="12" y="14" textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="bold">{g}</text>
            </g>
          ))}
        </g>
        {/* Downward arrow */}
        <path d="M75 105 L75 155" stroke="#fca5a5" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
        <polygon points="69,150 75,162 81,150" fill="#fca5a5" opacity="0.5" />
        <text x="75" y="178" textAnchor="middle" fill="#fca5a5" fontSize="8" opacity="0.7">Struggling</text>

        {/* Warning signs floating */}
        <g transform="translate(105, 70)" opacity="0.7">
          <polygon points="10,0 20,16 0,16" fill="#fbbf24" />
          <text x="10" y="13" textAnchor="middle" fill="#92400e" fontSize="9" fontWeight="bold">!</text>
        </g>
        <text x="115" y="100" textAnchor="middle" fill="#fde68a" fontSize="7">Signs to spot</text>

        {/* CENTER — LaunchPard intervention */}
        <g transform="translate(145, 55)">
          {/* Glow ring */}
          <circle cx="55" cy="55" r="48" fill="#8b5cf6" opacity="0.08" />
          <circle cx="55" cy="55" r="38" fill="#8b5cf6" opacity="0.12" />
          {/* Main circle */}
          <circle cx="55" cy="55" r="30" fill="#8b5cf6" stroke="white" strokeWidth="2.5" />
          <text x="55" y="49" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">LaunchPard</text>
          <text x="55" y="62" textAnchor="middle" fill="white" fontSize="18">🚀</text>
          {/* Pulse rings */}
          <circle cx="55" cy="55" r="34" fill="none" stroke="white" strokeWidth="0.8" opacity="0.2" />
          <circle cx="55" cy="55" r="42" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1" />
        </g>
        <text x="200" y="145" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" opacity="0.7">Personalised catch-up</text>

        {/* Connecting arrows: left → center */}
        <path d="M130 110 L155 110" stroke="white" strokeWidth="1.5" opacity="0.3" />
        <polygon points="152,107 158,110 152,113" fill="white" opacity="0.3" />

        {/* Connecting arrows: center → right */}
        <path d="M245 110 L270 110" stroke="#34d399" strokeWidth="1.5" opacity="0.5" />
        <polygon points="267,107 273,110 267,113" fill="#34d399" opacity="0.5" />

        {/* RIGHT SIDE — The recovery (after) */}
        {/* Happy child figure */}
        <g transform="translate(315, 40)">
          <circle cx="20" cy="0" r="14" fill="#6ee7b7" opacity="0.9" />
          <circle cx="15" cy="-3" r="1.5" fill="#065f46" />
          <circle cx="25" cy="-3" r="1.5" fill="#065f46" />
          <path d="M14 3 Q20 8 26 3" stroke="#065f46" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <rect x="10" y="14" width="20" height="22" rx="6" fill="#6ee7b7" opacity="0.9" />
        </g>
        {/* Rising grades */}
        <g transform="translate(290, 100)">
          {["B+", "A-", "A"].map((g, i) => (
            <g key={g} transform={`translate(${i * 28}, ${-i * 14})`}>
              <rect width="24" height="20" rx="4" fill="white" opacity="0.1" stroke="#34d399" strokeWidth="1" />
              <text x="12" y="14" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold">{g}</text>
            </g>
          ))}
        </g>
        {/* Upward arrow */}
        <path d="M335 140 L335 95" stroke="#34d399" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
        <polygon points="329,100 335,88 341,100" fill="#34d399" opacity="0.5" />
        <text x="335" y="158" textAnchor="middle" fill="#34d399" fontSize="8" fontWeight="bold">Thriving</text>

        {/* Celebration sparks */}
        <text x="370" y="50" fontSize="10" opacity="0.7">✨</text>
        <text x="285" y="75" fontSize="8" opacity="0.5">⭐</text>

        {/* Bottom tagline */}
        <text x="200" y="210" textAnchor="middle" fill="white" fontSize="9" opacity="0.4">Spot the signs early. Turn it around.</text>
      </svg>
    ),
  },

  /* ── 3. 11+ Preparation ─────────────────────────────────────────── */
  "11-plus-preparation": {
    bg: "from-blue-600 via-blue-700 to-indigo-800",
    label: "Exam Prep",
    scene: (
      <svg viewBox="0 0 400 220" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background stars */}
        {[...Array(12)].map((_, i) => (
          <circle key={i} cx={15 + (i * 113) % 390} cy={8 + (i * 67) % 210} r="1.2" fill="white" opacity="0.15" />
        ))}

        {/* Rising staircase path — child climbing towards 11+ */}
        <path d="M30 185 L90 185 L90 155 L155 155 L155 120 L225 120 L225 82 L295 82 L295 48 L365 48" stroke="white" strokeWidth="2" opacity="0.25" strokeLinecap="round" />

        {/* Step 1 — Start */}
        <rect x="30" y="170" width="60" height="30" rx="8" fill="white" opacity="0.08" stroke="white" strokeWidth="0.5" strokeOpacity="0.2" />
        <text x="60" y="183" textAnchor="middle" fill="white" fontSize="8" opacity="0.6">Year 4</text>
        <text x="60" y="195" textAnchor="middle" fill="#93c5fd" fontSize="7">Explore</text>

        {/* Child figure on step 1 */}
        <circle cx="50" cy="156" r="7" fill="#93c5fd" />
        <rect x="46" y="163" width="8" height="10" rx="3" fill="#93c5fd" />
        <circle cx="50" cy="155" r="3.5" fill="white" opacity="0.9" />

        {/* Step 2 — Subject stepping stones */}
        <g transform="translate(90, 133)">
          <rect width="65" height="30" rx="8" fill="white" opacity="0.1" stroke="white" strokeWidth="0.5" strokeOpacity="0.25" />
          {["🧩", "📖", "🔢", "🔷"].map((e, i) => (
            <text key={i} x={12 + i * 14} y="20" fontSize="11">{e}</text>
          ))}
        </g>
        <text x="122" y="175" textAnchor="middle" fill="#93c5fd" fontSize="7">Year 5 · Build Skills</text>

        {/* Step 3 — Mock test checkpoint */}
        <g transform="translate(155, 96)">
          <rect width="70" height="32" rx="8" fill="#3b82f6" opacity="0.2" stroke="#60a5fa" strokeWidth="1" />
          <text x="35" y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Mock Test</text>
          <text x="35" y="26" textAnchor="middle" fill="#93c5fd" fontSize="8">82%</text>
        </g>
        <text x="190" y="140" textAnchor="middle" fill="#60a5fa" fontSize="7">Summer · Practice</text>

        {/* Step 4 — Intensive prep */}
        <g transform="translate(225, 58)">
          <rect width="70" height="32" rx="8" fill="#6366f1" opacity="0.25" stroke="#818cf8" strokeWidth="1" />
          <text x="35" y="14" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Intensive</text>
          {/* Mini progress bar */}
          <rect x="10" y="20" width="50" height="5" rx="2.5" fill="white" opacity="0.15" />
          <rect x="10" y="20" width="42" height="5" rx="2.5" fill="#34d399" opacity="0.8" />
        </g>
        <text x="260" y="100" textAnchor="middle" fill="#a5b4fc" fontSize="7">Year 6 · Confidence</text>

        {/* Finish — glowing 11+ badge */}
        <g transform="translate(325, 14)">
          {/* Glow ring */}
          <circle cx="30" cy="34" r="30" fill="#34d399" opacity="0.08" />
          <circle cx="30" cy="34" r="22" fill="#34d399" opacity="0.12" />
          {/* Badge */}
          <circle cx="30" cy="34" r="16" fill="#34d399" stroke="white" strokeWidth="2" />
          <text x="30" y="32" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">11+</text>
          <text x="30" y="42" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">PASS</text>
          {/* Celebration sparks */}
          <text x="8" y="12" fontSize="10" opacity="0.8">✨</text>
          <text x="48" y="10" fontSize="8" opacity="0.7">⭐</text>
          <text x="52" y="58" fontSize="8" opacity="0.6">✨</text>
        </g>

        {/* Confidence meter on the right side */}
        <g transform="translate(378, 50)">
          <rect x="0" y="0" width="8" height="140" rx="4" fill="white" opacity="0.08" />
          <rect x="0" y="90" width="8" height="50" rx="4" fill="#60a5fa" opacity="0.4" />
          <rect x="0" y="50" width="8" height="90" rx="4" fill="#34d399" opacity="0.5" />
          <text x="4" y="-4" textAnchor="middle" fill="white" fontSize="6" opacity="0.5">Ready</text>
          <text x="4" y="155" textAnchor="middle" fill="white" fontSize="6" opacity="0.3">Start</text>
        </g>

        {/* Bottom tagline */}
        <text x="200" y="215" textAnchor="middle" fill="white" fontSize="9" opacity="0.4">From first steps to exam day — no panic needed</text>
      </svg>
    ),
  },

  /* ── 4. Screen Time That Counts ─────────────────────────────────── */
  "screen-time-that-counts": {
    bg: "from-purple-600 via-purple-700 to-indigo-800",
    label: "Digital Parenting",
    scene: (
      <svg viewBox="0 0 400 220" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Tablet device outline */}
        <rect x="110" y="20" width="180" height="130" rx="14" fill="white" opacity="0.1" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
        <rect x="120" y="30" width="160" height="105" rx="6" fill="white" opacity="0.05" />
        {/* Screen content - active learning */}
        <text x="200" y="55" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">3 + ? = 7</text>
        {/* Answer options */}
        {[3, 4, 5].map((n, i) => (
          <g key={n} transform={`translate(${145 + i * 40}, 65)`}>
            <rect width="30" height="24" rx="6" fill={n === 4 ? "#34d399" : "white"} opacity={n === 4 ? 0.9 : 0.15} />
            <text x="15" y="17" textAnchor="middle" fill={n === 4 ? "#065f46" : "white"} fontSize="12" fontWeight="bold">{n}</text>
          </g>
        ))}
        {/* Checkmark on correct answer */}
        <circle cx="200" cy="100" r="12" fill="#34d399" opacity="0.9" />
        <path d="M194 100 L198 104 L206 96" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="200" y="125" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontWeight="bold">ACTIVE LEARNING</text>
        {/* Home button */}
        <circle cx="200" cy="142" r="4" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
        {/* VS divider */}
        <text x="200" y="175" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" opacity="0.5">vs</text>
        {/* Passive - left side */}
        <g transform="translate(60, 160)" opacity="0.4">
          <rect width="80" height="50" rx="8" fill="white" opacity="0.1" stroke="white" strokeWidth="1" />
          <text x="40" y="22" textAnchor="middle" fill="white" fontSize="18">📺</text>
          <text x="40" y="40" textAnchor="middle" fill="#fca5a5" fontSize="8" fontWeight="bold">Passive</text>
        </g>
        {/* Active - right side */}
        <g transform="translate(260, 160)">
          <rect width="80" height="50" rx="8" fill="white" opacity="0.15" stroke="#34d399" strokeWidth="1.5" />
          <text x="40" y="22" textAnchor="middle" fill="white" fontSize="18">🧠</text>
          <text x="40" y="40" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontWeight="bold">Active</text>
        </g>
      </svg>
    ),
  },

  /* ── 5. WAEC vs GCSE ────────────────────────────────────────────── */
  "waec-vs-gcse": {
    bg: "from-cyan-600 via-teal-700 to-indigo-800",
    label: "Curricula",
    scene: (
      <svg viewBox="0 0 400 220" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left card - WAEC */}
        <g transform="translate(30, 20)">
          <rect width="150" height="180" rx="12" fill="white" opacity="0.1" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <text x="75" y="30" textAnchor="middle" fill="white" fontSize="26">🇳🇬</text>
          <text x="75" y="52" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">WAEC</text>
          <line x1="20" y1="62" x2="130" y2="62" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <text x="75" y="80" textAnchor="middle" fill="#67e8f9" fontSize="9">Age 17-18 (SS3)</text>
          <text x="75" y="98" textAnchor="middle" fill="white" fontSize="9" opacity="0.7">Grades: A1 → F9</text>
          <text x="75" y="116" textAnchor="middle" fill="white" fontSize="9" opacity="0.7">Single exam sitting</text>
          {/* Subject chips */}
          {["Math", "Eng", "Bio", "Chem"].map((s, i) => (
            <g key={s} transform={`translate(${15 + i * 33}, 130)`}>
              <rect width="28" height="18" rx="4" fill="#06b6d4" opacity="0.3" />
              <text x="14" y="13" textAnchor="middle" fill="#67e8f9" fontSize="7" fontWeight="bold">{s}</text>
            </g>
          ))}
          <text x="75" y="168" textAnchor="middle" fill="#67e8f9" fontSize="9" fontWeight="bold">West Africa</text>
        </g>
        {/* Center connector */}
        <g transform="translate(185, 80)">
          <circle cx="15" cy="30" r="18" fill="white" opacity="0.1" />
          <text x="15" y="35" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">vs</text>
        </g>
        {/* Right card - GCSE */}
        <g transform="translate(220, 20)">
          <rect width="150" height="180" rx="12" fill="white" opacity="0.1" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <text x="75" y="30" textAnchor="middle" fill="white" fontSize="26">🇬🇧</text>
          <text x="75" y="52" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">GCSE</text>
          <line x1="20" y1="62" x2="130" y2="62" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <text x="75" y="80" textAnchor="middle" fill="#a5b4fc" fontSize="9">Age 15-16 (Year 11)</text>
          <text x="75" y="98" textAnchor="middle" fill="white" fontSize="9" opacity="0.7">Grades: 9 → 1</text>
          <text x="75" y="116" textAnchor="middle" fill="white" fontSize="9" opacity="0.7">8-10 subjects</text>
          {["Math", "Eng", "Sci", "Hist"].map((s, i) => (
            <g key={s} transform={`translate(${15 + i * 33}, 130)`}>
              <rect width="28" height="18" rx="4" fill="#6366f1" opacity="0.3" />
              <text x="14" y="13" textAnchor="middle" fill="#a5b4fc" fontSize="7" fontWeight="bold">{s}</text>
            </g>
          ))}
          <text x="75" y="168" textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="bold">United Kingdom</text>
        </g>
      </svg>
    ),
  },

  /* ── 6. Homework Battle Is Over ─────────────────────────────────── */
  "homework-battle-is-over": {
    bg: "from-pink-600 via-rose-700 to-indigo-800",
    label: "Engagement",
    scene: (
      <svg viewBox="0 0 400 220" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Old way - crossed out worksheet */}
        <g transform="translate(40, 30)" opacity="0.4">
          <rect width="100" height="130" rx="6" fill="white" opacity="0.15" />
          <line x1="20" y1="25" x2="80" y2="25" stroke="white" strokeWidth="1.5" opacity="0.4" />
          <line x1="20" y1="40" x2="70" y2="40" stroke="white" strokeWidth="1.5" opacity="0.4" />
          <line x1="20" y1="55" x2="75" y2="55" stroke="white" strokeWidth="1.5" opacity="0.4" />
          <line x1="20" y1="70" x2="60" y2="70" stroke="white" strokeWidth="1.5" opacity="0.4" />
          <line x1="20" y1="85" x2="78" y2="85" stroke="white" strokeWidth="1.5" opacity="0.4" />
          <text x="50" y="115" textAnchor="middle" fill="white" fontSize="8">Worksheet</text>
          {/* X mark */}
          <line x1="10" y1="10" x2="90" y2="120" stroke="#f87171" strokeWidth="3" opacity="0.8" />
          <line x1="90" y1="10" x2="10" y2="120" stroke="#f87171" strokeWidth="3" opacity="0.8" />
        </g>
        {/* Arrow */}
        <path d="M160 100 L200 100" stroke="white" strokeWidth="2" opacity="0.5" markerEnd="url(#arrow2)" />
        <defs>
          <marker id="arrow2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="white" opacity="0.5" />
          </marker>
        </defs>
        {/* New way - gamified screen */}
        <g transform="translate(220, 20)">
          <rect width="140" height="150" rx="12" fill="white" opacity="0.15" stroke="#34d399" strokeWidth="1.5" />
          {/* Progress bar */}
          <rect x="15" y="15" width="110" height="8" rx="4" fill="white" opacity="0.1" />
          <rect x="15" y="15" width="75" height="8" rx="4" fill="#34d399" opacity="0.8" />
          <text x="100" y="22" fill="white" fontSize="7" fontWeight="bold">Lvl 7</text>
          {/* Mission icon */}
          <text x="70" y="55" textAnchor="middle" fill="white" fontSize="28">🚀</text>
          {/* Stars */}
          {[0, 1, 2].map((i) => (
            <text key={i} x={40 + i * 25} y="80" textAnchor="middle" fill="#fbbf24" fontSize="16">★</text>
          ))}
          {/* XP counter */}
          <rect x="30" y="90" width="80" height="20" rx="10" fill="#8b5cf6" opacity="0.5" />
          <text x="70" y="104" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">+250 XP</text>
          {/* Leaderboard preview */}
          {[1, 2, 3].map((rank) => (
            <g key={rank} transform={`translate(15, ${110 + (rank - 1) * 13})`}>
              <text x="0" y="10" fill={rank === 1 ? "#fbbf24" : "white"} fontSize="8" fontWeight="bold">{rank}.</text>
              <rect x="18" y="2" width={80 - rank * 15} height="8" rx="4" fill={["#fbbf24", "#94a3b8", "#b45309"][rank - 1]} opacity="0.4" />
            </g>
          ))}
        </g>
        {/* Smile face */}
        <g transform="translate(180, 170)">
          <circle cx="0" cy="0" r="16" fill="#fbbf24" opacity="0.2" />
          <circle cx="-5" cy="-3" r="2" fill="#fbbf24" opacity="0.6" />
          <circle cx="5" cy="-3" r="2" fill="#fbbf24" opacity="0.6" />
          <path d="M-6 4 Q0 10 6 4" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" fill="none" />
        </g>
      </svg>
    ),
  },
};

export default function BlogHeroVisual({ slug, size = "lg" }) {
  const data = scenes[slug];
  if (!data) return null;

  const heights = { sm: "h-40", md: "h-52", lg: "h-72 sm:h-80" };

  return (
    <div className={`relative ${heights[size]} w-full bg-gradient-to-br ${data.bg} rounded-xl overflow-hidden`}>
      {/* Subtle noise overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
      {/* Scene */}
      <div className="relative w-full h-full p-4">
        {data.scene}
      </div>
    </div>
  );
}
