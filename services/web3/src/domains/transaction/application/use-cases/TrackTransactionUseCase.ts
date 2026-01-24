/**
 * Track Transaction Use Case
 *
 * Use case for tracking transaction status on the blockchain.
 * Orchestrates transaction retrieval, blockchain status query, and event publishing.
 */

import type { Logger } from "@vbar/shared";
import { TransactionRepository } from "../../ports/out/TransactionRepository";
import { BlockchainProviderPort } from "../../../../ports/out/BlockchainProviderPort";
import { EventPublisher } from "../../../../ports/out/EventPublisher";
import type {
  TrackTransactionRequest,
  TrackTransactionResponse,
} from "../dto/TransactionDTO";
import { validateTrackTransactionRequest } from "../dto/TransactionDTO";

/**
 * Track Transaction Use Case Implementation
 *
 * Handles transaction tracking operations following Hexagonal Architecture principles.
 */
export class TrackTransactionUseCase {
  private readonly transactionRepository: TransactionRepository;
  private readonly blockchainProvider: BlockchainProviderPort;
  private readonly eventPublisher: EventPublisher;
  private readonly logger: Logger;

  constructor(
    transactionRepository: TransactionRepository,
    blockchainProvider: BlockchainProviderPort,
    eventPublisher: EventPublisher,
    logger: Logger
  ) {
    this.transactionRepository = transactionRepository;
    this.blockchainProvider = blockchainProvider;
    this.eventPublisher = eventPublisher;
    this.logger = logger;
  }

  /**
   * Execute track transaction
   *
   * @param request - Track transaction request
   * @returns Promise resolving to track transaction response
   * @throws Error if transaction tracking fails
   */
  async execute(
    request: TrackTransactionRequest
  ): Promise<TrackTransactionResponse> {
    try {
      // 1. Validate request
      validateTrackTransactionRequest(request);

      // 2. Get transaction from repository
      const transaction = await this.transactionRepository.findById(
        request.transactionId
      );

      if (!transaction) {
        throw new Error(`Transaction not found: ${request.transactionId}`);
      }

      this.logger.info("Tracking transaction", {
        transactionId: transaction.id,
        txHash: transaction.txHash.getValue(),
        network: transaction.network.getValue(),
      });

      // 3. Query blockchain for current status
      const receipt = await this.blockchainProvider.getTransactionReceipt(
        transaction.txHash.getValue(),
        transaction.network.getValue()
      );

      // 4. Update transaction status and confirmations
      let updatedTransaction = transaction;
      let shouldPublishEvent = false;

      if (receipt) {
        // Transaction is confirmed
        const blockNumber = receipt.blockNumber;
        const confirmations = receipt.confirmations;
        const gasUsed = receipt.gasUsed;
        const status = receipt.status === "success" ? "confirmed" : "failed";

        // Update transaction with new information via repository
        // The repository will create a new Transaction entity with updated values
        updatedTransaction = await this.transactionRepository.update(
          transaction.id,
          {
            status: status as "confirmed" | "failed",
            confirmations: confirmations,
            blockNumber: blockNumber,
            gasUsed: gasUsed,
          } as Partial<Transaction>
        );

        // Check if transaction was just confirmed (was pending, now confirmed)
        if (transaction.status === "pending" && status === "confirmed") {
          shouldPublishEvent = true;
        }

        this.logger.info("Transaction status updated", {
          transactionId: transaction.id,
          status: status,
          confirmations: confirmations,
          blockNumber: blockNumber,
        });
      } else {
        // Transaction is still pending
        // Optionally, we could check the transaction pool or update confirmations to 0
        this.logger.info("Transaction still pending", {
          transactionId: transaction.id,
          txHash: transaction.txHash.getValue(),
        });
      }

      // 5. If confirmed, publish transaction.confirmed event
      if (shouldPublishEvent && updatedTransaction.status === "confirmed") {
        await this.eventPublisher.publishTransactionConfirmed({
          transactionId: updatedTransaction.id,
          walletId: updatedTransaction.walletId,
          txHash: updatedTransaction.txHash.getValue(),
          network: updatedTransaction.network.getValue(),
          blockNumber: updatedTransaction.blockNumber || 0,
          confirmations: updatedTransaction.confirmations,
          timestamp: updatedTransaction.updatedAt.toISOString(),
        });

        this.logger.info("Published transaction confirmed event", {
          transactionId: updatedTransaction.id,
        });
      }

      // 6. Return updated transaction
      return {
        transaction: updatedTransaction.toJSON(),
      };
    } catch (error) {
      this.logger.error("Failed to track transaction", {
        error: error instanceof Error ? error.message : String(error),
        transactionId: request.transactionId,
      });
      throw error;
    }
  }
}

