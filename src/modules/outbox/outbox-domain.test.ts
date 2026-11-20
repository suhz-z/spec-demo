import { describe, expect, it } from "vitest";

import {
  runOutboxBatch,
  type EnqueueOutboxInput,
  type OutboxEventRecord,
  type OutboxHandler,
  type OutboxRepository,
  type OutboxTransaction,
} from "./outbox-domain";

type StoredEvent = OutboxEventRecord & {
  status: "pending" | "processing" | "completed" | "dead_letter";
  lockedAt: Date | null;
  lastErrorCode: string | null;
  completedAt: Date | null;
};

class MemoryOutbox implements OutboxRepository {
  now = new Date("2026-01-01T00:00:00.000Z");
  events: StoredEvent[] = [];
  holds = [
    { id: "hold-expired", status: "active" as string, expiresAt: new Date("2025-12-31T23:59:00Z") },
    { id: "hold-valid", status: "active" as string, expiresAt: new Date("2026-01-01T00:10:00Z") },
    {
      id: "hold-released",
      status: "released" as string,
      expiresAt: new Date("2025-12-31T23:00:00Z"),
    },
  ];
  private lock = Promise.resolve();

  async transaction<T>(operation: (tx: OutboxTransaction) => Promise<T>): Promise<T> {
    const previous = this.lock;
    let unlock!: () => void;
    this.lock = new Promise<void>((resolve) => (unlock = resolve));
    await previous;
    try {
      return await operation({
        now: async () => this.now,
        recoverStaleClaims: async ({ staleBefore, maxAttempts, retryDelaySeconds }) => {
          let released = 0;
          let deadLettered = 0;
          for (const event of this.events) {
            if (
              event.status === "processing" &&
              event.lockedAt !== null &&
              event.lockedAt < staleBefore
            ) {
              if (event.attemptCount >= maxAttempts) {
                event.status = "dead_letter";
                deadLettered += 1;
              } else {
                event.status = "pending";
                event.availableAt = new Date(this.now.getTime() + retryDelaySeconds * 1_000);
                released += 1;
              }
              event.lockedAt = null;
              event.lastErrorCode = "worker_timeout";
            }
          }
          return { released, deadLettered };
        },
        claimEvents: async ({ limit, eventTypes }) => {
          const claimable = this.events
            .filter(
              (event) =>
                event.status === "pending" &&
                event.availableAt <= this.now &&
                eventTypes.includes(event.eventType),
            )
            .sort((left, right) => left.availableAt.getTime() - right.availableAt.getTime())
            .slice(0, limit);
          for (const event of claimable) {
            event.status = "processing";
            event.lockedAt = this.now;
            event.attemptCount += 1;
          }
          return claimable.map((event) => ({ ...event }));
        },
        completeEvent: async (eventId) => {
          const event = this.events.find((item) => item.id === eventId);
          if (event) {
            event.status = "completed";
            event.completedAt = this.now;
            event.lockedAt = null;
            event.lastErrorCode = null;
          }
        },
        retryEvent: async ({ eventId, delaySeconds, errorCode }) => {
          const event = this.events.find((item) => item.id === eventId);
          if (event) {
            event.status = "pending";
            event.availableAt = new Date(this.now.getTime() + delaySeconds * 1_000);
            event.lockedAt = null;
            event.lastErrorCode = errorCode;
          }
        },
        deadLetterEvent: async ({ eventId, errorCode }) => {
          const event = this.events.find((item) => item.id === eventId);
          if (event) {
            event.status = "dead_letter";
            event.lockedAt = null;
            event.lastErrorCode = errorCode;
          }
        },
        expireElapsedHolds: async () => {
          let count = 0;
          for (const hold of this.holds) {
            if (hold.status === "active" && hold.expiresAt <= this.now) {
              hold.status = "expired";
              count += 1;
            }
          }
          return count;
        },
        enqueue: async (input: EnqueueOutboxInput) => {
          if (this.events.some((event) => event.dedupeKey === input.dedupeKey)) return false;
          this.events.push({
            id: `event-${this.events.length + 1}`,
            aggregateType: input.aggregateType,
            aggregateId: input.aggregateId,
            eventType: input.eventType,
            dedupeKey: input.dedupeKey,
            payload: input.payload ?? {},
            attemptCount: 0,
            availableAt: this.now,
            status: "pending",
            lockedAt: null,
            lastErrorCode: null,
            completedAt: null,
          });
          return true;
        },
      });
    } finally {
      unlock();
    }
  }
}

async function enqueue(repository: MemoryOutbox, dedupeKey = "booking.confirmed:1") {
  return repository.transaction((tx) =>
    tx.enqueue({
      aggregateType: "booking",
      aggregateId: "booking-1",
      eventType: "booking.confirmed",
      dedupeKey,
      payload: { bookingReference: "SG-ABCDEF123456" },
    }),
  );
}

const successHandler: OutboxHandler = async () => {};

