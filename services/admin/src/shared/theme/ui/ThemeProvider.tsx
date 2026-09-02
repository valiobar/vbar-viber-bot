"use client";

/**
 * ThemeProvider Component
 *
 * Client component that initializes and applies the theme on mount.
 * This ensures the theme is properly applied even before Zustand rehydrates.
 */

import { useEffect, type ReactNode } from "react";
import { useThemeStore } from "../model/themeStore";

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { theme } = useThemeStore();

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [theme]);

  // Initialize theme from localStorage on mount (before Zustand rehydrates)
  // This ensures theme is applied immediately, Zustand will sync state on rehydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme-storage");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.theme) {
          const storedTheme = parsed.state.theme;
          const html = document.documentElement;
          if (storedTheme === "dark") {
            html.classList.add("dark");
          } else {
            html.classList.remove("dark");
          }
        }
      }
    } catch {
      // Ignore errors - Zustand will handle rehydration
    }
  }, []); // Only run on mount

  return <>{children}</>;
};
