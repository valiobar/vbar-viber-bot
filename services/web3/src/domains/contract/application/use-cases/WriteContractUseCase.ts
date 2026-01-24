/**
 * Write Contract Use Case
 *
 * Use case for writing to smart contracts (calling state-changing functions).
 * Orchestrates wallet retrieval, private key decryption, contract ABI retrieval,
 * transaction signing, and event publishing.
 */

import type { Logger } from "@vbar/shared";
import { randomUUID } from "crypto";
import { Wallet as EthersWallet, Interface } from "ethers";
import CryptoJS from "crypto-js";
import { ConfigHelper } from "@vbar/shared";
import { Transaction } from "../../../transaction/entities/Transaction";
import { Network } from "../../../shared/value-objects/Network";
import { WalletRepository } from "../../../wallet/ports/out/WalletRepository";
import { TransactionRepository } from "../../../transaction/ports/out/TransactionRepository";
import { ContractRepository } from "../../ports/out/ContractRepository";
import { BlockchainProviderPort } from "../../../../ports/out/BlockchainProviderPort";
import { EventPublisher } from "../../../../ports/out/EventPublisher";
import type {
  WriteContractRequest,
  WriteContractResponse,
} from "../dto/ContractDTO";
import { validateWriteContractRequest } from "../dto/ContractDTO";

/**
 * Write Contract Use Case Implementation
 *
 * Handles contract write operations following Hexagonal Architecture principles.
 */
export class WriteContractUseCase {
  private readonly walletRepository: WalletRepository;
  private readonly transactionRepository: TransactionRepository;
  private readonly contractRepository?: ContractRepository;
  private readonly blockchainProvider: BlockchainProviderPort;
  private readonly eventPublisher: EventPublisher;
  private readonly logger: Logger;
  private readonly encryptionKey: string;

