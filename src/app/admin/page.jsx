"use client";
import React, { useState } from "react";

// --- MOCKS FOR PREVIEW ENVIRONMENT ---
// In the preview environment, external imports to local files like '../../lib/supabase' 
// cannot be resolved. We provide a mock implementation here so the UI compiles and 
// functions for demonstration. For your actual project, uncomment the real import.
// import { supabase } from "../../lib/supabase";

const supabaseMock = {
  from: (table) => ({
    insert: async (data) => {
      console.log(`Mocking insert into ${table}:`, data);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      return { data, error: null };
    }
  })
};

// Use the mock if the real one isn't available
const supabase = typeof window !== 'undefined' && window.supabase ? window.supabase : supabaseMock;

/**
 * AdminSeeder Component
 * Allows administrators to push initial curriculum data directly into the Supabase 
 * question_bank table without manually uploading CSVs.
 */
export default function AdminSeeder() {
  const [status, setStatus] = useState("Ready to upload");
  const [loading, setLoading] = useState(false);

  const seedDatabase = async () => {
    setLoading(true);
    setStatus("Uploading questions to Supabase Vault...");

    // Sample data structure for the multiplier effect
    const questionsToUpload = [
      {
        subject: "english",
        year_level: 3,
        topic: "comprehension",
        question_text: "Where did Sarah find the puppy?",
        options: ["In a park", "Behind a hedge", "In her garden", "At school"],
        correct_index: 1,
        explanation: "The text states she heard a sound 'behind a hedge'.",
        passage: "Sarah was walking home when she heard a soft whimpering sound coming from behind a hedge."
      },
      {
        subject: "maths",
        year_level: 4,
        topic: "arithmetic",
        question_text: "What is {a} + {b}?",
        options: ["{ans}", "{ans+2}", "{ans-1}", "{ans+10}"],
        correct_index: 0,
        explanation: "Add the units, then the tens: {a} + {b} = {ans}.",
        passage: null
      }
    ];

    try {
      const { data, error } = await supabase.from('question_bank').insert(questionsToUpload);
      
      if (error) throw error;
      
      setStatus("✅ Success! Vault seeded successfully.");
    } catch (error) {
      console.error(error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
      <div className="bg-white p-10 rounded-[32px] shadow-xl max-w-xl w-full text-center border-2 border-indigo-100">
        <div className="w-20 h-20 bg-indigo-100 rounded-3xl mx-auto flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        
        <h1 className="text-3xl font-black mb-4 text-slate-800 tracking-tight">Vault Database Seeder</h1>
        <p className="text-slate-500 font-bold mb-8 leading-relaxed">
          Push your curriculum data directly into the Supabase question bank. 
          <br/>
          <span className="text-xs text-indigo-400 mt-2 block opacity-70">(Demo mode enabled for preview)</span>
        </p>

        <button 
          onClick={seedDatabase} 
          disabled={loading}
          className="bg-indigo-600 text-white px-8 py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-lg transition-all w-full mb-6 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {loading ? "Seeding Vault..." : "Seed Database Vault"}
        </button>

        <div className={`p-5 rounded-2xl font-bold transition-all border-2 ${
          status.includes("Success") 
            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
            : status.includes("Error")
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
        }`}>
          {status}
        </div>

        <p className="mt-8 text-xs text-slate-400 font-medium">
          Note: In your local project, ensure the supabase client is correctly exported from 
          <code className="bg-slate-100 px-1 rounded ml-1">/lib/supabase.js</code>.
        </p>
      </div>
    </div>
  );
}
