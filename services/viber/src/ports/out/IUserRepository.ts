/**
 * User Repository Interface (Port)
 *
 * Output port interface for user repository operations.
 * This defines the contract for user persistence operations
 * following Hexagonal Architecture principles.
 *
 * Location: Output Ports layer (Hexagonal Architecture)
 */

import { ViberUser } from "../../domains/user/entities/ViberUser";

export interface IUserRepository {
  /**
   * Find a user by Viber ID
   * @param viberId - The Viber user ID
   * @returns The user entity or null if not found
   */
  findByViberId(viberId: string): Promise<ViberUser | null>;

  /**
   * Create a new user or update an existing one
   * @param userData - Partial user data to create or update
   * @returns The created or updated user entity
   */
  createOrUpdate(userData: Partial<ViberUser>): Promise<ViberUser>;

  /**
   * Update user subscription status
   * @param viberId - The Viber user ID
   * @param subscribed - The subscription status
   * @returns The updated user entity or null if not found
   */
  updateSubscriptionStatus(
    viberId: string,
    subscribed: boolean
  ): Promise<ViberUser | null>;

  /**
   * Find all subscribed users
   * @returns Array of subscribed user entities
   */
  findSubscribedUsers(): Promise<ViberUser[]>;

  /**
   * Update user profile information
   * @param viberId - The Viber user ID
   * @param profileData - Partial profile data to update
   * @returns The updated user entity or null if not found
   */
  updateProfile(
    viberId: string,
    profileData: Partial<ViberUser>
  ): Promise<ViberUser | null>;

  /**
   * Update user's current step
   * @param viberId - The Viber user ID
   * @param stepId - The step ID to set as current, or null to clear
   * @returns The updated user entity or null if not found
   */
  updateCurrentStep(
    viberId: string,
    stepId: string | null
  ): Promise<ViberUser | null>;
}
