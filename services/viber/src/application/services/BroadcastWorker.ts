/**
 * Broadcast Worker
 *
 * Polls admin for due broadcasts, claims one atomically, resolves recipients
 * (cursor pages for send-to-all, in-memory slice for test IDs), and sends via
 * BroadcastSender. Heartbeats through progress reports; lock loss aborts send.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import os from "node:os";
import { randomUUID } from "node:crypto";
import { Logger, ConsoleLogger } from "@vbar/shared";
import type { BroadcastDTO, BroadcastFailedEntry } from "@vbar/shared";
import { IAdminServiceClient } from "../../ports/out/IAdminServiceClient";
import { IUserRepository } from "../../ports/out/IUserRepository";
import { ViberBotService } from "./ViberBotService";
import { BroadcastSender } from "./BroadcastSender";
import { getBroadcastConfig } from "../../config/broadcast";

interface SendProgress {
  successCount: number;
  failedList: BroadcastFailedEntry[];
  lastProcessedId: string | null;
}

export class BroadcastWorker {
  private readonly instanceId = `${os.hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;
  private readonly sender: BroadcastSender;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly adminClient: IAdminServiceClient,
    private readonly userRepository: IUserRepository,
    private readonly viberBotService: ViberBotService,
    private readonly logger: Logger = new ConsoleLogger("BroadcastWorker")
  ) {
    this.sender = new BroadcastSender(this.logger);
  }

  start(): void {
    const { pollIntervalMs } = getBroadcastConfig();
    this.timer = setInterval(() => void this.poll(), pollIntervalMs);
    this.logger.info("Broadcast worker started", {
      instanceId: this.instanceId,
      pollIntervalMs,
    });
    void this.poll(); // pick up anything already due on boot
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Called by RefreshConsumer on dataType === "broadcasts" ("send now" nudge). */
  triggerPoll(): void {
    void this.poll();
  }

  private async poll(): Promise<void> {
    if (this.isRunning) return; // one broadcast at a time per instance
    this.isRunning = true;
    try {
      // Drain: keep claiming until nothing is due
      for (;;) {
        const broadcast = await this.adminClient.claimBroadcast(this.instanceId);
        if (!broadcast) break;
        this.logger.info("Claimed broadcast", {
          broadcastId: broadcast.id,
          name: broadcast.name,
        });
        await this.execute(broadcast);
      }
    } catch (error) {
      this.logger.error("Broadcast poll failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.isRunning = false;
    }
  }

  private async execute(broadcast: BroadcastDTO): Promise<void> {
    // Counts stay on this object so a mid-send failure still reports the latest heartbeat
    const progress: SendProgress = {
      successCount: broadcast.successCount, // non-zero when resuming a stale re-claim
      failedList: [...broadcast.failedList],
      lastProcessedId: broadcast.lastProcessedId,
    };
    const { usersPerBatch } = getBroadcastConfig();

    try {
      const botDataService = this.viberBotService.getBotDataService();
      // Same source MessageHandler uses: getSettings().buttonsPrefix (note the "s")
      const buttonPrefix = this.viberBotService.getSettings()?.buttonsPrefix ?? null;
      const rawMessages = this.sender.buildRawMessages(
        broadcast.stepId,
        botDataService,
        buttonPrefix
      );

      const totalCount = await this.resolveTotalCount(broadcast);

      // First report sets totalCount (and doubles as the initial heartbeat)
      await this.adminClient.reportBroadcastProgress(broadcast.id, {
        instanceId: this.instanceId,
        totalCount,
        successCount: progress.successCount,
        failedList: progress.failedList,
        lastProcessedId: progress.lastProcessedId,
      });

      if (broadcast.sendToAll) {
        await this.sendToAllSubscribers(
          broadcast.id,
          rawMessages,
          progress,
          usersPerBatch
        );
      } else {
        await this.sendToTestIds(broadcast, rawMessages, progress);
      }

      await this.adminClient.reportBroadcastProgress(broadcast.id, {
        instanceId: this.instanceId,
        successCount: progress.successCount,
        failedList: progress.failedList,
        lastProcessedId: progress.lastProcessedId,
        status: "finished",
      });
      this.logger.info("Broadcast finished", {
        broadcastId: broadcast.id,
        successCount: progress.successCount,
        failed: progress.failedList.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error("Broadcast execution failed", {
        broadcastId: broadcast.id,
        error: errorMessage,
      });
      try {
        await this.adminClient.reportBroadcastProgress(broadcast.id, {
          instanceId: this.instanceId,
          successCount: progress.successCount,
          failedList: progress.failedList,
          lastProcessedId: progress.lastProcessedId,
          status: "failed",
          errorMessage,
        });
      } catch {
        // Lock lost or admin unreachable — the stale-heartbeat re-claim will recover this broadcast
      }
    }
  }

  private async resolveTotalCount(broadcast: BroadcastDTO): Promise<number> {
    if (!broadcast.sendToAll) {
      return broadcast.testViberIds.length;
    }
    if (broadcast.totalCount > 0) {
      return broadcast.totalCount;
    }
    return this.userRepository.countSubscribedUsers();
  }

  private async sendToAllSubscribers(
    broadcastId: string,
    rawMessages: object[],
    progress: SendProgress,
    usersPerBatch: number
  ): Promise<void> {
    for (;;) {
      const page = await this.userRepository.findSubscribedViberIdsAfter(
        progress.lastProcessedId,
        usersPerBatch
      );
      if (page.viberIds.length === 0) break;

      await this.sender.sendToRecipients(rawMessages, page.viberIds, async (batch) => {
        progress.successCount += batch.sentCount;
        progress.failedList = progress.failedList.concat(batch.failed);
        progress.lastProcessedId = page.lastId;
        // Heartbeat + cursor; throws if this instance lost the lock — aborts the send
        await this.adminClient.reportBroadcastProgress(broadcastId, {
          instanceId: this.instanceId,
          successCount: progress.successCount,
          failedList: progress.failedList,
          lastProcessedId: progress.lastProcessedId,
        });
      });
    }
  }

  private async sendToTestIds(
    broadcast: BroadcastDTO,
    rawMessages: object[],
    progress: SendProgress
  ): Promise<void> {
    const idx = progress.lastProcessedId
      ? broadcast.testViberIds.indexOf(progress.lastProcessedId)
      : -1;
    const remaining = broadcast.testViberIds.slice(idx + 1);
    if (remaining.length === 0) {
      return;
    }

    await this.sender.sendToRecipients(rawMessages, remaining, async (batch) => {
      progress.successCount += batch.sentCount;
      progress.failedList = progress.failedList.concat(batch.failed);
      const handled = progress.successCount + progress.failedList.length;
      progress.lastProcessedId =
        broadcast.testViberIds[handled - 1] ?? progress.lastProcessedId;
      await this.adminClient.reportBroadcastProgress(broadcast.id, {
        instanceId: this.instanceId,
        successCount: progress.successCount,
        failedList: progress.failedList,
        lastProcessedId: progress.lastProcessedId,
      });
    });
  }
}
