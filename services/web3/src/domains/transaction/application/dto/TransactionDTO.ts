/**
 * Transaction DTOs
 *
 * Data Transfer Objects for transaction operations.
 * Defines request and response types for transaction use cases.
 */

import type { BlockchainNetwork } from "@vbar/shared";
import { TransactionStatus } from "../../entities/Transaction";

/**
 * Send transaction request
 */
export interface SendTransactionRequest {
  walletId: string;
  to: string;
  value: string; // Amount in wei (as string to handle large numbers)
  tokenAddress?: string; // Optional token address for ERC-20 transfers
  gasLimit?: string; // Optional gas limit
  gasPrice?: string; // Optional gas price
}

/**
 * Send transaction response
 */
export interface SendTransactionResponse {
  transaction: {
    id: string;
    walletId: string;
    txHash: string;
    network: BlockchainNetwork;
    from: string;
    to: string;
    value: string;
    tokenAddress?: string;
    status: TransactionStatus;
    confirmations: number;
    gasPrice?: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Track transaction request
 */
export interface TrackTransactionRequest {
  transactionId: string;
}

/**
 * Track transaction response
 */
export interface TrackTransactionResponse {
  transaction: {
    id: string;
    walletId: string;
    txHash: string;
    network: BlockchainNetwork;
    from: string;
    to: string;
    value: string;
    tokenAddress?: string;
    status: TransactionStatus;
    confirmations: number;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Get transaction history request
 */
export interface GetTransactionHistoryRequest {
  walletId?: string;
  network?: BlockchainNetwork;
  status?: TransactionStatus;
  page?: number;
  limit?: number;
}

/**
 * Get transaction history response
 */
export interface GetTransactionHistoryResponse {
  transactions: Array<{
    id: string;
    walletId: string;
    txHash: string;
    network: BlockchainNetwork;
    from: string;
    to: string;
    value: string;
    tokenAddress?: string;
    status: TransactionStatus;
    confirmations: number;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

/**
 * Validate send transaction request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateSendTransactionRequest(
  request: SendTransactionRequest
): void {
  if (!request.walletId || typeof request.walletId !== "string") {
    throw new Error("walletId is required and must be a string");
  }

  if (request.walletId.trim().length === 0) {
    throw new Error("walletId cannot be empty");
  }

  if (!request.to || typeof request.to !== "string") {
    throw new Error("to is required and must be a string");
  }

  if (request.to.trim().length === 0) {
    throw new Error("to cannot be empty");
  }

  // Basic address validation (should start with 0x and be 42 characters)
  if (!request.to.startsWith("0x") || request.to.length !== 42) {
    throw new Error("to must be a valid Ethereum address (0x + 40 hex characters)");
  }

  if (!request.value || typeof request.value !== "string") {
    throw new Error("value is required and must be a string");
  }

  if (request.value.trim().length === 0) {
    throw new Error("value cannot be empty");
  }

  // Validate value is a valid number string
  try {
    const valueNum = BigInt(request.value);
    if (valueNum < 0) {
      throw new Error("value cannot be negative");
    }
  } catch (error) {
    throw new Error(
      `value must be a valid number string: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Validate tokenAddress if provided
  if (request.tokenAddress !== undefined) {
    if (typeof request.tokenAddress !== "string") {
      throw new Error("tokenAddress must be a string if provided");
    }

    if (request.tokenAddress.trim().length === 0) {
      throw new Error("tokenAddress cannot be empty if provided");
    }

    if (!request.tokenAddress.startsWith("0x") || request.tokenAddress.length !== 42) {
      throw new Error("tokenAddress must be a valid Ethereum address (0x + 40 hex characters)");
    }
  }

  // Validate gasLimit if provided
  if (request.gasLimit !== undefined) {
    if (typeof request.gasLimit !== "string") {
      throw new Error("gasLimit must be a string if provided");
    }

    try {
      const gasLimitNum = BigInt(request.gasLimit);
      if (gasLimitNum <= 0) {
        throw new Error("gasLimit must be greater than 0");
      }
    } catch (error) {
      throw new Error(
        `gasLimit must be a valid number string: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Validate gasPrice if provided
  if (request.gasPrice !== undefined) {
    if (typeof request.gasPrice !== "string") {
      throw new Error("gasPrice must be a string if provided");
    }

    try {
      const gasPriceNum = BigInt(request.gasPrice);
      if (gasPriceNum <= 0) {
        throw new Error("gasPrice must be greater than 0");
      }
    } catch (error) {
      throw new Error(
        `gasPrice must be a valid number string: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

/**
 * Validate track transaction request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateTrackTransactionRequest(
  request: TrackTransactionRequest
): void {
  if (!request.transactionId || typeof request.transactionId !== "string") {
    throw new Error("transactionId is required and must be a string");
  }

  if (request.transactionId.trim().length === 0) {
    throw new Error("transactionId cannot be empty");
  }
}

/**
 * Validate get transaction history request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateGetTransactionHistoryRequest(
  request: GetTransactionHistoryRequest
): void {
  // Validate walletId if provided
  if (request.walletId !== undefined) {
    if (typeof request.walletId !== "string") {
      throw new Error("walletId must be a string if provided");
    }

    if (request.walletId.trim().length === 0) {
      throw new Error("walletId cannot be empty if provided");
    }
  }

  // Validate network if provided
  if (request.network !== undefined) {
    if (typeof request.network !== "string") {
      throw new Error("network must be a string if provided");
    }

    if (request.network.trim().length === 0) {
      throw new Error("network cannot be empty if provided");
    }
  }

  // Validate status if provided
  if (request.status !== undefined) {
    if (
      request.status !== "pending" &&
      request.status !== "confirmed" &&
      request.status !== "failed"
    ) {
      throw new Error(
        "status must be one of: pending, confirmed, failed"
      );
    }
  }

  // Validate page if provided
  if (request.page !== undefined) {
    if (typeof request.page !== "number" || request.page < 1) {
      throw new Error("page must be a number greater than 0");
    }
  }

  // Validate limit if provided
  if (request.limit !== undefined) {
    if (typeof request.limit !== "number" || request.limit < 1) {
      throw new Error("limit must be a number greater than 0");
    }

    if (request.limit > 100) {
      throw new Error("limit cannot be greater than 100");
    }
  }
}

