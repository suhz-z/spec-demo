import "server-only";

import { and, desc, eq, gt, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  bookings,
  holds,
  outboxEvents,
  paymentEvents,
  payments,
  priceSettings,
  priceSnapshots,
  refundRequests,
  villas,
} from "@/db/schema";

import type {
  BookingStatus,
  LockedPayment,
  PaymentBooking,
  PaymentRecord,
  PaymentRepository,
  PaymentStatus,
  PaymentTransaction,
  PriceRecord,
} from "./payment-domain";

const paymentColumns = {
  id: payments.id,
  bookingId: payments.bookingId,
  provider: payments.provider,
  idempotencyKey: payments.idempotencyKey,
  providerOrderId: payments.providerOrderId,
  amountMinor: payments.amountMinor,
  currency: payments.currency,
  status: payments.status,
};

function makePaymentRecord(row: {
  id: string;
  bookingId: string;
  provider: string;
  idempotencyKey: string;
  providerOrderId: string | null;
  amountMinor: bigint;
  currency: string;
  status: PaymentStatus;
}): PaymentRecord {
  return { ...row };
}

const bookingColumns = {
  id: bookings.id,
  reference: bookings.reference,
  villaId: villas.id,
  villaCode: villas.code,
  villaStatus: villas.status,
  status: bookings.status,
  holdId: holds.id,
  holdStatus: holds.status,
  holdExpiresAt: holds.expiresAt,
  sessionIdHash: holds.sessionIdHash,
  priceSnapshotId: priceSnapshots.id,
  currency: priceSnapshots.currency,
  baseAmountMinor: priceSnapshots.baseAmountMinor,
  taxAmountMinor: priceSnapshots.taxAmountMinor,
  totalAmountMinor: priceSnapshots.totalAmountMinor,
  taxRateBps: priceSnapshots.taxRateBps,
  taxPolicy: priceSnapshots.taxPolicy,
};

function makePaymentBooking(row: {
  id: string;
  reference: string;
  villaId: string;
  villaCode: string;
  villaStatus: PaymentBooking["villaStatus"];
  status: BookingStatus;
  holdId: string;
  holdStatus: PaymentBooking["holdStatus"];
  holdExpiresAt: Date;
  sessionIdHash: string;
  priceSnapshotId: string;
  currency: string;
  baseAmountMinor: bigint;
  taxAmountMinor: bigint;
  totalAmountMinor: bigint;
  taxRateBps: number;
  taxPolicy: string;
}): PaymentBooking {
  return {
    id: row.id,
    reference: row.reference,
    villaId: row.villaId,
    villaCode: row.villaCode,
    villaStatus: row.villaStatus,
    status: row.status,
    holdId: row.holdId,
    holdStatus: row.holdStatus,
    holdExpiresAt: row.holdExpiresAt,
    sessionIdHash: row.sessionIdHash,
    quote: {
      priceSnapshotId: row.priceSnapshotId,
      currency: "INR",
      baseAmountMinor: row.baseAmountMinor,
      taxAmountMinor: row.taxAmountMinor,
      totalAmountMinor: row.totalAmountMinor,
      taxRateBps: row.taxRateBps,
      taxPolicy:
        row.taxPolicy === "inclusive" || row.taxPolicy === "none" ? row.taxPolicy : "exclusive",
    },
  };
}

