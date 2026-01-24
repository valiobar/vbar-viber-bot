/**
 * Token DTOs
 *
 * Data Transfer Objects for token operations.
 * Defines request and response types for token use cases.
 */

import type { BlockchainNetwork, NFT } from "@vbar/shared";

/**
 * Get token balance request
 */
export interface GetTokenBalanceRequest {
  walletId: string;
  tokenAddress: string;
}

/**
 * Get token balance response
 */
export interface GetTokenBalanceResponse {
  balance: string; // Token balance (with decimals applied)
  tokenAddress: string;
  decimals: number;
  symbol: string;
  name: string;
  network: BlockchainNetwork;
  walletAddress: string;
}

/**
 * Transfer token request
 */
export interface TransferTokenRequest {
  walletId: string;
  tokenAddress: string;
  to: string;
  amount: string; // Amount in human-readable format (e.g., "1.5")
  gasPrice?: string; // Optional, will be estimated if not provided
  gasLimit?: string; // Optional, will be estimated if not provided
}

/**
 * Transfer token response
 */
export interface TransferTokenResponse {
  transaction: {
    id: string;
    walletId: string;
    txHash: string;
    network: BlockchainNetwork;
    from: string;
    to: string;
    value: string;
    tokenAddress: string;
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Get token info request
 */
export interface GetTokenInfoRequest {
  tokenAddress: string;
  network: BlockchainNetwork;
}

/**
 * Get token info response
 */
export interface GetTokenInfoResponse {
  token: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply?: string;
  };
  network: BlockchainNetwork;
}

/**
 * Get NFTs request
 */
export interface GetNFTsRequest {
  walletId: string;
  network?: BlockchainNetwork; // Optional, will use wallet's network if not provided
}

/**
 * Get NFTs response
 */
export interface GetNFTsResponse {
  nfts: NFT[];
  walletAddress: string;
  network: BlockchainNetwork;
  total: number;
}

/**
 * Transfer NFT request
 */
export interface TransferNFTRequest {
  walletId: string;
  contractAddress: string;
  tokenId: string;
  to: string;
  gasPrice?: string; // Optional, will be estimated if not provided
  gasLimit?: string; // Optional, will be estimated if not provided
}

/**
 * Transfer NFT response
 */
export interface TransferNFTResponse {
  transaction: {
    id: string;
    walletId: string;
    txHash: string;
    network: BlockchainNetwork;
    from: string;
    to: string;
    value: string; // "0" for NFT transfers
    tokenAddress: string; // NFT contract address
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Validate get token balance request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateGetTokenBalanceRequest(
  request: GetTokenBalanceRequest
): void {
  if (!request.walletId || typeof request.walletId !== "string") {
    throw new Error("walletId is required and must be a string");
  }

  if (request.walletId.trim().length === 0) {
    throw new Error("walletId cannot be empty");
  }

  if (!request.tokenAddress || typeof request.tokenAddress !== "string") {
    throw new Error("tokenAddress is required and must be a string");
  }

  if (request.tokenAddress.trim().length === 0) {
    throw new Error("tokenAddress cannot be empty");
  }

  // Basic Ethereum address validation (0x followed by 40 hex characters)
  const addressPattern = /^0x[a-fA-F0-9]{40}$/;
  if (!addressPattern.test(request.tokenAddress.trim())) {
    throw new Error("tokenAddress must be a valid Ethereum address");
  }
}

/**
 * Validate transfer token request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateTransferTokenRequest(
  request: TransferTokenRequest
): void {
  if (!request.walletId || typeof request.walletId !== "string") {
    throw new Error("walletId is required and must be a string");
  }

  if (request.walletId.trim().length === 0) {
    throw new Error("walletId cannot be empty");
  }

  if (!request.tokenAddress || typeof request.tokenAddress !== "string") {
    throw new Error("tokenAddress is required and must be a string");
  }

  if (request.tokenAddress.trim().length === 0) {
    throw new Error("tokenAddress cannot be empty");
  }

  // Basic Ethereum address validation
  const addressPattern = /^0x[a-fA-F0-9]{40}$/;
  if (!addressPattern.test(request.tokenAddress.trim())) {
    throw new Error("tokenAddress must be a valid Ethereum address");
  }

  if (!request.to || typeof request.to !== "string") {
    throw new Error("to is required and must be a string");
  }

  if (request.to.trim().length === 0) {
    throw new Error("to cannot be empty");
  }

  if (!addressPattern.test(request.to.trim())) {
    throw new Error("to must be a valid Ethereum address");
  }

  if (!request.amount || typeof request.amount !== "string") {
    throw new Error("amount is required and must be a string");
  }

  if (request.amount.trim().length === 0) {
    throw new Error("amount cannot be empty");
  }

  // Validate amount is a positive number
  const amountPattern = /^\d+(\.\d+)?$/;
  if (!amountPattern.test(request.amount.trim())) {
    throw new Error("amount must be a positive number");
  }

  const amountValue = parseFloat(request.amount.trim());
  if (amountValue <= 0) {
    throw new Error("amount must be greater than 0");
  }

  // Validate gasPrice if provided
  if (request.gasPrice !== undefined) {
    if (typeof request.gasPrice !== "string") {
      throw new Error("gasPrice must be a string if provided");
    }

    if (request.gasPrice.trim().length === 0) {
      throw new Error("gasPrice cannot be empty if provided");
    }

    try {
      const gasPriceBigInt = BigInt(request.gasPrice.trim());
      if (gasPriceBigInt < 0n) {
        throw new Error("gasPrice cannot be negative");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("negative")) {
        throw error;
      }
      throw new Error("gasPrice must be a valid number");
    }
  }

  // Validate gasLimit if provided
  if (request.gasLimit !== undefined) {
    if (typeof request.gasLimit !== "string") {
      throw new Error("gasLimit must be a string if provided");
    }

    if (request.gasLimit.trim().length === 0) {
      throw new Error("gasLimit cannot be empty if provided");
    }

    try {
      const gasLimitBigInt = BigInt(request.gasLimit.trim());
      if (gasLimitBigInt <= 0n) {
        throw new Error("gasLimit must be greater than 0");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("greater")) {
        throw error;
      }
      throw new Error("gasLimit must be a valid number");
    }
  }
}

/**
 * Validate get token info request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateGetTokenInfoRequest(
  request: GetTokenInfoRequest
): void {
  if (!request.tokenAddress || typeof request.tokenAddress !== "string") {
    throw new Error("tokenAddress is required and must be a string");
  }

  if (request.tokenAddress.trim().length === 0) {
    throw new Error("tokenAddress cannot be empty");
  }

  // Basic Ethereum address validation
  const addressPattern = /^0x[a-fA-F0-9]{40}$/;
  if (!addressPattern.test(request.tokenAddress.trim())) {
    throw new Error("tokenAddress must be a valid Ethereum address");
  }

  if (!request.network || typeof request.network !== "string") {
    throw new Error("network is required and must be a string");
  }

  const validNetworks: BlockchainNetwork[] = [
    "ethereum",
    "polygon",
    "bsc",
    "arbitrum",
  ];
  if (!validNetworks.includes(request.network as BlockchainNetwork)) {
    throw new Error(
      `Invalid network: ${request.network}. Valid networks: ${validNetworks.join(", ")}`
    );
  }
}

/**
 * Validate get NFTs request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateGetNFTsRequest(request: GetNFTsRequest): void {
  if (!request.walletId || typeof request.walletId !== "string") {
    throw new Error("walletId is required and must be a string");
  }

  if (request.walletId.trim().length === 0) {
    throw new Error("walletId cannot be empty");
  }

  // Validate network if provided
  if (request.network !== undefined) {
    if (typeof request.network !== "string") {
      throw new Error("network must be a string if provided");
    }

    const validNetworks: BlockchainNetwork[] = [
      "ethereum",
      "polygon",
      "bsc",
      "arbitrum",
    ];
    if (!validNetworks.includes(request.network as BlockchainNetwork)) {
      throw new Error(
        `Invalid network: ${request.network}. Valid networks: ${validNetworks.join(", ")}`
      );
    }
  }
}

/**
 * Validate transfer NFT request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateTransferNFTRequest(
  request: TransferNFTRequest
): void {
  if (!request.walletId || typeof request.walletId !== "string") {
    throw new Error("walletId is required and must be a string");
  }

  if (request.walletId.trim().length === 0) {
    throw new Error("walletId cannot be empty");
  }

  if (!request.contractAddress || typeof request.contractAddress !== "string") {
    throw new Error("contractAddress is required and must be a string");
  }

  if (request.contractAddress.trim().length === 0) {
    throw new Error("contractAddress cannot be empty");
  }

  // Basic Ethereum address validation
  const addressPattern = /^0x[a-fA-F0-9]{40}$/;
  if (!addressPattern.test(request.contractAddress.trim())) {
    throw new Error("contractAddress must be a valid Ethereum address");
  }

  if (!request.tokenId || typeof request.tokenId !== "string") {
    throw new Error("tokenId is required and must be a string");
  }

  if (request.tokenId.trim().length === 0) {
    throw new Error("tokenId cannot be empty");
  }

  if (!request.to || typeof request.to !== "string") {
    throw new Error("to is required and must be a string");
  }

  if (request.to.trim().length === 0) {
    throw new Error("to cannot be empty");
  }

  if (!addressPattern.test(request.to.trim())) {
    throw new Error("to must be a valid Ethereum address");
  }

  // Validate gasPrice if provided
  if (request.gasPrice !== undefined) {
    if (typeof request.gasPrice !== "string") {
      throw new Error("gasPrice must be a string if provided");
    }

    if (request.gasPrice.trim().length === 0) {
      throw new Error("gasPrice cannot be empty if provided");
    }

    try {
      const gasPriceBigInt = BigInt(request.gasPrice.trim());
      if (gasPriceBigInt < 0n) {
        throw new Error("gasPrice cannot be negative");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("negative")) {
        throw error;
      }
      throw new Error("gasPrice must be a valid number");
    }
  }

  // Validate gasLimit if provided
  if (request.gasLimit !== undefined) {
    if (typeof request.gasLimit !== "string") {
      throw new Error("gasLimit must be a string if provided");
    }

    if (request.gasLimit.trim().length === 0) {
      throw new Error("gasLimit cannot be empty if provided");
    }

    try {
      const gasLimitBigInt = BigInt(request.gasLimit.trim());
      if (gasLimitBigInt <= 0n) {
        throw new Error("gasLimit must be greater than 0");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("greater")) {
        throw error;
      }
      throw new Error("gasLimit must be a valid number");
    }
  }
}

