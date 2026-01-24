/**
 * Wallet Routes
 *
 * REST API routes for wallet operations.
 * Maps HTTP requests to wallet use cases.
 */

import { Router, Request, Response } from "express";
import { ConsoleLogger, type BlockchainNetwork } from "@vbar/shared";
import { CreateWalletUseCase } from "../../../domains/wallet/application/use-cases/CreateWalletUseCase";
import { GetBalanceUseCase } from "../../../domains/wallet/application/use-cases/GetBalanceUseCase";
import { GetWalletInfoUseCase } from "../../../domains/wallet/application/use-cases/GetWalletInfoUseCase";
import { ListWalletsUseCase } from "../../../domains/wallet/application/use-cases/ListWalletsUseCase";
import { BlockchainProviderFactory } from "../../../adapters/out/blockchain/BlockchainProviderFactory";
import { RabbitMQEventPublisher } from "../../../adapters/out/rabbitmq/EventPublisher";
import { MongoWalletRepository } from "../../../domains/wallet/adapters/out/repositories/MongoWalletRepository";
import { WalletService } from "../../../domains/wallet/services/WalletService";

const router = Router();
const logger = new ConsoleLogger("WalletRoutes");

// Initialize dependencies (these don't require env vars at construction time)
const walletRepository = new MongoWalletRepository();
const blockchainProvider = BlockchainProviderFactory.createProvider(
  "ethereum",
  logger
); // Default provider, will be network-specific in use cases
const eventPublisher = new RabbitMQEventPublisher(logger);
const walletService = new WalletService();

// Lazy initialization of use cases (to avoid env var access during module load)
let createWalletUseCaseInstance: CreateWalletUseCase | null = null;
let getBalanceUseCaseInstance: GetBalanceUseCase | null = null;
let getWalletInfoUseCaseInstance: GetWalletInfoUseCase | null = null;
let listWalletsUseCaseInstance: ListWalletsUseCase | null = null;

function getCreateWalletUseCase(): CreateWalletUseCase {
  if (!createWalletUseCaseInstance) {
    createWalletUseCaseInstance = new CreateWalletUseCase(
      walletRepository,
      blockchainProvider,
      eventPublisher,
      walletService,
      logger
    );
  }
  return createWalletUseCaseInstance;
}

function getGetBalanceUseCase(): GetBalanceUseCase {
  if (!getBalanceUseCaseInstance) {
    getBalanceUseCaseInstance = new GetBalanceUseCase(
      walletRepository,
      blockchainProvider,
      logger
    );
  }
  return getBalanceUseCaseInstance;
}

function getGetWalletInfoUseCase(): GetWalletInfoUseCase {
  if (!getWalletInfoUseCaseInstance) {
    getWalletInfoUseCaseInstance = new GetWalletInfoUseCase(
      walletRepository,
      logger
    );
  }
  return getWalletInfoUseCaseInstance;
}

function getListWalletsUseCase(): ListWalletsUseCase {
  if (!listWalletsUseCaseInstance) {
    listWalletsUseCaseInstance = new ListWalletsUseCase(
      walletRepository,
      logger
    );
  }
  return listWalletsUseCaseInstance;
}

/**
 * POST /api/web3/wallets
 * Create a new wallet or import an existing wallet
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { viberUserId, network, privateKey } = req.body;

    if (!viberUserId || !network) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "viberUserId and network are required",
        },
      });
    }

    const request = {
      viberUserId,
      network,
      privateKey: privateKey || undefined,
    };

    const response = await getCreateWalletUseCase().execute(request);

    res.status(201).json(response);
  } catch (error) {
    logger.error("Failed to create wallet", {
      error: error instanceof Error ? error.message : String(error),
    });

    if (
      error instanceof Error &&
      error.message.includes("already exists")
    ) {
      return res.status(409).json({
        error: {
          code: "WEB3_008",
          message: error.message,
        },
      });
    }

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error ? error.message : "Failed to create wallet",
      },
    });
  }
});

/**
 * GET /api/web3/wallets
 * List wallets with optional filters
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { viberUserId, network, page, limit } = req.query;

    const request = {
      viberUserId: viberUserId ? String(viberUserId) : undefined,
      network: network ? (String(network) as BlockchainNetwork) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    const response = await getListWalletsUseCase().execute(request);

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to list wallets", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error ? error.message : "Failed to list wallets",
      },
    });
  }
});

/**
 * GET /api/web3/wallets/:id
 * Get wallet information by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "Wallet ID is required",
        },
      });
    }

    const request = { walletId: id };
    const response = await getGetWalletInfoUseCase().execute(request);

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to get wallet info", {
      error: error instanceof Error ? error.message : String(error),
      walletId: req.params.id,
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
          error instanceof Error ? error.message : "Failed to get wallet info",
      },
    });
  }
});

/**
 * GET /api/web3/wallets/:id/balance
 * Get wallet balance
 */
router.get("/:id/balance", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "Wallet ID is required",
        },
      });
    }

    const request = { walletId: id };
    const response = await getGetBalanceUseCase().execute(request);

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to get wallet balance", {
      error: error instanceof Error ? error.message : String(error),
      walletId: req.params.id,
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
            : "Failed to get wallet balance",
      },
    });
  }
});

/**
 * DELETE /api/web3/wallets/:id
 * Delete wallet
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "Wallet ID is required",
        },
      });
    }

    // Check if wallet exists before deleting
    const wallet = await walletRepository.findById(id);
    if (!wallet) {
      return res.status(404).json({
        error: {
          code: "WEB3_005",
          message: "Wallet not found",
        },
      });
    }

    await walletRepository.delete(id);

    logger.info("Wallet deleted", {
      walletId: id,
    });

    res.status(204).send();
  } catch (error) {
    logger.error("Failed to delete wallet", {
      error: error instanceof Error ? error.message : String(error),
      walletId: req.params.id,
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
          error instanceof Error ? error.message : "Failed to delete wallet",
      },
    });
  }
});

export default router;
