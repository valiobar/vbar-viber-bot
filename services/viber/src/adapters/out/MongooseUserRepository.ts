/**
 * Mongoose User Repository Adapter
 *
 * Output adapter for user persistence using Mongoose and MongoDB.
 * This adapter implements the IUserRepository port interface
 * following Hexagonal Architecture principles.
 *
 * Location: Output Adapters layer (Hexagonal Architecture)
 */

import { IUserRepository } from "../../ports/out/IUserRepository";
import { ViberUser } from "../../domains/user/entities/ViberUser";
import { ViberUserModel, IViberUserDocument } from "./models/ViberUserModel";
import { ConsoleLogger, Logger } from "@vbar/shared";

export class MongooseUserRepository implements IUserRepository {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger("MongooseUserRepository");
  }

  /**
   * Find a user by Viber ID
   */
  async findByViberId(viberId: string): Promise<ViberUser | null> {
    try {
      this.logger.debug("Finding user by viberId", { viberId });
      const doc = await ViberUserModel.findOne({ viberId }).exec();

      if (!doc) {
        this.logger.debug("User not found", { viberId });
        return null;
      }

      return this.toDomainEntity(doc);
    } catch (error) {
      this.logger.error("Error finding user by viberId", {
        viberId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Create a new user or update an existing one
   */
  async createOrUpdate(userData: Partial<ViberUser>): Promise<ViberUser> {
    try {
      if (!userData.viberId) {
        throw new Error("viberId is required for createOrUpdate");
      }

      this.logger.debug("Creating or updating user", {
        viberId: userData.viberId,
      });

      const updateData: any = {
        ...(userData.name && { name: userData.name }),
        ...(userData.avatar !== undefined && { avatar: userData.avatar }),
        ...(userData.language !== undefined && { language: userData.language }),
        ...(userData.country !== undefined && { country: userData.country }),
        ...(userData.apiVersion !== undefined && {
          apiVersion: userData.apiVersion,
        }),
        ...(userData.subscribed !== undefined && {
          subscribed: userData.subscribed,
        }),
        ...(userData.subscribedAt && { subscribedAt: userData.subscribedAt }),
        ...(userData.unsubscribedAt && {
          unsubscribedAt: userData.unsubscribedAt,
        }),
        ...(userData.currentStepId !== undefined && {
          currentStepId: userData.currentStepId,
        }),
        ...(userData.state !== undefined && { state: userData.state }),
        ...(userData.metadata !== undefined && { metadata: userData.metadata }),
      };

      const doc = await ViberUserModel.findOneAndUpdate(
        { viberId: userData.viberId },
        updateData,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      ).exec();

      return this.toDomainEntity(doc);
    } catch (error) {
      this.logger.error("Error creating or updating user", {
        viberId: userData.viberId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Update user subscription status
   */
  async updateSubscriptionStatus(
    viberId: string,
    subscribed: boolean
  ): Promise<ViberUser | null> {
    try {
      this.logger.debug("Updating subscription status", {
        viberId,
        subscribed,
      });

      const updateData: any = {
        subscribed,
        ...(subscribed
          ? { subscribedAt: new Date(), unsubscribedAt: undefined }
          : { unsubscribedAt: new Date() }),
      };

      const doc = await ViberUserModel.findOneAndUpdate(
        { viberId },
        updateData,
        { new: true }
      ).exec();

      if (!doc) {
        this.logger.debug("User not found for subscription update", {
          viberId,
        });
        return null;
      }

      return this.toDomainEntity(doc);
    } catch (error) {
      this.logger.error("Error updating subscription status", {
        viberId,
        subscribed,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Find all subscribed users
   */
  async findSubscribedUsers(): Promise<ViberUser[]> {
    try {
      this.logger.debug("Finding subscribed users");
      const docs = await ViberUserModel.find({ subscribed: true }).exec();

      return docs.map((doc) => this.toDomainEntity(doc));
    } catch (error) {
      this.logger.error("Error finding subscribed users", {
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Update user profile information
   */
  async updateProfile(
    viberId: string,
    profileData: Partial<ViberUser>
  ): Promise<ViberUser | null> {
    try {
      this.logger.debug("Updating user profile", { viberId });

      const updateData: any = {};
      if (profileData.name !== undefined) updateData.name = profileData.name;
      if (profileData.avatar !== undefined)
        updateData.avatar = profileData.avatar;
      if (profileData.language !== undefined)
        updateData.language = profileData.language;
      if (profileData.country !== undefined)
        updateData.country = profileData.country;
      if (profileData.apiVersion !== undefined)
        updateData.apiVersion = profileData.apiVersion;
      if (profileData.metadata !== undefined)
        updateData.metadata = profileData.metadata;

      const doc = await ViberUserModel.findOneAndUpdate(
        { viberId },
        updateData,
        { new: true }
      ).exec();

      if (!doc) {
        this.logger.debug("User not found for profile update", { viberId });
        return null;
      }

      return this.toDomainEntity(doc);
    } catch (error) {
      this.logger.error("Error updating user profile", {
        viberId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Update user's current step
   */
  async updateCurrentStep(
    viberId: string,
    stepId: string | null
  ): Promise<ViberUser | null> {
    try {
      this.logger.debug("Updating user current step", {
        viberId,
        stepId,
      });

      const updateData: any = {
        currentStepId: stepId || undefined,
      };

      const doc = await ViberUserModel.findOneAndUpdate(
        { viberId },
        updateData,
        { new: true }
      ).exec();

      if (!doc) {
        this.logger.debug("User not found for current step update", {
          viberId,
        });
        return null;
      }

      return this.toDomainEntity(doc);
    } catch (error) {
      this.logger.error("Error updating user current step", {
        viberId,
        stepId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Convert Mongoose document to ViberUser domain entity
   */
  private toDomainEntity(doc: IViberUserDocument): ViberUser {
    return new ViberUser({
      id: doc._id.toString(),
      viberId: doc.viberId,
      name: doc.name,
      avatar: doc.avatar,
      language: doc.language,
      country: doc.country,
      apiVersion: doc.apiVersion,
      subscribed: doc.subscribed,
      subscribedAt: doc.subscribedAt,
      unsubscribedAt: doc.unsubscribedAt,
      currentStepId: doc.currentStepId,
      state: doc.state,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      metadata: doc.metadata,
    });
  }
}
