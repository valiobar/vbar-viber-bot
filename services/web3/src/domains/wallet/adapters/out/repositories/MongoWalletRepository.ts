/**
 * MongoDB Wallet Repository Implementation using Mongoose
 *
 * Implements the WalletRepository interface using Mongoose.
 * This is an output adapter following Hexagonal Architecture principles.
 */

import { connectToDatabase } from "../../../../../lib/mongodb";
import type { WalletRepository, WalletFilters } from "../../../ports/out/WalletRepository";
import { Wallet } from "../../../entities/Wallet";
import { WalletModel, type IWalletDocument } from "../models/WalletModel";
import { randomUUID } from "crypto";
import type { BlockchainNetwork, PaginationParams } from "@vbar/shared";

/**
 * MongoDB Wallet Repository using Mongoose
 *
 * Implements wallet data persistence operations using Mongoose models.
 */
export class MongoWalletRepository implements WalletRepository {
  /**
   * Ensures database connection is established
   */
  private async ensureConnection(): Promise<void> {
    await connectToDatabase();
  }

  /**
   * Converts Mongoose document to Wallet domain entity
   *
   * @param doc - Mongoose document
   * @returns Wallet domain entity
   */
  private toWalletEntity(doc: IWalletDocument): Wallet {
    return new Wallet({
      id: doc._id.toString(),
      viberUserId: doc.viberUserId,
      address: doc.address,
      network: doc.network,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Create a new wallet
   *
   * @param wallet - Wallet entity to create
   * @param encryptedPrivateKey - Encrypted private key
   * @returns Promise resolving to created wallet
   * @throws Error if wallet creation fails
   */
  async create(wallet: Wallet, encryptedPrivateKey?: string): Promise<Wallet> {
    try {
      await this.ensureConnection();

      if (!encryptedPrivateKey) {
        throw new Error("Encrypted private key is required for wallet creation");
      }

      const walletDoc = new WalletModel({
        _id: wallet.id,
        viberUserId: wallet.viberUserId,
        address: wallet.address.getValue(),
        network: wallet.network.getValue(),
        encryptedPrivateKey,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      });

      const savedDoc = await walletDoc.save();
      return this.toWalletEntity(savedDoc);
    } catch (error) {
      throw new Error(
        `Failed to create wallet: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Find wallet by ID
   *
   * @param id - Wallet ID
   * @returns Promise resolving to wallet or null if not found
   */
  async findById(id: string): Promise<Wallet | null> {
    try {
      await this.ensureConnection();
      const doc = await WalletModel.findById(id).exec();

      if (!doc) {
        return null;
      }

      return this.toWalletEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to find wallet by ID: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Find wallets by Viber user ID
   *
   * @param viberUserId - Viber user ID
   * @param network - Optional network filter
   * @returns Promise resolving to array of wallets
   */
  async findByViberUserId(
    viberUserId: string,
    network?: BlockchainNetwork
  ): Promise<Wallet[]> {
    try {
      await this.ensureConnection();
      const query: any = { viberUserId };
      if (network) {
        query.network = network;
      }
      const docs = await WalletModel.find(query).exec();

      return docs.map((doc) => this.toWalletEntity(doc));
    } catch (error) {
      throw new Error(
        `Failed to find wallets by Viber user ID: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Find wallet by address and network
   *
   * @param address - Wallet address
   * @param network - Blockchain network
   * @returns Promise resolving to wallet or null if not found
   */
  async findByAddress(
    address: string,
    network: BlockchainNetwork
  ): Promise<Wallet | null> {
    try {
      await this.ensureConnection();
      const doc = await WalletModel.findOne({ address, network }).exec();

      if (!doc) {
        return null;
      }

      return this.toWalletEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to find wallet by address: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Update wallet
   *
   * @param id - Wallet ID
   * @param updates - Partial wallet updates
   * @returns Promise resolving to updated wallet
   * @throws Error if wallet not found or update fails
   */
  async update(id: string, updates: Partial<Wallet>): Promise<Wallet> {
    try {
      await this.ensureConnection();

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (updates.viberUserId) {
        updateData.viberUserId = updates.viberUserId;
      }
      if (updates.address) {
        updateData.address =
          typeof updates.address === "string"
            ? updates.address
            : updates.address.getValue();
      }
      if (updates.network) {
        updateData.network =
          typeof updates.network === "string"
            ? updates.network
            : updates.network.getValue();
      }

      const doc = await WalletModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).exec();

      if (!doc) {
        throw new Error(`Wallet with ID ${id} not found`);
      }

      return this.toWalletEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to update wallet: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Delete wallet
   *
   * @param id - Wallet ID
   * @returns Promise that resolves when wallet is deleted
   * @throws Error if wallet not found or deletion fails
   */
  async delete(id: string): Promise<void> {
    try {
      await this.ensureConnection();
      const result = await WalletModel.findByIdAndDelete(id).exec();

      if (!result) {
        throw new Error(`Wallet with ID ${id} not found`);
      }
    } catch (error) {
      throw new Error(
        `Failed to delete wallet: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * List wallets with filters and pagination
   *
   * @param filters - Wallet filters
   * @param pagination - Pagination parameters
   * @returns Promise resolving to wallets and total count
   */
  async list(
    filters: WalletFilters,
    pagination: PaginationParams
  ): Promise<{ wallets: Wallet[]; total: number }> {
    try {
      await this.ensureConnection();

      const query: any = {};

      if (filters.viberUserId) {
        query.viberUserId = filters.viberUserId;
      }
      if (filters.network) {
        query.network = filters.network;
      }
      if (filters.address) {
        query.address = filters.address;
      }

      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const skip = (page - 1) * limit;

      const [docs, total] = await Promise.all([
        WalletModel.find(query).skip(skip).limit(limit).exec(),
        WalletModel.countDocuments(query).exec(),
      ]);

      return {
        wallets: docs.map((doc) => this.toWalletEntity(doc)),
        total,
      };
    } catch (error) {
      throw new Error(
        `Failed to list wallets: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get encrypted private key for a wallet
   *
   * @param walletId - Wallet ID
   * @returns Promise resolving to encrypted private key
   * @throws Error if wallet not found or private key not available
   */
  async getEncryptedPrivateKey(walletId: string): Promise<string> {
    try {
      await this.ensureConnection();
      const doc = await WalletModel.findById(walletId)
        .select("encryptedPrivateKey")
        .exec();

      if (!doc) {
        throw new Error(`Wallet with ID ${walletId} not found`);
      }

      if (!doc.encryptedPrivateKey) {
        throw new Error(`Encrypted private key not available for wallet ${walletId}`);
      }

      return doc.encryptedPrivateKey;
    } catch (error) {
      throw new Error(
        `Failed to get encrypted private key: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

