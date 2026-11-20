import { z } from "zod";

import {
  calculateHoldQuote,
  type HoldQuote,
  type TaxPolicy,
} from "@/modules/bookings/hold-pricing";

export const paymentStatusSchema = z.enum([
  "created",
  "pending",
  "succeeded",
  "failed",
  "cancelled",
  "unknown",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const bookingStatusSchema = z.enum([
  "pending_payment",
  "confirmed",
  "cancelled",
  "payment_failed",
  "refund_pending",
  "refunded",
]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const villaStatusSchema = z.enum(["draft", "available", "reserved", "booked", "withdrawn"]);
export type VillaStatus = z.infer<typeof villaStatusSchema>;

export const paymentEventTypeSchema = z.enum([
  "payment.succeeded",
  "payment.pending",
  "payment.failed",
  "payment.cancelled",
  "payment.unknown",
]);
export type PaymentEventType = z.infer<typeof paymentEventTypeSchema>;

const OUTCOME_BY_EVENT: Record<PaymentEventType, PaymentStatus> = {
  "payment.succeeded": "succeeded",
  "payment.pending": "pending",
  "payment.failed": "failed",
  "payment.cancelled": "cancelled",
  "payment.unknown": "unknown",
};

export function outcomeForEvent(eventType: PaymentEventType): PaymentStatus {
  return OUTCOME_BY_EVENT[eventType];
}

/**
 * Provider-neutral verified event. Only a provider adapter after signature
 * verification may construct this shape.
 */
export const verifiedPaymentEventSchema = z.object({
  provider: z.string().trim().min(1).max(40),
  eventId: z.string().trim().min(1).max(180),
  eventType: paymentEventTypeSchema,
  providerOrderId: z.string().trim().min(1).max(160),
  amountMinor: z
    .string()
    .regex(/^[1-9][0-9]{0,17}$/)
    .transform((value) => BigInt(value)),
  currency: z.literal("INR"),
  occurredAt: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .refine((value) => !Number.isNaN(Date.parse(value)), "occurredAt must be a timestamp"),
});

export type VerifiedPaymentEvent = z.infer<typeof verifiedPaymentEventSchema>;

export const createPaymentOrderInputSchema = z.object({
  bookingReference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^SG-[A-Z0-9-]{4,29}$/),
  idempotencyKey: z.uuid(),
});
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderInputSchema>;

export const paymentReferenceQuerySchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^SG-[A-Z0-9-]{4,29}$/),
});

export const sandboxOutcomeSchema = z.enum([
  "succeeded",
  "pending",
  "failed",
  "cancelled",
  "unknown",
]);
export type SandboxOutcome = z.infer<typeof sandboxOutcomeSchema>;

export const sandboxSimulationInputSchema = z.object({
  bookingReference: paymentReferenceQuerySchema.shape.reference,
  outcome: sandboxOutcomeSchema,
});

export type PriceRecord = {
  priceSettingId: string;
  currency: string;
  baseAmountMinor: bigint;
  taxRateBps: number;
  taxPolicy: TaxPolicy;
};

export type QuoteSnapshot = HoldQuote & { priceSnapshotId: string };

export type PaymentRecord = {
  id: string;
  bookingId: string;
  provider: string;
  idempotencyKey: string;
  providerOrderId: string | null;
  amountMinor: bigint;
  currency: string;
  status: PaymentStatus;
};

export type PaymentBooking = {
  id: string;
  reference: string;
  villaId: string;
  villaCode: string;
  villaStatus: VillaStatus;
  status: BookingStatus;
  holdId: string;
  holdStatus: "active" | "released" | "expired" | "converted";
  holdExpiresAt: Date;
  sessionIdHash: string;
  quote: QuoteSnapshot;
};

export type LockedPayment = {
  payment: PaymentRecord;
  booking: PaymentBooking;
};

