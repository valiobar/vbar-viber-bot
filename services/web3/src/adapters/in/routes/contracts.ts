/**
 * Contract Routes
 *
 * REST API routes for smart contract operations.
 * Maps HTTP requests to contract use cases.
 */

import { Router, Request, Response } from "express";
import { ConsoleLogger } from "@vbar/shared";
import { ReadContractUseCase } from "../../../domains/contract/application/use-cases/ReadContractUseCase";
import { WriteContractUseCase } from "../../../domains/contract/application/use-cases/WriteContractUseCase";
import { StoreContractABIUseCase } from "../../../domains/contract/application/use-cases/StoreContractABIUseCase";
import { GetContractABIUseCase } from "../../../domains/contract/application/use-cases/GetContractABIUseCase";
import { BlockchainProviderFactory } from "../../../adapters/out/blockchain/BlockchainProviderFactory";
import { RabbitMQEventPublisher } from "../../../adapters/out/rabbitmq/EventPublisher";
import { MongoWalletRepository } from "../../../domains/wallet/adapters/out/repositories/MongoWalletRepository";
import { MongoTransactionRepository } from "../../../domains/transaction/adapters/out/repositories/MongoTransactionRepository";
import { MongoContractRepository } from "../../../domains/contract/adapters/out/repositories/MongoContractRepository";

const router = Router();
const logger = new ConsoleLogger("ContractRoutes");

// Initialize dependencies (these don't require env vars at construction time)
const walletRepository = new MongoWalletRepository();
const transactionRepository = new MongoTransactionRepository();
const contractRepository = new MongoContractRepository();
const blockchainProvider = BlockchainProviderFactory.createProvider(
  "ethereum",
  logger
); // Default provider, will be network-specific in use cases
const eventPublisher = new RabbitMQEventPublisher(logger);

// Lazy initialization of use cases (to avoid env var access during module load)
let readContractUseCaseInstance: ReadContractUseCase | null = null;
let writeContractUseCaseInstance: WriteContractUseCase | null = null;
let storeContractABIUseCaseInstance: StoreContractABIUseCase | null = null;
let getContractABIUseCaseInstance: GetContractABIUseCase | null = null;

function getReadContractUseCase(): ReadContractUseCase {
  if (!readContractUseCaseInstance) {
    readContractUseCaseInstance = new ReadContractUseCase(
      blockchainProvider,
      logger,
      contractRepository
    );
  }
  return readContractUseCaseInstance;
}

function getWriteContractUseCase(): WriteContractUseCase {
  if (!writeContractUseCaseInstance) {
    writeContractUseCaseInstance = new WriteContractUseCase(
      walletRepository,
      transactionRepository,
      blockchainProvider,
      eventPublisher,
      logger,
      contractRepository
    );
  }
  return writeContractUseCaseInstance;
}

function getStoreContractABIUseCase(): StoreContractABIUseCase {
  if (!storeContractABIUseCaseInstance) {
    storeContractABIUseCaseInstance = new StoreContractABIUseCase(
      contractRepository,
      logger
    );
  }
  return storeContractABIUseCaseInstance;
}

function getContractABIUseCase(): GetContractABIUseCase {
  if (!getContractABIUseCaseInstance) {
    getContractABIUseCaseInstance = new GetContractABIUseCase(
      contractRepository,
      logger
    );
  }
  return getContractABIUseCaseInstance;
}

/**
 * POST /api/web3/contracts/read
 * Read from a smart contract
 */
router.post("/read", async (req: Request, res: Response) => {
  try {
    const {
      contractAddress,
      abi,
      functionName,
      args,
      network,
      contractId,
    } = req.body;

    if (!contractAddress || !functionName || !network) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "contractAddress, functionName, and network are required",
        },
      });
    }

    if (!abi && !contractId) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "Either abi or contractId must be provided",
        },
      });
    }

    const request = {
      contractAddress,
      abi: abi || undefined,
      functionName,
      args: args || undefined,
      network,
      contractId: contractId || undefined,
    };

    const response = await getReadContractUseCase().execute(request);

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to read contract", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error ? error.message : "Failed to read contract",
      },
    });
  }
});

/**
 * POST /api/web3/contracts/write
 * Write to a smart contract
 */
router.post("/write", async (req: Request, res: Response) => {
  try {
    const {
      walletId,
      contractAddress,
      abi,
      functionName,
      args,
      value,
      network,
      gasLimit,
      gasPrice,
      contractId,
    } = req.body;

    if (!walletId || !contractAddress || !functionName || !network) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message:
            "walletId, contractAddress, functionName, and network are required",
        },
      });
    }

    if (!abi && !contractId) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "Either abi or contractId must be provided",
        },
      });
    }

    const request = {
      walletId,
      contractAddress,
      abi: abi || undefined,
      functionName,
      args: args || undefined,
      value: value || undefined,
      network,
      gasLimit: gasLimit || undefined,
      gasPrice: gasPrice || undefined,
      contractId: contractId || undefined,
    };

    const response = await getWriteContractUseCase().execute(request);

    res.status(201).json(response);
  } catch (error) {
    logger.error("Failed to write contract", {
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
          error instanceof Error ? error.message : "Failed to write contract",
      },
    });
  }
});

/**
 * POST /api/web3/contracts
 * Store contract ABI
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { address, network, abi, name } = req.body;

    if (!address || !network || !abi) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "address, network, and abi are required",
        },
      });
    }

    const request = {
      address,
      network,
      abi,
      name: name || undefined,
    };

    const response = await getStoreContractABIUseCase().execute(request);

    res.status(201).json(response);
  } catch (error) {
    logger.error("Failed to store contract ABI", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error
            ? error.message
            : "Failed to store contract ABI",
      },
    });
  }
});

/**
 * GET /api/web3/contracts
 * List stored contracts (placeholder - would need ListContracts use case)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    // Note: This would require a ListContracts use case
    // For now, return not implemented
    res.status(501).json({
      error: {
        code: "WEB3_006",
        message: "List contracts functionality not yet implemented",
      },
    });
  } catch (error) {
    logger.error("Failed to list contracts", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error
            ? error.message
            : "Failed to list contracts",
      },
    });
  }
});

/**
 * GET /api/web3/contracts/:id
 * Get contract ABI by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: {
          code: "WEB3_003",
          message: "Contract ID is required",
        },
      });
    }

    const request = { contractId: id };
    const response = await getContractABIUseCase().execute(request);

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to get contract ABI", {
      error: error instanceof Error ? error.message : String(error),
      contractId: req.params.id,
    });

    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({
        error: {
          code: "WEB3_005",
          message: "Contract not found",
        },
      });
    }

    res.status(500).json({
      error: {
        code: "WEB3_004",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get contract ABI",
      },
    });
  }
});

export default router;

