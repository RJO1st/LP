/**
 * SEO Year-Specific Landing Pages
 * Deploy to: src/app/learn/[slug]/page.jsx
 *
 * Auto-generates pages like:
 *   /learn/year-3-maths
 *   /learn/11-plus-verbal-reasoning
 *   /learn/jss-2-english-studies
 *   /learn/ss-3-waec-preparation
 *   /learn/grade-5-mathematics-australia
 *
 * Each page has unique H1, meta title, meta description, structured data,
 * and a CTA to signup. Statically generated at build time for SEO.
 */

import Link from "next/link";
import { notFound } from "next/navigation";

// ─── PAGE DEFINITIONS ─────────────────────────────────────────────────────────
// Each entry generates a static page with SEO-optimised content.

const SUBJECT_DISPLAY = {
  mathematics: "Maths", english: "English", science: "Science",
  english_studies: "English Studies", basic_science: "Basic Science",
  basic_technology: "Basic Technology", social_studies: "Social Studies",
  civic_education: "Civic Education", business_education: "Business Studies",
  cultural_and_creative_arts: "Creative Arts", pre_vocational_studies: "Pre-Vocational Studies",
  basic_digital_literacy: "Digital Literacy", religious_studies: "Religious Studies",
  agricultural_science: "Agricultural Science", digital_technologies: "Digital Technologies",
  verbal_reasoning: "Verbal Reasoning", nvr: "Non-Verbal Reasoning",
  hass: "HASS", history: "History", geography: "Geography",
  computing: "Computing", design_and_technology: "Design & Technology",
  religious_education: "Religious Education", citizenship: "Citizenship",
  physics: "Physics", chemistry: "Chemistry", biology: "Biology",
  economics: "Economics", government: "Government", accounting: "Accounting",
  further_mathematics: "Further Mathematics", literature_in_english: "Literature in English",
  commerce: "Commerce",
};

