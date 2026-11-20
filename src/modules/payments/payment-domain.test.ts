import { describe, expect, it } from "vitest";

import {
  applyPaymentEvent,
  createPaymentOrder,
  getPaymentStatus,
  sandboxSimulationInputSchema,
  verifiedPaymentEventSchema,
  type BookingStatus,
  type LockedPayment,
  type PaymentBooking,
  type PaymentProvider,
  type PaymentRecord,
  type PaymentRepository,
  type PaymentStatus,
  type PaymentTransaction,
  type PriceRecord,
} from "./payment-domain";

const REFERENCE = "SG-ABCDEF123456";
const SESSION_HASH = "a".repeat(64);
const TOTAL = 10_500_000n;

class FakeProvider implements PaymentProvider {
  readonly name = "sandbox";
  calls = 0;
  fail = false;
  orderId = "sbx_deterministic_order";

  async createOrder(request: { merchantReference: string }) {
    this.calls += 1;
    if (this.fail) throw new Error("provider unavailable");
    return { providerOrderId: `${this.orderId}-${request.merchantReference}` };
  }

  verifyWebhook(): never {
    throw new Error("Not used in domain tests");
  }
}

class MemoryPayments implements PaymentRepository {
  now = new Date("2026-01-01T00:00:00.000Z");
  booking: PaymentBooking = {
    id: "booking-1",
    reference: REFERENCE,
    villaId: "villa-1",
    villaCode: "V01",
    villaStatus: "available",
    status: "pending_payment",
    holdId: "hold-1",
    holdStatus: "converted",
    holdExpiresAt: new Date("2026-01-01T00:10:00.000Z"),
    sessionIdHash: SESSION_HASH,
    quote: {
      priceSnapshotId: "snapshot-1",
      currency: "INR",
      baseAmountMinor: 10_000_000n,
      taxAmountMinor: 500_000n,
      totalAmountMinor: TOTAL,
      taxRateBps: 500,
      taxPolicy: "exclusive",
    },
  };
  currentPrice: PriceRecord | null = {
    priceSettingId: "price-1",
    currency: "INR",
    baseAmountMinor: 10_000_000n,
    taxRateBps: 500,
    taxPolicy: "exclusive",
  };
  otherLiveBooking = false;
  payments: PaymentRecord[] = [];
  events: { provider: string; providerEventId: string; outcome: PaymentStatus }[] = [];
  refunds: { paymentId: string; idempotencyKey: string; amountMinor: bigint }[] = [];
  outbox: { eventType: string; dedupeKey: string }[] = [];
  private lock = Promise.resolve();

