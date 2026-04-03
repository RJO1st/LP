"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import dynamic from "next/dynamic";

/**
 * /dashboard/student/exams
 *
 * Dedicated full-page exam experience.
 * Loads scholar from localStorage (same pattern as main dashboard),
 * then renders ExamOrchestrator as the entire page — no dashboard overlay.
 */

const ExamOrchestrator = dynamic(
  () => import("../../../../components/exam/ExamOrchestrator"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-semibold">Loading Exam Papers...</p>
        </div>
      </div>
    ),
  }
);

export default function ExamsPage() {
  const router = useRouter();
  const [scholar, setScholar] = useState(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Load scholar from localStorage (same pattern as main dashboard)
  useEffect(() => {
    const saved = localStorage.getItem("active_scholar");
    if (!saved) {
      router.push("/dashboard/student");
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      setScholar(parsed);

      // Re-fetch fresh from DB
      (async () => {
        try {
          const { data: fresh } = await supabase
            .from("scholars")
            .select("*")
            .eq("id", parsed.id)
            .single();
          if (fresh) {
            setScholar(fresh);
            localStorage.setItem("active_scholar", JSON.stringify(fresh));
          }
        } catch (_) {}
        setLoading(false);
      })();
    } catch (_) {
      router.push("/dashboard/student");
    }
  }, [router]);

  if (loading || !scholar) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ExamOrchestrator
        scholar={scholar}
        onClose={() => router.push("/dashboard/student")}
      />
    </div>
  );
}
