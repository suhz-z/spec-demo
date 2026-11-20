import "server-only";

import { getServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { createNotificationHandlers } from "@/modules/notifications/notification-handlers.server";

import { runOutboxBatch, type OutboxRunSummary } from "./outbox-domain";
import { outboxRepository } from "./outbox-repository.server";

const logger = createLogger({ module: "outbox-worker" });

export async function runOutboxWorker(): Promise<OutboxRunSummary> {
  const environment = getServerEnv();
  const handlers = createNotificationHandlers(environment.NOTIFICATION_PROVIDER);

  const summary = await runOutboxBatch(outboxRepository, {
    handlers,
    limit: 20,
    maxAttempts: 6,
    backoffSeconds: 30,
    maxBackoffSeconds: 3_600,
    staleAfterSeconds: 300,
  });

  logger.info("Outbox worker run completed", {
    notificationProvider: environment.NOTIFICATION_PROVIDER,
    ...summary,
  });

  return summary;
}
