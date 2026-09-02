"use client";

/**
 * ThemeToggle Component
 *
 * Button component to toggle between light and dark themes with icon.
 * Displays sun icon when theme is "dark" (to switch to light),
 * and moon icon when theme is "light" (to switch to dark).
 */

import { useThemeStore } from "../model/themeStore";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-gray-300 dark:hover:bg-gray-700"
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      role="button"
      type="button"
    >
      {/* Sun icon - shown when theme is "dark" (to switch to light) */}
      {theme === "dark" && (
        <svg
          className="h-5 w-5 transition-transform duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}

      {/* Moon icon - shown when theme is "light" (to switch to dark) */}
      {theme === "light" && (
        <svg
          className="h-5 w-5 transition-transform duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
};
