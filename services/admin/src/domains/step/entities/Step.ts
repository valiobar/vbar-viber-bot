/**
 * Step Domain Entity
 *
 * Domain entity representing a Step in the Admin Service.
 * Steps are the building blocks of bot conversation flows - they define what happens
 * when a user triggers a specific action (via trigger strings).
 * Each step contains multiple messages and optionally a keyboard.
 * This entity includes validation and business logic for step properties.
 */

/**
 * Step domain entity
 *
 * Represents a step in the bot conversation flow with trigger strings,
 * associated messages, and optionally a keyboard.
 */
export class Step {
  public readonly id: string;
  public readonly humanReadableName: string;
  public readonly trigger: string[];
  public readonly content: string[]; // Array of Message IDs
  public readonly keyboard: string | null; // Optional Keyboard ID
  public readonly hidden: boolean;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  /**
   * Creates a new Step domain entity
   *
   * @param params - Step properties
   * @throws Error if validation fails
   */
  constructor(params: {
    id: string;
    humanReadableName: string;
    trigger: string[];
    content: string[];
    keyboard?: string | null;
    hidden?: boolean;
    createdAt: string;
    updatedAt: string;
  }) {
    // Validate and set properties
    this.id = params.id;
    this.humanReadableName = this.validateHumanReadableName(
      params.humanReadableName
    );
    this.trigger = this.validateTrigger(params.trigger);
    this.content = this.validateContent(params.content);
    this.keyboard = params.keyboard ?? null;
    this.hidden = params.hidden ?? false;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  /**
   * Validates human-readable name
   *
   * @param name - Name to validate
   * @returns Validated name
   * @throws Error if name is invalid
   */
  private validateHumanReadableName(name: string): string {
    if (!name || typeof name !== "string") {
      throw new Error("Human-readable name is required and must be a string");
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      throw new Error("Human-readable name cannot be empty");
    }

    if (trimmedName.length > 100) {
      throw new Error("Human-readable name must be 100 characters or less");
    }

    return trimmedName;
  }

  /**
   * Validates trigger array
   *
   * @param trigger - Trigger array to validate
   * @returns Validated trigger array
   * @throws Error if trigger array is invalid
   */
  private validateTrigger(trigger: string[]): string[] {
    if (!Array.isArray(trigger)) {
      throw new Error("Trigger must be an array");
    }

    if (trigger.length === 0) {
      throw new Error("Trigger array must have at least one element");
    }

    // Validate each trigger string
    const validatedTriggers: string[] = [];
    const seenTriggers = new Set<string>();

    for (const triggerStr of trigger) {
      if (typeof triggerStr !== "string") {
        throw new Error("All trigger elements must be strings");
      }

      const trimmedTrigger = triggerStr.trim();

      if (trimmedTrigger.length === 0) {
        throw new Error("Trigger strings cannot be empty");
      }

      // Check for duplicates (case-sensitive)
      const lowerTrigger = trimmedTrigger.toLowerCase();
      if (seenTriggers.has(lowerTrigger)) {
        throw new Error(
          `Duplicate trigger string found: "${trimmedTrigger}" (case-insensitive)`
        );
      }
      seenTriggers.add(lowerTrigger);

      validatedTriggers.push(trimmedTrigger);
    }

    return validatedTriggers;
  }

  /**
   * Validates content array (Message IDs)
   *
   * @param content - Content array to validate
   * @returns Validated content array
   * @throws Error if content array is invalid
   */
  private validateContent(content: string[]): string[] {
    if (!Array.isArray(content)) {
      throw new Error("Content must be an array");
    }

    if (content.length === 0) {
      throw new Error("Content array must have at least one Message ID");
    }

    // Validate each content ID is a string
    const validatedContent: string[] = [];

    for (const messageId of content) {
      if (typeof messageId !== "string") {
        throw new Error("All content elements must be strings (Message IDs)");
      }

      const trimmedId = messageId.trim();

      if (trimmedId.length === 0) {
        throw new Error("Message IDs cannot be empty");
      }

      validatedContent.push(trimmedId);
    }

    return validatedContent;
  }

  /**
   * Checks if step is hidden
   *
   * @returns True if step is hidden
   */
  public isHidden(): boolean {
    return this.hidden;
  }

  /**
   * Checks if step has a keyboard
   *
   * @returns True if step has a keyboard assigned
   */
  public hasKeyboard(): boolean {
    return this.keyboard !== null && this.keyboard !== undefined;
  }

  /**
   * Gets the number of messages in this step
   *
   * @returns Number of messages
   */
  public getMessageCount(): number {
    return this.content.length;
  }

  /**
   * Creates a Step entity from database document
   *
   * @param doc - Database document (MongoDB document with _id)
   * @returns Step domain entity
   */
  public static fromDatabaseDocument(doc: {
    _id: string | { toString(): string };
    humanReadableName: string;
    trigger: string[];
    content: string[] | { toString(): string }[];
    keyboard?: string | { toString(): string } | null;
    hidden?: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): Step {
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

    // Convert content array (Message IDs) - handle ObjectId references
    const content = doc.content.map((item) =>
      typeof item === "string" ? item : item.toString()
    );

    // Convert keyboard reference (optional) - handle ObjectId reference
    let keyboard: string | null = null;
    if (doc.keyboard !== null && doc.keyboard !== undefined) {
      keyboard =
        typeof doc.keyboard === "string"
          ? doc.keyboard
          : doc.keyboard.toString();
    }

    return new Step({
      id,
      humanReadableName: doc.humanReadableName,
      trigger: doc.trigger,
      content,
      keyboard,
      hidden: doc.hidden,
      createdAt,
      updatedAt,
    });
  }

  /**
   * Creates a new Step entity
   *
   * @param params - Step creation parameters
   * @returns New Step domain entity
   */
  public static create(params: {
    humanReadableName: string;
    trigger: string[];
    content: string[];
    keyboard?: string | null;
    hidden?: boolean;
  }): Step {
    const now = new Date().toISOString();

    // Generate a temporary ID (will be replaced by repository)
    const tempId = `temp-${Date.now()}`;

    return new Step({
      id: tempId,
      humanReadableName: params.humanReadableName,
      trigger: params.trigger,
      content: params.content,
      keyboard: params.keyboard ?? null,
      hidden: params.hidden ?? false,
      createdAt: now,
      updatedAt: now,
    });
  }
}