export const paymentRepository: PaymentRepository = {
  async transaction<T>(operation: (tx: PaymentTransaction) => Promise<T>): Promise<T> {
    return getDb().transaction(async (databaseTx) => {
      const tx: PaymentTransaction = {
        async now() {
          const result = await databaseTx.execute<{ value: Date }>(sql`select now() as value`);
          const value = result[0]?.value;
          if (!value) throw new Error("Database time could not be read");
          return value instanceof Date ? value : new Date(value);
        },

        async lockBookingByReference(reference) {
          const [row] = await databaseTx
            .select(bookingColumns)
            .from(bookings)
            .innerJoin(holds, eq(holds.id, bookings.holdId))
            .innerJoin(villas, eq(villas.id, bookings.villaId))
            .innerJoin(priceSnapshots, eq(priceSnapshots.id, bookings.priceSnapshotId))
            .where(eq(bookings.reference, reference))
            .for("update");
          return row ? makePaymentBooking(row) : null;
        },

        async getBookingByReference(reference) {
          const [row] = await databaseTx
            .select(bookingColumns)
            .from(bookings)
            .innerJoin(holds, eq(holds.id, bookings.holdId))
            .innerJoin(villas, eq(villas.id, bookings.villaId))
            .innerJoin(priceSnapshots, eq(priceSnapshots.id, bookings.priceSnapshotId))
            .where(eq(bookings.reference, reference))
            .limit(1);
          return row ? makePaymentBooking(row) : null;
        },

        async findPaymentByIdempotencyKey(bookingId, idempotencyKey) {
          const [row] = await databaseTx
            .select(paymentColumns)
            .from(payments)
            .where(
              and(eq(payments.bookingId, bookingId), eq(payments.idempotencyKey, idempotencyKey)),
            )
            .limit(1);
          return row ? makePaymentRecord(row) : null;
        },

        async findLatestPayment(bookingId) {
          const [row] = await databaseTx
            .select(paymentColumns)
            .from(payments)
            .where(eq(payments.bookingId, bookingId))
            .orderBy(desc(payments.createdAt))
            .limit(1);
          return row ? makePaymentRecord(row) : null;
        },

        async hasUnsettledPayment(bookingId) {
          const [row] = await databaseTx
            .select({ id: payments.id })
            .from(payments)
            .where(
              and(
                eq(payments.bookingId, bookingId),
                inArray(payments.status, ["created", "pending", "unknown", "succeeded"]),
              ),
            )
            .limit(1);
          return Boolean(row);
        },

        async getCurrentPrice(villaId): Promise<PriceRecord | null> {
          const [row] = await databaseTx
            .select({
              priceSettingId: priceSettings.id,
              currency: priceSettings.currency,
              baseAmountMinor: priceSettings.baseAmountMinor,
              taxRateBps: priceSettings.taxRateBps,
              taxPolicy: priceSettings.taxPolicy,
            })
            .from(priceSettings)
            .where(
              and(
                eq(priceSettings.villaId, villaId),
                lte(priceSettings.validFrom, sql`now()`),
                or(isNull(priceSettings.validUntil), gt(priceSettings.validUntil, sql`now()`)),
              ),
            )
            .orderBy(desc(priceSettings.validFrom))
            .limit(1);
          if (!row) return null;
          return {
            priceSettingId: row.priceSettingId,
            currency: row.currency,
            baseAmountMinor: row.baseAmountMinor,
            taxRateBps: row.taxRateBps,
            taxPolicy:
              row.taxPolicy === "inclusive" || row.taxPolicy === "none"
                ? row.taxPolicy
                : "exclusive",
          };
        },

        async hasOtherLiveBooking(villaId, bookingId) {
          const [row] = await databaseTx
            .select({ id: bookings.id })
            .from(bookings)
            .where(
              and(
                eq(bookings.villaId, villaId),
                ne(bookings.id, bookingId),
                inArray(bookings.status, ["pending_payment", "confirmed", "refund_pending"]),
              ),
            )
            .limit(1);
          return Boolean(row);
        },

        async createPendingPayment(input) {
          const [inserted] = await databaseTx
            .insert(payments)
            .values({
              bookingId: input.bookingId,
              provider: input.provider,
              idempotencyKey: input.idempotencyKey,
              amountMinor: input.amountMinor,
              currency: input.currency,
              status: "pending",
            })
            .onConflictDoNothing({
              target: [payments.bookingId, payments.idempotencyKey],
            })
            .returning(paymentColumns);
          if (inserted) return makePaymentRecord(inserted);

          const [existing] = await databaseTx
            .select(paymentColumns)
            .from(payments)
            .where(
              and(
                eq(payments.bookingId, input.bookingId),
                eq(payments.idempotencyKey, input.idempotencyKey),
              ),
            )
            .limit(1);
          if (!existing) throw new Error("Payment could not be created");
          return makePaymentRecord(existing);
        },

        async attachProviderOrder(paymentId, providerOrderId) {
          const [row] = await databaseTx
            .update(payments)
            .set({ providerOrderId })
            .where(eq(payments.id, paymentId))
            .returning(paymentColumns);
          if (!row) throw new Error("Payment order could not be attached");
          return makePaymentRecord(row);
        },

        async setBookingStatus(bookingId, status) {
          await databaseTx
            .update(bookings)
            .set({ status })
            .where(
              and(
                eq(bookings.id, bookingId),
                inArray(bookings.status, ["pending_payment", "payment_failed"]),
              ),
            );
        },

        async lockPaymentByProviderOrder(provider, providerOrderId): Promise<LockedPayment | null> {
          const [row] = await databaseTx
            .select({
              paymentId: payments.id,
              paymentBookingId: payments.bookingId,
              paymentProvider: payments.provider,
              paymentIdempotencyKey: payments.idempotencyKey,
              paymentProviderOrderId: payments.providerOrderId,
              paymentAmountMinor: payments.amountMinor,
              paymentCurrency: payments.currency,
              paymentStatus: payments.status,
              bookingId: bookings.id,
              reference: bookings.reference,
              villaId: villas.id,
              villaCode: villas.code,
              villaStatus: villas.status,
              status: bookings.status,
              holdId: holds.id,
              holdStatus: holds.status,
              holdExpiresAt: holds.expiresAt,
              sessionIdHash: holds.sessionIdHash,
              priceSnapshotId: priceSnapshots.id,
              currency: priceSnapshots.currency,
              baseAmountMinor: priceSnapshots.baseAmountMinor,
              taxAmountMinor: priceSnapshots.taxAmountMinor,
              totalAmountMinor: priceSnapshots.totalAmountMinor,
              taxRateBps: priceSnapshots.taxRateBps,
              taxPolicy: priceSnapshots.taxPolicy,
            })
            .from(payments)
            .innerJoin(bookings, eq(bookings.id, payments.bookingId))
            .innerJoin(holds, eq(holds.id, bookings.holdId))
            .innerJoin(villas, eq(villas.id, bookings.villaId))
            .innerJoin(priceSnapshots, eq(priceSnapshots.id, bookings.priceSnapshotId))
            .where(
              and(eq(payments.provider, provider), eq(payments.providerOrderId, providerOrderId)),
            )
            .for("update");
          if (!row) return null;
          return {
            payment: {
              id: row.paymentId,
              bookingId: row.paymentBookingId,
              provider: row.paymentProvider,
              idempotencyKey: row.paymentIdempotencyKey,
              providerOrderId: row.paymentProviderOrderId,
              amountMinor: row.paymentAmountMinor,
              currency: row.paymentCurrency,
              status: row.paymentStatus,
            },
            booking: makePaymentBooking({ ...row, id: row.bookingId }),
          };
        },

        async findPaymentEvent(provider, providerEventId) {
          const [row] = await databaseTx
            .select({ outcome: paymentEvents.outcome })
            .from(paymentEvents)
            .where(
              and(
                eq(paymentEvents.provider, provider),
                eq(paymentEvents.providerEventId, providerEventId),
              ),
            )
            .limit(1);
          return row ?? null;
        },

        async recordPaymentEvent(input) {
          await databaseTx.insert(paymentEvents).values({
            paymentId: input.paymentId,
            provider: input.provider,
            providerEventId: input.providerEventId,
            eventType: input.eventType,
            verifiedAt: sql`now()`,
            outcome: input.outcome,
          });
        },

        async setPaymentStatus(paymentId, status) {
          const [row] = await databaseTx
            .select({ status: payments.status })
            .from(payments)
            .where(eq(payments.id, paymentId))
            .for("update");
          if (!row || row.status === status) return;

          if (row.status === "created" && status === "succeeded") {
            await databaseTx
              .update(payments)
              .set({ status: "pending" })
              .where(eq(payments.id, paymentId));
          }
          await databaseTx.update(payments).set({ status }).where(eq(payments.id, paymentId));
        },

        async confirmBookingIfPending(bookingId) {
          const [row] = await databaseTx
            .select({ status: bookings.status, villaId: bookings.villaId })
            .from(bookings)
            .where(eq(bookings.id, bookingId))
            .for("update");
          if (!row) return false;

          if (row.status === "payment_failed") {
            await databaseTx
              .update(bookings)
              .set({ status: "pending_payment" })
              .where(and(eq(bookings.id, bookingId), eq(bookings.status, "payment_failed")));
          } else if (row.status !== "pending_payment") {
            return false;
          }

          const [confirmed] = await databaseTx
            .update(bookings)
            .set({ status: "confirmed", confirmedAt: sql`now()` })
            .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending_payment")))
            .returning({ villaId: bookings.villaId });
          if (!confirmed) return false;

          await databaseTx
            .update(villas)
            .set({ status: "booked" })
            .where(eq(villas.id, confirmed.villaId));
          return true;
        },

        async hasSucceededPayment(bookingId, exceptPaymentId) {
          const [row] = await databaseTx
            .select({ id: payments.id })
            .from(payments)
            .where(
              and(
                eq(payments.bookingId, bookingId),
                ne(payments.id, exceptPaymentId),
                eq(payments.status, "succeeded"),
              ),
            )
            .limit(1);
          return Boolean(row);
        },

        async createRefundRequest(input) {
          const [row] = await databaseTx
            .insert(refundRequests)
            .values({
              paymentId: input.paymentId,
              idempotencyKey: input.idempotencyKey,
              amountMinor: input.amountMinor,
              reason: input.reason,
              status: "requested",
            })
            .onConflictDoNothing({
              target: [refundRequests.paymentId, refundRequests.idempotencyKey],
            })
            .returning({ id: refundRequests.id });
          return Boolean(row);
        },

        async enqueueOutbox(input) {
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
