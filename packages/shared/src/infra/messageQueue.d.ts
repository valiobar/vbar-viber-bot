/**
 * Shared RabbitMQ connection/channel helper.
 *
 * Callers pass { uri } — this module does not read process.env.
 * Asserts the default topic exchange; queue assert/bind stays with
 * publishers and consumers.
 */
import type { Channel } from "amqplib";
export interface QueueChannelOptions {
    uri: string;
}
/**
 * Connect (cached) and return a channel with the default exchange asserted.
 */
export declare const createQueueChannel: (options: QueueChannelOptions) => Promise<Channel>;
export declare const closeQueue: () => Promise<void>;
//# sourceMappingURL=messageQueue.d.ts.map