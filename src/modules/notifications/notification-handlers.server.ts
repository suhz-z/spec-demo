import "server-only";

import { createLogger } from "@/lib/logger";
import type { OutboxHandlers } from "@/modules/outbox/outbox-domain";

const logger = createLogger({ module: "notifications" });

export type NotificationProvider = "disabled" | "sandbox";

/**
 * Notification delivery stays disabled or sandboxed until recipients and a
 * provider are approved (DESIGN.md D-12/D-13). Returning an empty handler map
 * leaves queued notification events pending instead of discarding or sending
 * them. The sandbox handler records a safe log line and performs no delivery.
 */
export function createNotificationHandlers(provider: NotificationProvider): OutboxHandlers {
  if (provider === "disabled") return {};

  const handler = async (event: { id: string; eventType: string }) => {
    logger.info("Notification delivery suppressed by sandbox provider", {
      eventId: event.id,
      eventType: event.eventType,
    });
  };

  return {
    "booking.confirmed": handler,
    "refund.requested": handler,
  };
}