describe("outbox worker", () => {
  it("completes a claimed event and does not claim it again", async () => {
    const repository = new MemoryOutbox();
    await enqueue(repository);

    const first = await runOutboxBatch(repository, {
      handlers: { "booking.confirmed": successHandler },
    });
    expect(first).toMatchObject({ claimed: 1, completed: 1, retried: 0, deadLettered: 0 });
    expect(repository.events[0]?.status).toBe("completed");
    expect(repository.events[0]?.attemptCount).toBe(1);

    const second = await runOutboxBatch(repository, {
      handlers: { "booking.confirmed": successHandler },
    });
    expect(second.claimed).toBe(0);
  });

  it("retries with backoff and dead-letters after the attempt limit", async () => {
    const repository = new MemoryOutbox();
    await enqueue(repository);
    const handler: OutboxHandler = async () => {
      throw new RangeError("do not log this message");
    };

    const first = await runOutboxBatch(repository, {
      handlers: { "booking.confirmed": handler },
      maxAttempts: 2,
      backoffSeconds: 10,
    });
    expect(first).toMatchObject({ claimed: 1, retried: 1, deadLettered: 0 });
    expect(repository.events[0]).toMatchObject({
      status: "pending",
      attemptCount: 1,
      lastErrorCode: "RangeError",
    });
    expect(repository.events[0]?.availableAt).toEqual(new Date("2026-01-01T00:00:10Z"));

    repository.now = repository.events[0]!.availableAt;
    const second = await runOutboxBatch(repository, {
      handlers: { "booking.confirmed": handler },
      maxAttempts: 2,
      backoffSeconds: 10,
    });
    expect(second).toMatchObject({ claimed: 1, retried: 0, deadLettered: 1 });
    expect(repository.events[0]?.status).toBe("dead_letter");
    expect(repository.events[0]?.attemptCount).toBe(2);
  });

  it("recovers abandoned claims with backoff and dead-letters exhausted ones", async () => {
    const repository = new MemoryOutbox();
    await enqueue(repository, "event-a");
    await enqueue(repository, "event-b");
    repository.events[0]!.status = "processing";
    repository.events[0]!.attemptCount = 1;
    repository.events[0]!.lockedAt = new Date("2025-12-31T23:50:00Z");
    repository.events[1]!.status = "processing";
    repository.events[1]!.attemptCount = 3;
    repository.events[1]!.lockedAt = new Date("2025-12-31T23:50:00Z");

    const options = {
      handlers: { "booking.confirmed": successHandler },
      maxAttempts: 3,
      staleAfterSeconds: 300,
    };
    const summary = await runOutboxBatch(repository, options);

    expect(summary).toMatchObject({
      claimed: 0,
      completed: 0,
      releasedClaims: 1,
      deadLetteredClaims: 1,
    });
    expect(repository.events[0]?.status).toBe("pending");
    expect(repository.events[0]!.availableAt.getTime()).toBeGreaterThan(repository.now.getTime());
    expect(repository.events[1]?.status).toBe("dead_letter");
    expect(repository.events[1]?.lastErrorCode).toBe("worker_timeout");

    repository.now = new Date(repository.events[0]!.availableAt.getTime());
    const retry = await runOutboxBatch(repository, options);
    expect(retry).toMatchObject({ claimed: 1, completed: 1 });
  });

  it("expires only holds whose database expiry elapsed", async () => {
    const repository = new MemoryOutbox();
    const summary = await runOutboxBatch(repository, {
      handlers: { "booking.confirmed": successHandler },
    });

    expect(summary.expiredHolds).toBe(1);
    expect(repository.holds.map((hold) => hold.status)).toEqual(["expired", "active", "released"]);
  });

  it("leaves notification events pending while handlers are disabled", async () => {
    const repository = new MemoryOutbox();
    await enqueue(repository);

    const summary = await runOutboxBatch(repository, { handlers: {} });
    expect(summary.claimed).toBe(0);
    expect(repository.events[0]?.status).toBe("pending");
  });

  it("deduplicates enqueued business events by dedupe key", async () => {
    const repository = new MemoryOutbox();
    expect(await enqueue(repository)).toBe(true);
    expect(await enqueue(repository)).toBe(false);
    expect(repository.events).toHaveLength(1);
  });

  it("does not claim an event before its retry time", async () => {
    const repository = new MemoryOutbox();
    await enqueue(repository);
    const handler: OutboxHandler = async () => {
      throw new Error("temporary");
    };

    await runOutboxBatch(repository, {
      handlers: { "booking.confirmed": handler },
      maxAttempts: 5,
      backoffSeconds: 60,
    });

    const early = await runOutboxBatch(repository, {
      handlers: { "booking.confirmed": successHandler },
    });
    expect(early.claimed).toBe(0);

    repository.now = repository.events[0]!.availableAt;
    const ready = await runOutboxBatch(repository, {
      handlers: { "booking.confirmed": successHandler },
    });
    expect(ready.claimed).toBe(1);
    expect(repository.events[0]?.status).toBe("completed");
  });
});