export interface PaymentTransaction {
  /** Database-authoritative time; the browser clock is never authoritative. */
  now(): Promise<Date>;
  lockBookingByReference(reference: string): Promise<PaymentBooking | null>;
  getBookingByReference(reference: string): Promise<PaymentBooking | null>;
  findPaymentByIdempotencyKey(
    bookingId: string,
    idempotencyKey: string,
  ): Promise<PaymentRecord | null>;
  findLatestPayment(bookingId: string): Promise<PaymentRecord | null>;
  /** True while any attempt for this booking can still become a charge. */
  hasUnsettledPayment(bookingId: string): Promise<boolean>;
  getCurrentPrice(villaId: string): Promise<PriceRecord | null>;
  hasOtherLiveBooking(villaId: string, bookingId: string): Promise<boolean>;
  createPendingPayment(input: {
    bookingId: string;
    provider: string;
    idempotencyKey: string;
    amountMinor: bigint;
    currency: string;
  }): Promise<PaymentRecord>;
  attachProviderOrder(paymentId: string, providerOrderId: string): Promise<PaymentRecord>;
  setBookingStatus(bookingId: string, status: BookingStatus): Promise<void>;
  lockPaymentByProviderOrder(
    provider: string,
    providerOrderId: string,
  ): Promise<LockedPayment | null>;
  findPaymentEvent(
    provider: string,
    providerEventId: string,
  ): Promise<{ outcome: PaymentStatus } | null>;
  recordPaymentEvent(input: {
    paymentId: string;
    provider: string;
    providerEventId: string;
    eventType: string;
    outcome: PaymentStatus;
  }): Promise<void>;
  setPaymentStatus(paymentId: string, status: PaymentStatus): Promise<void>;
  confirmBookingIfPending(bookingId: string): Promise<boolean>;
  hasSucceededPayment(bookingId: string, exceptPaymentId: string): Promise<boolean>;
  createRefundRequest(input: {
    paymentId: string;
    idempotencyKey: string;
    amountMinor: bigint;
    reason: string;
  }): Promise<boolean>;
  enqueueOutbox(input: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    dedupeKey: string;
    payload?: Record<string, string | number | boolean | null>;
  }): Promise<boolean>;
}

export interface PaymentRepository {
  transaction<T>(operation: (tx: PaymentTransaction) => Promise<T>): Promise<T>;
}

export interface CreateProviderOrderRequest {
  merchantReference: string;
  idempotencyKey: string;
  amountMinor: bigint;
  currency: "INR";
}

export interface ProviderOrder {
  providerOrderId: string;
}

export interface PaymentProvider {
  readonly name: string;
  createOrder(request: CreateProviderOrderRequest): Promise<ProviderOrder>;
  verifyWebhook(request: { rawBody: string; signature: string | null }): VerifiedPaymentEvent;
}

export type CreatePaymentOrderFailureCode =
  "unavailable" | "hold_expired" | "quote_changed" | "invalid_state" | "provider_error";

export type CreatePaymentOrderResult =
  | { ok: true; payment: PaymentRecord; reused: boolean }
  | { ok: false; code: CreatePaymentOrderFailureCode };

type ClaimResult =
  | { kind: "ready"; payment: PaymentRecord }
  | { kind: "needs_order"; payment: PaymentRecord }
  | { kind: "failed"; code: CreatePaymentOrderFailureCode };

function quoteMatchesSnapshot(current: PriceRecord, snapshot: QuoteSnapshot): boolean {
  let calculated: HoldQuote;
  try {
    calculated = calculateHoldQuote({
      baseAmountMinor: current.baseAmountMinor,
      taxRateBps: current.taxRateBps,
      taxPolicy: current.taxPolicy,
    });
  } catch {
    return false;
  }

  return (
    current.currency === snapshot.currency &&
    calculated.baseAmountMinor === snapshot.baseAmountMinor &&
    calculated.taxAmountMinor === snapshot.taxAmountMinor &&
    calculated.totalAmountMinor === snapshot.totalAmountMinor &&
    calculated.taxRateBps === snapshot.taxRateBps &&
    calculated.taxPolicy === snapshot.taxPolicy
  );
}

/**
 * Creates an idempotent payment order for a session-owned booking. The booking
 * and hold rows are locked, availability and the current server quote are
 * rechecked, and the amount is always the immutable hold snapshot total.
 */