const PAGES = [
  // ── UK National ────────────────────────────────────────────────────
  ...([1,2,3,4,5,6,7,8,9].flatMap(y => {
    const ks = y <= 2 ? "KS1" : y <= 6 ? "KS2" : "KS3";
    const subjects = y <= 2
      ? ["mathematics","english","science"]
      : y <= 6
        ? ["mathematics","english","science","computing","history","geography"]
        : ["mathematics","english","science","computing","history","geography","citizenship"];
    return subjects.map(s => ({
      slug: `year-${y}-${s.replace(/_/g, "-")}`,
      curriculum: "uk_national",
      year: y,
      subject: s,
      region: "uk",
      h1: `Year ${y} ${SUBJECT_DISPLAY[s]} Practice`,
      subtitle: `AI-powered ${SUBJECT_DISPLAY[s]} practice for Year ${y} (${ks}). Aligned to the UK National Curriculum.`,
      metaTitle: `Year ${y} ${SUBJECT_DISPLAY[s]} Practice — AI-Powered | LaunchPard`,
      metaDesc: `Adaptive ${SUBJECT_DISPLAY[s]} practice for Year ${y} ${ks} scholars. AI questions, Tara tutor, parent dashboard. Start free.`,
    }));
  })),

  // ── UK 11+ ─────────────────────────────────────────────────────────
  ...([3,4,5,6].flatMap(y =>
    ["mathematics","english","verbal_reasoning","nvr","science"].map(s => ({
      slug: `11-plus-${s.replace(/_/g, "-")}${y !== 5 ? `-year-${y}` : ""}`,
      curriculum: "uk_11plus",
      year: y,
      subject: s,
      region: "uk",
      h1: `11+ ${SUBJECT_DISPLAY[s]} Practice${y !== 5 ? ` — Year ${y}` : ""}`,
      subtitle: `Timed 11+ ${SUBJECT_DISPLAY[s]} practice for grammar school entry. Adaptive AI questions at Year ${y} level.`,
      metaTitle: `11+ ${SUBJECT_DISPLAY[s]} Practice Year ${y} — Mock Tests | LaunchPard`,
      metaDesc: `11+ ${SUBJECT_DISPLAY[s]} preparation for Year ${y}. AI-adaptive questions, timed mock tests, instant marking. Start free.`,
    }))
  )),
  // Standalone 11+ landing pages (no year)
  { slug: "11-plus-practice", curriculum: "uk_11plus", year: null, subject: null, region: "uk",
    h1: "11+ Exam Practice — Grammar School Preparation",
    subtitle: "AI-powered 11+ practice across Maths, English, Verbal Reasoning, and Non-Verbal Reasoning. Timed mock tests under real exam conditions.",
    metaTitle: "11+ Practice Tests Online — AI-Powered | LaunchPard",
    metaDesc: "Prepare for 11+ grammar school entry with adaptive AI questions. Maths, English, VR, NVR. Timed mock tests. Parent dashboard. Start free." },
  { slug: "11-plus-verbal-reasoning", curriculum: "uk_11plus", year: null, subject: "verbal_reasoning", region: "uk",
    h1: "11+ Verbal Reasoning Practice",
    subtitle: "Master verbal reasoning patterns with AI-adaptive practice. Letter sequences, word codes, analogies, and more.",
    metaTitle: "11+ Verbal Reasoning Practice Online | LaunchPard",
    metaDesc: "11+ verbal reasoning practice with AI-adaptive questions. Codes, sequences, analogies, odd-one-out. Timed tests. Start free." },
  { slug: "11-plus-non-verbal-reasoning", curriculum: "uk_11plus", year: null, subject: "nvr", region: "uk",
    h1: "11+ Non-Verbal Reasoning Practice",
    subtitle: "Build spatial reasoning skills with pattern sequences, rotations, reflections, and matrices.",
    metaTitle: "11+ Non-Verbal Reasoning Practice Online | LaunchPard",
    metaDesc: "11+ NVR practice with adaptive AI. Shape sequences, rotations, reflections, matrices. Timed mock tests. Start free." },

  // ── Nigerian Primary ───────────────────────────────────────────────
  ...([1,2,3,4,5,6].flatMap(y =>
    ["mathematics","english_studies","basic_science","social_studies","civic_education"].map(s => ({
      slug: `primary-${y}-${s.replace(/_/g, "-")}`,
      curriculum: "ng_primary",
      year: y,
      subject: s,
      region: "ng",
      h1: `Primary ${y} ${SUBJECT_DISPLAY[s]} Practice`,
      subtitle: `Adaptive ${SUBJECT_DISPLAY[s]} practice for Primary ${y} scholars. Aligned to the Nigerian NERDC curriculum.`,
      metaTitle: `Primary ${y} ${SUBJECT_DISPLAY[s]} — Nigerian Curriculum | LaunchPard`,
      metaDesc: `${SUBJECT_DISPLAY[s]} practice for Nigerian Primary ${y}. AI-powered questions, Tara AI tutor, parent dashboard. Start free.`,
    }))
  )),

  // ── Nigerian JSS ───────────────────────────────────────────────────
  ...([1,2,3].flatMap(y =>
    ["mathematics","english_studies","basic_science","basic_technology","social_studies","business_education","civic_education"].map(s => ({
      slug: `jss-${y}-${s.replace(/_/g, "-")}`,
      curriculum: "ng_jss",
      year: y,
      subject: s,
      region: "ng",
      h1: `JSS ${y} ${SUBJECT_DISPLAY[s]}`,
      subtitle: `Adaptive ${SUBJECT_DISPLAY[s]} practice for JSS ${y} scholars. NERDC curriculum aligned.`,
      metaTitle: `JSS ${y} ${SUBJECT_DISPLAY[s]} Practice — Nigeria | LaunchPard`,
      metaDesc: `JSS ${y} ${SUBJECT_DISPLAY[s]} for Nigerian students. AI-adaptive questions, instant feedback, parent dashboard. Start free.`,
    }))
  )),
  // BECE landing page
  { slug: "bece-practice", curriculum: "ng_jss", year: 3, subject: null, region: "ng",
    h1: "BECE Practice — Junior WAEC Preparation",
    subtitle: "Timed BECE mock papers across all JSS subjects. Real exam conditions with instant marking and answer review.",
    metaTitle: "BECE Practice Questions Online — Junior WAEC | LaunchPard",
    metaDesc: "Prepare for BECE (Junior WAEC) with timed mock papers. Mathematics, English, Basic Science, Social Studies. Start free." },

  // ── Nigerian SSS ───────────────────────────────────────────────────
  ...([1,2,3].flatMap(y =>
    ["mathematics","english","physics","chemistry","biology","economics","government","geography"].map(s => ({
      slug: `ss-${y}-${s.replace(/_/g, "-")}`,
      curriculum: "ng_sss",
      year: y,
      subject: s,
      region: "ng",
      h1: `SS ${y} ${SUBJECT_DISPLAY[s]}`,
      subtitle: `Adaptive ${SUBJECT_DISPLAY[s]} practice for SS ${y} scholars. WAEC/NECO syllabus aligned.`,
      metaTitle: `SS ${y} ${SUBJECT_DISPLAY[s]} — WAEC Prep | LaunchPard`,
      metaDesc: `SS ${y} ${SUBJECT_DISPLAY[s]} for Nigerian students. AI-powered practice, WAEC-style questions, parent dashboard. Start free.`,
    }))
  )),
  // WAEC landing page
  { slug: "waec-practice", curriculum: "ng_sss", year: 3, subject: null, region: "ng",
    h1: "WAEC Practice Questions — SS3 Exam Preparation",
    subtitle: "Timed WAEC and NECO mock papers. Mathematics, English, Physics, Chemistry, Biology. Real exam conditions.",
    metaTitle: "WAEC Practice Questions Online — Free Mock Tests | LaunchPard",
    metaDesc: "Prepare for WAEC and NECO with timed mock papers. AI-powered practice across all SS3 subjects. Start free." },

  // ── Australian ─────────────────────────────────────────────────────
  ...([1,2,3,4,5,6].flatMap(y =>
    ["mathematics","english","science","hass"].map(s => ({
      slug: `year-${y}-${s.replace(/_/g, "-")}-australia`,
      curriculum: "aus_acara",
      year: y,
      subject: s,
      region: "au",
      h1: `Year ${y} ${SUBJECT_DISPLAY[s]} — Australian Curriculum`,
      subtitle: `AI-powered ${SUBJECT_DISPLAY[s]} practice for Year ${y}. Aligned to the Australian ACARA curriculum.`,
      metaTitle: `Year ${y} ${SUBJECT_DISPLAY[s]} Australia — ACARA Aligned | LaunchPard`,
      metaDesc: `${SUBJECT_DISPLAY[s]} practice for Australian Year ${y} students. AI-adaptive questions, parent dashboard. Start free.`,
    }))
  )),

  // ── Canadian ───────────────────────────────────────────────────────
  ...([1,2,3,4,5,6,7,8].flatMap(y =>
    ["mathematics","english","science"].map(s => ({
      slug: `grade-${y}-${s.replace(/_/g, "-")}-canada`,
      curriculum: "ca_primary",
      year: y,
      subject: s,
      region: "ca",
      h1: `Grade ${y} ${SUBJECT_DISPLAY[s]} — Canadian Curriculum`,
      subtitle: `AI-powered ${SUBJECT_DISPLAY[s]} practice for Grade ${y}. Aligned to Canadian provincial curricula.`,
      metaTitle: `Grade ${y} ${SUBJECT_DISPLAY[s]} Canada — Curriculum Aligned | LaunchPard`,
      metaDesc: `${SUBJECT_DISPLAY[s]} practice for Canadian Grade ${y}. AI questions, Tara tutor, parent dashboard. Start free.`,
    }))
  )),
];

