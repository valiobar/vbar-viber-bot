/**
 * Read Contract Use Case
 *
 * Use case for reading from smart contracts (calling view/pure functions).
 * Orchestrates contract ABI retrieval and contract function calls.
 */

import type { Logger } from "@vbar/shared";
import { ContractRepository } from "../../ports/out/ContractRepository";
import { BlockchainProviderPort } from "../../../../ports/out/BlockchainProviderPort";
import type {
  ReadContractRequest,
  ReadContractResponse,
} from "../dto/ContractDTO";
import { validateReadContractRequest } from "../dto/ContractDTO";

/**
 * Read Contract Use Case Implementation
 *
 * Handles contract read operations following Hexagonal Architecture principles.
 */
export class ReadContractUseCase {
  private readonly contractRepository?: ContractRepository;
  private readonly blockchainProvider: BlockchainProviderPort;
  private readonly logger: Logger;

  constructor(
    blockchainProvider: BlockchainProviderPort,
    logger: Logger,
    contractRepository?: ContractRepository
  ) {
    this.blockchainProvider = blockchainProvider;
    this.logger = logger;
    this.contractRepository = contractRepository;
  }

  /**
   * Execute read contract
   *
   * @param request - Read contract request
   * @returns Promise resolving to read contract response
   * @throws Error if contract read fails
   */
  async execute(
    request: ReadContractRequest
  ): Promise<ReadContractResponse> {
    try {
      // 1. Validate request
      validateReadContractRequest(request);

      this.logger.info("Reading from contract", {
        contractAddress: request.contractAddress,
        functionName: request.functionName,
        network: request.network,
      });

      // 2. Get contract ABI (from repository or request)
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

      // 3. Call contract function (view function)
      const result = await this.blockchainProvider.callContract(
        request.contractAddress,
        abi,
        request.functionName,
        request.args || [],
        request.network
      );

      this.logger.info("Contract read successful", {
        contractAddress: request.contractAddress,
        functionName: request.functionName,
        network: request.network,
      });

      // 4. Return result
      return {
        contractAddress: request.contractAddress,
        functionName: request.functionName,
        result: result,
        network: request.network,
      };
    } catch (error) {
      this.logger.error("Failed to read from contract", {
        error: error instanceof Error ? error.message : String(error),
        contractAddress: request.contractAddress,
        functionName: request.functionName,
        network: request.network,
      });
      throw error;
    }
  }
}