export async function createPaymentOrder(
  input: CreatePaymentOrderInput,
  sessionIdHash: string,
  repository: PaymentRepository,
  provider: PaymentProvider,
): Promise<CreatePaymentOrderResult> {
  const claim = await repository.transaction<ClaimResult>(async (tx) => {
    const booking = await tx.lockBookingByReference(input.bookingReference);
    if (!booking || booking.sessionIdHash !== sessionIdHash) {
      return { kind: "failed", code: "unavailable" };
    }

    const existing = await tx.findPaymentByIdempotencyKey(booking.id, input.idempotencyKey);
    if (existing && existing.status !== "pending" && existing.status !== "created") {
      // A finished attempt cannot be retried with the same key. The caller
      // re-reads server status, which is authoritative for the outcome.
      return { kind: "failed", code: "invalid_state" };
    }
    if (existing?.providerOrderId) return { kind: "ready", payment: existing };

    const now = await tx.now();
    if (booking.holdExpiresAt.getTime() <= now.getTime()) {
      return { kind: "failed", code: "hold_expired" };
    }
    if (booking.status !== "pending_payment" && booking.status !== "payment_failed") {
      return { kind: "failed", code: "invalid_state" };
    }
    if (booking.villaStatus !== "available" && booking.villaStatus !== "reserved") {
      return { kind: "failed", code: "unavailable" };
    }
    if (await tx.hasOtherLiveBooking(booking.villaId, booking.id)) {
      return { kind: "failed", code: "unavailable" };
    }

    const current = await tx.getCurrentPrice(booking.villaId);
    if (!current) return { kind: "failed", code: "unavailable" };
    if (!quoteMatchesSnapshot(current, booking.quote)) {
      return { kind: "failed", code: "quote_changed" };
    }
    if (booking.quote.totalAmountMinor <= 0n) {
      return { kind: "failed", code: "unavailable" };
    }

    if (!existing && (await tx.hasUnsettledPayment(booking.id))) {
      // A second key must not create a second chargeable order while an
      // earlier attempt can still succeed. Failed/cancelled attempts are
      // terminal and allow a fresh key.
      return { kind: "failed", code: "invalid_state" };
    }

    if (existing) {
      if (booking.status === "payment_failed") {
        await tx.setBookingStatus(booking.id, "pending_payment");
      }
      return { kind: "needs_order", payment: existing };
    }

    if (booking.status === "payment_failed") {
      await tx.setBookingStatus(booking.id, "pending_payment");
    }
    const payment = await tx.createPendingPayment({
      bookingId: booking.id,
      provider: provider.name,
      idempotencyKey: input.idempotencyKey,
      amountMinor: booking.quote.totalAmountMinor,
      currency: booking.quote.currency,
    });
    return { kind: "needs_order", payment };
  });

  if (claim.kind === "failed") return { ok: false, code: claim.code };
  if (claim.kind === "ready") return { ok: true, payment: claim.payment, reused: true };

  let providerOrder: ProviderOrder;
  try {
    providerOrder = await provider.createOrder({
      merchantReference: claim.payment.id,
      idempotencyKey: claim.payment.idempotencyKey,
      amountMinor: claim.payment.amountMinor,
      currency: "INR",
    });
  } catch {
    // The pending row and idempotency key are retained so a retry reuses the
    // same merchant reference instead of creating a second charge.
    return { ok: false, code: "provider_error" };
  }

  try {
    const payment = await repository.transaction((tx) =>
      tx.attachProviderOrder(claim.payment.id, providerOrder.providerOrderId),
    );
    return { ok: true, payment, reused: false };
  } catch {
    return { ok: false, code: "provider_error" };
  }
}

export type ApplyPaymentEventFailureCode = "unknown_payment" | "amount_mismatch" | "invalid_state";

export type ApplyPaymentEventResult =
  | {
      ok: true;
      outcome: PaymentStatus;
      duplicate: boolean;
      ignored: boolean;
      bookingConfirmed: boolean;
      refundRequested: boolean;
    }
  | { ok: false; code: ApplyPaymentEventFailureCode };

/**
 * Applies a verified provider event exactly once. Repeated or delayed
 * deliveries are deduplicated by provider event ID, and a successful payment
 * confirms the booking only inside this server-side transition.
 */
