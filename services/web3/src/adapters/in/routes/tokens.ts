/**
 * Token Routes
 *
 * REST API routes for token operations.
 * Maps HTTP requests to token use cases.
 */

import { Router, Request, Response } from "express";
import { ConsoleLogger } from "@vbar/shared";
import { GetTokenBalanceUseCase } from "../../../domains/token/application/use-cases/GetTokenBalanceUseCase";
import { TransferTokenUseCase } from "../../../domains/token/application/use-cases/TransferTokenUseCase";
import { GetTokenInfoUseCase } from "../../../domains/token/application/use-cases/GetTokenInfoUseCase";
import { GetNFTsUseCase } from "../../../domains/token/application/use-cases/GetNFTsUseCase";
import { TransferNFTUseCase } from "../../../domains/token/application/use-cases/TransferNFTUseCase";
import { BlockchainProviderFactory } from "../../../adapters/out/blockchain/BlockchainProviderFactory";
import { RabbitMQEventPublisher } from "../../../adapters/out/rabbitmq/EventPublisher";
import { MongoWalletRepository } from "../../../domains/wallet/adapters/out/repositories/MongoWalletRepository";
import { MongoTransactionRepository } from "../../../domains/transaction/adapters/out/repositories/MongoTransactionRepository";

const router = Router();
const logger = new ConsoleLogger("TokenRoutes");

// Initialize dependencies (these don't require env vars at construction time)
const walletRepository = new MongoWalletRepository();
const transactionRepository = new MongoTransactionRepository();
const blockchainProvider = BlockchainProviderFactory.createProvider(
  "ethereum",
  logger
); // Default provider, will be network-specific in use cases
const eventPublisher = new RabbitMQEventPublisher(logger);

// Lazy initialization of use cases (to avoid env var access during module load)
let getTokenBalanceUseCaseInstance: GetTokenBalanceUseCase | null = null;
let transferTokenUseCaseInstance: TransferTokenUseCase | null = null;
let getTokenInfoUseCaseInstance: GetTokenInfoUseCase | null = null;
let getNFTsUseCaseInstance: GetNFTsUseCase | null = null;
let transferNFTUseCaseInstance: TransferNFTUseCase | null = null;

function getTokenBalanceUseCase(): GetTokenBalanceUseCase {
  if (!getTokenBalanceUseCaseInstance) {
    getTokenBalanceUseCaseInstance = new GetTokenBalanceUseCase(
      walletRepository,
      blockchainProvider,
      logger
    );
  }
  return getTokenBalanceUseCaseInstance;
}

function getTransferTokenUseCase(): TransferTokenUseCase {
  if (!transferTokenUseCaseInstance) {
    transferTokenUseCaseInstance = new TransferTokenUseCase(
      walletRepository,
      transactionRepository,
      blockchainProvider,
      eventPublisher,
      logger
    );
  }
  return transferTokenUseCaseInstance;
}

function getTokenInfoUseCase(): GetTokenInfoUseCase {
  if (!getTokenInfoUseCaseInstance) {
    getTokenInfoUseCaseInstance = new GetTokenInfoUseCase(
      blockchainProvider,
      logger
    );
  }
  return getTokenInfoUseCaseInstance;
}

function getNFTsUseCase(): GetNFTsUseCase {
  if (!getNFTsUseCaseInstance) {
    getNFTsUseCaseInstance = new GetNFTsUseCase(
      walletRepository,
      blockchainProvider,
      logger
    );
  }
  return getNFTsUseCaseInstance;
}

function getTransferNFTUseCase(): TransferNFTUseCase {
  if (!transferNFTUseCaseInstance) {
    transferNFTUseCaseInstance = new TransferNFTUseCase(
      walletRepository,
      transactionRepository,
      blockchainProvider,
      eventPublisher,
      logger
    );
  }
  return transferNFTUseCaseInstance;
}

/**
 * GET /api/web3/tokens/:address/balance
 * Get token balance for a wallet
 */
router.get("/:address/balance", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { walletId } = req.query;

    if (!walletId || !address) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "walletId (query param) and token address are required",
        },
      });
    }

    const request = {
      walletId: walletId as string,
      tokenAddress: address,
    };

    const response = await getTokenBalanceUseCase().execute(request);

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to get token balance", {
      error: error instanceof Error ? error.message : String(error),
      tokenAddress: req.params.address,
      walletId: req.query.walletId,
    });

    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({
        error: {
          code: "WEB3_005",
          message: "Wallet not found",
        },
      });
    }

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get token balance",
      },
    });
  }
});

/**
 * POST /api/web3/tokens/transfer
 * Transfer tokens
 */
router.post("/transfer", async (req: Request, res: Response) => {
  try {
    const { walletId, tokenAddress, to, amount, gasPrice, gasLimit } = req.body;

    if (!walletId || !tokenAddress || !to || !amount) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "walletId, tokenAddress, to, and amount are required",
        },
      });
    }

    const request = {
      walletId,
      tokenAddress,
      to,
      amount,
      gasPrice: gasPrice || undefined,
      gasLimit: gasLimit || undefined,
    };

    const response = await getTransferTokenUseCase().execute(request);

    res.status(201).json(response);
  } catch (error) {
    logger.error("Failed to transfer token", {
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
          error instanceof Error ? error.message : "Failed to transfer token",
      },
    });
  }
});

/**
 * GET /api/web3/tokens/:address/info
 * Get token information
 */
router.get("/:address/info", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { network } = req.query;

    if (!address || !network) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "token address and network (query param) are required",
        },
      });
    }

    const request = {
      tokenAddress: address,
      network: network as any,
    };

    const response = await getTokenInfoUseCase().execute(request);

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to get token info", {
      error: error instanceof Error ? error.message : String(error),
      tokenAddress: req.params.address,
      network: req.query.network,
    });

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error ? error.message : "Failed to get token info",
      },
    });
  }
});

/**
 * GET /api/web3/nfts
 * Get NFTs owned by a wallet
 */
router.get("/nfts", async (req: Request, res: Response) => {
  try {
    const { walletId, network } = req.query;

    if (!walletId) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "walletId (query param) is required",
        },
      });
    }

    const request = {
      walletId: walletId as string,
      network: network as any,
    };

    const response = await getNFTsUseCase().execute(request);

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to get NFTs", {
      error: error instanceof Error ? error.message : String(error),
      walletId: req.query.walletId,
      network: req.query.network,
    });

    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({
        error: {
          code: "WEB3_005",
          message: "Wallet not found",
        },
      });
    }

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message: error instanceof Error ? error.message : "Failed to get NFTs",
      },
    });
  }
});

/**
 * POST /api/web3/nfts/transfer
 * Transfer NFT
 */
router.post("/nfts/transfer", async (req: Request, res: Response) => {
  try {
    const {
      walletId,
      contractAddress,
      tokenId,
      to,
      gasPrice,
      gasLimit,
    } = req.body;

    if (!walletId || !contractAddress || !tokenId || !to) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message:
            "walletId, contractAddress, tokenId, and to are required",
        },
      });
    }

    const request = {
      walletId,
      contractAddress,
      tokenId,
      to,
      gasPrice: gasPrice || undefined,
      gasLimit: gasLimit || undefined,
    };

    const response = await getTransferNFTUseCase().execute(request);

    res.status(201).json(response);
  } catch (error) {
    logger.error("Failed to transfer NFT", {
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
        error.message.includes("balance") ||
        error.message.includes("not owner"))
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
          error instanceof Error ? error.message : "Failed to transfer NFT",
      },
    });
  }
});

export default router;

