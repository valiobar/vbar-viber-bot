/**
 * Contract DTOs
 *
 * Data Transfer Objects for contract operations.
 * Defines request and response types for contract use cases.
 */

import type { BlockchainNetwork } from "@vbar/shared";

/**
 * Read contract request
 */
export interface ReadContractRequest {
  contractAddress: string;
  abi?: any[]; // Optional: Contract ABI (or use stored ABI via contractId)
  functionName: string;
  args?: any[]; // Function arguments
  network: BlockchainNetwork;
  contractId?: string; // Optional: Use stored contract ABI by ID
}

/**
 * Read contract response
 */
export interface ReadContractResponse {
  contractAddress: string;
  functionName: string;
  result: any; // Function return value
  network: BlockchainNetwork;
}

/**
 * Write contract request
 */
export interface WriteContractRequest {
  walletId: string; // Wallet ID to send transaction from
  contractAddress: string;
  abi?: any[]; // Optional: Contract ABI (or use stored ABI via contractId)
  functionName: string;
  args?: any[]; // Function arguments
  value?: string; // Optional: Native token value to send (in wei, as string)
  network: BlockchainNetwork;
  gasLimit?: string; // Optional: Gas limit
  gasPrice?: string; // Optional: Gas price in wei (as string)
  contractId?: string; // Optional: Use stored contract ABI by ID
}

/**
 * Write contract response
 */
export interface WriteContractResponse {
  transaction: {
    id: string;
    walletId: string;
    txHash: string;
    network: BlockchainNetwork;
    from: string;
    to: string;
    value: string;
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
 * Store contract ABI request
 */
export interface StoreContractABIRequest {
  address: string;
  network: BlockchainNetwork;
  abi: any[]; // Contract ABI JSON
  name?: string; // Optional: Human-readable contract name
}

/**
 * Store contract ABI response
 */
export interface StoreContractABIResponse {
  contract: {
    id: string;
    address: string;
    network: BlockchainNetwork;
    abi: any[];
    name?: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Get contract ABI request
 */
export interface GetContractABIRequest {
  contractId: string; // Contract ID
}

/**
 * Get contract ABI response
 */
export interface GetContractABIResponse {
  contract: {
    id: string;
    address: string;
    network: BlockchainNetwork;
    abi: any[];
    name?: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Validate read contract request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateReadContractRequest(
  request: ReadContractRequest
): void {
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

  if (!request.functionName || typeof request.functionName !== "string") {
    throw new Error("functionName is required and must be a string");
  }

  if (request.functionName.trim().length === 0) {
    throw new Error("functionName cannot be empty");
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

  // Either abi or contractId must be provided
  if (!request.abi && !request.contractId) {
    throw new Error("Either abi or contractId must be provided");
  }

  if (request.abi !== undefined) {
    if (!Array.isArray(request.abi)) {
      throw new Error("abi must be an array if provided");
    }

    if (request.abi.length === 0) {
      throw new Error("abi cannot be empty if provided");
    }
  }

  if (request.contractId !== undefined) {
    if (typeof request.contractId !== "string") {
      throw new Error("contractId must be a string if provided");
    }

    if (request.contractId.trim().length === 0) {
      throw new Error("contractId cannot be empty if provided");
    }
  }

  // Validate args if provided
  if (request.args !== undefined) {
    if (!Array.isArray(request.args)) {
      throw new Error("args must be an array if provided");
    }
  }
}

/**
 * Validate write contract request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateWriteContractRequest(
  request: WriteContractRequest
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

  if (!request.functionName || typeof request.functionName !== "string") {
    throw new Error("functionName is required and must be a string");
  }

  if (request.functionName.trim().length === 0) {
    throw new Error("functionName cannot be empty");
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

  // Either abi or contractId must be provided
  if (!request.abi && !request.contractId) {
    throw new Error("Either abi or contractId must be provided");
  }

  if (request.abi !== undefined) {
    if (!Array.isArray(request.abi)) {
      throw new Error("abi must be an array if provided");
    }

    if (request.abi.length === 0) {
      throw new Error("abi cannot be empty if provided");
    }
  }

  if (request.contractId !== undefined) {
    if (typeof request.contractId !== "string") {
      throw new Error("contractId must be a string if provided");
    }

    if (request.contractId.trim().length === 0) {
      throw new Error("contractId cannot be empty if provided");
    }
  }

  // Validate args if provided
  if (request.args !== undefined) {
    if (!Array.isArray(request.args)) {
      throw new Error("args must be an array if provided");
    }
  }

  // Validate value if provided
  if (request.value !== undefined) {
    if (typeof request.value !== "string") {
      throw new Error("value must be a string if provided");
    }

    if (request.value.trim().length === 0) {
      throw new Error("value cannot be empty if provided");
    }

    try {
      const valueBigInt = BigInt(request.value.trim());
      if (valueBigInt < 0n) {
        throw new Error("value cannot be negative");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("negative")) {
        throw error;
      }
      throw new Error("value must be a valid number");
    }
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
 * Validate store contract ABI request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateStoreContractABIRequest(
  request: StoreContractABIRequest
): void {
  if (!request.address || typeof request.address !== "string") {
    throw new Error("address is required and must be a string");
  }

  if (request.address.trim().length === 0) {
    throw new Error("address cannot be empty");
  }

  // Basic Ethereum address validation
  const addressPattern = /^0x[a-fA-F0-9]{40}$/;
  if (!addressPattern.test(request.address.trim())) {
    throw new Error("address must be a valid Ethereum address");
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

  if (!request.abi || !Array.isArray(request.abi)) {
    throw new Error("abi is required and must be an array");
  }

  if (request.abi.length === 0) {
    throw new Error("abi cannot be empty");
  }

  // Validate name if provided
  if (request.name !== undefined) {
    if (typeof request.name !== "string") {
      throw new Error("name must be a string if provided");
    }

    if (request.name.trim().length === 0) {
      throw new Error("name cannot be empty if provided");
    }
  }
}

/**
 * Validate get contract ABI request
 *
 * @param request - Request to validate
 * @throws Error if request is invalid
 */
export function validateGetContractABIRequest(
  request: GetContractABIRequest
): void {
  if (!request.contractId || typeof request.contractId !== "string") {
    throw new Error("contractId is required and must be a string");
  }

  if (request.contractId.trim().length === 0) {
    throw new Error("contractId cannot be empty");
  }
}

