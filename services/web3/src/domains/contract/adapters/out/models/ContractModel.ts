/**
 * Mongoose Contract Model
 *
 * Defines the MongoDB schema and model for SmartContract documents.
 */

import mongoose, { Schema, Model } from "mongoose";
import type { BlockchainNetwork } from "@vbar/shared";

/**
 * Contract document interface (MongoDB document structure)
 */
export interface IContractDocument extends mongoose.Document {
  address: string;
  network: BlockchainNetwork;
  abi: any[]; // Contract ABI JSON array
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contract schema definition
 */
const contractSchema = new Schema<IContractDocument>(
  {
    _id: {
      type: Schema.Types.String,
      required: true,
    } as any,
    address: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    network: {
      type: String,
      required: true,
      enum: ["ethereum", "polygon", "bsc", "arbitrum"],
      index: true,
    },
    abi: {
      type: Schema.Types.Mixed,
      required: true,
    },
    name: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: "contracts",
  }
);

// Compound index for address and network (unique constraint)
contractSchema.index({ address: 1, network: 1 }, { unique: true });

/**
 * Contract model
 * Uses singleton pattern to prevent model recompilation
 */
let ContractModel: Model<IContractDocument>;

if (mongoose.models.Contract) {
  ContractModel = mongoose.models.Contract as Model<IContractDocument>;
} else {
  ContractModel = mongoose.model<IContractDocument>("Contract", contractSchema);
}

export { ContractModel };

