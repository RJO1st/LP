"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginType = searchParams.get("type") || "parent";
  
  const [supabase, setSupabase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [parentForm, setParentForm] = useState({
    email: "",
    password: ""
  });
  
  const [scholarForm, setScholarForm] = useState({
    accessCode: ""
  });

  useEffect(() => {
    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    setSupabase(client);

    // Check if already logged in
    client.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard/parent");
      }
    });
  }, [router]);

  // Parent login
  const handleParentLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: parentForm.email,
        password: parentForm.password
      });

      if (signInError) throw signInError;

      if (data.user) {
        console.log("✅ Parent signed in:", data.user.email);

        // Check if parent record exists
        const { data: parent, error: parentError } = await supabase
          .from('parents')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (parentError || !parent) {
          // Create parent record
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 7);

          await supabase
            .from('parents')
            .upsert({
              id: data.user.id,
              email: parentForm.email,
              full_name: data.user.user_metadata?.full_name || '',
              subscription_status: 'trial',
              trial_end: trialEnd.toISOString(),
              max_children: 3
            }, {
              onConflict: 'id'
            });
        }

        router.push("/dashboard/parent");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // Scholar login
  const handleScholarLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const code = scholarForm.accessCode.trim().toUpperCase();
      console.log("🔍 Looking for scholar with code:", code);

      // Query scholars table - use .maybeSingle() instead of .single()
      const { data, error: queryError } = await supabase
        .from('scholars')
        .select('*')
        .eq('access_code', code)
        .maybeSingle(); // Returns null if no match, doesn't throw error

      console.log("📊 Query result:", { data, error: queryError });

      if (queryError) {
        console.error("❌ Query error:", queryError);
        throw new Error("Database error. Please try again.");
      }

      if (!data) {
        console.log("❌ No scholar found with code:", code);
        throw new Error(`No scholar found with code "${code}". Please check the code and try again.`);
      }

      const scholar = data;
      console.log("✅ Scholar found:", scholar.name, scholar.curriculum);

      // Store in localStorage
      localStorage.setItem("active_scholar", JSON.stringify(scholar));
      
      console.log("✅ Redirecting to student dashboard...");
      
      // Redirect to student dashboard
      router.push("/dashboard/student");

    } catch (err) {
      console.error("❌ Scholar login error:", err);
      setError(err.message || "Invalid access code");
    } finally {
      setLoading(false);
    }
  };

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e27]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background effects */}
      <div className="fixed inset-0 z-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.7 + 0.3
            }}
          />
        ))}
      </div>

      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl" />

      {/* Login Card */}
      <div className="relative z-10 bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700 p-8 max-w-md w-full shadow-2xl">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">
            {loginType === "scholar" ? "🎓" : "🚀"}
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            {loginType === "scholar" ? "Scholar Login" : "Parent Login"}
          </h1>
          <p className="text-slate-400">
            {loginType === "scholar" ? "Enter your quest access code" : "Welcome back to LaunchPard"}
          </p>
        </div>

        {/* Login Type Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => router.push("/login?type=parent")}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              loginType === "parent"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Parent
          </button>
          <button
            onClick={() => router.push("/login?type=scholar")}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              loginType === "scholar"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Scholar
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {/* PARENT LOGIN FORM */}
        {loginType === "parent" && (
          <form onSubmit={handleParentLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={parentForm.email}
                onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={parentForm.password}
                onChange={(e) => setParentForm({ ...parentForm, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-500/50 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {/* SCHOLAR LOGIN FORM */}
        {loginType === "scholar" && (
          <form onSubmit={handleScholarLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Access Code
              </label>
              <input
                type="text"
                required
                value={scholarForm.accessCode}
                onChange={(e) => setScholarForm({ accessCode: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none transition-colors text-center text-lg font-bold tracking-widest"
                placeholder="QUEST-1234"
                maxLength={10}
              />
              <p className="text-xs text-slate-500 mt-2 text-center">
                Get your code from your parent
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-500/50 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Checking code..." : "Start Quest"}
            </button>
          </form>
        )}

        {/* Additional Links */}
        {loginType === "parent" && (
          <div className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <a href="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold">
              Start free trial
            </a>
          </div>
        )}

        {loginType === "scholar" && (
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400 mb-3">
              Don't have an access code?
            </p>
            <a 
              href="/login?type=parent" 
              className="text-indigo-400 hover:text-indigo-300 font-bold text-sm"
            >
              Ask your parent or switch to Parent Login
            </a>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <a href="/" className="text-slate-500 hover:text-slate-400 text-sm">
            ← Back to home
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e27]">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}