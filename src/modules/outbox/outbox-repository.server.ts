import "server-only";

import { and, asc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { holds, outboxEvents } from "@/db/schema";

import type {
  EnqueueOutboxInput,
  OutboxEventRecord,
  OutboxRepository,
  OutboxTransaction,
} from "./outbox-domain";

function makeEventRecord(row: {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
  attemptCount: number;
  availableAt: Date;
}): OutboxEventRecord {
  return {
    id: row.id,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    eventType: row.eventType,
    dedupeKey: row.dedupeKey,
    payload: row.payload,
    attemptCount: row.attemptCount,
    availableAt: row.availableAt,
  };
}

export const outboxRepository: OutboxRepository = {
  async transaction<T>(operation: (tx: OutboxTransaction) => Promise<T>): Promise<T> {
    return getDb().transaction(async (databaseTx) => {
      const tx: OutboxTransaction = {
        async now() {
          const result = await databaseTx.execute<{ value: Date }>(sql`select now() as value`);
          const value = result[0]?.value;
          if (!value) throw new Error("Database time could not be read");
          return value instanceof Date ? value : new Date(value);
        },

        async recoverStaleClaims(input) {
          const dead = await databaseTx
            .update(outboxEvents)
            .set({ status: "dead_letter", lockedAt: null, lastErrorCode: "worker_timeout" })
            .where(
              and(
                eq(outboxEvents.status, "processing"),
                lt(outboxEvents.lockedAt, input.staleBefore),
                gte(outboxEvents.attemptCount, input.maxAttempts),
              ),
            )
            .returning({ id: outboxEvents.id });

          const released = await databaseTx
            .update(outboxEvents)
            .set({
              status: "pending",
              lockedAt: null,
              lastErrorCode: "worker_timeout",
              availableAt: sql`now() + (${input.retryDelaySeconds} * interval '1 second')`,
            })
            .where(
              and(
                eq(outboxEvents.status, "processing"),
                lt(outboxEvents.lockedAt, input.staleBefore),
                lt(outboxEvents.attemptCount, input.maxAttempts),
              ),
            )
            .returning({ id: outboxEvents.id });

          return { released: released.length, deadLettered: dead.length };
        },

        async claimEvents(input) {
          if (input.eventTypes.length === 0) return [];

          const candidates = await databaseTx
            .select({ id: outboxEvents.id })
            .from(outboxEvents)
            .where(
              and(
                eq(outboxEvents.status, "pending"),
                lte(outboxEvents.availableAt, sql`now()`),
                inArray(outboxEvents.eventType, [...input.eventTypes]),
              ),
            )
            .orderBy(asc(outboxEvents.availableAt), asc(outboxEvents.createdAt))
            .limit(input.limit)
            .for("update", { skipLocked: true });

          if (candidates.length === 0) return [];
          const ids = candidates.map((candidate) => candidate.id);

          const rows = await databaseTx
            .update(outboxEvents)
            .set({
              status: "processing",
              lockedAt: sql`now()`,
              attemptCount: sql`${outboxEvents.attemptCount} + 1`,
            })
            .where(inArray(outboxEvents.id, ids))
            .returning({
              id: outboxEvents.id,
              aggregateType: outboxEvents.aggregateType,
              aggregateId: outboxEvents.aggregateId,
              eventType: outboxEvents.eventType,
              dedupeKey: outboxEvents.dedupeKey,
              payload: outboxEvents.payload,
              attemptCount: outboxEvents.attemptCount,
              availableAt: outboxEvents.availableAt,
            });

          return rows.map(makeEventRecord);
        },

        async completeEvent(eventId) {
          await databaseTx
            .update(outboxEvents)
            .set({
              status: "completed",
              completedAt: sql`now()`,
              lockedAt: null,
              lastErrorCode: null,
            })
            .where(eq(outboxEvents.id, eventId));
        },

        async retryEvent(input) {
          await databaseTx
            .update(outboxEvents)
            .set({
              status: "pending",
              lockedAt: null,
              lastErrorCode: input.errorCode,
              availableAt: sql`now() + (${input.delaySeconds} * interval '1 second')`,
            })
            .where(eq(outboxEvents.id, input.eventId));
        },

        async deadLetterEvent(input) {
          await databaseTx
            .update(outboxEvents)
            .set({
              status: "dead_letter",
              lockedAt: null,
              lastErrorCode: input.errorCode,
            })
            .where(eq(outboxEvents.id, input.eventId));
        },

        async expireElapsedHolds() {
          const expired = await databaseTx
            .update(holds)
            .set({ status: "expired" })
            .where(and(eq(holds.status, "active"), lte(holds.expiresAt, sql`now()`)))
            .returning({ id: holds.id });
          return expired.length;
        },

        async enqueue(input: EnqueueOutboxInput) {
          const [row] = await databaseTx
            .insert(outboxEvents)
            .values({
              aggregateType: input.aggregateType,
              aggregateId: input.aggregateId,
              eventType: input.eventType,
              dedupeKey: input.dedupeKey,
              payload: input.payload ?? {},
            })
            .onConflictDoNothing({ target: outboxEvents.dedupeKey })
            .returning({ id: outboxEvents.id });
          return Boolean(row);
        },
      };

      return operation(tx);
    });
  },
};
