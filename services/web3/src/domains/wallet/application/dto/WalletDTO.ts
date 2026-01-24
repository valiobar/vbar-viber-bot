/**
 * Wallet DTOs
 *
 * Data Transfer Objects for wallet operations.
 * Defines request and response types for wallet use cases.
 */

import type { BlockchainNetwork } from "@vbar/shared";

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
  wallet: {
    id: string;
    viberUserId: string;
    address: string;
    network: BlockchainNetwork;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Get balance request
 */
export interface GetBalanceRequest {
  walletId: string;
}

/**
 * Get balance response
 */
export interface GetBalanceResponse {
  balance: string; // Balance in wei (as string to handle large numbers)
  network: BlockchainNetwork;
  address: string;
}

/**
 * Get wallet info request
 */
export interface GetWalletInfoRequest {
  walletId: string;
}

/**
 * Get wallet info response
 */
export interface GetWalletInfoResponse {
  wallet: {
    id: string;
    viberUserId: string;
    address: string;
    network: BlockchainNetwork;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * List wallets request
 */
export interface ListWalletsRequest {
  viberUserId?: string;
  network?: BlockchainNetwork;
  page?: number;
  limit?: number;
}

/**
 * List wallets response
 */
export interface ListWalletsResponse {
  wallets: Array<{
    id: string;
    viberUserId: string;
    address: string;
    network: BlockchainNetwork;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

