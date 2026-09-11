/**
 * Mongoose Broadcast Model
 *
 * Defines the MongoDB schema and model for Broadcast documents.
 * Broadcasts schedule a Step send to test Viber IDs or all subscribed users.
 */

import mongoose, { Schema, Model } from "mongoose";
import type { BroadcastStatus } from "@vbar/shared";

/**
 * Broadcast document interface (MongoDB document structure)
 */
export interface IBroadcastDocument extends mongoose.Document {
  name: string;
  stepId: mongoose.Types.ObjectId; // ref Step
  sendToAll: boolean;
  testViberIds: string[];
  scheduledAt: Date;
  status: BroadcastStatus;
  totalCount: number;
  successCount: number;
  failedList: { viberId: string; reason: string }[];
  startedAt: Date | null;
  finishedAt: Date | null;
  errorMessage: string | null;
  lockedBy: string | null;
  lockedAt: Date | null;
  lastHeartbeatAt: Date | null;
  lastProcessedId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Broadcast schema definition
 */
const broadcastSchema = new Schema<IBroadcastDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    stepId: { type: Schema.Types.ObjectId, ref: "Step", required: true },
    sendToAll: { type: Boolean, default: false },
    testViberIds: { type: [String], default: [] },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["scheduled", "sending", "finished", "failed", "canceled"],
      default: "scheduled",
    },
    totalCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failedList: { type: [{ viberId: String, reason: String }], default: [] },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
    lockedBy: { type: String, default: null },
    lockedAt: { type: Date, default: null },
    lastHeartbeatAt: { type: Date, default: null },
    lastProcessedId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false, // We handle timestamps manually in pre-save hook
    collection: "broadcasts",
  }
);

// Compound indexes for the two hot queries
broadcastSchema.index({ status: 1, scheduledAt: 1 }); // due-claim query
broadcastSchema.index({ status: 1, lastHeartbeatAt: 1 }); // stale recovery

/**
 * Pre-save hook for broadcast schema
 * Updates timestamp
 */
broadcastSchema.pre("save", function () {
  (this as any).updatedAt = new Date();
});

/**
 * Broadcast model
 * Uses singleton pattern to prevent model recompilation
 */
let BroadcastModel: Model<IBroadcastDocument>;

if (mongoose.models.Broadcast) {
  BroadcastModel = mongoose.models.Broadcast as Model<IBroadcastDocument>;
} else {
  BroadcastModel = mongoose.model<IBroadcastDocument>(
    "Broadcast",
    broadcastSchema
  );
}

export { BroadcastModel };
