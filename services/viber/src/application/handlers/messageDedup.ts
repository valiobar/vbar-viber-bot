/**
 * In-memory TTL set of recently seen Viber message tokens.
 * Used to drop at-least-once webhook re-deliveries of the same message.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

export class MessageDedup {
  private seenAt = new Map<string, number>();

  constructor(
    private ttlMs = 5 * 60_000,
    private maxEntries = 5000
  ) {}

  /**
   * @returns true if the token was already recorded within the TTL
   */
  seen(token: string): boolean {
    const now = Date.now();
    this.prune(now);
    if (this.seenAt.has(token)) {
      return true;
    }
    this.seenAt.set(token, now + this.ttlMs);
    return false;
  }

  private prune(now: number): void {
    for (const [token, expiry] of this.seenAt) {
      if (expiry <= now) {
        this.seenAt.delete(token);
      }
    }
    if (this.seenAt.size <= this.maxEntries) {
      return;
    }
    const overflow = this.seenAt.size - this.maxEntries;
    let dropped = 0;
    for (const token of this.seenAt.keys()) {
      this.seenAt.delete(token);
      dropped += 1;
      if (dropped >= overflow) {
        break;
      }
    }
  }
}
