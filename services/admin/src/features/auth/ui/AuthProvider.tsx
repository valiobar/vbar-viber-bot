"use client";

/**
 * Auth Provider Component
 *
 * Client component that wraps protected routes and checks authentication state.
 * Redirects unauthenticated users to login page while preserving intended destination.
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/entities/session";

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ["/login"];

/**
 * Get auth state from localStorage
 * This is used as a fallback to check authentication before Zustand store hydrates
 */
const getAuthStateFromStorage = (): {
  isAuthenticated: boolean;
  hasState: boolean;
} => {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, hasState: false };
  }

  try {
    // Check for auth-storage key (used by Zustand persist)
    const stored = localStorage.getItem("auth-storage");
    if (!stored) {
      return { isAuthenticated: false, hasState: false };
    }

    const parsed = JSON.parse(stored);
    const state = parsed?.state;

    if (!state) {
      return { isAuthenticated: false, hasState: false };
    }

    return {
      isAuthenticated: state.isAuthenticated === true,
      hasState: true,
    };
  } catch (error) {
    console.error("Error reading auth state from localStorage:", error);
    return { isAuthenticated: false, hasState: false };
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  /**
   * Check if current route is public
   */
  const isPublicRoute = (path: string): boolean => {
    return PUBLIC_ROUTES.some((route) => path.startsWith(route));
  };

  /**
   * Check if store has been hydrated from localStorage
   */
  useEffect(() => {
    // Check localStorage directly to see if we have auth state
    const storageState = getAuthStateFromStorage();

    // Zustand persist hydrates synchronously on client side, but we need to
    // ensure the component has mounted and the store is ready
    // Use a small delay to ensure Zustand has hydrated
    const hydrationTimer = setTimeout(() => {
      setIsHydrated(true);
    }, 0);

    return () => clearTimeout(hydrationTimer);
  }, []);

  /**
   * Check authentication state on mount and redirect if not authenticated
   */
  useEffect(() => {
    // Wait for hydration before checking auth
    if (!isHydrated) {
      return;
    }

    // Skip auth check for public routes
    if (isPublicRoute(pathname)) {
      setIsCheckingAuth(false);
      return;
    }

    // Get auth state - check both store and localStorage as fallback
    const storageState = getAuthStateFromStorage();
    const authStatus = isAuthenticated || storageState.isAuthenticated;

    // Check authentication state for protected routes
    if (!authStatus) {
      // Redirect to login with redirect parameter to preserve intended destination
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.push(redirectUrl);
    } else {
      // User is authenticated, show content
      setIsCheckingAuth(false);
    }
  }, [isAuthenticated, isHydrated, router, pathname]);

  // Show loading state while checking authentication (only for protected routes)
  // Only show loading while we're still checking or waiting for hydration
  if (!isPublicRoute(pathname) && (isCheckingAuth || !isHydrated)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show children (either public route or authenticated user)
  return <>{children}</>;
};
