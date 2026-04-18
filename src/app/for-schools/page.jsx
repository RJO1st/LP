"use client";
/**
 * /for-schools — Dedicated landing page for Nigerian school proprietors and teachers.
 * Explains the B2B2C model, shows the teacher/proprietor dashboard value proposition,
 * and collects school interest leads via POST /api/schools/interest.
 */
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DarkModeToggle from '@/components/theme/DarkModeToggle';

function SchoolInterestForm() {
  const [form, setForm] = useState({ schoolName: '', contactName: '', email: '', phone: '', studentCount: '', state: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/schools/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  const inputCls = "w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition";

  if (status === 'success') {
    return (
      <div className="text-center py-10">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">We got it!</h3>
        <p className="text-slate-600 dark:text-slate-400 text-base mb-2">
          Our team will reach out to <strong className="text-slate-800 dark:text-slate-200">{form.contactName || 'you'}</strong> at <strong className="text-slate-800 dark:text-slate-200">{form.email}</strong> within 1–2 business days.
        </p>
        <p className="text-slate-500 dark:text-slate-500 text-sm">We'll book a 30-minute demo call and walk you through the teacher dashboard live.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">School Name *</label>
          <input required value={form.schoolName} onChange={set('schoolName')} placeholder="e.g. Victory Secondary School, Lagos" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Your Name</label>
          <input value={form.contactName} onChange={set('contactName')} placeholder="Principal / HOD" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">State</label>
          <input value={form.state} onChange={set('state')} placeholder="e.g. Lagos, Abuja, Ogun" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Email Address *</label>
          <input required type="email" value={form.email} onChange={set('email')} placeholder="principal@yourschool.edu.ng" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">WhatsApp Number</label>
          <input type="tel" value={form.phone} onChange={set('phone')} placeholder="0801 234 5678" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Approx. Students</label>
          <input type="number" min="1" value={form.studentCount} onChange={set('studentCount')} placeholder="e.g. 400" className={inputCls} />
        </div>
      </div>

      {status === 'error' && (
        <p className="text-red-600 dark:text-red-400 text-sm">Something went wrong — please try again or email us directly at <a href="mailto:hello@launchpard.com" className="underline">hello@launchpard.com</a>.</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl text-base transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-60 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-0.5"
      >
        {status === 'submitting' ? 'Sending…' : 'Register My School →'}
      </button>
      <p className="text-center text-xs text-slate-500 dark:text-slate-500">NDPR compliant · No hidden fees · No long-term contracts</p>
    </form>
  );
}

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'School sets up in minutes',
    desc: 'Create your school account. Add your classes — JSS1 through SSS3. Takes 10 minutes and we\'ll walk you through it.',
    icon: '🏫',
  },
  {
    step: '02',
    title: 'Scholars join via invitation',
    desc: 'Share a class link or validation code. Scholars and parents sign up with their own accounts. Your data stays separate from their billing.',
    icon: '📧',
  },
  {
    step: '03',
    title: 'Teachers see real-time insights',
    desc: 'Your teacher dashboard shows every student\'s readiness score, subject mastery, and the exact topics dragging down their grade.',
    icon: '📊',
  },
  {
    step: '04',
    title: 'Parents upgrade at their own pace',
    desc: 'Free accounts give every student access to daily practice. Parents who want exam prep, Tara AI feedback, and unlimited questions can upgrade whenever they\'re ready.',
    icon: '💳',
  },
];

const TEACHER_FEATURES = [
  { icon: '📊', title: 'Class Readiness Dashboard', desc: 'One view shows every student\'s readiness score across all subjects. Flagged students are sorted to the top — no hunting through spreadsheets.' },
  { icon: '🎯', title: 'Topic Gap Analysis', desc: 'See which topics are pulling your class average down. Tara\'s learning paths prioritise those gaps automatically for each student.' },
  { icon: '📈', title: 'Individual Student Profiles', desc: 'Click any student to see their mastery by topic, practice history, and a predicted WAEC/BECE grade — all in one screen.' },
  { icon: '📋', title: 'Class & Term Reports', desc: 'Exportable PDF reports for parents, governors, or WAEC preparation meetings. One click, no manual aggregation.' },
  { icon: '🏫', title: 'Multi-Class Management', desc: 'HODs and principals see across all classes in one school overview. Spot which classes need the most attention before exam season.' },
  { icon: '🔒', title: 'NDPR Compliant', desc: 'Student data is visible to teachers only after parent consent. Data is never sold or shared. Fully compliant with Nigeria\'s data protection law.' },
];

const FAQS = [
  { q: 'Does it cost the school anything?', a: 'LaunchPard offers a Starter tier for schools with no upfront cost — teacher dashboards, mastery tracking, and gap analysis are all included from day one. A Professional tier adds PDF exports, school-wide HOD analytics, and priority support. Either way, your school never handles student billing directly.' },
  { q: 'What happens if parents don\'t upgrade?', a: 'The free plan gives every student 10 questions per day. Even free accounts feed the teacher dashboard with readiness data. Premium features (unlimited questions, Tara AI, exam papers) require a parent upgrade, but basic class tracking works without it.' },
  { q: 'Can we use it for JSS and SSS?', a: 'Yes. LaunchPard covers Primary 1 through SSS3 — the full Nigerian curriculum. Teacher dashboards work for any year group. WAEC/NECO mock papers are available from SSS1.' },
  { q: 'How long does setup take?', a: 'About 10 minutes to create the school account and add your first class. We provide onboarding support and can bulk-import your student list from a spreadsheet.' },
  { q: 'Can teachers see individual exam scores?', a: 'Yes — with parent consent. NDPR compliance means consent is required before individual scores are visible to teachers. Aggregate class data is always available.' },
  { q: 'What exams does it cover?', a: 'WAEC SSCE, NECO, BECE, JAMB UTME, and Common Entrance. All questions are NERDC-aligned and mapped to the official exam syllabuses.' },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 dark:border-slate-700/80">
      <button onClick={() => setOpen(!open)} className="w-full text-left py-5 flex items-start justify-between gap-4 group">
        <span className="text-slate-900 dark:text-slate-100 font-bold text-[15px] leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{q}</span>
        <span className={`text-indigo-600 dark:text-indigo-400 text-xl leading-none font-bold mt-0.5 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden"><p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{a}</p></div>
      </div>
    </div>
  );
}

export default function ForSchoolsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#080c15] text-slate-900 dark:text-slate-100 font-sans">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="LaunchPard" width={30} height={30} style={{ objectFit: 'contain' }} />
            <span className="font-black text-slate-900 dark:text-white text-lg">LaunchPard</span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded-full ml-1 hidden sm:inline">For Schools</span>
          </Link>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <Link href="/" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hidden sm:block">For Parents →</Link>
            <a href="#register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-500/20">Register School</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="px-4 sm:px-6 pt-16 pb-12 bg-gradient-to-b from-indigo-50 dark:from-indigo-950/30 to-white dark:to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-full px-4 py-2 mb-6">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-indigo-500 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-indigo-500" /></span>
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">No setup fee · NDPR compliant · No long-term contracts</span>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[0.95] text-slate-900 dark:text-white mb-5">
            See Every Student's<br />
            <span className="text-indigo-600 dark:text-indigo-400">Exam Readiness</span><br />
            in Real Time.
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
            LaunchPard gives Nigerian teachers a live class dashboard — readiness scores, topic gaps, and individual student profiles — across JSS and SSS. No spreadsheets. No complicated setup.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#register" className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/30 hover:scale-105 transition-all">
              Register Your School <span>→</span>
            </a>
            <a href="#how-it-works" className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 text-slate-900 dark:text-slate-100 font-bold text-lg px-8 py-4 rounded-2xl hover:scale-105 transition-all">
              See How It Works
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8 text-sm text-slate-500 dark:text-slate-400 mt-8">
            {[['🏫','No setup fee'],['📊','P1 · JSS · SSS'],['🔒','NDPR compliant'],['⚡','Setup in 10 minutes']].map(([icon,text],i) => (
              <span key={i} className="flex items-center gap-1.5"><span>{icon}</span>{text}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Model ── */}
      <section className="px-4 sm:px-6 py-16 bg-slate-50 dark:bg-slate-800/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">How the model works</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Schools get powerful class analytics. Scholars get personalised AI learning. Both see results.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {HOW_IT_WORKS.map(({ step, title, desc, icon }) => (
              <div key={step} className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">{icon}</div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Step {step}</p>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Teacher Features ── */}
      <section id="how-it-works" className="px-4 sm:px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 px-4 py-1.5 rounded-full mb-4">Teacher Dashboard</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">What your teachers actually get</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-xl mx-auto">No extra software to install. Works on any browser, any device.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TEACHER_FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 rounded-2xl p-6 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cost model callout ── */}
      <section className="px-4 sm:px-6 py-12 bg-indigo-600 dark:bg-indigo-700">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 text-center text-white">
            <div>
              <p className="text-4xl font-black mb-1">₦0</p>
              <p className="text-indigo-200 text-sm font-semibold">Cost to your school</p>
              <p className="text-indigo-300 text-xs mt-1">No hidden fees.</p>
            </div>
            <div>
              <p className="text-4xl font-black mb-1">10 min</p>
              <p className="text-indigo-200 text-sm font-semibold">Setup time</p>
              <p className="text-indigo-300 text-xs mt-1">Onboarding support included</p>
            </div>
            <div>
              <p className="text-4xl font-black mb-1">P1–SSS3</p>
              <p className="text-indigo-200 text-sm font-semibold">All Year Groups</p>
              <p className="text-indigo-300 text-xs mt-1">No Key Stage left out</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-4 sm:px-6 py-16 bg-slate-50 dark:bg-slate-800/20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-center text-slate-900 dark:text-white mb-8">Common questions</h2>
          {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ── Registration Form ── */}
      <section id="register" className="px-4 sm:px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">Register your school</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Leave your details. We'll book a 30-minute demo call and walk you through the teacher dashboard live — at no cost.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-slate-900/5">
            <SchoolInterestForm />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 dark:border-white/10 px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 dark:text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="LaunchPard" width={22} height={22} style={{ objectFit: 'contain' }} />
            <span className="font-bold text-slate-700 dark:text-slate-200">LaunchPard</span>
          </div>
          <p className="text-xs text-center">© {new Date().getFullYear()} LaunchPard Technologies. NDPR compliant.</p>
          <div className="flex gap-4 text-xs">
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">For Parents</Link>
            <Link href="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</Link>
            <a href="mailto:hello@launchpard.com" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
