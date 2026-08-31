/**
 * Mongoose Wallet Model
 *
 * Defines the MongoDB schema and model for Wallet documents.
 */

import mongoose, { Schema, Model } from "mongoose";
import type { BlockchainNetwork } from "@vbar/shared";

/**
 * Wallet document interface (MongoDB document structure)
 */
export interface IWalletDocument extends mongoose.Document {
  viberUserId: string;
  address: string;
  network: BlockchainNetwork;
  encryptedPrivateKey: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Wallet schema definition
 */
const walletSchema = new Schema<IWalletDocument>(
  {
    _id: {
      type: Schema.Types.String,
      required: true,
    } as any,
    viberUserId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
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
    encryptedPrivateKey: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: "wallets",
  }
);

// Compound index for viberUserId and network
walletSchema.index({ viberUserId: 1, network: 1 });

// Compound index for address and network (unique constraint)
walletSchema.index({ address: 1, network: 1 }, { unique: true });

/**
 * Wallet model
 * Uses singleton pattern to prevent model recompilation
 */
let WalletModel: Model<IWalletDocument>;

if (mongoose.models.Wallet) {
  WalletModel = mongoose.models.Wallet as Model<IWalletDocument>;
} else {
  WalletModel = mongoose.model<IWalletDocument>("Wallet", walletSchema);
}

export { WalletModel };

