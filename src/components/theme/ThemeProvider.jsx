"use client";
/**
 * ThemeProvider.jsx
 * Deploy to: src/components/theme/ThemeProvider.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps the app (or dashboard section) and provides age-band theming to all
 * child components via React context.
 *
 * USAGE:
 *   import { ThemeProvider, useTheme } from '@/components/theme/ThemeProvider';
 *
 *   // In layout or page:
 *   <ThemeProvider yearLevel={scholar.year_level}>
 *     <Dashboard />
 *   </ThemeProvider>
 *
 *   // In any child:
 *   const { band, theme, isDark } = useTheme();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useMemo } from "react";
import { getAgeBand, getBandConfig } from "@/lib/ageBandConfig";

const ThemeContext = createContext(null);

export function ThemeProvider({ yearLevel, curriculum, children }) {
  const value = useMemo(() => {
    const band = getAgeBand(yearLevel, curriculum);
    const theme = getBandConfig(band);
    const isDark = false; // All bands now use light themes
    return { band, theme, isDark, yearLevel: parseInt(yearLevel, 10) || 4 };
  }, [yearLevel, curriculum]);
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for components rendered outside ThemeProvider
    const band = "ks2";
    return { band, theme: getBandConfig(band), isDark: false, yearLevel: 4 };
  }
  return ctx;
}

export default ThemeProvider;