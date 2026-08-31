/**
 * Ethers Adapter
 *
 * Main ethers.js adapter implementing BlockchainProviderPort.
 * Provides network-agnostic interface for blockchain operations using ethers.js v6.
 */

import {
  JsonRpcProvider,
  Contract,
  Interface,
  formatUnits,
  parseUnits,
  isAddress,
  getAddress
} from "ethers";
import type { BlockchainNetwork, Logger, NFT } from "@vbar/shared";
import type {
  BlockchainProviderPort,
  TransactionReceipt,
  TokenInfo,
  TransactionRequest,
} from "../../../ports/out/BlockchainProviderPort";

/**
 * Ethers Adapter Implementation
 *
 * Implements BlockchainProviderPort using ethers.js v6.
 * Provides network-agnostic blockchain operations with error handling and retry logic.
 */
export class EthersAdapter implements BlockchainProviderPort {
  private readonly provider: JsonRpcProvider;
  private readonly logger: Logger;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 1 second

  /**
   * Creates a new EthersAdapter instance
   *
   * @param rpcUrl - RPC endpoint URL
   * @param logger - Logger instance
   */
  constructor(rpcUrl: string, logger: Logger) {
    if (!rpcUrl || typeof rpcUrl !== "string") {
      throw new Error("RPC URL is required and must be a string");
    }

    this.provider = new JsonRpcProvider(rpcUrl);
    this.logger = logger;
  }

  /**
   * Execute operation with retry logic
   *
   * @param operation - Async operation to execute
   * @param operationName - Name of operation for logging
   * @returns Promise resolving to operation result
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          this.logger.warn(
            `Retrying ${operationName} (attempt ${attempt}/${this.maxRetries})`,
            {
              error: lastError.message,
            }
          );
          await this.delay(this.retryDelay * attempt);
        } else {
          this.logger.error(`Failed ${operationName} after ${this.maxRetries} attempts`, {
            error: lastError.message,
          });
        }
      }
    }

    throw lastError || new Error(`Failed to execute ${operationName}`);
  }

  /**
   * Delay execution
   *
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get native token balance for an address
   *
   * @param address - Wallet address
   * @param network - Blockchain network
   * @returns Promise resolving to balance in wei (as string)
   */
  async getBalance(
    address: string,
    network: BlockchainNetwork
  ): Promise<string> {
    return this.executeWithRetry(async () => {
      if (!isAddress(address)) {
        throw new Error(`Invalid address: ${address}`);
      }

      const checksummedAddress = getAddress(address);
      const balance = await this.provider.getBalance(checksummedAddress);

      this.logger.debug("Got balance", {
        address: checksummedAddress,
        network,
        balance: balance.toString(),
      });

      return balance.toString();
    }, `getBalance(${address}, ${network})`);
  }

  /**
   * Send a signed transaction to the blockchain
   *
   * @param signedTx - Signed transaction hex string
   * @param network - Blockchain network
   * @returns Promise resolving to transaction hash
   */
  async sendTransaction(
    signedTx: string,
    network: BlockchainNetwork
  ): Promise<string> {
    return this.executeWithRetry(async () => {
      if (!signedTx || typeof signedTx !== "string" || !signedTx.startsWith("0x")) {
        throw new Error("Invalid signed transaction: must be a hex string starting with 0x");
      }

      const txResponse = await this.provider.broadcastTransaction(signedTx);

      this.logger.info("Transaction sent", {
        txHash: txResponse.hash,
        network,
      });

      return txResponse.hash;
    }, `sendTransaction(${network})`);
  }

