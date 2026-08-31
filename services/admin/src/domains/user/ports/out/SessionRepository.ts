/**
 * Session Repository Interface (Output Port)
 *
 * Defines the contract for session data persistence operations.
 * This is an output port following Hexagonal Architecture principles.
 * Implementations will be provided by adapters (e.g., MongoDB adapter).
 */

/**
 * Session entity interface
 *
 * Represents a user session with refresh token.
 */
export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Session repository interface
 *
 * Defines methods for session data persistence operations.
 * All methods return Promises to support asynchronous operations.
 */
export interface SessionRepository {
  /**
   * Creates a new session
   *
   * @param session - Session data to create
   * @returns Created session entity with generated ID
   * @throws Error if session already exists or database operation fails
   */
  create(session: Omit<Session, "id" | "createdAt">): Promise<Session>;

  /**
   * Finds a session by refresh token
   *
   * @param refreshToken - Refresh token to search for
   * @returns Session entity if found, null otherwise
   * @throws Error if database operation fails
   */
  findByToken(refreshToken: string): Promise<Session | null>;

  /**
   * Deletes a session by refresh token
   *
   * @param refreshToken - Refresh token to delete
   * @returns True if session was deleted, false if session not found
   * @throws Error if database operation fails
   */
  deleteByToken(refreshToken: string): Promise<boolean>;

  /**
   * Deletes all sessions for a specific user
   *
   * @param userId - User ID whose sessions should be deleted
   * @returns Number of sessions deleted
   * @throws Error if database operation fails
   */
  deleteByUserId(userId: string): Promise<number>;

  /**
   * Deletes all expired sessions
   *
   * @returns Number of expired sessions deleted
   * @throws Error if database operation fails
   */
  deleteExpired(): Promise<number>;
}