  constructor(
    walletRepository: WalletRepository,
    transactionRepository: TransactionRepository,
    blockchainProvider: BlockchainProviderPort,
    eventPublisher: EventPublisher,
    logger: Logger,
    contractRepository?: ContractRepository
  ) {
    this.walletRepository = walletRepository;
    this.transactionRepository = transactionRepository;
    this.contractRepository = contractRepository;
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
   * Execute write contract
   *
   * @param request - Write contract request
   * @returns Promise resolving to write contract response
   * @throws Error if contract write fails
   */
  async execute(
    request: WriteContractRequest
  ): Promise<WriteContractResponse> {
    try {
      // 1. Validate request
      validateWriteContractRequest(request);

      // 2. Get wallet from repository
      const wallet = await this.walletRepository.findById(request.walletId);

      if (!wallet) {
        throw new Error(`Wallet not found: ${request.walletId}`);
      }

      this.logger.info("Writing to contract", {
        walletId: wallet.id,
        contractAddress: request.contractAddress,
        functionName: request.functionName,
        network: request.network,
      });

      const network = new Network(request.network);

      // Verify wallet network matches request network
      if (wallet.network.getValue() !== request.network) {
        throw new Error(
          `Wallet network (${wallet.network.getValue()}) does not match request network (${request.network})`
        );
      }

      // 3. Get encrypted private key from repository
      const encryptedPrivateKey = await this.walletRepository.getEncryptedPrivateKey(
        wallet.id
      );

      // 4. Decrypt private key
      const privateKey = this.decryptPrivateKey(encryptedPrivateKey);

      // 5. Get contract ABI
      let abi: any[];

      if (request.contractId && this.contractRepository) {
        // Get ABI from repository
        const contract = await this.contractRepository.findById(
          request.contractId
        );

        if (!contract) {
          throw new Error(`Contract not found: ${request.contractId}`);
        }

        // Verify contract address matches if provided
        if (
          contract.address.getValue().toLowerCase() !==
          request.contractAddress.toLowerCase()
        ) {
          throw new Error(
            "Contract address does not match stored contract address"
          );
        }

        abi = contract.abi.getValue();
      } else if (request.abi) {
        // Use ABI from request
        abi = request.abi;
      } else {
        throw new Error("Either abi or contractId must be provided");
      }

      // 6. Create contract function call transaction
      const contractInterface = new Interface(abi);
      const functionData = contractInterface.encodeFunctionData(
        request.functionName,
        request.args || []
      );

      // 7. Estimate gas (if not provided)
      const gasLimit = request.gasLimit
        ? request.gasLimit
        : await this.estimateGasForContractCall(
            wallet,
            request.contractAddress,
            functionData,
            request.value || "0",
            network
          );

      // 8. Get gas price (if not provided)
      const gasPrice = request.gasPrice
        ? request.gasPrice
        : await this.blockchainProvider.getGasPrice(network.getValue());

      // 9. Sign and send transaction
      const signedTx = await this.signContractTransaction(
        wallet,
        request.contractAddress,
        functionData,
        privateKey,
        gasLimit,
        gasPrice,
        request.value || "0",
        network
      );

      const txHash = await this.blockchainProvider.sendTransaction(
        signedTx,
        network.getValue()
      );

      this.logger.info("Contract write transaction sent to blockchain", {
        txHash,
        walletId: wallet.id,
        contractAddress: request.contractAddress,
        functionName: request.functionName,
        network: network.getValue(),
      });

      // 10. Save transaction to repository
      const now = new Date();
      const transaction = new Transaction({
        id: randomUUID(),
        walletId: wallet.id,
        txHash: txHash,
        network: network.getValue(),
        from: wallet.address.getValue(),
        to: request.contractAddress,
        value: request.value || "0",
        status: "pending",
        confirmations: 0,
        gasPrice: gasPrice,
        createdAt: now,
        updatedAt: now,
      });

      const savedTransaction = await this.transactionRepository.create(
        transaction
      );

      // 11. Publish transaction.sent event
      try {
        await this.eventPublisher.publishTransactionSent({
          transactionId: savedTransaction.id,
          walletId: wallet.id,
          txHash: txHash,
          network: network.getValue(),
          from: wallet.address.getValue(),
          to: request.contractAddress,
          value: request.value || "0",
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

      // 12. Return transaction
      return {
        transaction: savedTransaction.toJSON(),
      };
    } catch (error) {
      this.logger.error("Failed to write to contract", {
        error: error instanceof Error ? error.message : String(error),
        walletId: request.walletId,
        contractAddress: request.contractAddress,
        functionName: request.functionName,
        network: request.network,
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
   * Estimate gas for contract function call
   *
   * @param wallet - Wallet entity
   * @param contractAddress - Contract address
   * @param data - Encoded function call data
   * @param value - Native token value to send (in wei)
   * @param network - Network value object
   * @returns Promise resolving to estimated gas as string
   */
  private async estimateGasForContractCall(
    wallet: { address: { getValue: () => string } },
    contractAddress: string,
    data: string,
    value: string,
    network: Network
  ): Promise<string> {
    try {
      const txRequest = {
        from: wallet.address.getValue(),
        to: contractAddress,
        value: value,
        data: data,
      };

      return await this.blockchainProvider.estimateGas(
        txRequest,
        network.getValue()
      );
    } catch (error) {
      this.logger.warn("Failed to estimate gas for contract call, using default", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return default gas limit for contract calls
      return "200000";
    }
  }

  /**
   * Sign contract transaction using ethers.js
   *
   * @param wallet - Wallet entity
   * @param contractAddress - Contract address
   * @param data - Encoded function call data
   * @param privateKey - Decrypted private key
   * @param gasLimit - Gas limit
   * @param gasPrice - Gas price
   * @param value - Native token value to send (in wei)
   * @param network - Network value object
   * @returns Promise resolving to signed transaction hex string
   */
  private async signContractTransaction(
    wallet: { address: { getValue: () => string } },
    contractAddress: string,
    data: string,
    privateKey: string,
    gasLimit: string,
    gasPrice: string,
    value: string,
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
        value: BigInt(value),
        gasLimit: BigInt(gasLimit),
        gasPrice: BigInt(gasPrice),
        data: data,
      };

      // Sign transaction (ethers.js v6)
      const signedTx = await ethersWallet.signTransaction(tx);

      return signedTx;
    } catch (error) {
      throw new Error(
        `Failed to sign contract transaction: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

