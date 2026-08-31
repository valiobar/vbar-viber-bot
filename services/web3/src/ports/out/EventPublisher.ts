/**
 * Event Publisher Port
 *
 * Output port interface for publishing domain events.
 * This defines the contract for event publishing to message queues.
 */

/**
 * Wallet created event
 */
export interface WalletCreatedEvent {
  walletId: string;
  viberUserId: string;
  address: string;
  network: string;
  timestamp: string;
}

/**
 * Transaction sent event
 */
export interface TransactionSentEvent {
  transactionId: string;
  walletId: string;
  txHash: string;
  network: string;
  from: string;
  to: string;
  value: string;
  timestamp: string;
}

/**
 * Transaction confirmed event
 */
export interface TransactionConfirmedEvent {
  transactionId: string;
  walletId: string;
  txHash: string;
  network: string;
  blockNumber: number;
  confirmations: number;
  timestamp: string;
}

/**
 * Token transferred event
 */
export interface TokenTransferredEvent {
  transactionId: string;
  walletId: string;
  txHash: string;
  network: string;
  tokenAddress: string;
  from: string;
  to: string;
  amount: string;
  timestamp: string;
}

/**
 * Event publisher port interface
 *
 * Defines the contract for publishing domain events to message queues.
 * Implementations will be provided by output adapters (e.g., RabbitMQ).
 */
export interface EventPublisher {
  /**
   * Publish wallet created event
   *
   * @param event - Wallet created event data
   * @returns Promise that resolves when event is published
   */
  publishWalletCreated(event: WalletCreatedEvent): Promise<void>;

  /**
   * Publish transaction sent event
   *
   * @param event - Transaction sent event data
   * @returns Promise that resolves when event is published
   */
  publishTransactionSent(event: TransactionSentEvent): Promise<void>;

  /**
   * Publish transaction confirmed event
   *
   * @param event - Transaction confirmed event data
   * @returns Promise that resolves when event is published
   */
  publishTransactionConfirmed(
    event: TransactionConfirmedEvent
  ): Promise<void>;

  /**
   * Publish token transferred event
   *
   * @param event - Token transferred event data
   * @returns Promise that resolves when event is published
   */
  publishTokenTransferred(event: TokenTransferredEvent): Promise<void>;
}

