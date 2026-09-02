"use client";

/**
 * DashboardLayout Component
 *
 * Layout wrapper that includes SideMenu and main content area with menu toggle functionality.
 * The menu toggle works on all screen sizes. On mobile, the menu overlays with a backdrop.
 * On desktop, the menu slides in/out.
 */

import { useState, useEffect } from "react";
import { SideMenu } from "@/widgets/side-menu";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  // Menu state - default to open
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  // Load initial menu state from localStorage (optional persistence)
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menu-open");
    if (savedMenuState !== null) {
      setIsMenuOpen(savedMenuState === "true");
    }
  }, []);

  // Save menu state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("menu-open", String(isMenuOpen));
  }, [isMenuOpen]);

  /**
   * Toggle menu open/closed
   */
  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  /**
   * Close menu
   */
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Menu Toggle Button - visible on all screen sizes */}
      <div
        className={`fixed top-4 z-50 flex items-center gap-2 transition-all duration-300 ${
          isMenuOpen ? "left-[280px] md:left-[280px]" : "left-4"
        }`}
      >
        <button
          onClick={toggleMenu}
          className="rounded-lg bg-white p-2 text-gray-700 shadow-md transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          type="button"
        >
          {/* Hamburger icon - shown when menu is closed */}
          {!isMenuOpen && (
            <svg
              className="h-6 w-6 transition-transform duration-300"
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}

          {/* X/Close icon - shown when menu is open */}
          {isMenuOpen && (
            <svg
              className="h-6 w-6 transition-transform duration-300"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </button>
      </div>

      {/* SideMenu */}
      <SideMenu isOpen={isMenuOpen} onClose={closeMenu} />

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-300 ${
          isMenuOpen ? "md:ml-64" : "md:ml-0"
        }`}
      >
        <div className="p-4 pt-20 md:p-8 md:pt-8">{children}</div>
      </main>
    </div>
  );
};

