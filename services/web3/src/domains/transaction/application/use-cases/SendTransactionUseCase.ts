/**
 * Send Transaction Use Case
 *
 * Use case for sending transactions to the blockchain.
 * Orchestrates wallet retrieval, private key decryption, transaction signing, and event publishing.
 */

import type { BlockchainNetwork, Logger } from "@vbar/shared";
import { randomUUID } from "crypto";
import { Wallet as EthersWallet } from "ethers";
import CryptoJS from "crypto-js";
import { ConfigHelper } from "@vbar/shared";
import { Transaction } from "../../entities/Transaction";
import { Network } from "../../../shared/value-objects/Network";
import { Address } from "../../../shared/value-objects/Address";
import { TransactionHash } from "../../value-objects/TransactionHash";
import { GasPrice } from "../../value-objects/GasPrice";
import { WalletRepository } from "../../../wallet/ports/out/WalletRepository";
import { TransactionRepository } from "../../ports/out/TransactionRepository";
import { BlockchainProviderPort } from "../../../../ports/out/BlockchainProviderPort";
import { EventPublisher } from "../../../../ports/out/EventPublisher";
import type {
  SendTransactionRequest,
  SendTransactionResponse,
} from "../dto/TransactionDTO";
import { validateSendTransactionRequest } from "../dto/TransactionDTO";

/**
 * Send Transaction Use Case Implementation
 *
 * Handles transaction sending operations following Hexagonal Architecture principles.
 */
export class SendTransactionUseCase {
  private readonly walletRepository: WalletRepository;
  private readonly transactionRepository: TransactionRepository;
  private readonly blockchainProvider: BlockchainProviderPort;
  private readonly eventPublisher: EventPublisher;
  private readonly logger: Logger;
  private readonly encryptionKey: string;

  constructor(
    walletRepository: WalletRepository,
    transactionRepository: TransactionRepository,
    blockchainProvider: BlockchainProviderPort,
    eventPublisher: EventPublisher,
    logger: Logger
  ) {
    this.walletRepository = walletRepository;
    this.transactionRepository = transactionRepository;
    this.blockchainProvider = blockchainProvider;
    this.eventPublisher = eventPublisher;
    this.logger = logger;

    // Get encryption key from environment
    const key = ConfigHelper.getEnv("WEB3_ENCRYPTION_KEY") || 'test';
    if (!key || key.length < 32) {
      throw new Error(
        "WEB3_ENCRYPTION_KEY must be set and be at least 32 characters long"
      );
    }
    this.encryptionKey = key;
  }

  /**
   * Execute send transaction
   *
   * @param request - Send transaction request
   * @returns Promise resolving to send transaction response
   * @throws Error if transaction sending fails
   */
  async execute(
    request: SendTransactionRequest
  ): Promise<SendTransactionResponse> {
    try {
      // 1. Validate request
      validateSendTransactionRequest(request);

      // 2. Get wallet from repository
      const wallet = await this.walletRepository.findById(request.walletId);

      if (!wallet) {
        throw new Error(`Wallet not found: ${request.walletId}`);
      }

      this.logger.info("Sending transaction", {
        walletId: wallet.id,
        to: request.to,
        value: request.value,
        network: wallet.network.getValue(),
      });

      const network = wallet.network;

      // 3. Get encrypted private key from repository
      // Note: This assumes WalletRepository has a method to get encrypted private key
      // If not available, we'll need to add it to the repository interface
      const encryptedPrivateKey = await this.getEncryptedPrivateKey(
        wallet.id
      );

      // 4. Decrypt private key
      const privateKey = this.decryptPrivateKey(encryptedPrivateKey);

      // 5. Check balance (if native token transfer)
      if (!request.tokenAddress) {
        const balance = await this.blockchainProvider.getBalance(
          wallet.address.getValue(),
          network.getValue()
        );

        const valueBigInt = BigInt(request.value);
        const balanceBigInt = BigInt(balance);

        // Check if balance is sufficient (including gas)
        const estimatedGas = request.gasLimit
          ? BigInt(request.gasLimit)
          : await this.estimateGasForTransaction(request, wallet, network);

        const gasPrice = request.gasPrice
          ? BigInt(request.gasPrice)
          : BigInt(await this.blockchainProvider.getGasPrice(network.getValue()));

        const totalRequired = valueBigInt + estimatedGas * gasPrice;

        if (balanceBigInt < totalRequired) {
          throw new Error(
            `Insufficient balance. Required: ${totalRequired.toString()}, Available: ${balance.toString()}`
          );
        }
      }

      // 6. Estimate gas (if not provided)
      const gasLimit = request.gasLimit
        ? request.gasLimit
        : await this.estimateGasForTransaction(request, wallet, network);

      // 7. Get gas price (if not provided)
      const gasPrice = request.gasPrice
        ? request.gasPrice
        : await this.blockchainProvider.getGasPrice(network.getValue());

      // 8. Sign transaction using ethers.js
      const signedTx = await this.signTransaction(
        request,
        wallet,
        privateKey,
        gasLimit,
        gasPrice,
        network
      );

      // 9. Send transaction to blockchain
      const txHash = await this.blockchainProvider.sendTransaction(
        signedTx,
        network.getValue()
      );

      this.logger.info("Transaction sent to blockchain", {
        txHash,
        walletId: wallet.id,
        network: network.getValue(),
      });

      // 10. Create transaction entity
      const now = new Date();
      const transaction = new Transaction({
        id: randomUUID(),
        walletId: wallet.id,
        txHash: txHash,
        network: network.getValue(),
        from: wallet.address.getValue(),
        to: request.to,
        value: request.value,
        tokenAddress: request.tokenAddress,
        status: "pending",
        confirmations: 0,
        gasPrice: gasPrice,
        createdAt: now,
        updatedAt: now,
      });

      // 11. Save transaction to repository
      const savedTransaction = await this.transactionRepository.create(
        transaction
      );

      // 12. Publish transaction.sent event
      await this.eventPublisher.publishTransactionSent({
        transactionId: savedTransaction.id,
        walletId: wallet.id,
        txHash: txHash,
        network: network.getValue(),
        from: wallet.address.getValue(),
        to: request.to,
        value: request.value,
        timestamp: now.toISOString(),
      });

      // 13. Return transaction
      return {
        transaction: savedTransaction.toJSON(),
      };
    } catch (error) {
      this.logger.error("Failed to send transaction", {
        error: error instanceof Error ? error.message : String(error),
        walletId: request.walletId,
        to: request.to,
      });
      throw error;
    }
  }

