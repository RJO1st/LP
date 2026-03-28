"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * GuidedOnboarding – Phase 3 UX Differentiation
 * A guided 5-step onboarding journey for new scholars with age-adaptive content.
 *
 * Props:
 *   scholarName: string — Scholar's name (default: "Scholar")
 *   ageBand: "ks1" | "ks2" | "ks3" | "ks4" — Age group
 *   curriculum: string — Curriculum code (default: "uk_national")
 *   subjects: array — Available subjects with { key, label, icon, description }
 *   onComplete: () => void — Called when onboarding finishes
 *   onSelectSubject: (subjectKey) => void — Called to start first quest
 *   onSkip: () => void — Called when user skips onboarding
 */

// ─── Age-adaptive welcome messages ──────────────────────────────────────
const WELCOME_MESSAGES = {
  ks1: {
    primary: "Welcome, {name}! Let's go on an adventure! 🚀",
    emoji: "🚀",
    textSize: "text-4xl",
    primarySize: "text-3xl",
    secondarySize: "text-base",
  },
  ks2: {
    primary: "Welcome aboard, {name}! Your learning journey starts now!",
    emoji: "🗺️",
    textSize: "text-3xl",
    primarySize: "text-2xl",
    secondarySize: "text-sm",
  },
  ks3: {
    primary: "Hey {name}! Ready to level up your knowledge?",
    emoji: "⚡",
    textSize: "text-2xl",
    primarySize: "text-xl",
    secondarySize: "text-xs",
  },
  ks4: {
    primary: "Welcome, {name}. Let's set up your study plan.",
    emoji: "📚",
    textSize: "text-xl",
    primarySize: "text-lg",
    secondarySize: "text-xs",
  },
};

const HOW_IT_WORKS_CONTENT = {
  ks1: [
    { point: "Answer questions to build mastery", icon: "❓" },
    { point: "Tara AI helps when you're stuck", icon: "🤖" },
    { point: "Track your progress on the dashboard", icon: "📊" },
  ],
  ks2: [
    { point: "Answer questions to build mastery", icon: "❓" },
    { point: "Tara AI helps when you're stuck", icon: "🤖" },
    { point: "Track your progress on the dashboard", icon: "📊" },
  ],
  ks3: [
    { point: "Strategic answering builds deep mastery", icon: "🎯" },
    { point: "AI tutor Tara adapts to your pace", icon: "🤖" },
    { point: "Real-time analytics show your progress", icon: "📈" },
  ],
  ks4: [
    { point: "Focused practice improves exam readiness", icon: "✓" },
    { point: "Personalized AI support (Tara)", icon: "🤖" },
    { point: "Detailed progress tracking and insights", icon: "📋" },
  ],
};

const DEFAULT_SUBJECTS = [
  { key: "maths", label: "Maths", icon: "🔢", description: "Numbers, shapes & problem-solving" },
  { key: "english", label: "English", icon: "📖", description: "Reading, writing & comprehension" },
  { key: "science", label: "Science", icon: "🔬", description: "Biology, chemistry & physics" },
  { key: "history", label: "History", icon: "🏛️", description: "Events, people & civilizations" },
];

// ─── Color schemes by age band ─────────────────────────────────────────
const THEME_BY_AGE = {
  ks1: {
    bgGradient: "from-purple-600 via-pink-500 to-purple-700",
    accentColor: "from-yellow-400 to-orange-400",
    cardBg: "rgba(168, 85, 247, 0.1)",
    borderColor: "rgba(168, 85, 247, 0.3)",
    buttonColor: "from-pink-500 to-purple-600",
  },
  ks2: {
    bgGradient: "from-blue-600 via-indigo-600 to-purple-600",
    accentColor: "from-cyan-400 to-blue-400",
    cardBg: "rgba(99, 102, 241, 0.1)",
    borderColor: "rgba(99, 102, 241, 0.3)",
    buttonColor: "from-blue-500 to-indigo-600",
  },
  ks3: {
    bgGradient: "from-slate-800 via-slate-700 to-slate-900",
    accentColor: "from-emerald-400 to-cyan-400",
    cardBg: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.2)",
    buttonColor: "from-emerald-500 to-teal-600",
  },
  ks4: {
    bgGradient: "from-slate-900 via-slate-800 to-slate-950",
    accentColor: "from-slate-300 to-slate-200",
    cardBg: "rgba(51, 65, 85, 0.2)",
    borderColor: "rgba(51, 65, 85, 0.3)",
    buttonColor: "from-slate-600 to-slate-700",
  },
};

