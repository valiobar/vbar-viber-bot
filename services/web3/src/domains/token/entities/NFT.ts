/**
 * NFT Domain Entity
 *
 * Domain entity representing an NFT (ERC-721) in the Web3 Service.
 * This entity includes validation and business logic for NFT operations.
 */

import { Address } from "../../shared/value-objects/Address";

/**
 * NFT domain entity
 *
 * Represents an ERC-721 NFT with validation and business logic.
 * Includes methods for metadata URI retrieval.
 */
export class NFT {
  public readonly contractAddress: Address;
  public readonly tokenId: string;
  public readonly name?: string;
  public readonly description?: string;
  public readonly image?: string;
  public readonly metadata?: Record<string, any>;

  /**
   * Creates a new NFT domain entity
   *
   * @param params - NFT properties
   * @throws Error if validation fails
   */
  constructor(params: {
    contractAddress: string | Address;
    tokenId: string;
    name?: string;
    description?: string;
    image?: string;
    metadata?: Record<string, any>;
  }) {
    // Validate and set properties
    this.contractAddress =
      params.contractAddress instanceof Address
        ? params.contractAddress
        : new Address(params.contractAddress);
    this.tokenId = this.validateTokenId(params.tokenId);
    this.name = params.name ? this.validateName(params.name) : undefined;
    this.description = params.description
      ? this.validateDescription(params.description)
      : undefined;
    this.image = params.image ? this.validateImage(params.image) : undefined;
    this.metadata = params.metadata ? this.validateMetadata(params.metadata) : undefined;
  }

  /**
   * Validates token ID
   *
   * @param tokenId - Token ID to validate
   * @returns Validated token ID
   * @throws Error if token ID is invalid
   */
  private validateTokenId(tokenId: string): string {
    if (!tokenId || typeof tokenId !== "string") {
      throw new Error("Token ID is required and must be a string");
    }

    const trimmedTokenId = tokenId.trim();

    if (trimmedTokenId.length === 0) {
      throw new Error("Token ID cannot be empty");
    }

    // Validate token ID is a valid number (can be very large)
    try {
      const tokenIdBigInt = BigInt(trimmedTokenId);
      if (tokenIdBigInt < 0n) {
        throw new Error("Token ID cannot be negative");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("negative")) {
        throw error;
      }
      // If it's not a number, it might be a string identifier (some NFTs use strings)
      // Allow it but validate it's not empty
      if (trimmedTokenId.length === 0) {
        throw new Error("Token ID cannot be empty");
      }
    }

    return trimmedTokenId;
  }

  /**
   * Validates name
   *
   * @param name - Name to validate
   * @returns Validated name
   * @throws Error if name is invalid
   */
  private validateName(name: string): string {
    if (!name || typeof name !== "string") {
      throw new Error("Name must be a string");
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      throw new Error("Name cannot be empty");
    }

    return trimmedName;
  }

  /**
   * Validates description
   *
   * @param description - Description to validate
   * @returns Validated description
   * @throws Error if description is invalid
   */
  private validateDescription(description: string): string {
    if (!description || typeof description !== "string") {
      throw new Error("Description must be a string");
    }

    const trimmedDescription = description.trim();

    if (trimmedDescription.length === 0) {
      throw new Error("Description cannot be empty");
    }

    return trimmedDescription;
  }

  /**
   * Validates image URL
   *
   * @param image - Image URL to validate
   * @returns Validated image URL
   * @throws Error if image URL is invalid
   */
  private validateImage(image: string): string {
    if (!image || typeof image !== "string") {
      throw new Error("Image URL must be a string");
    }

    const trimmedImage = image.trim();

    if (trimmedImage.length === 0) {
      throw new Error("Image URL cannot be empty");
    }

    // Basic URL validation (can be http, https, ipfs, data URI, etc.)
    const urlPattern = /^(https?:\/\/|ipfs:\/\/|data:)/i;
    if (!urlPattern.test(trimmedImage)) {
      // Allow relative paths and other formats
      // Just ensure it's not empty
    }

    return trimmedImage;
  }

  /**
   * Validates metadata
   *
   * @param metadata - Metadata to validate
   * @returns Validated metadata
   * @throws Error if metadata is invalid
   */
  private validateMetadata(metadata: Record<string, any>): Record<string, any> {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      throw new Error("Metadata must be an object");
    }

    return metadata;
  }

  /**
   * Gets metadata URI if available
   *
   * @returns Metadata URI or null if not available
   */
  public getMetadataURI(): string | null {
    // Check if metadata contains a tokenURI or metadataURI field
    if (this.metadata) {
      if (typeof this.metadata.tokenURI === "string") {
        return this.metadata.tokenURI;
      }
      if (typeof this.metadata.metadataURI === "string") {
        return this.metadata.metadataURI;
      }
      if (typeof this.metadata.uri === "string") {
        return this.metadata.uri;
      }
    }

    // If no metadata URI is found, return null
    return null;
  }

  /**
   * Validates NFT entity
   *
   * @throws Error if validation fails
   */
  public validate(): void {
    // Contract address validation is done in Address value object constructor
    // Token ID validation is done in validateTokenId method
    // Additional NFT-level validations can be added here
  }

  /**
   * Converts NFT to plain object (JSON)
   *
   * @returns Plain object representation
   */
  public toJSON(): {
    contractAddress: string;
    tokenId: string;
    name?: string;
    description?: string;
    image?: string;
    metadata?: Record<string, any>;
  } {
    return {
      contractAddress: this.contractAddress.getValue(),
      tokenId: this.tokenId,
      name: this.name,
      description: this.description,
      image: this.image,
      metadata: this.metadata,
    };
  }

  /**
   * Checks if this NFT equals another NFT
   *
   * @param other - Other NFT to compare
   * @returns True if NFTs are equal
   */
  public equals(other: NFT): boolean {
    // Compare metadata: both undefined or both defined and equal
    const metadataEqual =
      this.metadata === undefined && other.metadata === undefined
        ? true
        : this.metadata !== undefined && other.metadata !== undefined
          ? JSON.stringify(this.metadata) === JSON.stringify(other.metadata)
          : false;

    return (
      this.contractAddress.equals(other.contractAddress) &&
      this.tokenId === other.tokenId &&
      this.name === other.name &&
      this.description === other.description &&
      this.image === other.image &&
      metadataEqual
    );
  }
}

