/**
 * MongoDB Transaction Repository Implementation using Mongoose
 *
 * Implements the TransactionRepository interface using Mongoose.
 * This is an output adapter following Hexagonal Architecture principles.
 */

import { connectToDatabase } from "../../../../../lib/mongodb";
import type {
  TransactionRepository,
  TransactionFilters,
} from "../../../ports/out/TransactionRepository";
import { Transaction, TransactionStatus } from "../../../entities/Transaction";
import {
  TransactionModel,
  type ITransactionDocument,
} from "../models/TransactionModel";
import type { BlockchainNetwork, PaginationParams } from "@vbar/shared";

/**
 * MongoDB Transaction Repository using Mongoose
 *
 * Implements transaction data persistence operations using Mongoose models.
 */
export class MongoTransactionRepository implements TransactionRepository {
  /**
   * Ensures database connection is established
   */
  private async ensureConnection(): Promise<void> {
    await connectToDatabase();
  }

  /**
   * Converts Mongoose document to Transaction domain entity
   *
   * @param doc - Mongoose document
   * @returns Transaction domain entity
   */
  private toTransactionEntity(doc: ITransactionDocument): Transaction {
    return new Transaction({
      id: doc._id.toString(),
      walletId: doc.walletId,
      txHash: doc.txHash,
      network: doc.network,
      from: doc.from,
      to: doc.to,
      value: doc.value,
      tokenAddress: doc.tokenAddress,
      status: doc.status as TransactionStatus,
      confirmations: doc.confirmations,
      blockNumber: doc.blockNumber,
      gasUsed: doc.gasUsed,
      gasPrice: doc.gasPrice,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Create a new transaction
   *
   * @param transaction - Transaction entity to create
   * @returns Promise resolving to created transaction
   * @throws Error if transaction creation fails
   */
  async create(transaction: Transaction): Promise<Transaction> {
    try {
      await this.ensureConnection();

      const transactionDoc = new TransactionModel({
        _id: transaction.id,
        walletId: transaction.walletId,
        txHash: transaction.txHash.getValue(),
        network: transaction.network.getValue(),
        from: transaction.from.getValue(),
        to: transaction.to.getValue(),
        value: transaction.value,
        tokenAddress: transaction.tokenAddress?.getValue(),
        status: transaction.status,
        confirmations: transaction.confirmations,
        blockNumber: transaction.blockNumber,
        gasUsed: transaction.gasUsed,
        gasPrice: transaction.gasPrice?.getValue(),
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      });

      const savedDoc = await transactionDoc.save();
      return this.toTransactionEntity(savedDoc);
    } catch (error) {
      throw new Error(
        `Failed to create transaction: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Find transaction by ID
   *
   * @param id - Transaction ID
   * @returns Promise resolving to transaction or null if not found
   */
  async findById(id: string): Promise<Transaction | null> {
    try {
      await this.ensureConnection();
      const doc = await TransactionModel.findById(id).exec();

      if (!doc) {
        return null;
      }

      return this.toTransactionEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to find transaction by ID: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Find transaction by transaction hash
   *
   * @param txHash - Transaction hash
   * @param network - Blockchain network
   * @returns Promise resolving to transaction or null if not found
   */
  async findByTxHash(
    txHash: string,
    network: BlockchainNetwork
  ): Promise<Transaction | null> {
    try {
      await this.ensureConnection();
      const doc = await TransactionModel.findOne({ txHash, network }).exec();

      if (!doc) {
        return null;
      }

      return this.toTransactionEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to find transaction by hash: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Find transactions by wallet ID
   *
   * @param walletId - Wallet ID
   * @param network - Optional network filter
   * @returns Promise resolving to array of transactions
   */
  async findByWalletId(
    walletId: string,
    network?: BlockchainNetwork
  ): Promise<Transaction[]> {
    try {
      await this.ensureConnection();
      const query: any = { walletId };
      if (network) {
        query.network = network;
      }
      const docs = await TransactionModel.find(query)
        .sort({ createdAt: -1 })
        .exec();

      return docs.map((doc) => this.toTransactionEntity(doc));
    } catch (error) {
      throw new Error(
        `Failed to find transactions by wallet ID: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Update transaction
   *
   * @param id - Transaction ID
   * @param updates - Partial transaction updates
   * @returns Promise resolving to updated transaction
   * @throws Error if transaction not found or update fails
   */
  async update(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    try {
      await this.ensureConnection();

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (updates.walletId) {
        updateData.walletId = updates.walletId;
      }
      if (updates.txHash) {
        updateData.txHash =
          typeof updates.txHash === "string"
            ? updates.txHash
            : updates.txHash.getValue();
      }
      if (updates.network) {
        updateData.network =
          typeof updates.network === "string"
            ? updates.network
            : updates.network.getValue();
      }
      if (updates.from) {
        updateData.from =
          typeof updates.from === "string"
            ? updates.from
            : updates.from.getValue();
      }
      if (updates.to) {
        updateData.to =
          typeof updates.to === "string"
            ? updates.to
            : updates.to.getValue();
      }
      if (updates.value !== undefined) {
        updateData.value = updates.value;
      }
      if (updates.tokenAddress !== undefined) {
        updateData.tokenAddress = updates.tokenAddress
          ? typeof updates.tokenAddress === "string"
            ? updates.tokenAddress
            : updates.tokenAddress.getValue()
          : null;
      }
      if (updates.status) {
        updateData.status = updates.status;
      }
      if (updates.confirmations !== undefined) {
        updateData.confirmations = updates.confirmations;
      }
      if (updates.blockNumber !== undefined) {
        updateData.blockNumber = updates.blockNumber;
      }
      if (updates.gasUsed !== undefined) {
        updateData.gasUsed = updates.gasUsed;
      }
      if (updates.gasPrice !== undefined) {
        updateData.gasPrice =
          typeof updates.gasPrice === "string"
            ? updates.gasPrice
            : updates.gasPrice.getValue();
      }

      const doc = await TransactionModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).exec();

      if (!doc) {
        throw new Error(`Transaction with ID ${id} not found`);
      }

      return this.toTransactionEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to update transaction: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Delete transaction
   *
   * @param id - Transaction ID
   * @returns Promise that resolves when transaction is deleted
   * @throws Error if transaction not found or deletion fails
   */
  async delete(id: string): Promise<void> {
    try {
      await this.ensureConnection();
      const result = await TransactionModel.findByIdAndDelete(id).exec();

      if (!result) {
        throw new Error(`Transaction with ID ${id} not found`);
      }
    } catch (error) {
      throw new Error(
        `Failed to delete transaction: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * List transactions with filters and pagination
   *
   * @param filters - Transaction filters
   * @param pagination - Pagination parameters
   * @returns Promise resolving to transactions and total count
   */
  async list(
    filters: TransactionFilters,
    pagination: PaginationParams
  ): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      await this.ensureConnection();

      const query: any = {};

      if (filters.walletId) {
        query.walletId = filters.walletId;
      }
      if (filters.network) {
        query.network = filters.network;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.from) {
        query.from = filters.from;
      }
      if (filters.to) {
        query.to = filters.to;
      }

      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const skip = (page - 1) * limit;

      const [docs, total] = await Promise.all([
        TransactionModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        TransactionModel.countDocuments(query).exec(),
      ]);

      return {
        transactions: docs.map((doc) => this.toTransactionEntity(doc)),
        total,
      };
    } catch (error) {
      throw new Error(
        `Failed to list transactions: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

