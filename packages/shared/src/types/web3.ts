/**
 * Types for Web3 Service
 */

import { BaseEntity } from "./common";

/**
 * Blockchain network type
 */
export type BlockchainNetwork = "ethereum" | "polygon" | "bsc" | "arbitrum";

/**
 * Wallet interface
 */
export interface Wallet extends BaseEntity {
  viberUserId: string;
  address: string; // EIP-55 checksummed
  network: BlockchainNetwork;
}

/**
 * Create wallet request
 */
export interface CreateWalletRequest {
  viberUserId: string;
  network: BlockchainNetwork;
  privateKey?: string; // Optional for importing existing wallet
}

/**
 * Create wallet response
 */
export interface CreateWalletResponse {
  wallet: Wallet;
}

/**
 * Transaction interface
 */
export interface Transaction extends BaseEntity {
  walletId: string;
  txHash: string;
  network: BlockchainNetwork;
  from: string;
  to: string;
  value: string; // Amount in wei
  tokenAddress?: string; // For token transfers
  status: "pending" | "confirmed" | "failed";
  confirmations: number;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
}

/**
 * Send transaction request
 */
export interface SendTransactionRequest {
  walletId: string;
  to: string;
  value: string; // Amount in wei
  network: BlockchainNetwork;
  gasPrice?: string; // Optional, will be estimated if not provided
}

/**
 * Send transaction response
 */
export interface SendTransactionResponse {
  transaction: Transaction;
}

/**
 * Token balance interface
 */
export interface TokenBalance {
  address: string;
  balance: string; // Token balance (with decimals)
  decimals: number;
  symbol: string;
  name: string;
}

/**
 * NFT interface
 */
export interface NFT {
  contractAddress: string;
  tokenId: string;
  name?: string;
  description?: string;
  image?: string;
  metadata?: Record<string, any>;
}

/**
 * Contract interface
 */
export interface Contract extends BaseEntity {
  address: string; // EIP-55 checksummed
  network: BlockchainNetwork;
  abi: any[]; // Contract ABI JSON
  name?: string;
}