  async transaction<T>(operation: (tx: PaymentTransaction) => Promise<T>): Promise<T> {
    const previous = this.lock;
    let unlock!: () => void;
    this.lock = new Promise<void>((resolve) => (unlock = resolve));
    await previous;
    try {
      return await operation({
        now: async () => this.now,
        lockBookingByReference: async (reference) =>
          reference === this.booking.reference ? this.booking : null,
        getBookingByReference: async (reference) =>
          reference === this.booking.reference ? this.booking : null,
        findPaymentByIdempotencyKey: async (bookingId, key) =>
          this.payments.find(
            (payment) => payment.bookingId === bookingId && payment.idempotencyKey === key,
          ) ?? null,
        findLatestPayment: async (bookingId) =>
          [...this.payments].reverse().find((payment) => payment.bookingId === bookingId) ?? null,
        hasUnsettledPayment: async (bookingId) =>
          this.payments.some(
            (payment) =>
              payment.bookingId === bookingId &&
              (payment.status === "created" ||
                payment.status === "pending" ||
                payment.status === "unknown" ||
                payment.status === "succeeded"),
          ),
        getCurrentPrice: async () => this.currentPrice,
        hasOtherLiveBooking: async () => this.otherLiveBooking,
        createPendingPayment: async (input) => {
          const existing = this.payments.find(
            (payment) =>
              payment.bookingId === input.bookingId &&
              payment.idempotencyKey === input.idempotencyKey,
          );
          if (existing) return existing;
          const payment: PaymentRecord = {
            id: `payment-${this.payments.length + 1}`,
            bookingId: input.bookingId,
            provider: input.provider,
            idempotencyKey: input.idempotencyKey,
            providerOrderId: null,
            amountMinor: input.amountMinor,
            currency: input.currency,
            status: "pending",
          };
          this.payments.push(payment);
          return payment;
        },
        attachProviderOrder: async (paymentId, providerOrderId) => {
          const payment = this.payments.find((item) => item.id === paymentId);
          if (!payment) throw new Error("missing payment");
          payment.providerOrderId = providerOrderId;
          return payment;
        },
        setBookingStatus: async (_bookingId, status: BookingStatus) => {
          this.booking.status = status;
        },
        lockPaymentByProviderOrder: async (provider, providerOrderId) => {
          const payment = this.payments.find(
            (item) => item.provider === provider && item.providerOrderId === providerOrderId,
          );
          if (!payment) return null;
          return { payment, booking: this.booking } satisfies LockedPayment;
        },
        findPaymentEvent: async (provider, providerEventId) =>
          this.events.find(
            (event) => event.provider === provider && event.providerEventId === providerEventId,
          ) ?? null,
        recordPaymentEvent: async (input) => {
          this.events.push({
            provider: input.provider,
            providerEventId: input.providerEventId,
            outcome: input.outcome,
          });
        },
        setPaymentStatus: async (paymentId, status) => {
          const payment = this.payments.find((item) => item.id === paymentId);
          if (payment) payment.status = status;
        },
        confirmBookingIfPending: async () => {
          if (this.booking.status === "payment_failed") {
            this.booking.status = "pending_payment";
          }
          if (this.booking.status !== "pending_payment") return false;
          this.booking.status = "confirmed";
          this.booking.villaStatus = "booked";
          return true;
        },
        hasSucceededPayment: async (bookingId, exceptPaymentId) =>
          this.payments.some(
            (payment) =>
              payment.bookingId === bookingId &&
              payment.id !== exceptPaymentId &&
              payment.status === "succeeded",
          ),
        createRefundRequest: async (input) => {
          const exists = this.refunds.some(
            (refund) =>
              refund.paymentId === input.paymentId &&
              refund.idempotencyKey === input.idempotencyKey,
          );
          if (exists) return false;
          this.refunds.push({
            paymentId: input.paymentId,
            idempotencyKey: input.idempotencyKey,
            amountMinor: input.amountMinor,
          });
          return true;
        },
        enqueueOutbox: async (input) => {
          if (this.outbox.some((event) => event.dedupeKey === input.dedupeKey)) return false;
          this.outbox.push({ eventType: input.eventType, dedupeKey: input.dedupeKey });
          return true;
        },
      });
    } finally {
      unlock();
    }
  }
}

