/**
 * ViberUser Domain Entity
 *
 * Represents a Viber user with subscription status and profile information.
 * This is a domain entity following Hexagonal Architecture principles.
 */

export interface ViberUserParams {
  id?: string; // MongoDB _id as string
  viberId: string;
  name: string;
  avatar?: string;
  language?: string;
  country?: string;
  apiVersion?: number;
  subscribed: boolean;
  subscribedAt?: Date;
  unsubscribedAt?: Date;
  state?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export class ViberUser {
  public readonly id?: string; // MongoDB _id as string
  public readonly viberId: string;
  public readonly name: string;
  public readonly avatar?: string;
  public readonly language?: string;
  public readonly country?: string;
  public readonly apiVersion?: number;
  public readonly subscribed: boolean;
  public readonly subscribedAt?: Date;
  public readonly unsubscribedAt?: Date;
  public readonly state?: Record<string, any>;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly metadata?: Record<string, any>;

  constructor(params: ViberUserParams) {
    // Validate required fields
    this.validateViberId(params.viberId);
    this.validateName(params.name);

    // Assign properties
    this.id = params.id;
    this.viberId = params.viberId;
    this.name = params.name;
    this.avatar = params.avatar;
    this.language = params.language;
    this.country = params.country;
    this.apiVersion = params.apiVersion;
    this.subscribed = params.subscribed;
    this.subscribedAt = params.subscribedAt;
    this.unsubscribedAt = params.unsubscribedAt;
    this.state = params.state;
    this.createdAt = params.createdAt || new Date();
    this.updatedAt = params.updatedAt || new Date();
    this.metadata = params.metadata;
  }

  /**
   * Validates viberId (required, non-empty string)
   */
  private validateViberId(viberId: string): void {
    if (
      !viberId ||
      typeof viberId !== "string" ||
      viberId.trim().length === 0
    ) {
      throw new Error("viberId is required and must be a non-empty string");
    }
  }

  /**
   * Validates name (required, non-empty string)
   */
  private validateName(name: string): void {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new Error("name is required and must be a non-empty string");
    }
  }

  /**
   * Subscribe the user
   * Returns a new ViberUser instance with updated subscription status
   */
  subscribe(): ViberUser {
    return new ViberUser({
      ...this.toParams(),
      subscribed: true,
      subscribedAt: new Date(),
      unsubscribedAt: undefined,
      updatedAt: new Date(),
    });
  }

  /**
   * Unsubscribe the user
   * Returns a new ViberUser instance with updated subscription status
   */
  unsubscribe(): ViberUser {
    return new ViberUser({
      ...this.toParams(),
      subscribed: false,
      unsubscribedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Update user profile information
   * Returns a new ViberUser instance with updated profile
   */
  updateProfile(profileData: {
    name?: string;
    avatar?: string;
    language?: string;
    country?: string;
    apiVersion?: number;
    metadata?: Record<string, any>;
  }): ViberUser {
    const updatedParams: ViberUserParams = {
      ...this.toParams(),
      updatedAt: new Date(),
    };

    // Update only provided fields
    if (profileData.name !== undefined) {
      this.validateName(profileData.name);
      updatedParams.name = profileData.name;
    }
    if (profileData.avatar !== undefined) {
      updatedParams.avatar = profileData.avatar;
    }
    if (profileData.language !== undefined) {
      updatedParams.language = profileData.language;
    }
    if (profileData.country !== undefined) {
      updatedParams.country = profileData.country;
    }
    if (profileData.apiVersion !== undefined) {
      updatedParams.apiVersion = profileData.apiVersion;
    }
    if (profileData.metadata !== undefined) {
      updatedParams.metadata = profileData.metadata;
    }

    return new ViberUser(updatedParams);
  }

  /**
   * Update user state/context data
   * Returns a new ViberUser instance with updated state
   */
  updateState(stateData: Record<string, any>): ViberUser {
    return new ViberUser({
      ...this.toParams(),
      state: stateData,
      updatedAt: new Date(),
    });
  }

  /**
   * Convert entity to plain object for persistence
   */
  private toParams(): ViberUserParams {
    return {
      id: this.id,
      viberId: this.viberId,
      name: this.name,
      avatar: this.avatar,
      language: this.language,
      country: this.country,
      apiVersion: this.apiVersion,
      subscribed: this.subscribed,
      subscribedAt: this.subscribedAt,
      unsubscribedAt: this.unsubscribedAt,
      state: this.state,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
    };
  }
}
