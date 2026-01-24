/**
 * Transaction Routes
 *
 * REST API routes for transaction operations.
 * Maps HTTP requests to transaction use cases.
 */

import { Router, Request, Response } from "express";
import { ConsoleLogger, type BlockchainNetwork } from "@vbar/shared";
import { TransactionStatus } from "../../../domains/transaction/entities/Transaction";
import { SendTransactionUseCase } from "../../../domains/transaction/application/use-cases/SendTransactionUseCase";
import { TrackTransactionUseCase } from "../../../domains/transaction/application/use-cases/TrackTransactionUseCase";
import { GetTransactionHistoryUseCase } from "../../../domains/transaction/application/use-cases/GetTransactionHistoryUseCase";
import { BlockchainProviderFactory } from "../../../adapters/out/blockchain/BlockchainProviderFactory";
import { RabbitMQEventPublisher } from "../../../adapters/out/rabbitmq/EventPublisher";
import { MongoWalletRepository } from "../../../domains/wallet/adapters/out/repositories/MongoWalletRepository";
import { MongoTransactionRepository } from "../../../domains/transaction/adapters/out/repositories/MongoTransactionRepository";

const router = Router();
const logger = new ConsoleLogger("TransactionRoutes");

// Initialize dependencies (these don't require env vars at construction time)
const walletRepository = new MongoWalletRepository();
const transactionRepository = new MongoTransactionRepository();
const blockchainProvider = BlockchainProviderFactory.createProvider(
  "ethereum",
  logger
); // Default provider, will be network-specific in use cases
const eventPublisher = new RabbitMQEventPublisher(logger);

// Lazy initialization of use cases (to avoid env var access during module load)
let sendTransactionUseCaseInstance: SendTransactionUseCase | null = null;
let trackTransactionUseCaseInstance: TrackTransactionUseCase | null = null;
let getTransactionHistoryUseCaseInstance: GetTransactionHistoryUseCase | null =
  null;

function getSendTransactionUseCase(): SendTransactionUseCase {
  if (!sendTransactionUseCaseInstance) {
    sendTransactionUseCaseInstance = new SendTransactionUseCase(
      walletRepository,
      transactionRepository,
      blockchainProvider,
      eventPublisher,
      logger
    );
  }
  return sendTransactionUseCaseInstance;
}

function getTrackTransactionUseCase(): TrackTransactionUseCase {
  if (!trackTransactionUseCaseInstance) {
    trackTransactionUseCaseInstance = new TrackTransactionUseCase(
      transactionRepository,
      blockchainProvider,
      eventPublisher,
      logger
    );
  }
  return trackTransactionUseCaseInstance;
}

function getGetTransactionHistoryUseCase(): GetTransactionHistoryUseCase {
  if (!getTransactionHistoryUseCaseInstance) {
    getTransactionHistoryUseCaseInstance = new GetTransactionHistoryUseCase(
      transactionRepository,
      logger
    );
  }
  return getTransactionHistoryUseCaseInstance;
}

/**
 * POST /api/web3/transactions
 * Send a transaction
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { walletId, to, value, tokenAddress, gasLimit, gasPrice } = req.body;

    if (!walletId || !to || !value) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "walletId, to, and value are required",
        },
      });
    }

    const request = {
      walletId,
      to,
      value,
      tokenAddress: tokenAddress || undefined,
      gasLimit: gasLimit || undefined,
      gasPrice: gasPrice || undefined,
    };

    const response = await getSendTransactionUseCase().execute(request);

    res.status(201).json(response);
  } catch (error) {
    logger.error("Failed to send transaction", {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({
        error: {
          code: "WEB3_005",
          message: "Wallet not found",
        },
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes("insufficient") ||
        error.message.includes("balance"))
    ) {
      return res.status(400).json({
        error: {
          code: "WEB3_007",
          message: error.message,
        },
      });
    }

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error
            ? error.message
            : "Failed to send transaction",
      },
    });
  }
});

/**
 * GET /api/web3/transactions
 * Get transaction history with optional filters
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { walletId, network, status, page, limit } = req.query;

    const request = {
      walletId: walletId ? String(walletId) : undefined,
      network: network ? (String(network) as BlockchainNetwork) : undefined,
      status: status ? (String(status) as TransactionStatus) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    const response = await getGetTransactionHistoryUseCase().execute(request);

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to get transaction history", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get transaction history",
      },
    });
  }
});

/**
 * GET /api/web3/transactions/:hash/track
 * Track transaction status by hash
 * Note: This route must come before /:hash to ensure proper matching
 */
router.get("/:hash/track", async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    const { network } = req.query;

    if (!hash) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "Transaction hash is required",
        },
      });
    }

    if (!network) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "Network query parameter is required",
        },
      });
    }

    // First find transaction by hash
    const transaction = await transactionRepository.findByTxHash(
      hash,
      network as BlockchainNetwork
    );

    if (!transaction) {
      return res.status(404).json({
        error: {
          code: "WEB3_005",
          message: "Transaction not found",
        },
      });
    }

    // Then track it using the use case (which uses ID)
    const request = { transactionId: transaction.id };
    const response = await getTrackTransactionUseCase().execute(request);

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to track transaction", {
      error: error instanceof Error ? error.message : String(error),
      txHash: req.params.hash,
    });

    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({
        error: {
          code: "WEB3_005",
          message: "Transaction not found",
        },
      });
    }

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error
            ? error.message
            : "Failed to track transaction",
      },
    });
  }
});

/**
 * GET /api/web3/transactions/:hash
 * Get transaction by hash
 * Note: This route must come after /:hash/track to ensure proper matching
 */
router.get("/:hash", async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    const { network } = req.query;

    if (!hash) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "Transaction hash is required",
        },
      });
    }

    if (!network) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "Network query parameter is required",
        },
      });
    }

    // Get transaction by hash from repository
    const transaction = await transactionRepository.findByTxHash(
      hash,
      network as BlockchainNetwork
    );

    if (!transaction) {
      return res.status(404).json({
        error: {
          code: "WEB3_005",
          message: "Transaction not found",
        },
      });
    }

    res.status(200).json({
      transaction: transaction.toJSON(),
    });
  } catch (error) {
    logger.error("Failed to get transaction", {
      error: error instanceof Error ? error.message : String(error),
      txHash: req.params.hash,
    });

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get transaction",
      },
    });
  }
});

export default router;