function key(n: number): string {
  return `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function event(providerOrderId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return verifiedPaymentEventSchema.parse({
    provider: "sandbox",
    eventId: "event-1",
    eventType: "payment.succeeded",
    providerOrderId,
    amountMinor: TOTAL.toString(),
    currency: "INR",
    occurredAt: "2026-01-01T00:01:00.000Z",
    ...overrides,
  });
}

async function orderedPayment(repository: MemoryPayments, provider: FakeProvider) {
  const result = await createPaymentOrder(
    { bookingReference: REFERENCE, idempotencyKey: key(1) },
    SESSION_HASH,
    repository,
    provider,
  );
  if (!result.ok) throw new Error(`expected order, received ${result.code}`);
  return result.payment;
}

describe("payment order creation", () => {
  it("validates the request shape and sandbox preview input", () => {
    expect(
      sandboxSimulationInputSchema.safeParse({
        bookingReference: "SG-ABCDEF123456",
        outcome: "succeeded",
      }).success,
    ).toBe(true);
    expect(
      sandboxSimulationInputSchema.safeParse({
        bookingReference: "SG-ABCDEF123456",
        outcome: "charged_twice",
      }).success,
    ).toBe(false);
  });

  it("uses the immutable quote total and reuses a completed idempotency key", async () => {
    const repository = new MemoryPayments();
    const provider = new FakeProvider();

    const first = await orderedPayment(repository, provider);
    const retry = await createPaymentOrder(
      { bookingReference: REFERENCE, idempotencyKey: key(1) },
      SESSION_HASH,
      repository,
      provider,
    );

    expect(first.amountMinor).toBe(TOTAL);
    expect(first.currency).toBe("INR");
    expect(first.status).toBe("pending");
    expect(retry).toMatchObject({ ok: true, reused: true });
    expect(repository.payments).toHaveLength(1);
    expect(provider.calls).toBe(1);
  });

  it("rejects foreign sessions, expired holds, unavailable villas, and current-state changes", async () => {
    const provider = new FakeProvider();

    const foreign = new MemoryPayments();
    expect(
      await createPaymentOrder(
        { bookingReference: REFERENCE, idempotencyKey: key(1) },
        "b".repeat(64),
        foreign,
        provider,
      ),
    ).toMatchObject({ ok: false, code: "unavailable" });

    const expired = new MemoryPayments();
    expired.now = new Date("2026-01-01T00:10:00.000Z");
    expect(
      await createPaymentOrder(
        { bookingReference: REFERENCE, idempotencyKey: key(1) },
        SESSION_HASH,
        expired,
        provider,
      ),
    ).toMatchObject({ ok: false, code: "hold_expired" });

    const booked = new MemoryPayments();
    booked.booking.status = "confirmed";
    expect(
      await createPaymentOrder(
        { bookingReference: REFERENCE, idempotencyKey: key(1) },
        SESSION_HASH,
        booked,
        provider,
      ),
    ).toMatchObject({ ok: false, code: "invalid_state" });

    const competing = new MemoryPayments();
    competing.otherLiveBooking = true;
    expect(
      await createPaymentOrder(
        { bookingReference: REFERENCE, idempotencyKey: key(1) },
        SESSION_HASH,
        competing,
        provider,
      ),
    ).toMatchObject({ ok: false, code: "unavailable" });
  });

  it("requires review when the current server price differs from the hold snapshot", async () => {
    const repository = new MemoryPayments();
    repository.currentPrice = {
      priceSettingId: "price-2",
      currency: "INR",
      baseAmountMinor: 11_000_000n,
      taxRateBps: 500,
      taxPolicy: "exclusive",
    };
    const provider = new FakeProvider();

    const result = await createPaymentOrder(
      { bookingReference: REFERENCE, idempotencyKey: key(1) },
      SESSION_HASH,
      repository,
      provider,
    );

    expect(result).toMatchObject({ ok: false, code: "quote_changed" });
    expect(repository.payments).toHaveLength(0);
    expect(provider.calls).toBe(0);
  });

  it("retains a pending attempt after a provider failure so a retry cannot charge twice", async () => {
    const repository = new MemoryPayments();
    const provider = new FakeProvider();
    provider.fail = true;

    const failed = await createPaymentOrder(
      { bookingReference: REFERENCE, idempotencyKey: key(1) },
      SESSION_HASH,
      repository,
      provider,
    );
    expect(failed).toMatchObject({ ok: false, code: "provider_error" });
    expect(repository.payments).toHaveLength(1);
    expect(repository.payments[0]?.providerOrderId).toBeNull();

    provider.fail = false;
    const retried = await createPaymentOrder(
      { bookingReference: REFERENCE, idempotencyKey: key(1) },
      SESSION_HASH,
      repository,
      provider,
    );
    expect(retried).toMatchObject({ ok: true, reused: false });
    expect(repository.payments).toHaveLength(1);
    expect(repository.payments[0]?.providerOrderId).toContain(provider.orderId);
    expect(provider.calls).toBe(2);
  });
});

describe("verified payment events", () => {
  it("confirms a booking only through the server-side success transition", async () => {
    const repository = new MemoryPayments();
    const provider = new FakeProvider();
    const payment = await orderedPayment(repository, provider);

    const result = await applyPaymentEvent(event(payment.providerOrderId!), repository);

    expect(result).toMatchObject({
      ok: true,
      outcome: "succeeded",
      bookingConfirmed: true,
      duplicate: false,
    });
    expect(repository.booking.status).toBe("confirmed");
    expect(repository.booking.villaStatus).toBe("booked");
    expect(repository.payments[0]?.status).toBe("succeeded");
    expect(repository.outbox).toContainEqual({
      eventType: "booking.confirmed",
      dedupeKey: "booking.confirmed:booking-1",
    });
  });

  it("deduplicates repeated deliveries and keeps a delayed success working after a failure", async () => {
    const repository = new MemoryPayments();
    const provider = new FakeProvider();
    const payment = await orderedPayment(repository, provider);

    await applyPaymentEvent(
      event(payment.providerOrderId!, { eventId: "event-failed", eventType: "payment.failed" }),
      repository,
    );
    expect(repository.booking.status).toBe("payment_failed");

    const delayed = await applyPaymentEvent(
      event(payment.providerOrderId!, { eventId: "event-delayed-success" }),
      repository,
    );
    expect(delayed).toMatchObject({ ok: true, bookingConfirmed: true });
    expect(repository.booking.status).toBe("confirmed");

    const duplicate = await applyPaymentEvent(
      event(payment.providerOrderId!, { eventId: "event-delayed-success" }),
      repository,
    );
    expect(duplicate).toMatchObject({ ok: true, duplicate: true });
    expect(repository.payments[0]?.status).toBe("succeeded");
    expect(repository.events).toHaveLength(2);
  });

  it("does not downgrade a successful payment on a late failure event", async () => {
    const repository = new MemoryPayments();
    const provider = new FakeProvider();
    const payment = await orderedPayment(repository, provider);
    await applyPaymentEvent(event(payment.providerOrderId!), repository);

    const lateFailure = await applyPaymentEvent(
      event(payment.providerOrderId!, { eventId: "event-late", eventType: "payment.failed" }),
      repository,
    );

    expect(lateFailure).toMatchObject({ ok: true, outcome: "succeeded", ignored: true });
    expect(repository.payments[0]?.status).toBe("succeeded");
    expect(repository.booking.status).toBe("confirmed");
    expect(repository.events).toHaveLength(2);
  });

  it("rejects unknown orders and mismatched amounts without changing state", async () => {
    const repository = new MemoryPayments();
    const provider = new FakeProvider();
    const payment = await orderedPayment(repository, provider);

    const unknown = await applyPaymentEvent(event("sbx_unknown"), repository);
    expect(unknown).toMatchObject({ ok: false, code: "unknown_payment" });

    const mismatch = await applyPaymentEvent(
      event(payment.providerOrderId!, { amountMinor: "1" }),
      repository,
    );
    expect(mismatch).toMatchObject({ ok: false, code: "amount_mismatch" });
    expect(repository.booking.status).toBe("pending_payment");
    expect(repository.events).toHaveLength(0);
  });

  it("records a refund request for a duplicate successful payment", async () => {
    const repository = new MemoryPayments();
    const provider = new FakeProvider();

    const first = await orderedPayment(repository, provider);
    // A second chargeable order is now blocked. Model a provider-side
    // duplicate instead to verify that the refund-request path still works.
    const blocked = await createPaymentOrder(
      { bookingReference: REFERENCE, idempotencyKey: key(2) },
      SESSION_HASH,
      repository,
      provider,
    );
    expect(blocked).toMatchObject({ ok: false, code: "invalid_state" });

    const second: PaymentRecord = {
      ...first,
      id: "payment-2",
      idempotencyKey: key(2),
      providerOrderId: "sbx_duplicate_order",
    };
    repository.payments.push(second);
    expect(second.providerOrderId).not.toBe(first.providerOrderId);

    const firstEvent = await applyPaymentEvent(event(first.providerOrderId!), repository);
    expect(firstEvent).toMatchObject({ ok: true, bookingConfirmed: true });

    const duplicate = await applyPaymentEvent(
      event(second.providerOrderId!, { eventId: "event-2" }),
      repository,
    );
    expect(duplicate).toMatchObject({
      ok: true,
      bookingConfirmed: true,
      refundRequested: true,
    });
    expect(repository.booking.status).toBe("confirmed");
    expect(repository.refunds).toHaveLength(1);
    expect(repository.refunds[0]?.paymentId).toBe(second.id);
  });

  it("records a refund request when payment succeeds after cancellation", async () => {
    const repository = new MemoryPayments();
    const provider = new FakeProvider();
    const payment = await orderedPayment(repository, provider);

    await applyPaymentEvent(
      event(payment.providerOrderId!, {
        eventId: "event-cancelled",
        eventType: "payment.cancelled",
      }),
      repository,
    );
    expect(repository.booking.status).toBe("cancelled");

    const lateSuccess = await applyPaymentEvent(
      event(payment.providerOrderId!, { eventId: "event-cancelled-success" }),
      repository,
    );
    expect(lateSuccess).toMatchObject({ ok: true, refundRequested: true });
    expect(repository.booking.status).toBe("cancelled");
    expect(repository.refunds).toHaveLength(1);
  });

  it("keeps pending and unknown outcomes unconfirmed", async () => {
    const repository = new MemoryPayments();
    const provider = new FakeProvider();
    const payment = await orderedPayment(repository, provider);

    const pending = await applyPaymentEvent(
      event(payment.providerOrderId!, { eventId: "event-pending", eventType: "payment.pending" }),
      repository,
    );
    expect(pending).toMatchObject({ ok: true, outcome: "pending", bookingConfirmed: false });
    expect(repository.booking.status).toBe("pending_payment");

    const unknown = await applyPaymentEvent(
      event(payment.providerOrderId!, { eventId: "event-unknown", eventType: "payment.unknown" }),
      repository,
    );
    expect(unknown).toMatchObject({ ok: true, outcome: "unknown", bookingConfirmed: false });
    expect(repository.booking.status).toBe("pending_payment");
  });
});

describe("session-scoped status reads", () => {
  it("returns status only to the owning session", async () => {
    const repository = new MemoryPayments();
    const provider = new FakeProvider();
    await orderedPayment(repository, provider);

    const owner = await getPaymentStatus(REFERENCE, SESSION_HASH, repository);
    expect(owner).toMatchObject({
      bookingReference: REFERENCE,
      confirmed: false,
      payment: { status: "pending", amountMinor: TOTAL.toString() },
    });

    expect(await getPaymentStatus(REFERENCE, "b".repeat(64), repository)).toBeNull();
  });
});
