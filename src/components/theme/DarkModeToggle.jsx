"use client";
/**
 * DarkModeToggle.jsx
 * A small sun/moon toggle button for switching dark ↔ light mode.
 */

import React from "react";
import { useDarkMode } from "./DarkModeProvider";

export default function DarkModeToggle({ className = "" }) {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full
        bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600
        transition-colors duration-200 ${className}`}
    >
      {/* Sun icon — shown in dark mode (click to go light) */}
      <svg
        className={`w-5 h-5 text-amber-400 transition-all duration-300 absolute ${
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      {/* Moon icon — shown in light mode (click to go dark) */}
      <svg
        className={`w-5 h-5 text-indigo-600 transition-all duration-300 absolute ${
          isDark ? "opacity-0 -rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </button>
  );
}