// ─── Animation keyframes (CSS) ─────────────────────────────────────────
const ANIMATION_STYLES = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(40px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOutLeft {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(-40px);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes wave {
    0%, 100% { transform: rotate(0deg); }
    10%, 30% { transform: rotate(14deg); }
    20%, 40%, 60%, 100% { transform: rotate(-10deg); }
    50% { transform: rotate(10deg); }
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .onboarding-slide-enter {
    animation: slideInRight 0.4s ease-out forwards;
  }

  .onboarding-slide-exit {
    animation: slideOutLeft 0.3s ease-in forwards;
  }

  .avatar-wave {
    transform-origin: 70% 70%;
    animation: wave 0.8s ease-in-out infinite;
  }

  .bounce-animated {
    animation: bounce 2s ease-in-out infinite;
  }

  .pulse-animated {
    animation: pulse 2s ease-in-out infinite;
  }
`;

// ─── Waving avatar component ───────────────────────────────────────────
function WavingAvatar({ emoji, ageBand }) {
  const sizeMap = { ks1: 80, ks2: 72, ks3: 64, ks4: 56 };
  const size = sizeMap[ageBand] || 72;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.75,
        marginBottom: 16,
      }}
      className="avatar-wave"
    >
      {emoji}
    </div>
  );
}

// ─── Step indicator dots ───────────────────────────────────────────────
function StepIndicator({ currentStep, totalSteps, ageBand }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 8,
        marginBottom: 24,
      }}
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          style={{
            width: i < currentStep ? 28 : 8,
            height: 8,
            borderRadius: 4,
            background: i < currentStep ? "rgba(34, 197, 94, 0.8)" : "rgba(255, 255, 255, 0.2)",
            transition: "all 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Subject card component ────────────────────────────────────────────
function SubjectCard({ subject, onSelect, theme, isRecommended }) {
  return (
    <button
      onClick={() => onSelect(subject.key)}
      style={{
        padding: 20,
        borderRadius: 16,
        border: `2px solid ${isRecommended ? "rgba(34, 197, 94, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
        background: isRecommended ? "rgba(34, 197, 94, 0.1)" : theme.cardBg,
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.3s ease",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        e.target.style.borderColor = "rgba(34, 197, 94, 0.6)";
        e.target.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.target.style.borderColor = isRecommended ? "rgba(34, 197, 94, 0.5)" : "rgba(255, 255, 255, 0.1)";
        e.target.style.transform = "translateY(0)";
      }}
    >
      <div style={{ fontSize: 44, marginBottom: 8 }}>{subject.icon}</div>
      <h3 style={{ color: "white", fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
        {subject.label}
      </h3>
      <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 12, margin: 0, lineHeight: 1.4 }}>
        {subject.description}
      </p>
      {isRecommended && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            fontWeight: 700,
            color: "#22c55e",
          }}
        >
          ⭐ Recommended
        </div>
      )}
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────
export default function GuidedOnboarding({
  scholarName = "Scholar",
  ageBand = "ks2",
  curriculum = "uk_national",
  subjects = DEFAULT_SUBJECTS,
  onComplete = () => {},
  onSelectSubject = () => {},
  onSkip = () => {},
}) {
  // Validate inputs
  if (!["ks1", "ks2", "ks3", "ks4"].includes(ageBand)) {
    ageBand = "ks2";
  }

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState("next"); // "next" | "prev"
  const [testQuestion, setTestQuestion] = useState("");
  const cardRef = useRef(null);
  const focusRef = useRef(null);

  const theme = THEME_BY_AGE[ageBand] || THEME_BY_AGE.ks2;
  const messages = WELCOME_MESSAGES[ageBand] || WELCOME_MESSAGES.ks2;
  const howItWorks = HOW_IT_WORKS_CONTENT[ageBand] || HOW_IT_WORKS_CONTENT.ks2;

  const totalSteps = 5;
  const steps = ["welcome", "how-it-works", "choose-subject", "meet-tara", "ready-to-go"];

  // ─ Keyboard navigation ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onSkip();
        return;
      }
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep]);

  // ─ Focus management ──────────────────────────────────────────────────
  useEffect(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, [currentStep]);

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setDirection("next");
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, totalSteps]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection("prev");
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSubjectSelect = useCallback(
    (subjectKey) => {
      onSelectSubject(subjectKey);
      setCurrentStep(4); // Jump to "ready to go"
    },
    [onSelectSubject]
  );

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // ─── STEP 0: WELCOME ───────────────────────────────────────────────────
  const renderWelcome = () => {
    const welcomeMsg = messages.primary.replace("{name}", scholarName);
    return (
      <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease-out" }}>
        <WavingAvatar emoji={messages.emoji} ageBand={ageBand} />
        <h1
          ref={focusRef}
          tabIndex={-1}
          style={{
            color: "white",
            fontSize: ageBand === "ks1" ? 32 : ageBand === "ks2" ? 28 : ageBand === "ks3" ? 24 : 20,
            fontWeight: 900,
            margin: "0 0 16px",
            lineHeight: 1.3,
          }}
        >
          {welcomeMsg}
        </h1>
        <p
          style={{
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: ageBand === "ks1" ? 16 : ageBand === "ks2" ? 15 : 14,
            margin: "0 0 32px",
            lineHeight: 1.6,
            maxWidth: 400,
          }}
        >
          {ageBand === "ks1"
            ? "We'll help you get started with your learning adventure."
            : ageBand === "ks2"
            ? "We'll guide you through everything you need to know."
            : ageBand === "ks3"
            ? "Let's get you set up for success."
            : "Here's how to make the most of your time."}
        </p>
      </div>
    );
  };

  // ─── STEP 1: HOW IT WORKS ──────────────────────────────────────────────
  const renderHowItWorks = () => (
    <div style={{ animation: "fadeIn 0.5s ease-out" }}>
      <h2
        ref={focusRef}
        tabIndex={-1}
        style={{
          color: "white",
          fontSize: ageBand === "ks1" ? 28 : ageBand === "ks2" ? 24 : 20,
          fontWeight: 800,
          margin: "0 0 24px",
          textAlign: "center",
        }}
      >
        How It Works
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {howItWorks.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: 16,
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${theme.borderColor}`,
            }}
          >
            <span style={{ fontSize: 24, minWidth: 32 }}>{item.icon}</span>
            <p
              style={{
                color: "white",
                fontSize: 14,
                margin: 0,
                lineHeight: 1.6,
                fontWeight: 600,
              }}
            >
              {item.point}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── STEP 2: CHOOSE SUBJECT ────────────────────────────────────────────
  const renderChooseSubject = () => {
    const availableSubjects = subjects.length > 0 ? subjects : DEFAULT_SUBJECTS;
    const recommendedIdx = 0; // First subject is recommended

    return (
      <div style={{ animation: "fadeIn 0.5s ease-out" }}>
        <h2
          ref={focusRef}
          tabIndex={-1}
          style={{
            color: "white",
            fontSize: ageBand === "ks1" ? 28 : ageBand === "ks2" ? 24 : 20,
            fontWeight: 800,
            margin: "0 0 12px",
            textAlign: "center",
          }}
        >
          Choose Your First Subject
        </h2>
        <p
          style={{
            color: "rgba(255, 255, 255, 0.6)",
            fontSize: 14,
            textAlign: "center",
            margin: "0 0 24px",
          }}
        >
          Pick a subject to get started
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: ageBand === "ks1" ? "1fr 1fr" : "1fr 1fr",
            gap: 16,
          }}
        >
          {availableSubjects.slice(0, 4).map((subject, idx) => (
            <SubjectCard
              key={subject.key}
              subject={subject}
              onSelect={handleSubjectSelect}
              theme={theme}
              isRecommended={idx === recommendedIdx}
            />
          ))}
        </div>
      </div>
    );
  };

  // ─── STEP 3: MEET TARA ─────────────────────────────────────────────────
  const renderMeetTara = () => (
    <div style={{ animation: "fadeIn 0.5s ease-out" }}>
      <h2
        ref={focusRef}
        tabIndex={-1}
        style={{
          color: "white",
          fontSize: ageBand === "ks1" ? 28 : ageBand === "ks2" ? 24 : 20,
          fontWeight: 800,
          margin: "0 0 24px",
          textAlign: "center",
        }}
      >
        Meet Tara, Your AI Tutor
      </h2>

      {/* Tara avatar with speech bubble */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 24,
          gap: 12,
        }}
      >
        <div style={{ fontSize: 56 }} className="bounce-animated">
          🤖
        </div>
        <div
          style={{
            background: "rgba(34, 197, 94, 0.15)",
            border: "2px solid rgba(34, 197, 94, 0.4)",
            borderRadius: 16,
            padding: "16px 20px",
            maxWidth: 320,
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "white",
              fontSize: 14,
              margin: 0,
              lineHeight: 1.6,
              fontWeight: 600,
            }}
          >
            Hi! I'm Tara, your personal tutor. I'll help explain anything you find tricky!
          </p>
        </div>
      </div>

      {/* Optional test question input */}
      {(ageBand === "ks2" || ageBand === "ks3" || ageBand === "ks4") && (
        <div>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: 13,
              textAlign: "center",
              margin: "0 0 12px",
            }}
          >
            Try asking me a test question (optional):
          </p>
          <input
            type="text"
            placeholder="e.g., What is photosynthesis?"
            value={testQuestion}
            onChange={(e) => setTestQuestion(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: `2px solid ${theme.borderColor}`,
              background: "rgba(255, 255, 255, 0.08)",
              color: "white",
              fontSize: 14,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                goNext();
              }
            }}
            aria-label="Test question for Tara"
          />
        </div>
      )}
    </div>
  );

  // ─── STEP 4: READY TO GO ───────────────────────────────────────────────
  const renderReadyToGo = () => (
    <div
      style={{
        textAlign: "center",
        animation: "fadeIn 0.5s ease-out",
      }}
    >
      <div style={{ fontSize: 56, marginBottom: 16 }} className="bounce-animated">
        🎯
      </div>
      <h2
        ref={focusRef}
        tabIndex={-1}
        style={{
          color: "white",
          fontSize: ageBand === "ks1" ? 28 : ageBand === "ks2" ? 26 : 22,
          fontWeight: 900,
          margin: "0 0 12px",
        }}
      >
        {ageBand === "ks1"
          ? "Ready for your adventure?"
          : ageBand === "ks2"
          ? "Let's start your first quest!"
          : ageBand === "ks3"
          ? "You're all set!"
          : "Ready to begin"}
      </h2>
      <p
        style={{
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: 14,
          margin: "0 0 32px",
          lineHeight: 1.6,
        }}
      >
        {ageBand === "ks1"
          ? "You've completed onboarding. Let's learn together!"
          : ageBand === "ks2"
          ? "Your learning path is set. Let's start with your first challenge!"
          : ageBand === "ks3"
          ? "Onboarding complete. Time to boost your knowledge!"
          : "Onboarding is complete. Ready to study efficiently."}
      </p>

      <div
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          border: `1px solid ${theme.borderColor}`,
        }}
      >
        <p style={{ color: "white", fontSize: 13, margin: "0", fontWeight: 600 }}>
          ✨ Pro tip: Use keyboard arrows to navigate, press ESC to skip.
        </p>
      </div>
    </div>
  );

  // ─── Step renderer ─────────────────────────────────────────────────────
  const stepContent =
    currentStep === 0
      ? renderWelcome()
      : currentStep === 1
      ? renderHowItWorks()
      : currentStep === 2
      ? renderChooseSubject()
      : currentStep === 3
      ? renderMeetTara()
      : renderReadyToGo();

  return (
    <>
      <style>{ANIMATION_STYLES}</style>

      {/* Full-screen overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: `linear-gradient(135deg, rgb(15, 14, 26), rgb(10, 10, 20))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          overflow: "auto",
        }}
        role="dialog"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-desc"
      >
        {/* Skip button (top-right) */}
        <button
          onClick={onSkip}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "rgba(255, 255, 255, 0.1)",
            border: "none",
            color: "rgba(255, 255, 255, 0.6)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            padding: "8px 16px",
            borderRadius: 8,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.15)";
            e.target.style.color = "rgba(255, 255, 255, 0.8)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.1)";
            e.target.style.color = "rgba(255, 255, 255, 0.6)";
          }}
          aria-label="Skip onboarding"
        >
          Skip
        </button>

        {/* Main card */}
        <div
          ref={cardRef}
          style={{
            background: `linear-gradient(135deg, ${theme.cardBg}, rgba(255, 255, 255, 0.02))`,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 24,
            padding: ageBand === "ks1" ? "40px 32px" : ageBand === "ks2" ? "36px 32px" : "32px 28px",
            maxWidth: 500,
            width: "100%",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
          }}
          className={direction === "next" ? "onboarding-slide-enter" : "onboarding-slide-exit"}
        >
          {/* Hidden ARIA labels */}
          <h1 id="onboarding-title" style={{ display: "none" }}>
            Scholar Onboarding
          </h1>
          <div id="onboarding-desc" style={{ display: "none" }}>
            Step {currentStep + 1} of {totalSteps}: {steps[currentStep]}
          </div>

          {/* Step indicator */}
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} ageBand={ageBand} />

          {/* Step content */}
          {stepContent}

          {/* Navigation buttons */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 32,
              justifyContent: currentStep === 0 ? "center" : "space-between",
            }}
          >
            {/* Back button */}
            {currentStep > 0 && currentStep !== 2 && (
              <button
                onClick={goPrev}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: `2px solid ${theme.borderColor}`,
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  flex: 1,
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = `rgba(255, 255, 255, 0.1)`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = `rgba(255, 255, 255, 0.05)`;
                }}
                aria-label="Go to previous step"
              >
                ← Back
              </button>
            )}

            {/* Next / Begin button */}
            {currentStep !== 2 && (
              <button
                onClick={currentStep === totalSteps - 1 ? handleComplete : goNext}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: `linear-gradient(135deg, ${theme.buttonColor.split(" ")[1]}, ${theme.buttonColor.split(" ")[3]})`,
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  flex: currentStep === 0 ? "100%" : 1,
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
                aria-label={currentStep === totalSteps - 1 ? "Begin learning" : "Go to next step"}
              >
                {currentStep === totalSteps - 1 ? "🚀 Begin" : "Next →"}
              </button>
            )}
          </div>

          {/* Progress text */}
          <p
            style={{
              color: "rgba(255, 255, 255, 0.4)",
              fontSize: 12,
              textAlign: "center",
              margin: "16px 0 0",
              fontWeight: 600,
            }}
          >
            Step {currentStep + 1} of {totalSteps}
          </p>
        </div>
      </div>
    </>
  );
}
