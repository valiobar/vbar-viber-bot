"use client";

/**
 * SideMenu Component
 *
 * Client component that displays navigation links and user-related functionalities
 * with responsive mobile behavior. The menu can be toggled open/closed on all screen sizes.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { DEFAULT_TOOLS } from "@/store/dashboardStore";
import ThemeToggle from "./ThemeToggle";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const SideMenu = ({ isOpen, onClose }: SideMenuProps) => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  /**
   * Handle link click
   * Closes the menu when a navigation link is clicked (on mobile only)
   */
  const handleLinkClick = () => {
    // Close menu on mobile when link is clicked
    // On desktop, menu stays open for better UX
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    await logout();
    // Close menu after logout
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop/overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* SideMenu */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out dark:bg-gray-800 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Sidebar navigation"
      >
        <div className="flex h-full flex-col">
          {/* Mobile close button */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700 md:hidden">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Menu
            </h2>
            <button
              onClick={onClose}
              className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              aria-label="Close menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Top Section: Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {DEFAULT_TOOLS.map((tool) => {
                const isActive = pathname === tool.route;
                return (
                  <li key={tool.id}>
                    <Link
                      href={tool.route}
                      onClick={handleLinkClick}
                      className={`block rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {tool.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom Section: User Info, Theme Toggle, and Logout */}
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-4">
              <div className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                User
              </div>
              <div className="flex items-center space-x-3">
                {/* User avatar placeholder */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                  <span className="text-sm font-semibold">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {user?.username || "User"}
                  </div>
                  {user?.email && (
                    <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-700/50">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </span>
              <ThemeToggle />
            </div>

            <button
              onClick={handleLogout}
              className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SideMenu;
