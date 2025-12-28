/**
 * Authentication Input Port
 *
 * Defines the contract for authentication use cases.
 * This is an input port following Hexagonal Architecture principles.
 * Use case implementations will implement these interfaces.
 */

import type { User } from "@vbar/shared";

/**
 * Login request interface
 *
 * Contains credentials for user authentication.
 */
export interface LoginRequest {
  /**
   * User username
   */
  username: string;

  /**
   * User password (plain text)
   */
  password: string;
}

/**
 * Login response interface
 *
 * Contains authentication tokens and user information.
 */
export interface LoginResponse {
  /**
   * JWT access token
   */
  accessToken: string;

  /**
   * JWT refresh token
   */
  refreshToken: string;

  /**
   * Authenticated user information (without password hash)
   */
  user: User;
}

/**
 * Logout request interface
 *
 * Contains refresh token to invalidate.
 */
export interface LogoutRequest {
  /**
   * Refresh token to invalidate
   */
  refreshToken: string;
}

/**
 * Logout response interface
 *
 * Confirms successful logout.
 */
export interface LogoutResponse {
  /**
   * Success message
   */
  message: string;

  /**
   * Indicates if logout was successful
   */
  success: boolean;
}

/**
 * Refresh token request interface
 *
 * Contains refresh token to exchange for new access token.
 */
export interface RefreshTokenRequest {
  /**
   * Refresh token to exchange
   */
  refreshToken: string;
}

/**
 * Refresh token response interface
 *
 * Contains new authentication tokens.
 */
export interface RefreshTokenResponse {
  /**
   * New JWT access token
   */
  accessToken: string;

  /**
   * New JWT refresh token (if token rotation is enabled)
   */
  refreshToken?: string;
}