  /**
   * Get transaction receipt
   *
   * @param txHash - Transaction hash
   * @param network - Blockchain network
   * @returns Promise resolving to transaction receipt or null if not found
   */
  async getTransactionReceipt(
    txHash: string,
    network: BlockchainNetwork
  ): Promise<TransactionReceipt | null> {
    return this.executeWithRetry(async () => {
      if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x")) {
        throw new Error("Invalid transaction hash: must be a hex string starting with 0x");
      }

      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return null;
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = receipt.blockNumber
        ? Math.max(0, currentBlock - receipt.blockNumber + 1)
        : 0;

      const transactionReceipt: TransactionReceipt = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber || 0,
        blockHash: receipt.blockHash,
        confirmations,
        status: receipt.status === 1 ? "success" : "failed",
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.gasPrice?.toString(),
        from: receipt.from,
        to: receipt.to || null,
      };

      this.logger.debug("Got transaction receipt", {
        txHash,
        network,
        status: transactionReceipt.status,
        confirmations,
      });

      return transactionReceipt;
    }, `getTransactionReceipt(${txHash}, ${network})`);
  }

  /**
   * Call a contract function (read operation)
   *
   * @param address - Contract address
   * @param abi - Contract ABI
   * @param functionName - Function name to call
   * @param params - Function parameters
   * @param network - Blockchain network
   * @returns Promise resolving to function result
   */
  async callContract(
    address: string,
    abi: any[],
    functionName: string,
    params: any[],
    network: BlockchainNetwork
  ): Promise<any> {
    return this.executeWithRetry(async () => {
      if (!isAddress(address)) {
        throw new Error(`Invalid contract address: ${address}`);
      }

      const checksummedAddress = getAddress(address);
      const contract = new Contract(checksummedAddress, abi, this.provider);

      if (!contract[functionName]) {
        throw new Error(`Function ${functionName} not found in contract ABI`);
      }

      const result = await contract[functionName](...params);

      this.logger.debug("Called contract function", {
        address: checksummedAddress,
        functionName,
        network,
      });

      return result;
    }, `callContract(${address}, ${functionName}, ${network})`);
  }

  /**
   * Estimate gas for a transaction
   *
   * @param tx - Transaction request
   * @param network - Blockchain network
   * @returns Promise resolving to estimated gas (as string)
   */
  async estimateGas(
    tx: TransactionRequest,
    network: BlockchainNetwork
  ): Promise<string> {
    return this.executeWithRetry(async () => {
      if (!tx.from || !isAddress(tx.from)) {
        throw new Error(`Invalid from address: ${tx.from}`);
      }

      if (!tx.to || !isAddress(tx.to)) {
        throw new Error(`Invalid to address: ${tx.to}`);
      }

      const txRequest = {
        from: getAddress(tx.from),
        to: getAddress(tx.to),
        value: tx.value ? BigInt(tx.value) : undefined,
        data: tx.data || undefined,
      };

      const gasEstimate = await this.provider.estimateGas(txRequest);

      this.logger.debug("Estimated gas", {
        from: txRequest.from,
        to: txRequest.to,
        network,
        gasEstimate: gasEstimate.toString(),
      });

      return gasEstimate.toString();
    }, `estimateGas(${network})`);
  }

  /**
   * Get current gas price
   *
   * @param network - Blockchain network
   * @returns Promise resolving to gas price in wei (as string)
   */
  async getGasPrice(network: BlockchainNetwork): Promise<string> {
    return this.executeWithRetry(async () => {
      const feeData = await this.provider.getFeeData();

      if (!feeData.gasPrice) {
        throw new Error("Gas price not available from provider");
      }

      const gasPrice = feeData.gasPrice.toString();

      this.logger.debug("Got gas price", {
        network,
        gasPrice,
      });

      return gasPrice;
    }, `getGasPrice(${network})`);
  }

  /**
   * Get ERC-20 token balance
   *
   * @param tokenAddress - Token contract address
   * @param walletAddress - Wallet address
   * @param network - Blockchain network
   * @returns Promise resolving to token balance (as string, with decimals)
   */
  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    network: BlockchainNetwork
  ): Promise<string> {
    return this.executeWithRetry(async () => {
      if (!isAddress(tokenAddress)) {
        throw new Error(`Invalid token address: ${tokenAddress}`);
      }

      if (!isAddress(walletAddress)) {
        throw new Error(`Invalid wallet address: ${walletAddress}`);
      }

      const checksummedTokenAddress = getAddress(tokenAddress);
      const checksummedWalletAddress = getAddress(walletAddress);

      // ERC-20 standard ABI (balanceOf, decimals)
      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];

      const tokenContract = new Contract(
        checksummedTokenAddress,
        erc20Abi,
        this.provider
      );

      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(checksummedWalletAddress),
        tokenContract.decimals(),
      ]);

      const balanceString = balance.toString();

      this.logger.debug("Got token balance", {
        tokenAddress: checksummedTokenAddress,
        walletAddress: checksummedWalletAddress,
        network,
        balance: balanceString,
        decimals: decimals.toString(),
      });

      return balanceString;
    }, `getTokenBalance(${tokenAddress}, ${walletAddress}, ${network})`);
  }

  /**
   * Get token information (name, symbol, decimals)
   *
   * @param tokenAddress - Token contract address
   * @param network - Blockchain network
   * @returns Promise resolving to token info
   */
  async getTokenInfo(
    tokenAddress: string,
    network: BlockchainNetwork
  ): Promise<TokenInfo> {
    return this.executeWithRetry(async () => {
      if (!isAddress(tokenAddress)) {
        throw new Error(`Invalid token address: ${tokenAddress}`);
      }

      const checksummedAddress = getAddress(tokenAddress);

      // ERC-20 standard ABI
      const erc20Abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
      ];

      const tokenContract = new Contract(
        checksummedAddress,
        erc20Abi,
        this.provider
      );

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.name().catch(() => "Unknown"),
        tokenContract.symbol().catch(() => "UNKNOWN"),
        tokenContract.decimals().catch(() => 18),
        tokenContract.totalSupply().catch(() => null),
      ]);

      const tokenInfo: TokenInfo = {
        address: checksummedAddress,
        name: name || "Unknown",
        symbol: symbol || "UNKNOWN",
        decimals: Number(decimals) || 18,
        totalSupply: totalSupply ? totalSupply.toString() : undefined,
      };

      this.logger.debug("Got token info", {
        address: checksummedAddress,
        network,
        symbol: tokenInfo.symbol,
      });

      return tokenInfo;
    }, `getTokenInfo(${tokenAddress}, ${network})`);
  }

  /**
   * Get NFTs owned by an address
   *
   * Note: This is a basic implementation. For production, consider using
   * specialized NFT indexing services (e.g., Alchemy, Moralis, OpenSea API)
   * for better performance and coverage.
   *
   * @param ownerAddress - Owner address
   * @param network - Blockchain network
   * @returns Promise resolving to array of NFTs
   */
  async getNFTs(ownerAddress: string, network: BlockchainNetwork): Promise<NFT[]> {
    return this.executeWithRetry(async () => {
      if (!isAddress(ownerAddress)) {
        throw new Error(`Invalid owner address: ${ownerAddress}`);
      }

      const checksummedAddress = getAddress(ownerAddress);

      // ERC-721 standard ABI
      const erc721Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
        "function tokenURI(uint256 tokenId) view returns (string)",
      ];

      // ERC-1155 standard ABI
      const erc1155Abi = [
        "function balanceOf(address account, uint256 id) view returns (uint256)",
      ];

      // For now, return empty array as full NFT enumeration requires:
      // 1. Known NFT contract addresses (or indexing service)
      // 2. Iterating through all token IDs (expensive)
      // 3. Fetching metadata from IPFS/HTTP (slow)
      //
      // In production, this should integrate with:
      // - Alchemy NFT API
      // - Moralis NFT API
      // - OpenSea API
      // - Or maintain an indexed database of NFT ownership

      this.logger.warn(
        "getNFTs() called but full implementation requires NFT indexing service",
        {
          ownerAddress: checksummedAddress,
          network,
        }
      );

      // Return empty array for now
      // TODO: Integrate with NFT indexing service
      return [];
    }, `getNFTs(${ownerAddress}, ${network})`);
  }
}

