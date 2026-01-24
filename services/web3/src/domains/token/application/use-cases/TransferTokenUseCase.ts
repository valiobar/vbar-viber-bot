/**
 * Transfer Token Use Case
 *
 * Use case for transferring ERC-20 tokens.
 * Orchestrates wallet retrieval, private key decryption, token balance check, transaction signing, and event publishing.
 */

import type { BlockchainNetwork, Logger } from "@vbar/shared";
import { randomUUID } from "crypto";
import { Wallet as EthersWallet, Interface } from "ethers";
import CryptoJS from "crypto-js";
import { ConfigHelper } from "@vbar/shared";
import { Transaction } from "../../../transaction/entities/Transaction";
import { Network } from "../../../shared/value-objects/Network";
import { Address } from "../../../shared/value-objects/Address";
import { TransactionHash } from "../../../transaction/value-objects/TransactionHash";
import { GasPrice } from "../../../transaction/value-objects/GasPrice";
import { WalletRepository } from "../../../wallet/ports/out/WalletRepository";
import { TransactionRepository } from "../../../transaction/ports/out/TransactionRepository";
import { BlockchainProviderPort } from "../../../../ports/out/BlockchainProviderPort";
import { EventPublisher } from "../../../../ports/out/EventPublisher";
import { Token } from "../../entities/Token";
import type {
  TransferTokenRequest,
  TransferTokenResponse,
} from "../dto/TokenDTO";
import { validateTransferTokenRequest } from "../dto/TokenDTO";

/**
 * Transfer Token Use Case Implementation
 *
 * Handles token transfer operations following Hexagonal Architecture principles.
 */
export class TransferTokenUseCase {
  private readonly walletRepository: WalletRepository;
  private readonly transactionRepository: TransactionRepository;
  private readonly blockchainProvider: BlockchainProviderPort;
  private readonly eventPublisher: EventPublisher;
  private readonly logger: Logger;
  private readonly encryptionKey: string;

