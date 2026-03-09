"use client";
// src/app/cookie-policy/page.jsx
// Deploy to: src/app/cookie-policy/page.jsx

const EMAIL    = "hello@launchpard.com";
const COMPANY  = "LaunchPard Technologies";
const PLATFORM = "LaunchPard";
const WEBSITE  = "https://www.launchpard.com";
const UPDATED  = "9 March 2026";

// ─── Sub-component ────────────────────────────────────────────────
function Block({ blocks }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (b.type === "h3") return (
          <h3 key={i} className="text-sm font-bold text-slate-800 pt-4 first:pt-0">{b.text}</h3>
        );
        if (b.type === "list") return (
          <ul key={i} className="space-y-2 pl-1">
            {b.items.map((item, j) => (
              <li key={j} className="flex gap-2.5 text-sm text-slate-600 leading-relaxed">
                <span className="text-indigo-400 font-bold flex-shrink-0">({String.fromCharCode(97 + j)})</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        );
        if (b.type === "table") return (
          <div key={i} className="overflow-x-auto mt-2">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-indigo-50">
                  {b.headers.map((h, hi) => (
                    <th key={hi} className="text-left px-3 py-2 font-black text-indigo-700 border border-indigo-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-slate-600 border border-slate-100 leading-relaxed">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        return <p key={i} className="text-sm text-slate-600 leading-relaxed">{b.text}</p>;
      })}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────
export default function CookiePolicyPage() {
  const sections = [
    {
      id: "what-are-cookies", n: "1", title: "What Are Cookies?",
      blocks: [
        { type: "p", text: "Cookies are small text files placed on your device when you visit a website. They allow the website to recognise your device, remember your preferences, and improve your experience." },
        { type: "p", text: "We also use similar technologies such as local storage and session storage, which function in a comparable way. References to 'cookies' in this policy include these similar technologies unless otherwise stated." },
      ],
    },
    {
      id: "how-we-use", n: "2", title: "How We Use Cookies",
      blocks: [
        { type: "p", text: `${PLATFORM} uses cookies for the following purposes:` },
        { type: "list", items: [
          "Authentication — to keep you signed in securely across sessions.",
          "Preferences — to remember your language, display settings, and curriculum choices.",
          "Security — to protect against cross-site request forgery (CSRF) and session hijacking.",
          "Analytics — to understand how parents and scholars use the platform so we can improve it.",
          "Performance — to ensure pages load quickly and reliably.",
        ]},
        { type: "p", text: "We do not use cookies to serve advertising, and we do not allow third-party advertisers to place cookies on our platform." },
      ],
    },
    {
      id: "types", n: "3", title: "Types of Cookies We Use",
      blocks: [
        { type: "table", headers: ["Cookie / Technology", "Type", "Purpose", "Duration"],
          rows: [
            ["sb-auth-token", "Strictly Necessary", "Supabase authentication session token — keeps you logged in.", "Session / up to 1 week"],
            ["sb-refresh-token", "Strictly Necessary", "Refreshes your session without requiring you to sign in again.", "Up to 1 week"],
            ["__Host-next-auth.*", "Strictly Necessary", "Next.js session security token.", "Session"],
            ["next-locale", "Functional", "Remembers your language preference.", "1 year"],
            ["lp_theme", "Functional", "Stores your display preferences (e.g. dark mode).", "1 year"],
            ["_vercel_*", "Strictly Necessary", "Vercel infrastructure routing and edge caching.", "Session"],
            ["posthog_*", "Analytics", "Anonymised usage analytics (page views, feature engagement). No personal data.", "Up to 1 year"],
          ],
        },
        { type: "p", text: "We review the cookies we use regularly. The table above reflects current usage and may be updated as the platform evolves." },
      ],
    },
    {
      id: "strictly-necessary", n: "4", title: "Strictly Necessary Cookies",
      blocks: [
        { type: "p", text: "Some cookies are essential for the platform to function. Without them, you cannot sign in, access your dashboard, or use core features. These cookies do not require your consent under UK GDPR because they are technically necessary to deliver the service you have requested." },
        { type: "p", text: "We cannot provide the LaunchPard service without these cookies." },
      ],
    },
    {
      id: "functional", n: "5", title: "Functional Cookies",
      blocks: [
        { type: "p", text: "Functional cookies allow the platform to remember choices you have made, such as your display preferences or selected curriculum. These improve your experience but are not strictly required for the platform to operate." },
        { type: "p", text: "We will ask for your consent before placing functional cookies where this is required by law." },
      ],
    },
    {
      id: "analytics", n: "6", title: "Analytics Cookies",
      blocks: [
        { type: "p", text: "We use anonymised analytics to understand how our platform is used. This helps us identify which features are most valuable, where users encounter difficulty, and how to prioritise improvements." },
        { type: "p", text: `Our analytics provider (PostHog) processes data on servers within the EU. No personally identifiable information is sent. IP addresses are anonymised before storage. You can opt out of analytics cookies via our cookie banner or by contacting us at ${EMAIL}.` },
      ],
    },
    {
      id: "third-party", n: "7", title: "Third-Party Cookies",
      blocks: [
        { type: "p", text: "We use a small number of third-party services that may set their own cookies:" },
        { type: "list", items: [
          "Supabase — authentication and real-time database infrastructure. Privacy policy: supabase.com/privacy.",
          "Vercel — hosting and edge delivery infrastructure. Privacy policy: vercel.com/legal/privacy-policy.",
          "PostHog — anonymised product analytics. Privacy policy: posthog.com/privacy.",
          "Brevo (Sendinblue) — transactional email delivery. Brevo does not set cookies on our platform.",
        ]},
        { type: "p", text: "We do not use Google Analytics, Facebook Pixel, or any advertising networks." },
      ],
    },
    {
      id: "children", n: "8", title: "Cookies and Children",
      blocks: [
        { type: "p", text: "We take children's privacy seriously. Scholar accounts (used by children) use only strictly necessary cookies. We do not place analytics or functional cookies on scholar sessions." },
        { type: "p", text: "Parents manage account creation and consent on behalf of their children. If you believe we have inadvertently collected data from a child without appropriate consent, please contact us immediately." },
      ],
    },
    {
      id: "managing", n: "9", title: "Managing Your Cookie Preferences",
      blocks: [
        { type: "p", text: "You can control cookies in the following ways:" },
        { type: "h3", text: "Cookie Banner" },
        { type: "p", text: "When you first visit LaunchPard, a cookie banner will appear. You can accept all cookies, accept only necessary cookies, or customise your preferences. You can revisit your choices at any time by clicking 'Cookie Settings' in the footer." },
        { type: "h3", text: "Browser Settings" },
        { type: "p", text: "Most browsers allow you to block or delete cookies. Blocking strictly necessary cookies will prevent you from signing in. Common browser controls:" },
        { type: "list", items: [
          "Chrome: Settings → Privacy and Security → Cookies and other site data.",
          "Firefox: Settings → Privacy & Security → Cookies and Site Data.",
          "Safari: Settings → Privacy → Manage Website Data.",
          "Edge: Settings → Cookies and site permissions → Cookies and site data.",
        ]},
        { type: "h3", text: "Opt Out of Analytics" },
        { type: "p", text: `To opt out of PostHog analytics specifically, contact us at ${EMAIL} and we will add your account to our exclusion list.` },
      ],
    },
    {
      id: "legal-basis", n: "10", title: "Legal Basis for Processing",
      blocks: [
        { type: "p", text: "Under UK GDPR, our legal basis for using cookies is as follows:" },
        { type: "list", items: [
          "Strictly necessary cookies: Legitimate interests (and technical necessity) — we cannot provide the service without these.",
          "Functional cookies: Consent — we will ask before placing these where required.",
          "Analytics cookies: Consent — we will ask before placing these, and you can withdraw consent at any time.",
        ]},
        { type: "p", text: "For full details of how we process personal data, please see our Privacy Policy." },
      ],
    },
    {
      id: "changes", n: "11", title: "Changes to This Policy",
      blocks: [
        { type: "p", text: "We may update this Cookie Policy from time to time. When we do, we will update the 'Last updated' date at the top of this page and, where the changes are material, notify you via email or a notice on the platform." },
        { type: "p", text: "Your continued use of LaunchPard after any changes constitutes your acceptance of the updated policy." },
      ],
    },
    {
      id: "contact", n: "12", title: "Contact Us",
      blocks: [
        { type: "p", text: `If you have questions about our use of cookies, or wish to exercise any of your rights, please contact us:` },
        { type: "p", text: COMPANY },
        { type: "p", text: `Email: ${EMAIL}` },
        { type: "p", text: `Website: ${WEBSITE}` },
        { type: "p", text: "If you are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk." },
      ],
    },
  ];

  return (
    <main className="min-h-screen" style={{ background: "#f0f2ff" }}>

      {/* Header */}
      <div
        className="py-16 px-6 overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          {[200, 350, 500, 650].map((size, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: size, height: size, top: "50%", right: "-5%", transform: "translateY(-50%)" }} />
          ))}
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <a href="/" className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-white text-sm mb-8 transition-colors">
            &larr; Back to {PLATFORM}
          </a>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🍪</span>
            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.1)", color: "#a5b4fc" }}>Legal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Cookie Policy
          </h1>
          <p className="text-indigo-300 text-sm">
            Effective: {UPDATED} &middot; Last updated: {UPDATED}
          </p>
          <p className="text-indigo-200/70 text-sm mt-3 max-w-xl">
            This policy explains what cookies {PLATFORM} uses, why, and how you can manage them.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-6 py-14">
        <div className="grid lg:grid-cols-[220px_1fr] gap-10 items-start">

          {/* Sticky TOC */}
          <nav className="hidden lg:block sticky top-8 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Contents</p>
            <ul className="space-y-0.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}
                    className="flex items-baseline gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors py-1">
                    <span className="font-mono text-slate-300 flex-shrink-0 w-5">{s.n}.</span>
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Questions?</p>
              <a href={`mailto:${EMAIL}`} className="text-xs font-semibold text-indigo-600 hover:underline break-all">
                {EMAIL}
              </a>
            </div>
          </nav>

          {/* Content */}
          <div className="space-y-5">

            {/* Intro callout */}
            <div className="rounded-2xl border p-6"
              style={{ background: "linear-gradient(135deg, #eef2ff, #f5f3ff)", borderColor: "#c7d2fe" }}>
              <p className="text-slate-700 text-sm leading-relaxed">
                We use cookies and similar technologies to keep {PLATFORM} secure, remember your preferences, and improve the platform. This policy explains exactly what we use, why, and how you can control it. We never use cookies to serve advertising.
              </p>
              <p className="text-slate-500 text-xs mt-3">
                Questions? Contact us at{" "}
                <a href={`mailto:${EMAIL}`} className="text-indigo-600 hover:underline">{EMAIL}</a>
              </p>
            </div>

            {/* Section cards */}
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden scroll-mt-8"
              >
                <div className="px-6 pt-6 pb-2 border-b border-slate-50 flex items-start gap-3">
                  <span className="font-mono text-xs text-slate-300 mt-1 flex-shrink-0 w-5">
                    {section.n}.
                  </span>
                  <h2 className="text-base font-black text-slate-900">{section.title}</h2>
                </div>
                <div className="px-6 py-5 pl-14">
                  <Block blocks={section.blocks} />
                </div>
              </section>
            ))}

            {/* Related links */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Related Policies</p>
              <div className="flex flex-wrap gap-3">
                <a href="/privacy-policy" className="text-indigo-600 hover:underline text-sm font-semibold">Privacy Policy</a>
                <a href="/terms"          className="text-indigo-600 hover:underline text-sm font-semibold">Terms &amp; Conditions</a>
                <a href={`mailto:${EMAIL}`} className="text-indigo-600 hover:underline text-sm font-semibold">Contact Us</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white/50 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-400">
          &copy; 2026 {COMPANY}. All rights reserved.
        </div>
      </div>
    </main>
  );
}