  /**
   * Get encrypted private key from wallet repository
   *
   * @param walletId - Wallet ID
   * @returns Promise resolving to encrypted private key
   * @throws Error if wallet not found or private key not available
   */
  private async getEncryptedPrivateKey(walletId: string): Promise<string> {
    return await this.walletRepository.getEncryptedPrivateKey(walletId);
  }

  /**
   * Decrypt private key using AES decryption
   *
   * @param encryptedPrivateKey - Encrypted private key
   * @returns Decrypted private key
   */
  private decryptPrivateKey(encryptedPrivateKey: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, this.encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      if (!decrypted || decrypted.length === 0) {
        throw new Error("Failed to decrypt private key: invalid key or data");
      }

      return decrypted;
    } catch (error) {
      throw new Error(
        `Failed to decrypt private key: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Estimate gas for transaction
   *
   * @param request - Send transaction request
   * @param wallet - Wallet entity
   * @param network - Network value object
   * @returns Promise resolving to estimated gas as string
   */
  private async estimateGasForTransaction(
    request: SendTransactionRequest,
    wallet: { address: { getValue: () => string } },
    network: Network
  ): Promise<string> {
    try {
      const txRequest = {
        from: wallet.address.getValue(),
        to: request.to,
        value: request.value,
        data: request.tokenAddress ? this.getTokenTransferData(request) : undefined,
      };

      return await this.blockchainProvider.estimateGas(
        txRequest,
        network.getValue()
      );
    } catch (error) {
      this.logger.warn("Failed to estimate gas, using default", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return default gas limit (21000 for simple transfers, 65000 for token transfers)
      return request.tokenAddress ? "65000" : "21000";
    }
  }

  /**
   * Get ERC-20 token transfer data
   *
   * @param request - Send transaction request
   * @returns Transaction data hex string
   */
  private getTokenTransferData(request: SendTransactionRequest): string {
    // ERC-20 transfer function signature: transfer(address,uint256)
    // Function selector: 0xa9059cbb
    // This is a simplified version - in production, you'd use a proper ABI encoder
    // For now, return empty string as placeholder
    // The actual implementation would encode: transfer(address to, uint256 amount)
    return "";
  }

  /**
   * Sign transaction using ethers.js
   *
   * @param request - Send transaction request
   * @param wallet - Wallet entity
   * @param privateKey - Decrypted private key
   * @param gasLimit - Gas limit
   * @param gasPrice - Gas price
   * @param network - Network value object
   * @returns Promise resolving to signed transaction hex string
   */
  private async signTransaction(
    request: SendTransactionRequest,
    wallet: { address: { getValue: () => string } },
    privateKey: string,
    gasLimit: string,
    gasPrice: string,
    network: Network
  ): Promise<string> {
    try {
      // Normalize private key (ensure 0x prefix)
      const normalizedPrivateKey = privateKey.startsWith("0x")
        ? privateKey
        : `0x${privateKey}`;

      // Create wallet from private key
      const ethersWallet = new EthersWallet(normalizedPrivateKey);

      // Build transaction
      const tx: {
        to: string;
        value: bigint;
        gasLimit: bigint;
        gasPrice: bigint;
        data?: string;
      } = {
        to: request.to,
        value: BigInt(request.value),
        gasLimit: BigInt(gasLimit),
        gasPrice: BigInt(gasPrice),
      };

      // Add data for token transfers
      if (request.tokenAddress) {
        const tokenData = this.getTokenTransferData(request);
        if (tokenData) {
          tx.data = tokenData;
        }
      }

      // Sign transaction (ethers.js v6)
      // Note: signTransaction returns a Promise<string> in ethers.js v6
      const signedTx = await ethersWallet.signTransaction(tx);

      return signedTx;
    } catch (error) {
      throw new Error(
        `Failed to sign transaction: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