  // ERC-20 Transfer function ABI
  private readonly erc20TransferInterface = new Interface([
    "function transfer(address to, uint256 amount) returns (bool)",
  ]);

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
    const key = ConfigHelper.getEnv("WEB3_ENCRYPTION_KEY");
    if (!key || key.length < 32) {
      throw new Error(
        "WEB3_ENCRYPTION_KEY must be set and be at least 32 characters long"
      );
    }
    this.encryptionKey = key;
  }

  /**
   * Execute transfer token
   *
   * @param request - Transfer token request
   * @returns Promise resolving to transfer token response
   * @throws Error if token transfer fails
   */
  async execute(
    request: TransferTokenRequest
  ): Promise<TransferTokenResponse> {
    try {
      // 1. Validate request
      validateTransferTokenRequest(request);

      // 2. Get wallet from repository
      const wallet = await this.walletRepository.findById(request.walletId);

      if (!wallet) {
        throw new Error(`Wallet not found: ${request.walletId}`);
      }

      this.logger.info("Transferring token", {
        walletId: wallet.id,
        tokenAddress: request.tokenAddress,
        to: request.to,
        amount: request.amount,
        network: wallet.network.getValue(),
      });

      const network = wallet.network;

      // 3. Get encrypted private key from repository
      const encryptedPrivateKey = await this.walletRepository.getEncryptedPrivateKey(
        wallet.id
      );

      // 4. Decrypt private key
      const privateKey = this.decryptPrivateKey(encryptedPrivateKey);

      // 5. Get token info to parse amount correctly
      const tokenInfo = await this.blockchainProvider.getTokenInfo(
        request.tokenAddress,
        network.getValue()
      );

      const token = new Token({
        address: request.tokenAddress,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
      });

      // Parse human-readable amount to smallest unit
      const amountInSmallestUnit = token.parseAmount(request.amount);

      // 6. Check token balance
      const balanceRaw = await this.blockchainProvider.getTokenBalance(
        request.tokenAddress,
        wallet.address.getValue(),
        network.getValue()
      );

      const balanceBigInt = BigInt(balanceRaw);
      const amountBigInt = BigInt(amountInSmallestUnit);

      if (balanceBigInt < amountBigInt) {
        throw new Error(
          `Insufficient token balance. Required: ${request.amount} ${tokenInfo.symbol}, Available: ${token.formatAmount(balanceRaw)} ${tokenInfo.symbol}`
        );
      }

      // 7. Create ERC-20 transfer transaction data
      const transferData = this.erc20TransferInterface.encodeFunctionData(
        "transfer",
        [request.to, amountInSmallestUnit]
      );

      // 8. Estimate gas (if not provided)
      const gasLimit = request.gasLimit
        ? request.gasLimit
        : await this.estimateGasForTokenTransfer(
            wallet,
            request.tokenAddress,
            transferData,
            network
          );

      // 9. Get gas price (if not provided)
      const gasPrice = request.gasPrice
        ? request.gasPrice
        : await this.blockchainProvider.getGasPrice(network.getValue());

      // 10. Sign and send transaction
      const signedTx = await this.signTokenTransferTransaction(
        wallet,
        request.tokenAddress,
        transferData,
        privateKey,
        gasLimit,
        gasPrice,
        network
      );

      const txHash = await this.blockchainProvider.sendTransaction(
        signedTx,
        network.getValue()
      );

      this.logger.info("Token transfer transaction sent to blockchain", {
        txHash,
        walletId: wallet.id,
        tokenAddress: request.tokenAddress,
        network: network.getValue(),
      });

      // 11. Save transaction to repository
      const now = new Date();
      const transaction = new Transaction({
        id: randomUUID(),
        walletId: wallet.id,
        txHash: txHash,
        network: network.getValue(),
        from: wallet.address.getValue(),
        to: request.tokenAddress, // For token transfers, 'to' is the token contract
        value: amountInSmallestUnit,
        tokenAddress: request.tokenAddress,
        status: "pending",
        confirmations: 0,
        gasPrice: gasPrice,
        createdAt: now,
        updatedAt: now,
      });

      const savedTransaction = await this.transactionRepository.create(
        transaction
      );

      // 12. Publish token.transferred event
      try {
        await this.eventPublisher.publishTokenTransferred({
          transactionId: savedTransaction.id,
          walletId: wallet.id,
          txHash: txHash,
          network: network.getValue(),
          tokenAddress: request.tokenAddress,
          from: wallet.address.getValue(),
          to: request.to,
          amount: amountInSmallestUnit,
          timestamp: now.toISOString(),
        });
      } catch (eventError) {
        // Log error but don't fail the operation
        this.logger.error("Failed to publish token.transferred event", {
          error:
            eventError instanceof Error ? eventError.message : String(eventError),
          transactionId: savedTransaction.id,
        });
      }

      // 13. Return transaction
      return {
        transaction: savedTransaction.toJSON(),
      };
    } catch (error) {
      this.logger.error("Failed to transfer token", {
        error: error instanceof Error ? error.message : String(error),
        walletId: request.walletId,
        tokenAddress: request.tokenAddress,
        to: request.to,
      });
      throw error;
    }
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
   * Estimate gas for token transfer transaction
   *
   * @param wallet - Wallet entity
   * @param tokenAddress - Token contract address
   * @param data - Transaction data (encoded transfer function call)
   * @param network - Network value object
   * @returns Promise resolving to estimated gas as string
   */
  private async estimateGasForTokenTransfer(
    wallet: { address: { getValue: () => string } },
    tokenAddress: string,
    data: string,
    network: Network
  ): Promise<string> {
    try {
      const txRequest = {
        from: wallet.address.getValue(),
        to: tokenAddress,
        value: "0", // Token transfers don't send native token
        data: data,
      };

      return await this.blockchainProvider.estimateGas(
        txRequest,
        network.getValue()
      );
    } catch (error) {
      this.logger.warn("Failed to estimate gas for token transfer, using default", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return default gas limit for ERC-20 transfers
      return "65000";
    }
  }

  /**
   * Sign token transfer transaction using ethers.js
   *
   * @param wallet - Wallet entity
   * @param tokenAddress - Token contract address
   * @param data - Transaction data (encoded transfer function call)
   * @param privateKey - Decrypted private key
   * @param gasLimit - Gas limit
   * @param gasPrice - Gas price
   * @param network - Network value object
   * @returns Promise resolving to signed transaction hex string
   */
  private async signTokenTransferTransaction(
    wallet: { address: { getValue: () => string } },
    tokenAddress: string,
    data: string,
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
      const tx = {
        to: tokenAddress,
        value: 0n, // Token transfers don't send native token
        gasLimit: BigInt(gasLimit),
        gasPrice: BigInt(gasPrice),
        data: data,
      };

      // Sign transaction (ethers.js v6)
      const signedTx = await ethersWallet.signTransaction(tx);

      return signedTx;
    } catch (error) {
      throw new Error(
        `Failed to sign token transfer transaction: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

