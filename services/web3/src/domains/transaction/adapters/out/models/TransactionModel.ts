/**
 * Mongoose Transaction Model
 *
 * Defines the MongoDB schema and model for Transaction documents.
 */

import mongoose, { Schema, Model } from "mongoose";
import type { BlockchainNetwork } from "@vbar/shared";

/**
 * Transaction status type
 */
export type TransactionStatus = "pending" | "confirmed" | "failed";

/**
 * Transaction document interface (MongoDB document structure)
 */
export interface ITransactionDocument extends mongoose.Document {
  walletId: string;
  txHash: string;
  network: BlockchainNetwork;
  from: string;
  to: string;
  value: string;
  tokenAddress?: string;
  status: TransactionStatus;
  confirmations: number;
  blockNumber?: number;
  blockHash?: string;
  gasUsed?: string;
  gasPrice?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transaction schema definition
 */
const transactionSchema = new Schema<ITransactionDocument>(
  {
    _id: {
      type: Schema.Types.String,
      required: true,
    } as any,
    walletId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    txHash: {
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
    from: {
      type: String,
      required: true,
      trim: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
    },
    tokenAddress: {
      type: String,
      required: false,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "confirmed", "failed"],
      index: true,
      default: "pending",
    },
    confirmations: {
      type: Number,
      required: true,
      default: 0,
    },
    blockNumber: {
      type: Number,
      required: false,
    },
    blockHash: {
      type: String,
      required: false,
      trim: true,
    },
    gasUsed: {
      type: String,
      required: false,
    },
    gasPrice: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: "transactions",
  }
);

// Compound index for walletId and network
transactionSchema.index({ walletId: 1, network: 1 });

// Compound index for txHash and network (unique constraint)
transactionSchema.index({ txHash: 1, network: 1 }, { unique: true });

// Compound index for status and network
transactionSchema.index({ status: 1, network: 1 });

/**
 * Transaction model
 * Uses singleton pattern to prevent model recompilation
 */
let TransactionModel: Model<ITransactionDocument>;

if (mongoose.models.Transaction) {
  TransactionModel = mongoose.models.Transaction as Model<ITransactionDocument>;
} else {
  TransactionModel = mongoose.model<ITransactionDocument>(
    "Transaction",
    transactionSchema
  );
}

export { TransactionModel };

