"use client";
/**
 * DarkModeProvider.jsx
 * Site-wide dark/light mode toggle.
 *
 * Adds or removes the `dark` class on <html> and persists the
 * preference to localStorage. Falls back to the user's OS setting
 * on first visit.
 *
 * Usage:
 *   import { DarkModeProvider, useDarkMode } from '@/components/theme/DarkModeProvider';
 *
 *   // In layout:
 *   <DarkModeProvider>{children}</DarkModeProvider>
 *
 *   // In any child:
 *   const { isDark, toggle } = useDarkMode();
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const DarkModeContext = createContext({ isDark: false, toggle: () => {} });

export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* On mount, read stored preference or fall back to OS setting */
  useEffect(() => {
    const stored = localStorage.getItem("lp-dark-mode");
    if (stored !== null) {
      setIsDark(stored === "true");
    } else {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    setMounted(true);
  }, []);

  /* Keep <html> class and localStorage in sync */
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("lp-dark-mode", String(isDark));
  }, [isDark, mounted]);

  const toggle = useCallback(() => setIsDark((prev) => !prev), []);

  return (
    <DarkModeContext.Provider value={{ isDark, toggle }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}

export default DarkModeProvider;
