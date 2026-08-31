/**
 * Mongoose Step Model
 *
 * Defines the MongoDB schema and model for Step documents.
 * Steps are the building blocks of bot conversation flows.
 */

import mongoose, { Schema, Model } from "mongoose";

/**
 * Step document interface (MongoDB document structure)
 */
export interface IStepDocument extends mongoose.Document {
  humanReadableName: string;
  trigger: string[];
  content: mongoose.Types.ObjectId[]; // Array of Message IDs (references to Message model)
  keyboard?: mongoose.Types.ObjectId | null; // Optional Keyboard ID (reference to Keyboard model)
  hidden: boolean;
  isAi: boolean;
  botId?: string | null; // Optional BotInstance ID (string identifier)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Step schema definition
 */
const stepSchema = new Schema<IStepDocument>(
  {
    humanReadableName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      validate: {
        validator: function (value: string) {
          return !!(value && value.trim().length > 0);
        },
        message: "Human-readable name cannot be empty",
      },
    },
    trigger: {
      type: [String],
      required: true,
      validate: {
        validator: function (value: string[]) {
          return (
            Array.isArray(value) &&
            value.length > 0 &&
            value.every(
              (item) => typeof item === "string" && item.trim().length > 0
            )
          );
        },
        message:
          "Trigger array is required and must contain at least one non-empty string",
      },
    },
    content: {
      type: [Schema.Types.ObjectId],
      ref: "Message",
      required: true,
      validate: {
        validator: function (value: mongoose.Types.ObjectId[]) {
          return (
            Array.isArray(value) &&
            value.length > 0 &&
            value.every((item) => mongoose.Types.ObjectId.isValid(item))
          );
        },
        message:
          "Content array is required and must contain at least one valid Message ID",
      },
    },
    keyboard: {
      type: Schema.Types.ObjectId,
      ref: "Keyboard",
      required: false,
      default: null,
      validate: {
        validator: function (value: mongoose.Types.ObjectId | null) {
          if (value === null || value === undefined) {
            return true;
          }
          return mongoose.Types.ObjectId.isValid(value);
        },
        message: "Keyboard must be a valid Keyboard ID or null",
      },
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    isAi: {
      type: Boolean,
      default: false,
    },
    botId: {
      type: String,
      required: false,
      default: null,
      index: true, // Add index for efficient querying
      validate: {
        validator: function (value: string | null) {
          if (value === null || value === undefined) {
            return true; // Allow null for backward compatibility
          }
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "botId must be a non-empty string or null",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We handle timestamps manually in pre-save hook
    collection: "steps",
  }
);

// Indexes for efficient querying
stepSchema.index({ botId: 1 }); // Single field index
stepSchema.index({ botId: 1, hidden: 1 }); // Compound index for filtering by botId and hidden status

/**
 * Pre-save hook for step schema
 * Validates trigger array uniqueness and updates timestamp
 */
stepSchema.pre("save", async function () {
  // Update updatedAt timestamp
  (this as any).updatedAt = new Date();

  // Validate trigger array has no duplicates (case-insensitive)
  if (this.trigger && Array.isArray(this.trigger)) {
    const seenTriggers = new Set<string>();
    for (const triggerStr of this.trigger) {
      const lowerTrigger = triggerStr.toLowerCase();
      if (seenTriggers.has(lowerTrigger)) {
        throw new Error(
          `Duplicate trigger string found: "${triggerStr}" (case-insensitive)`
        );
      }
      seenTriggers.add(lowerTrigger);
    }
  }

  // Validate content array is not empty
  if (
    !this.content ||
    !Array.isArray(this.content) ||
    this.content.length === 0
  ) {
    throw new Error("Content array must have at least one Message ID");
  }

  // Validate human-readable name
  if (
    !this.humanReadableName ||
    typeof this.humanReadableName !== "string" ||
    this.humanReadableName.trim().length === 0
  ) {
    throw new Error("Human-readable name is required and cannot be empty");
  }
});

/**
 * Step model
 * Uses singleton pattern to prevent model recompilation
 */
let StepModel: Model<IStepDocument>;

if (mongoose.models.Step) {
  StepModel = mongoose.models.Step as Model<IStepDocument>;
} else {
  StepModel = mongoose.model<IStepDocument>("Step", stepSchema);
}

export { StepModel };
