export type OutboxStatus = "pending" | "processing" | "completed" | "dead_letter";

export type OutboxEventRecord = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
  attemptCount: number;
  availableAt: Date;
};

export type EnqueueOutboxInput = {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  dedupeKey: string;
  payload?: Record<string, string | number | boolean | null>;
};

export interface OutboxTransaction {
  now(): Promise<Date>;
  /** Requeues abandoned claims and dead-letters ones that exhausted attempts. */
  recoverStaleClaims(input: {
    staleBefore: Date;
    maxAttempts: number;
    /** Released rows must wait this long before they can be claimed again. */
    retryDelaySeconds: number;
  }): Promise<{ released: number; deadLettered: number }>;
  claimEvents(input: {
    limit: number;
    eventTypes: readonly string[];
  }): Promise<OutboxEventRecord[]>;
  completeEvent(eventId: string): Promise<void>;
  retryEvent(input: { eventId: string; delaySeconds: number; errorCode: string }): Promise<void>;
  deadLetterEvent(input: { eventId: string; errorCode: string }): Promise<void>;
  /** Marks only holds whose database expiry has elapsed. */
  expireElapsedHolds(): Promise<number>;
  enqueue(input: EnqueueOutboxInput): Promise<boolean>;
}

export interface OutboxRepository {
  transaction<T>(operation: (tx: OutboxTransaction) => Promise<T>): Promise<T>;
}

export type OutboxHandler = (event: OutboxEventRecord) => Promise<void>;

export type OutboxHandlers = Record<string, OutboxHandler>;

export type OutboxRunOptions = {
  handlers: OutboxHandlers;
  limit?: number;
  maxAttempts?: number;
  backoffSeconds?: number;
  maxBackoffSeconds?: number;
  staleAfterSeconds?: number;
};

export type OutboxRunSummary = {
  expiredHolds: number;
  releasedClaims: number;
  deadLetteredClaims: number;
  claimed: number;
  completed: number;
  retried: number;
  deadLettered: number;
  failed: number;
};

const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_ATTEMPTS = 6;
const DEFAULT_BACKOFF_SECONDS = 30;
const DEFAULT_MAX_BACKOFF_SECONDS = 3_600;
const DEFAULT_STALE_AFTER_SECONDS = 300;

function safeErrorCode(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  return /^[A-Za-z0-9_.-]{1,80}$/.test(name) ? name : "handler_error";
}

function backoffSeconds(attempt: number, base: number, maximum: number): number {
  const exponent = Math.max(0, Math.min(attempt - 1, 20));
  return Math.min(base * 2 ** exponent, maximum);
}

/**
 * Processes one bounded outbox batch. Handlers run outside the claim
 * transaction and may run more than once if the worker is interrupted after a
 * side effect but before completion, so every handler must be idempotent.
 */
export async function runOutboxBatch(
  repository: OutboxRepository,
  options: OutboxRunOptions,
): Promise<OutboxRunSummary> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseBackoff = options.backoffSeconds ?? DEFAULT_BACKOFF_SECONDS;
  const maxBackoff = options.maxBackoffSeconds ?? DEFAULT_MAX_BACKOFF_SECONDS;
  const staleAfterSeconds = options.staleAfterSeconds ?? DEFAULT_STALE_AFTER_SECONDS;
  const eventTypes = Object.keys(options.handlers);

  const summary: OutboxRunSummary = {
    expiredHolds: 0,
    releasedClaims: 0,
    deadLetteredClaims: 0,
    claimed: 0,
    completed: 0,
    retried: 0,
    deadLettered: 0,
    failed: 0,
  };

  if (limit < 1 || maxAttempts < 1) {
    throw new RangeError("Outbox batch options are outside the supported range");
  }

  const claimed = await repository.transaction(async (tx) => {
    summary.expiredHolds = await tx.expireElapsedHolds();
    const now = await tx.now();
    const staleBefore = new Date(now.getTime() - staleAfterSeconds * 1_000);
    const recovered = await tx.recoverStaleClaims({
      staleBefore,
      maxAttempts,
      retryDelaySeconds: baseBackoff,
    });
    summary.releasedClaims = recovered.released;
    summary.deadLetteredClaims = recovered.deadLettered;

    if (eventTypes.length === 0) return [];
    return tx.claimEvents({ limit, eventTypes });
  });

  summary.claimed = claimed.length;

  for (const event of claimed) {
    const handler = options.handlers[event.eventType];
    if (!handler) {
      summary.releasedClaims += 1;
      await repository.transaction((tx) =>
        tx.retryEvent({ eventId: event.id, delaySeconds: 0, errorCode: "handler_missing" }),
      );
      continue;
    }

    try {
      await handler(event);
      await repository.transaction((tx) => tx.completeEvent(event.id));
      summary.completed += 1;
    } catch (error) {
      const errorCode = safeErrorCode(error);
      if (event.attemptCount >= maxAttempts) {
        await repository.transaction((tx) => tx.deadLetterEvent({ eventId: event.id, errorCode }));
        summary.deadLettered += 1;
      } else {
        const delay = backoffSeconds(event.attemptCount, baseBackoff, maxBackoff);
        await repository.transaction((tx) =>
          tx.retryEvent({ eventId: event.id, delaySeconds: delay, errorCode }),
        );
        summary.retried += 1;
      }
    }
  }

  summary.failed = summary.retried + summary.deadLettered;
  return summary;
}
