/**
 * Zustand Theme Store
 *
 * Manages client-side theme state (light/dark mode) with localStorage persistence.
 * This store handles theme toggling and applies the theme class to the document.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Theme type definition
 */
export type Theme = "light" | "dark";

/**
 * Theme state interface
 */
interface ThemeState {
  // State
  theme: Theme;

  // Actions
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

/**
 * Apply theme class to document element
 *
 * Adds or removes the 'dark' class on the <html> element based on the theme.
 * This enables Tailwind's dark mode class strategy.
 *
 * @param theme - Theme to apply ("light" or "dark")
 */
const applyTheme = (theme: Theme) => {
  if (typeof window !== "undefined") {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }
};

/**
 * Zustand theme store
 *
 * Manages theme state and provides actions for toggling and setting themes.
 * Theme state is persisted to localStorage.
 * The theme class is automatically applied to the document element.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // Initial state
      theme: "light",

      /**
       * Toggle theme action
       *
       * Switches between light and dark themes.
       */
      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === "light" ? "dark" : "light";
          applyTheme(newTheme);
          return { theme: newTheme };
        });
      },

      /**
       * Set theme action
       *
       * Sets a specific theme.
       *
       * @param theme - Theme to set ("light" or "dark")
       */
      setTheme: (theme: Theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: "theme-storage", // localStorage key
      // On rehydration (when store loads from localStorage), apply the theme
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

/**
 * Selectors for optimized re-renders
 *
 * These selectors allow components to subscribe to specific parts of the theme state,
 * preventing unnecessary re-renders when unrelated state changes.
 */

/**
 * Selector for theme only
 */
export const selectTheme = (state: ThemeState) => state.theme;

/**
 * Selector for theme actions only
 */
export const selectThemeActions = (state: ThemeState) => ({
  toggleTheme: state.toggleTheme,
  setTheme: state.setTheme,
});

