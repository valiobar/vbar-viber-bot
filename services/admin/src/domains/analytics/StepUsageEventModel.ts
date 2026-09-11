/**
 * Mongoose Step Usage Event Model
 *
 * Raw analytics events: one document per step execution in the viber service.
 * Written by the RabbitMQ step-usage consumer, read by AnalyticsService.
 */
import mongoose, { Schema, Model } from "mongoose";
import type { StepUsageSource } from "@vbar/shared";

export interface IStepUsageEventDocument extends mongoose.Document {
  stepId: mongoose.Types.ObjectId;
  userId: string;
  source: StepUsageSource;
  trigger?: string | null;
  customHandler?: string | null;
  timestamp: Date;
}

const stepUsageEventSchema = new Schema<IStepUsageEventDocument>(
  {
    stepId: { type: Schema.Types.ObjectId, ref: "Step", required: true },
    userId: { type: String, required: true, trim: true },
    source: {
      type: String,
      required: true,
      enum: ["trigger", "welcome", "subscribe"],
    },
    trigger: { type: String, default: null, trim: true, maxlength: 200 },
    customHandler: { type: String, default: null, trim: true },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: false, // events are immutable, `timestamp` is the event time
    collection: "stepusageevents",
  }
);

/** Retention: 100 days — MongoDB TTL monitor deletes expired events automatically */
const RETENTION_SECONDS = 100 * 24 * 60 * 60; // 8,640,000s

stepUsageEventSchema.index({ stepId: 1, timestamp: -1 });
// TTL index also serves range queries/sorts on timestamp (single-field index)
stepUsageEventSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: RETENTION_SECONDS }
);

let StepUsageEventModel: Model<IStepUsageEventDocument>;
if (mongoose.models.StepUsageEvent) {
  StepUsageEventModel = mongoose.models
    .StepUsageEvent as Model<IStepUsageEventDocument>;
} else {
  StepUsageEventModel = mongoose.model<IStepUsageEventDocument>(
    "StepUsageEvent",
    stepUsageEventSchema
  );
}

export { StepUsageEventModel };
