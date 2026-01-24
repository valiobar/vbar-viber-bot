/**
 * Create Wallet Use Case
 *
 * Use case for creating new wallets or importing existing wallets.
 * Orchestrates wallet generation/import, encryption, persistence, and event publishing.
 */

import type { BlockchainNetwork, Logger } from "@vbar/shared";
import { randomUUID } from "crypto";
import { Wallet } from "../../entities/Wallet";
import { WalletService } from "../../services/WalletService";
import { Network } from "../../../shared/value-objects/Network";
import { WalletRepository } from "../../ports/out/WalletRepository";
import { BlockchainProviderPort } from "../../../../ports/out/BlockchainProviderPort";
import { EventPublisher } from "../../../../ports/out/EventPublisher";
import CryptoJS from "crypto-js";
import { ConfigHelper } from "@vbar/shared";
import type {
  CreateWalletRequest,
  CreateWalletResponse,
} from "../dto/WalletDTO";

/**
 * Create Wallet Use Case Implementation
 *
 * Handles wallet creation and import operations following Hexagonal Architecture principles.
 */
export class CreateWalletUseCase {
  private readonly walletRepository: WalletRepository;
  private readonly blockchainProvider: BlockchainProviderPort;
  private readonly eventPublisher: EventPublisher;
  private readonly walletService: WalletService;
  private readonly logger: Logger;
  private readonly encryptionKey: string;

  constructor(
    walletRepository: WalletRepository,
    blockchainProvider: BlockchainProviderPort,
    eventPublisher: EventPublisher,
    walletService: WalletService,
    logger: Logger
  ) {
    this.walletRepository = walletRepository;
    this.blockchainProvider = blockchainProvider;
    this.eventPublisher = eventPublisher;
    this.walletService = walletService;
    this.logger = logger;

    // Get encryption key from environment
    const key = ConfigHelper.getEnv("WEB3_ENCRYPTION_KEY");
    if (!key || key.length < 32) {
      throw new Error(
        "WEB3_ENCRYPTION_KEY must be set and be at least 32 characters long"
      );
    }
    this.encryptionKey = key;
  }

  /**
   * Execute wallet creation
   *
   * @param request - Create wallet request
   * @returns Promise resolving to create wallet response
   * @throws Error if wallet creation fails
   */
  async execute(request: CreateWalletRequest): Promise<CreateWalletResponse> {
    try {
      // 1. Validate request
      this.validateRequest(request);

      const network = new Network(request.network);

      // 2. Generate or import wallet using WalletService
      let address: string;
      let privateKey: string;

      if (request.privateKey) {
        // Import existing wallet
        this.logger.info("Importing existing wallet", {
          viberUserId: request.viberUserId,
          network: request.network,
        });

        const importResult = this.walletService.importWallet(
          request.privateKey,
          network
        );
        address = importResult.address;
        privateKey = request.privateKey;
      } else {
        // Generate new wallet
        this.logger.info("Generating new wallet", {
          viberUserId: request.viberUserId,
          network: request.network,
        });

        const generationResult = this.walletService.generateWallet(network);
        address = generationResult.address;
        privateKey = generationResult.privateKey;
      }

      // 3. Check if wallet already exists for this user and network
      const existingWallets = await this.walletRepository.findByViberUserId(
        request.viberUserId,
        request.network
      );

      const duplicateWallet = existingWallets.find(
        (w: Wallet) => w.address.getValue() === address && w.network.equals(network)
      );

      if (duplicateWallet) {
        throw new Error(
          `Wallet already exists for user ${request.viberUserId} on network ${request.network}`
        );
      }

      // 4. Encrypt private key using encryption key from config
      const encryptedPrivateKey = this.encryptPrivateKey(privateKey);

      // 5. Create wallet entity
      const now = new Date();
      const wallet = new Wallet({
        id: randomUUID(),
        viberUserId: request.viberUserId,
        address: address,
        network: request.network,
        createdAt: now,
        updatedAt: now,
      });

      // Note: The repository implementation will handle storing the encrypted private key
      // For now, we'll need to extend the Wallet entity or repository to handle this
      // This is a design consideration - private keys should not be in the domain entity
      // They should be handled at the repository/adapter level

      // 6. Save wallet to repository with encrypted private key
      const savedWallet = await this.walletRepository.create(
        wallet,
        encryptedPrivateKey
      );

      // 7. Publish wallet.created event
      try {
        await this.eventPublisher.publishWalletCreated({
          walletId: savedWallet.id,
          viberUserId: savedWallet.viberUserId,
          address: savedWallet.address.getValue(),
          network: savedWallet.network.getValue(),
          timestamp: new Date().toISOString(),
        });
      } catch (eventError) {
        // Log error but don't fail the operation
        this.logger.error("Failed to publish wallet.created event", {
          error:
            eventError instanceof Error ? eventError.message : String(eventError),
          walletId: savedWallet.id,
        });
      }

      // 8. Return wallet (without private key)
      return {
        wallet: savedWallet.toJSON(),
      };
    } catch (error) {
      this.logger.error("Failed to create wallet", {
        error: error instanceof Error ? error.message : String(error),
        viberUserId: request.viberUserId,
        network: request.network,
      });
      throw error;
    }
  }

  /**
   * Validate create wallet request
   *
   * @param request - Request to validate
   * @throws Error if request is invalid
   */
  private validateRequest(request: CreateWalletRequest): void {
    if (!request.viberUserId || typeof request.viberUserId !== "string") {
      throw new Error("viberUserId is required and must be a string");
    }

    if (request.viberUserId.trim().length === 0) {
      throw new Error("viberUserId cannot be empty");
    }

    if (!request.network || typeof request.network !== "string") {
      throw new Error("network is required and must be a string");
    }

    // Network validation will be done by Network value object
    try {
      new Network(request.network);
    } catch (error) {
      throw new Error(
        `Invalid network: ${request.network}. ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // If privateKey is provided, validate it
    if (request.privateKey !== undefined) {
      if (typeof request.privateKey !== "string") {
        throw new Error("privateKey must be a string if provided");
      }

      if (request.privateKey.trim().length === 0) {
        throw new Error("privateKey cannot be empty if provided");
      }
    }
  }

  /**
   * Encrypt private key using AES encryption
   *
   * @param privateKey - Private key to encrypt
   * @returns Encrypted private key
   */
  private encryptPrivateKey(privateKey: string): string {
    try {
      return CryptoJS.AES.encrypt(privateKey, this.encryptionKey).toString();
    } catch (error) {
      throw new Error(
        `Failed to encrypt private key: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

