/**
 * Zustand Authentication Store
 *
 * Manages client-side authentication state including user, tokens, and auth actions.
 * This store handles login, logout, and token refresh operations.
 */

import { create } from "zustand";
import type { User } from "@vbar/shared";
import type { ApiResponse } from "@vbar/shared";
import type {
  LoginResponse,
  LogoutResponse,
  RefreshTokenResponse,
} from "@/domains/user/ports/in/AuthPort";

/**
 * Authentication state interface
 */
interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

/**
 * Zustand authentication store
 *
 * Manages authentication state and provides actions for login, logout, and token refresh.
 * Tokens are stored in memory for security (not in localStorage).
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  /**
   * Login action
   *
   * Authenticates user with username and password, stores tokens and user data.
   *
   * @param username - User username
   * @param password - User password
   * @throws Error if login fails
   */
  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result: ApiResponse<LoginResponse> = await response.json();

      if (!response.ok || result.error) {
        const errorMessage =
          result.error?.message || "Login failed. Please try again.";
        set({
          isLoading: false,
          error: errorMessage,
          isAuthenticated: false,
        });
        throw new Error(errorMessage);
      }

      if (!result.data) {
        const errorMessage = "Invalid response from server";
        set({
          isLoading: false,
          error: errorMessage,
          isAuthenticated: false,
        });
        throw new Error(errorMessage);
      }

      // Store tokens and user data
      set({
        user: result.data.user,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during login";
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
      });
      throw error;
    }
  },

  /**
   * Logout action
   *
   * Invalidates refresh token and clears authentication state.
   */
  logout: async () => {
    const { refreshToken } = get();

    set({ isLoading: true, error: null });

    try {
      // If we have a refresh token, try to invalidate it on the server
      if (refreshToken) {
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
          });
        } catch (error) {
          // Log error but don't fail logout - clear state anyway
          console.error("Failed to invalidate refresh token on server:", error);
        }
      }

      // Clear authentication state
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during logout";

      // Even if logout fails, clear local state
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  /**
   * Refresh access token action
   *
   * Exchanges refresh token for new access token and optionally new refresh token.
   * Automatically updates stored tokens.
   */
  refreshAccessToken: async () => {
    const { refreshToken } = get();

    if (!refreshToken) {
      const errorMessage = "No refresh token available";
      set({
        error: errorMessage,
        isAuthenticated: false,
      });
      throw new Error(errorMessage);
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      const result: ApiResponse<RefreshTokenResponse> = await response.json();

      if (!response.ok || result.error) {
        const errorMessage =
          result.error?.message || "Token refresh failed. Please login again.";

        // If refresh fails, clear auth state (token expired or invalid)
        set({
          isLoading: false,
          error: errorMessage,
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
        });
        throw new Error(errorMessage);
      }

      if (!result.data) {
        const errorMessage = "Invalid response from server";
        set({
          isLoading: false,
          error: errorMessage,
          isAuthenticated: false,
        });
        throw new Error(errorMessage);
      }

      // Update tokens
      set({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken || refreshToken, // Use new refresh token if provided, otherwise keep existing
        isLoading: false,
        error: null,
        // Keep isAuthenticated true if it was true before
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during token refresh";

      // If refresh fails, clear auth state
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
      });
      throw error;
    }
  },

  /**
   * Set user action
   *
   * Updates user information in the store.
   *
   * @param user - User object to set
   */
  setUser: (user: User) => {
    set({ user });
  },

  /**
   * Clear auth action
   *
   * Clears all authentication state without calling logout API.
   * Useful for clearing state on errors or when tokens are invalid.
   */
  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },
}));

/**
 * Selectors for optimized re-renders
 *
 * These selectors allow components to subscribe to specific parts of the auth state,
 * preventing unnecessary re-renders when unrelated state changes.
 */

/**
 * Selector for user data only
 */
export const selectUser = (state: AuthState) => state.user;

/**
 * Selector for authentication status only
 */
export const selectIsAuthenticated = (state: AuthState) =>
  state.isAuthenticated;

/**
 * Selector for loading state only
 */
export const selectIsLoading = (state: AuthState) => state.isLoading;

/**
 * Selector for error state only
 */
export const selectError = (state: AuthState) => state.error;

/**
 * Selector for access token only
 */
export const selectAccessToken = (state: AuthState) => state.accessToken;

/**
 * Selector for auth actions only
 */
export const selectAuthActions = (state: AuthState) => ({
  login: state.login,
  logout: state.logout,
  refreshAccessToken: state.refreshAccessToken,
  setUser: state.setUser,
  clearAuth: state.clearAuth,
});