export async function applyPaymentEvent(
  event: VerifiedPaymentEvent,
  repository: PaymentRepository,
): Promise<ApplyPaymentEventResult> {
  const outcome = outcomeForEvent(event.eventType);

  return repository.transaction<ApplyPaymentEventResult>(async (tx) => {
    const locked = await tx.lockPaymentByProviderOrder(event.provider, event.providerOrderId);
    if (!locked) return { ok: false, code: "unknown_payment" };

    const previous = await tx.findPaymentEvent(event.provider, event.eventId);
    if (previous) {
      return {
        ok: true,
        outcome: previous.outcome,
        duplicate: true,
        ignored: false,
        bookingConfirmed: locked.booking.status === "confirmed",
        refundRequested: false,
      };
    }

    if (
      locked.payment.amountMinor !== event.amountMinor ||
      locked.payment.currency !== event.currency
    ) {
      return { ok: false, code: "amount_mismatch" };
    }

    await tx.recordPaymentEvent({
      paymentId: locked.payment.id,
      provider: event.provider,
      providerEventId: event.eventId,
      eventType: event.eventType,
      outcome,
    });

    if (locked.payment.status === "succeeded" && outcome !== "succeeded") {
      return {
        ok: true,
        outcome: "succeeded",
        duplicate: false,
        ignored: true,
        bookingConfirmed: locked.booking.status === "confirmed",
        refundRequested: false,
      };
    }

    const ignorable =
      (outcome === "pending" && locked.payment.status !== "pending") ||
      (outcome === "unknown" && locked.payment.status === "unknown") ||
      ((outcome === "failed" || outcome === "cancelled") &&
        locked.payment.status !== "pending" &&
        locked.payment.status !== "created" &&
        locked.payment.status !== "unknown");

    if (ignorable) {
      return {
        ok: true,
        outcome: locked.payment.status,
        duplicate: false,
        ignored: true,
        bookingConfirmed: locked.booking.status === "confirmed",
        refundRequested: false,
      };
    }

    if (outcome === "succeeded") {
      await tx.setPaymentStatus(locked.payment.id, "succeeded");
      const bookingConfirmed = await tx.confirmBookingIfPending(locked.booking.id);
      const finalConfirmed = bookingConfirmed || locked.booking.status === "confirmed";
      let refundRequested = false;
      if (!bookingConfirmed) {
        const otherSucceeded = await tx.hasSucceededPayment(locked.booking.id, locked.payment.id);
        if (otherSucceeded || locked.booking.status === "cancelled") {
          refundRequested = await tx.createRefundRequest({
            paymentId: locked.payment.id,
            idempotencyKey: `auto_duplicate_${locked.payment.id}`,
            amountMinor: locked.payment.amountMinor,
            reason: "Duplicate or post-cancellation payment requires review",
          });
        }
      }
      if (finalConfirmed) {
        await tx.enqueueOutbox({
          aggregateType: "booking",
          aggregateId: locked.booking.id,
          eventType: "booking.confirmed",
          dedupeKey: `booking.confirmed:${locked.booking.id}`,
          payload: {
            bookingReference: locked.booking.reference,
            villaCode: locked.booking.villaCode,
            paymentId: locked.payment.id,
          },
        });
      }
      if (refundRequested) {
        await tx.enqueueOutbox({
          aggregateType: "payment",
          aggregateId: locked.payment.id,
          eventType: "refund.requested",
          dedupeKey: `refund.requested:${locked.payment.id}`,
          payload: { paymentId: locked.payment.id },
        });
      }
      return {
        ok: true,
        outcome: "succeeded",
        duplicate: false,
        ignored: false,
        bookingConfirmed: finalConfirmed,
        refundRequested,
      };
    }

    await tx.setPaymentStatus(locked.payment.id, outcome);
    if (outcome === "failed" && locked.booking.status === "pending_payment") {
      await tx.setBookingStatus(locked.booking.id, "payment_failed");
    }
    if (outcome === "cancelled" && locked.booking.status === "pending_payment") {
      await tx.setBookingStatus(locked.booking.id, "cancelled");
    }

    return {
      ok: true,
      outcome,
      duplicate: false,
      ignored: false,
      bookingConfirmed: locked.booking.status === "confirmed",
      refundRequested: false,
    };
  });
}

export type PaymentStatusView = {
  bookingReference: string;
  bookingStatus: BookingStatus;
  villaCode: string;
  confirmed: boolean;
  payment: {
    status: PaymentStatus;
    amountMinor: string;
    currency: string;
  } | null;
};

/** Status reads are session-scoped; a guessed reference never reveals a booking. */
export async function getPaymentStatus(
  reference: string,
  sessionIdHash: string,
  repository: PaymentRepository,
): Promise<PaymentStatusView | null> {
  return repository.transaction(async (tx) => {
    const booking = await tx.getBookingByReference(reference);
    if (!booking || booking.sessionIdHash !== sessionIdHash) return null;
    const payment = await tx.findLatestPayment(booking.id);
    return {
      bookingReference: booking.reference,
      bookingStatus: booking.status,
      villaCode: booking.villaCode,
      confirmed: booking.status === "confirmed",
      payment: payment
        ? {
            status: payment.status,
            amountMinor: payment.amountMinor.toString(),
            currency: payment.currency,
          }
        : null,
    };
  });
}

export function toPublicPayment(payment: PaymentRecord) {
  return {
    id: payment.id,
    provider: payment.provider,
    providerOrderId: payment.providerOrderId,
    amountMinor: payment.amountMinor.toString(),
    currency: payment.currency,
    status: payment.status,
  };
}
