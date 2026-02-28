"use client";
import React, { useState } from "react";

// --- MOCKS FOR PREVIEW ENVIRONMENT ---
// These allow the component to render in the browser preview without external dependencies.
const useRouter = () => ({
  push: (path) => {
    console.log(`Navigating to: ${path}`);
    if (typeof window !== "undefined") {
      const msg = document.createElement('div');
      msg.className = "fixed bottom-4 right-4 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-black z-[9999] animate-in slide-in-from-bottom";
      msg.innerText = `Successfully signed in! (Redirecting to Dashboard...)`;
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    }
  },
});

const createBrowserClient = () => ({
  auth: {
    signUp: async ({ email }) => {
      console.log("Mock signing up:", email);
      return { data: { user: { email } }, error: null };
    },
    signInWithPassword: async ({ email }) => {
      console.log("Mock signing in:", email);
      return { data: { user: { email } }, error: null };
    }
  }
});

// --- INLINED ICONS ---
const TrophyIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);

const BrainIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A5 5 0 0 1 12 7.33A5 5 0 0 1 14.5 2"/><path d="M17 15a5 5 0 1 1-5 5"/><path d="M2 9a5 5 0 0 1 7-4.5h.5a5 5 0 0 1 4.5 7v.5a5 5 0 0 1-7 4.5H6.5a5 5 0 0 1-4.5-7Z"/><path d="M22 9a5 5 0 0 0-7-4.5h-.5a5 5 0 0 0-4.5 7v.5a5 5 0 0 0 7 4.5h.5a5 5 0 0 0 4.5-7Z"/></svg>
);

const UsersIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

const ArrowRightIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

const ShieldCheckIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);

const ZapIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
);

const StarIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);

const XCircleIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

const CheckCircleIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

// --- COMPONENT ---
export default function Gateway() {
  const [activeModal, setActiveModal] = useState(null); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [scholarCode, setScholarCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();
  const supabase = createBrowserClient();

  const handleParentAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (activeModal === "parent_signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        alert("Success! Welcome to Quest Academy.");
        setActiveModal(null);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/parent");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push("/student");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      
      {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
              <TrophyIcon size={24} />
            </div>
            <span className="text-2xl font-black tracking-tight">Quest Academy</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-bold text-slate-500">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
            <button onClick={() => setActiveModal("student_login")} className="hover:text-indigo-600 transition-colors flex items-center gap-2">
              <BrainIcon size={18} /> Scholar Login
            </button>
            <div className="flex items-center gap-3 border-l-2 border-slate-200 pl-8">
              <button onClick={() => setActiveModal("parent_login")} className="text-slate-600 hover:text-indigo-600 transition-colors">Sign In</button>
              <button onClick={() => setActiveModal("parent_signup")} className="bg-slate-900 text-white px-6 py-2.5 rounded-full hover:bg-black transition-all shadow-lg">Get Started</button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="pt-32 pb-20">
        <section className="px-6 py-12 md:py-20 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full font-black text-sm mb-8 uppercase tracking-wider border border-indigo-100">
            <StarIcon size={16} /> The UK's Premier 11+ Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6 text-balance text-slate-900">
            Turn screen time into <span className="text-indigo-600 relative inline-block">scholarship.<div className="absolute -bottom-2 left-0 w-full h-3 bg-indigo-200 -z-10 rounded-full"></div></span>
          </h1>
          <p className="text-xl text-slate-500 font-bold mb-10 max-w-2xl mx-auto leading-relaxed">
            Manage multiple children, track deep analytics, and let our adaptive AI engine build the perfect 11+ learning journey.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 font-black">
            <button onClick={() => setActiveModal("parent_signup")} className="bg-indigo-600 text-white text-lg px-10 py-5 rounded-full shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105">
              Start Free Trial
            </button>
            <button onClick={() => setActiveModal("student_login")} className="bg-white border-2 border-slate-200 text-slate-600 text-lg px-10 py-5 rounded-full hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm">
              Enter Scholar Code
            </button>
          </div>
        </section>

        {/* --- FEATURES GRID --- */}
        <section id="features" className="px-6 py-20 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black mb-4">Built for Families. Powered by AI.</h2>
              <p className="text-xl text-slate-500 font-bold">Everything you need to manage your child's 11+ journey.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-50 p-10 rounded-[40px] border-2 border-slate-100">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <UsersIcon size={32} />
                </div>
                <h3 className="text-2xl font-black mb-3">Family Profiles</h3>
                <p className="text-slate-500 font-bold leading-relaxed">Manage multiple scholars under one parent account. Set individual target exams and year groups.</p>
              </div>
              <div className="bg-slate-50 p-10 rounded-[40px] border-2 border-slate-100">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheckIcon size={32} />
                </div>
                <h3 className="text-2xl font-black mb-3">Secure Cloud Vault</h3>
                <p className="text-slate-500 font-bold leading-relaxed">All progress is instantly synced to our secure database. Switch from iPad to Desktop seamlessly.</p>
              </div>
              <div className="bg-slate-50 p-10 rounded-[40px] border-2 border-slate-100">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                  <ZapIcon size={32} />
                </div>
                <h3 className="text-2xl font-black mb-3">Deep Analytics</h3>
                <p className="text-slate-500 font-bold leading-relaxed">Track accuracy, speed, and exact topic proficiencies on your live Parent Dashboard.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* PARENT AUTH MODAL */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">
                {activeModal === 'student_login' ? "Enter Academy" : activeModal === 'parent_signup' ? "Create Account" : "Parent Sign In"}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <XCircleIcon size={28} />
              </button>
            </div>

            {error && <div className="mx-6 mt-6 p-4 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm border border-rose-100">{error}</div>}

            {(activeModal === 'parent_login' || activeModal === 'parent_signup') && (
              <form onSubmit={handleParentAuth} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-wider text-slate-400">Email Address</label>
                  <input type="email" required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-wider text-slate-400">Password</label>
                  <input type="password" required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 mt-4">
                  {loading ? "Authenticating..." : activeModal === 'parent_signup' ? "Sign Up" : "Secure Sign In"}
                </button>
                <div className="text-center pt-2">
                   <button 
                     type="button"
                     onClick={() => setActiveModal(activeModal === 'parent_signup' ? 'parent_login' : 'parent_signup')}
                     className="text-indigo-600 font-bold text-sm hover:underline"
                   >
                     {activeModal === 'parent_signup' ? "Already a member? Sign In" : "New to Quest Academy? Sign Up"}
                   </button>
                </div>
              </form>
            )}

            {activeModal === 'student_login' && (
              <form onSubmit={handleStudentAuth} className="p-6 space-y-6">
                <div className="text-center">
                   <label className="block text-sm font-black text-slate-400 mb-4 uppercase tracking-widest">Scholar Access Code</label>
                   <input 
                     type="text" 
                     required 
                     maxLength={6} 
                     className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-center text-2xl tracking-[0.5em] focus:border-indigo-500 outline-none transition-all uppercase" 
                     placeholder="XXXXXX" 
                     value={scholarCode} 
                     onChange={(e) => setScholarCode(e.target.value)} 
                   />
                </div>
                <button type="submit" disabled={loading || scholarCode.length < 4} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? "Loading..." : "Enter Academy"} <ArrowRightIcon size={20} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
