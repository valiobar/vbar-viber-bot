/**
 * MongoDB Contract Repository Implementation using Mongoose
 *
 * Implements the ContractRepository interface using Mongoose.
 * This is an output adapter following Hexagonal Architecture principles.
 */

import { connectToDatabase } from "../../../../../lib/mongodb";
import type {
  ContractRepository,
  ContractFilters,
} from "../../../ports/out/ContractRepository";
import { SmartContract } from "../../../entities/SmartContract";
import { ContractModel, type IContractDocument } from "../models/ContractModel";
import type { BlockchainNetwork, PaginationParams } from "@vbar/shared";

/**
 * MongoDB Contract Repository using Mongoose
 *
 * Implements contract data persistence operations using Mongoose models.
 */
export class MongoContractRepository implements ContractRepository {
  /**
   * Ensures database connection is established
   */
  private async ensureConnection(): Promise<void> {
    await connectToDatabase();
  }

  /**
   * Converts Mongoose document to SmartContract domain entity
   *
   * @param doc - Mongoose document
   * @returns SmartContract domain entity
   */
  private toContractEntity(doc: IContractDocument): SmartContract {
    return new SmartContract({
      id: doc._id.toString(),
      address: doc.address,
      network: doc.network,
      abi: doc.abi,
      name: doc.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Create a new contract
   *
   * @param contract - Smart contract entity to create
   * @returns Promise resolving to created contract
   * @throws Error if contract creation fails
   */
  async create(contract: SmartContract): Promise<SmartContract> {
    try {
      await this.ensureConnection();

      const contractDoc = new ContractModel({
        _id: contract.id,
        address: contract.address.getValue(),
        network: contract.network.getValue(),
        abi: contract.abi.getValue(),
        name: contract.name,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
      });

      const savedDoc = await contractDoc.save();
      return this.toContractEntity(savedDoc);
    } catch (error) {
      throw new Error(
        `Failed to create contract: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Find contract by ID
   *
   * @param id - Contract ID
   * @returns Promise resolving to contract or null if not found
   */
  async findById(id: string): Promise<SmartContract | null> {
    try {
      await this.ensureConnection();
      const doc = await ContractModel.findById(id).exec();

      if (!doc) {
        return null;
      }

      return this.toContractEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to find contract by ID: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Find contract by address and network
   *
   * @param address - Contract address
   * @param network - Blockchain network
   * @returns Promise resolving to contract or null if not found
   */
  async findByAddress(
    address: string,
    network: BlockchainNetwork
  ): Promise<SmartContract | null> {
    try {
      await this.ensureConnection();
      const doc = await ContractModel.findOne({ address, network }).exec();

      if (!doc) {
        return null;
      }

      return this.toContractEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to find contract by address: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Update contract
   *
   * @param id - Contract ID
   * @param updates - Partial contract updates
   * @returns Promise resolving to updated contract
   * @throws Error if contract not found or update fails
   */
  async update(
    id: string,
    updates: Partial<SmartContract>
  ): Promise<SmartContract> {
    try {
      await this.ensureConnection();

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (updates.address) {
        updateData.address =
          typeof updates.address === "string"
            ? updates.address
            : updates.address.getValue();
      }
      if (updates.network) {
        updateData.network =
          typeof updates.network === "string"
            ? updates.network
            : updates.network.getValue();
      }
      if (updates.abi) {
        updateData.abi =
          Array.isArray(updates.abi) || typeof updates.abi === "object"
            ? Array.isArray(updates.abi)
              ? updates.abi
              : updates.abi.getValue()
            : updates.abi;
      }
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }

      const doc = await ContractModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).exec();

      if (!doc) {
        throw new Error(`Contract with ID ${id} not found`);
      }

      return this.toContractEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to update contract: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Delete contract
   *
   * @param id - Contract ID
   * @returns Promise that resolves when contract is deleted
   * @throws Error if contract not found or deletion fails
   */
  async delete(id: string): Promise<void> {
    try {
      await this.ensureConnection();
      const result = await ContractModel.findByIdAndDelete(id).exec();

      if (!result) {
        throw new Error(`Contract with ID ${id} not found`);
      }
    } catch (error) {
      throw new Error(
        `Failed to delete contract: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * List contracts with filters and pagination
   *
   * @param filters - Contract filters
   * @param pagination - Pagination parameters
   * @returns Promise resolving to contracts and total count
   */
  async list(
    filters: ContractFilters,
    pagination: PaginationParams
  ): Promise<{ contracts: SmartContract[]; total: number }> {
    try {
      await this.ensureConnection();

      const query: any = {};

      if (filters.network) {
        query.network = filters.network;
      }
      if (filters.address) {
        query.address = filters.address;
      }
      if (filters.name) {
        query.name = { $regex: filters.name, $options: "i" }; // Case-insensitive search
      }

      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const skip = (page - 1) * limit;

      const [docs, total] = await Promise.all([
        ContractModel.find(query).skip(skip).limit(limit).exec(),
        ContractModel.countDocuments(query).exec(),
      ]);

      return {
        contracts: docs.map((doc) => this.toContractEntity(doc)),
        total,
      };
    } catch (error) {
      throw new Error(
        `Failed to list contracts: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

