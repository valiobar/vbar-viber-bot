/**
 * Get Contract ABI Use Case
 *
 * Use case for getting stored contract ABIs.
 * Orchestrates contract retrieval from repository.
 */

import type { Logger } from "@vbar/shared";
import { ContractRepository } from "../../ports/out/ContractRepository";
import type {
  GetContractABIRequest,
  GetContractABIResponse,
} from "../dto/ContractDTO";
import { validateGetContractABIRequest } from "../dto/ContractDTO";

/**
 * Get Contract ABI Use Case Implementation
 *
 * Handles contract ABI retrieval operations following Hexagonal Architecture principles.
 */
export class GetContractABIUseCase {
  private readonly contractRepository: ContractRepository;
  private readonly logger: Logger;

  constructor(contractRepository: ContractRepository, logger: Logger) {
    this.contractRepository = contractRepository;
    this.logger = logger;
  }

  /**
   * Execute get contract ABI
   *
   * @param request - Get contract ABI request
   * @returns Promise resolving to get contract ABI response
   * @throws Error if contract ABI retrieval fails
   */
  async execute(
    request: GetContractABIRequest
  ): Promise<GetContractABIResponse> {
    try {
      // 1. Validate request
      validateGetContractABIRequest(request);

      this.logger.info("Getting contract ABI", {
        contractId: request.contractId,
      });

      // 2. Get contract ABI from repository
      const contract = await this.contractRepository.findById(
        request.contractId
      );

      if (!contract) {
        throw new Error(`Contract not found: ${request.contractId}`);
      }

      this.logger.info("Contract ABI retrieved successfully", {
        contractId: contract.id,
        address: contract.address.getValue(),
        network: contract.network.getValue(),
      });

      // 3. Return ABI
      return {
        contract: contract.toJSON(),
      };
    } catch (error) {
      this.logger.error("Failed to get contract ABI", {
        error: error instanceof Error ? error.message : String(error),
        contractId: request.contractId,
      });
      throw error;
    }
  }
}

