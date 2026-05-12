"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "voyou-theme";

/** Read the current theme from <html>.classList — kept in sync with the
 *  no-FOUC inline script that runs before React. */
function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  // Sync state from DOM after hydration
  useEffect(() => {
    setThemeState(getInitialTheme());
  }, []);

  const applyTheme = useCallback((next: Theme) => {
    if (typeof document === "undefined") return;
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore quota / privacy mode errors
    }
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [theme, applyTheme]);

  return { theme, setTheme: applyTheme, toggle };
}