// Build lookup map
const PAGE_MAP = Object.fromEntries(PAGES.map(p => [p.slug, p]));

// ─── STATIC PARAMS ────────────────────────────────────────────────────────────
export async function generateStaticParams() {
  return PAGES.map(p => ({ slug: p.slug }));
}

// ─── METADATA ─────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }) {
  const page = PAGE_MAP[params.slug];
  if (!page) return { title: "Not Found" };
  return {
    title: page.metaTitle,
    description: page.metaDesc,
    openGraph: {
      title: page.metaTitle,
      description: page.metaDesc,
      type: "website",
      url: `https://launchpard.com/learn/${page.slug}`,
    },
    alternates: { canonical: `https://launchpard.com/learn/${page.slug}` },
  };
}

// ─── PAGE COMPONENT ───────────────────────────────────────────────────────────
export default function LearnPage({ params }) {
  const page = PAGE_MAP[params.slug];
  if (!page) notFound();

  const subjectLabel = page.subject ? SUBJECT_DISPLAY[page.subject] : null;

  return (
    <div className="min-h-screen bg-[#f0f2ff] font-sans">
      {/* Nav */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="LaunchPard" width={30} height={30} style={{ objectFit: "contain" }} />
            <span className="text-lg font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">LaunchPard</span>
          </Link>
          <Link href="/signup" className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm px-5 py-2 rounded-full shadow-md">
            Start Free
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
          <Link href="/" className="hover:text-indigo-600">Home</Link>
          <span>›</span>
          <Link href="/learn" className="hover:text-indigo-600">Learn</Link>
          <span>›</span>
          <span className="text-slate-600 font-bold">{page.h1}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 leading-tight">{page.h1}</h1>
        <p className="text-lg text-slate-600 mb-10 leading-relaxed">{page.subtitle}</p>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {[
            ["🧠", "Adaptive AI Engine", "Questions adjust to your scholar's level in real time"],
            ["🤖", "Tara AI Tutor", "Personalised feedback using Explain-It-Back pedagogy"],
            ["📊", "Parent Dashboard", "See strengths, weaknesses, and what to practise next"],
            ["🚀", "Gamified Missions", "Stardust rewards, certificates, and leaderboards"],
          ].map(([icon, title, desc], i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
              <span className="text-2xl mb-2 block">{icon}</span>
              <h3 className="font-bold text-slate-900 text-sm mb-1">{title}</h3>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-3xl p-8 text-center">
          <h2 className="text-xl font-black text-slate-900 mb-2">
            Start practising {subjectLabel || "now"} — free
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            14-day Pro trial. No card needed. Up to 3 scholars.
          </p>
          <Link href="/signup" className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black px-8 py-3.5 rounded-xl shadow-lg text-sm">
            Create Free Account →
          </Link>
        </div>

        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: page.metaTitle,
              description: page.metaDesc,
              url: `https://launchpard.com/learn/${page.slug}`,
              provider: {
                "@type": "EducationalOrganization",
                name: "LaunchPard",
                url: "https://launchpard.com",
              },
            }),
          }}
        />
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} LaunchPard Technologies · <Link href="/terms" className="hover:text-indigo-600">Terms</Link> · <Link href="/privacy-policy" className="hover:text-indigo-600">Privacy</Link>
      </footer>
    </div>
  );
}