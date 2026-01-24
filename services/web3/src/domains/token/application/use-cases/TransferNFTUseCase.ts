/**
 * Transfer NFT Use Case
 *
 * Use case for transferring NFTs (ERC-721/ERC-1155).
 * Orchestrates wallet retrieval, private key decryption, transaction signing, and event publishing.
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
import type {
  TransferNFTRequest,
  TransferNFTResponse,
} from "../dto/TokenDTO";
import { validateTransferNFTRequest } from "../dto/TokenDTO";

/**
 * Transfer NFT Use Case Implementation
 *
 * Handles NFT transfer operations following Hexagonal Architecture principles.
 * Supports ERC-721 (safeTransferFrom) and ERC-1155 (safeTransferFrom).
 */
export class TransferNFTUseCase {
  private readonly walletRepository: WalletRepository;
  private readonly transactionRepository: TransactionRepository;
  private readonly blockchainProvider: BlockchainProviderPort;
  private readonly eventPublisher: EventPublisher;
  private readonly logger: Logger;
  private readonly encryptionKey: string;

  // ERC-721 safeTransferFrom function ABI
  private readonly erc721TransferInterface = new Interface([
    "function safeTransferFrom(address from, address to, uint256 tokenId)",
  ]);

  // ERC-1155 safeTransferFrom function ABI
  private readonly erc1155TransferInterface = new Interface([
    "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
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
   * Execute transfer NFT
   *
   * @param request - Transfer NFT request
   * @returns Promise resolving to transfer NFT response
   * @throws Error if NFT transfer fails
   */
  async execute(request: TransferNFTRequest): Promise<TransferNFTResponse> {
    try {
      // 1. Validate request
      validateTransferNFTRequest(request);

      // 2. Get wallet from repository
      const wallet = await this.walletRepository.findById(request.walletId);

      if (!wallet) {
        throw new Error(`Wallet not found: ${request.walletId}`);
      }

      this.logger.info("Transferring NFT", {
        walletId: wallet.id,
        contractAddress: request.contractAddress,
        tokenId: request.tokenId,
        to: request.to,
        network: wallet.network.getValue(),
      });

      const network = wallet.network;

      // 3. Get encrypted private key from repository
      const encryptedPrivateKey = await this.walletRepository.getEncryptedPrivateKey(
        wallet.id
      );

      // 4. Decrypt private key
      const privateKey = this.decryptPrivateKey(encryptedPrivateKey);

      // 5. Determine NFT standard (ERC-721 or ERC-1155) and create transfer data
      // For now, we'll try ERC-721 first (most common)
      // In production, you might want to check the contract standard first
      let transferData: string;
      try {
        // Try ERC-721 safeTransferFrom
        transferData = this.erc721TransferInterface.encodeFunctionData(
          "safeTransferFrom",
          [wallet.address.getValue(), request.to, request.tokenId]
        );
      } catch (error) {
        // If ERC-721 fails, try ERC-1155 (amount = 1, data = "0x")
        transferData = this.erc1155TransferInterface.encodeFunctionData(
          "safeTransferFrom",
          [
            wallet.address.getValue(),
            request.to,
            request.tokenId,
            "1", // amount for ERC-1155
            "0x", // data
          ]
        );
      }

      // 6. Estimate gas (if not provided)
      const gasLimit = request.gasLimit
        ? request.gasLimit
        : await this.estimateGasForNFTTransfer(
            wallet,
            request.contractAddress,
            transferData,
            network
          );

      // 7. Get gas price (if not provided)
      const gasPrice = request.gasPrice
        ? request.gasPrice
        : await this.blockchainProvider.getGasPrice(network.getValue());

      // 8. Sign and send transaction
      const signedTx = await this.signNFTTransferTransaction(
        wallet,
        request.contractAddress,
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

      this.logger.info("NFT transfer transaction sent to blockchain", {
        txHash,
        walletId: wallet.id,
        contractAddress: request.contractAddress,
        tokenId: request.tokenId,
        network: network.getValue(),
      });

      // 9. Save transaction to repository
      const now = new Date();
      const transaction = new Transaction({
        id: randomUUID(),
        walletId: wallet.id,
        txHash: txHash,
        network: network.getValue(),
        from: wallet.address.getValue(),
        to: request.contractAddress, // For NFT transfers, 'to' is the NFT contract
        value: "0", // NFT transfers don't send native token
        tokenAddress: request.contractAddress, // Store NFT contract address in tokenAddress field
        status: "pending",
        confirmations: 0,
        gasPrice: gasPrice,
        createdAt: now,
        updatedAt: now,
      });

      const savedTransaction = await this.transactionRepository.create(
        transaction
      );

      // 10. Publish transaction.sent event (NFT transfers use the same event as regular transactions)
      try {
        await this.eventPublisher.publishTransactionSent({
          transactionId: savedTransaction.id,
          walletId: wallet.id,
          txHash: txHash,
          network: network.getValue(),
          from: wallet.address.getValue(),
          to: request.to,
          value: "0", // NFT transfers don't send native token
          timestamp: now.toISOString(),
        });
      } catch (eventError) {
        // Log error but don't fail the operation
        this.logger.error("Failed to publish transaction.sent event", {
          error:
            eventError instanceof Error ? eventError.message : String(eventError),
          transactionId: savedTransaction.id,
        });
      }

      // 11. Return transaction
      return {
        transaction: savedTransaction.toJSON(),
      };
    } catch (error) {
      this.logger.error("Failed to transfer NFT", {
        error: error instanceof Error ? error.message : String(error),
        walletId: request.walletId,
        contractAddress: request.contractAddress,
        tokenId: request.tokenId,
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
   * Estimate gas for NFT transfer transaction
   *
   * @param wallet - Wallet entity
   * @param contractAddress - NFT contract address
   * @param data - Transaction data (encoded transfer function call)
   * @param network - Network value object
   * @returns Promise resolving to estimated gas as string
   */
  private async estimateGasForNFTTransfer(
    wallet: { address: { getValue: () => string } },
    contractAddress: string,
    data: string,
    network: Network
  ): Promise<string> {
    try {
      const txRequest = {
        from: wallet.address.getValue(),
        to: contractAddress,
        value: "0", // NFT transfers don't send native token
        data: data,
      };

      return await this.blockchainProvider.estimateGas(
        txRequest,
        network.getValue()
      );
    } catch (error) {
      this.logger.warn("Failed to estimate gas for NFT transfer, using default", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return default gas limit for NFT transfers
      return "100000";
    }
  }

  /**
   * Sign NFT transfer transaction using ethers.js
   *
   * @param wallet - Wallet entity
   * @param contractAddress - NFT contract address
   * @param data - Transaction data (encoded transfer function call)
   * @param privateKey - Decrypted private key
   * @param gasLimit - Gas limit
   * @param gasPrice - Gas price
   * @param network - Network value object
   * @returns Promise resolving to signed transaction hex string
   */
  private async signNFTTransferTransaction(
    wallet: { address: { getValue: () => string } },
    contractAddress: string,
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
        to: contractAddress,
        value: 0n, // NFT transfers don't send native token
        gasLimit: BigInt(gasLimit),
        gasPrice: BigInt(gasPrice),
        data: data,
      };

      // Sign transaction (ethers.js v6)
      const signedTx = await ethersWallet.signTransaction(tx);

      return signedTx;
    } catch (error) {
      throw new Error(
        `Failed to sign NFT transfer transaction: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

