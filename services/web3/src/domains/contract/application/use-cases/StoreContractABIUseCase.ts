/**
 * Store Contract ABI Use Case
 *
 * Use case for storing contract ABIs.
 * Orchestrates ABI validation and contract storage.
 */

import type { Logger } from "@vbar/shared";
import { randomUUID } from "crypto";
import { SmartContract } from "../../entities/SmartContract";
import { ContractRepository } from "../../ports/out/ContractRepository";
import type {
  StoreContractABIRequest,
  StoreContractABIResponse,
} from "../dto/ContractDTO";
import { validateStoreContractABIRequest } from "../dto/ContractDTO";

/**
 * Store Contract ABI Use Case Implementation
 *
 * Handles contract ABI storage operations following Hexagonal Architecture principles.
 */
export class StoreContractABIUseCase {
  private readonly contractRepository: ContractRepository;
  private readonly logger: Logger;

  constructor(contractRepository: ContractRepository, logger: Logger) {
    this.contractRepository = contractRepository;
    this.logger = logger;
  }

  /**
   * Execute store contract ABI
   *
   * @param request - Store contract ABI request
   * @returns Promise resolving to store contract ABI response
   * @throws Error if ABI storage fails
   */
  async execute(
    request: StoreContractABIRequest
  ): Promise<StoreContractABIResponse> {
    try {
      // 1. Validate request
      validateStoreContractABIRequest(request);

      this.logger.info("Storing contract ABI", {
        address: request.address,
        network: request.network,
        name: request.name,
      });

      // 2. Validate ABI format
      // Create SmartContract entity to validate ABI
      const now = new Date();
      const contract = new SmartContract({
        id: randomUUID(),
        address: request.address,
        network: request.network,
        abi: request.abi,
        name: request.name,
        createdAt: now,
        updatedAt: now,
      });

      // Validate the contract entity (includes ABI validation)
      contract.validate();

      // Check if contract already exists
      const existingContract = await this.contractRepository.findByAddress(
        request.address,
        request.network
      );

      let savedContract: SmartContract;

      if (existingContract) {
        // Update existing contract
        this.logger.info("Updating existing contract", {
          contractId: existingContract.id,
          address: request.address,
        });

        savedContract = await this.contractRepository.update(
          existingContract.id,
          {
            abi: contract.abi,
            name: request.name,
            updatedAt: now,
          }
        );
      } else {
        // Create new contract
        savedContract = await this.contractRepository.create(contract);
      }

      this.logger.info("Contract ABI stored successfully", {
        contractId: savedContract.id,
        address: request.address,
        network: request.network,
      });

      // 3. Return contract info
      return {
        contract: savedContract.toJSON(),
      };
    } catch (error) {
      this.logger.error("Failed to store contract ABI", {
        error: error instanceof Error ? error.message : String(error),
        address: request.address,
        network: request.network,
      });
      throw error;
    }
  }
}

