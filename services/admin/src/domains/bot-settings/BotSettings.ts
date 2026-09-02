/**
 * BotSettings Domain Entity
 *
 * Domain entity representing Bot Settings in the Admin Service.
 * Bot Settings store global bot configuration including bot identity,
 * default button styles, welcome step reference, and analytics configuration.
 * This entity includes validation and business logic for bot settings properties.
 */

import { BotStatus } from "./types";
import { Validators } from "./lib/Validators";

/**
 * BotSettings domain entity
 *
 * Represents global bot configuration settings.
 * Bot Settings follow a singleton pattern (only one settings document exists).
 */
export class BotSettings {
  public readonly id: string;
  public readonly avatarURL: string | null;
  public readonly botName: string;
  public readonly botViberName: string | null;
  public readonly status: BotStatus;
  public readonly buttonsBackground: string | null;
  public readonly buttonsTextColor: string | null;
  public readonly buttonsPrefix: string | null;
  public readonly welcomeStepId: string | null;
  public readonly GAKey: string | null;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  /**
   * Creates a new BotSettings domain entity
   *
   * @param params - BotSettings properties
   * @throws Error if validation fails
   */
  constructor(params: {
    id: string;
    avatarURL?: string | null;
    botName: string;
    botViberName?: string | null;
    status?: BotStatus;
    buttonsBackground?: string | null;
    buttonsTextColor?: string | null;
    buttonsPrefix?: string | null;
    welcomeStepId?: string | null;
    GAKey?: string | null;
    createdAt: string;
    updatedAt: string;
  }) {
    // Validate and set properties
    this.id = params.id;
    this.avatarURL = Validators.validateUrl(params.avatarURL, "avatarURL");
    this.botName = Validators.validateBotName(params.botName);
    this.botViberName = params.botViberName ?? null;
    this.status = Validators.validateStatus(params.status);
    this.buttonsBackground = Validators.validateColor(
      params.buttonsBackground,
      "buttonsBackground"
    );
    this.buttonsTextColor = Validators.validateColor(
      params.buttonsTextColor,
      "buttonsTextColor"
    );
    this.buttonsPrefix = params.buttonsPrefix ?? null;
    this.welcomeStepId = Validators.validateObjectId(
      params.welcomeStepId,
      "welcomeStepId"
    );
    this.GAKey = params.GAKey ?? null;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  /**
   * Creates a BotSettings entity from database document
   *
   * @param doc - Database document (MongoDB document with _id)
   * @returns BotSettings domain entity
   */
  public static fromDatabaseDocument(doc: {
    _id: string | { toString(): string };
    avatarURL?: string | null;
    botName: string;
    botViberName?: string | null;
    status?: BotStatus;
    buttonsBackground?: string | null;
    buttonsTextColor?: string | null;
    buttonsPrefix?: string | null;
    welcomeStepId?: string | { toString(): string } | null;
    GAKey?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): BotSettings {
    // Convert ObjectId to string if needed
    const id = typeof doc._id === "string" ? doc._id : doc._id.toString();

    // Convert dates to ISO strings
    const createdAt =
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : doc.createdAt;
    const updatedAt =
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : doc.updatedAt;

    // Convert welcomeStepId reference (optional) - handle ObjectId reference
    let welcomeStepId: string | null = null;
    if (doc.welcomeStepId !== null && doc.welcomeStepId !== undefined) {
      welcomeStepId =
        typeof doc.welcomeStepId === "string"
          ? doc.welcomeStepId
          : doc.welcomeStepId.toString();
    }

    return new BotSettings({
      id,
      avatarURL: doc.avatarURL,
      botName: doc.botName,
      botViberName: doc.botViberName,
      status: doc.status,
      buttonsBackground: doc.buttonsBackground,
      buttonsTextColor: doc.buttonsTextColor,
      buttonsPrefix: doc.buttonsPrefix,
      welcomeStepId,
      GAKey: doc.GAKey,
      createdAt,
      updatedAt,
    });
  }

  /**
   * Creates a new BotSettings entity
   *
   * @param params - BotSettings creation parameters
   * @returns New BotSettings domain entity
   */
  public static create(params: {
    avatarURL?: string | null;
    botName: string;
    botViberName?: string | null;
    status?: BotStatus;
    buttonsBackground?: string | null;
    buttonsTextColor?: string | null;
    buttonsPrefix?: string | null;
    welcomeStepId?: string | null;
    GAKey?: string | null;
  }): BotSettings {
    const now = new Date().toISOString();

    // Generate a temporary ID (will be replaced by repository)
    const tempId = `temp-${Date.now()}`;

    return new BotSettings({
      id: tempId,
      avatarURL: params.avatarURL,
      botName: params.botName,
      botViberName: params.botViberName,
      status: params.status,
      buttonsBackground: params.buttonsBackground,
      buttonsTextColor: params.buttonsTextColor,
      buttonsPrefix: params.buttonsPrefix,
      welcomeStepId: params.welcomeStepId,
      GAKey: params.GAKey,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Updates BotSettings entity with partial updates
   *
   * @param updates - Partial updates to apply
   * @returns New BotSettings entity with updates applied
   * @throws Error if validation fails
   */
  public update(updates: {
    avatarURL?: string | null;
    botName?: string;
    botViberName?: string | null;
    status?: BotStatus;
    buttonsBackground?: string | null;
    buttonsTextColor?: string | null;
    buttonsPrefix?: string | null;
    welcomeStepId?: string | null;
    GAKey?: string | null;
  }): BotSettings {
    const now = new Date().toISOString();

    return new BotSettings({
      id: this.id,
      avatarURL:
        updates.avatarURL !== undefined ? updates.avatarURL : this.avatarURL,
      botName: updates.botName !== undefined ? updates.botName : this.botName,
      botViberName:
        updates.botViberName !== undefined
          ? updates.botViberName
          : this.botViberName,
      status: updates.status !== undefined ? updates.status : this.status,
      buttonsBackground:
        updates.buttonsBackground !== undefined
          ? updates.buttonsBackground
          : this.buttonsBackground,
      buttonsTextColor:
        updates.buttonsTextColor !== undefined
          ? updates.buttonsTextColor
          : this.buttonsTextColor,
      buttonsPrefix:
        updates.buttonsPrefix !== undefined
          ? updates.buttonsPrefix
          : this.buttonsPrefix,
      welcomeStepId:
        updates.welcomeStepId !== undefined
          ? updates.welcomeStepId
          : this.welcomeStepId,
      GAKey: updates.GAKey !== undefined ? updates.GAKey : this.GAKey,
      createdAt: this.createdAt,
      updatedAt: now,
    });
  }
}
