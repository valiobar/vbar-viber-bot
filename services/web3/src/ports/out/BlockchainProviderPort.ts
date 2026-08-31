/**
 * Blockchain Provider Port
 *
 * Output port interface for blockchain operations.
 * This defines the contract for interacting with blockchain networks.
 */

import type { BlockchainNetwork } from "@vbar/shared";
import type { NFT } from "@vbar/shared";

/**
 * Transaction receipt from blockchain
 */
export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  confirmations: number;
  status: "success" | "failed";
  gasUsed: string;
  effectiveGasPrice?: string;
  from: string;
  to: string | null;
}

/**
 * Token information
 */
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
}

/**
 * Transaction request for gas estimation
 */
export interface TransactionRequest {
  from: string;
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
}

/**
 * Blockchain provider port interface
 *
 * Defines the contract for blockchain operations.
 * Implementations will be provided by output adapters (e.g., EthersAdapter).
 */
export interface BlockchainProviderPort {
  /**
   * Get native token balance for an address
   *
   * @param address - Wallet address
   * @param network - Blockchain network
   * @returns Promise resolving to balance in wei (as string)
   */
  getBalance(address: string, network: BlockchainNetwork): Promise<string>;

  /**
   * Send a signed transaction to the blockchain
   *
   * @param signedTx - Signed transaction hex string
   * @param network - Blockchain network
   * @returns Promise resolving to transaction hash
   */
  sendTransaction(
    signedTx: string,
    network: BlockchainNetwork
  ): Promise<string>;

  /**
   * Get transaction receipt
   *
   * @param txHash - Transaction hash
   * @param network - Blockchain network
   * @returns Promise resolving to transaction receipt
   */
  getTransactionReceipt(
    txHash: string,
    network: BlockchainNetwork
  ): Promise<TransactionReceipt | null>;

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
  callContract(
    address: string,
    abi: any[],
    functionName: string,
    params: any[],
    network: BlockchainNetwork
  ): Promise<any>;

  /**
   * Estimate gas for a transaction
   *
   * @param tx - Transaction request
   * @param network - Blockchain network
   * @returns Promise resolving to estimated gas (as string)
   */
  estimateGas(
    tx: TransactionRequest,
    network: BlockchainNetwork
  ): Promise<string>;

  /**
   * Get current gas price
   *
   * @param network - Blockchain network
   * @returns Promise resolving to gas price in wei (as string)
   */
  getGasPrice(network: BlockchainNetwork): Promise<string>;

  /**
   * Get ERC-20 token balance
   *
   * @param tokenAddress - Token contract address
   * @param walletAddress - Wallet address
   * @param network - Blockchain network
   * @returns Promise resolving to token balance (as string, with decimals)
   */
  getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    network: BlockchainNetwork
  ): Promise<string>;

  /**
   * Get token information (name, symbol, decimals)
   *
   * @param tokenAddress - Token contract address
   * @param network - Blockchain network
   * @returns Promise resolving to token info
   */
  getTokenInfo(
    tokenAddress: string,
    network: BlockchainNetwork
  ): Promise<TokenInfo>;

  /**
   * Get NFTs owned by an address
   *
   * @param ownerAddress - Owner address
   * @param network - Blockchain network
   * @returns Promise resolving to array of NFTs
   */
  getNFTs(ownerAddress: string, network: BlockchainNetwork): Promise<NFT[]>;
}

