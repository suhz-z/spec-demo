import "server-only";

import { and, asc, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  bookings,
  floorPlans,
  holds,
  payments,
  priceSettings,
  priceSnapshots,
  refundRequests,
  rooms,
  staffProfiles,
  villas,
} from "@/db/schema";

import type {
  CreatePriceSettingInput,
  PaymentForRefund,
  StaffBookingRecord,
  StaffIdentity,
  StaffPaymentRecord,
  StaffPlanRecord,
  StaffPriceRecord,
  StaffRefundRecord,
  StaffRepository,
  StaffTransaction,
  StaffVillaRecord,
} from "./staff-domain";

const activePrice = and(
  lte(priceSettings.validFrom, sql`now()`),
  or(isNull(priceSettings.validUntil), gt(priceSettings.validUntil, sql`now()`)),
);

function makePriceRecord(row: {
  id: string;
  villaId: string;
  villaCode: string;
  currency: string;
  baseAmountMinor: bigint;
  taxRateBps: number;
  taxPolicy: string;
  validFrom: Date;
  validUntil: Date | null;
  createdAt: Date;
}): StaffPriceRecord {
  return { ...row };
}

export const staffRepository: StaffRepository = {
  async transaction<T>(operation: (tx: StaffTransaction) => Promise<T>): Promise<T> {
    return getDb().transaction(async (databaseTx) => {
      const tx: StaffTransaction = {
        async findActiveStaffByAuthUserId(authUserId): Promise<StaffIdentity | null> {
          const [row] = await databaseTx
            .select({
              profileId: staffProfiles.id,
              authUserId: staffProfiles.authUserId,
              role: staffProfiles.role,
            })
            .from(staffProfiles)
            .where(and(eq(staffProfiles.authUserId, authUserId), eq(staffProfiles.active, true)))
            .limit(1);
          return row ?? null;
        },

        async listVillas(input): Promise<StaffVillaRecord[]> {
          const rows = await databaseTx
            .select({
              id: villas.id,
              code: villas.code,
              configuration: villas.configuration,
              status: villas.status,
              publishedAt: villas.publishedAt,
              displayOrder: villas.displayOrder,
              baseAmountMinor: priceSettings.baseAmountMinor,
              currency: priceSettings.currency,
              priceValidFrom: priceSettings.validFrom,
            })
            .from(villas)
            .leftJoin(priceSettings, and(eq(priceSettings.villaId, villas.id), activePrice))
            .orderBy(asc(villas.displayOrder), asc(villas.code))
            .limit(input.limit)
            .offset(input.offset);
          return rows;
        },

        async updateVillaStatus(input) {
          const [current] = await databaseTx
            .select({ status: villas.status })
            .from(villas)
            .where(eq(villas.id, input.villaId))
            .for("update");
          if (!current) return "not_found";
          // Reserved and booked are derived from live holds/bookings. Staff may
          // publish, unpublish, or withdraw, but not overwrite those states.
          if (current.status === "reserved" || current.status === "booked") return "conflict";

          // A hold does not change villas.status, so it must be checked
          // explicitly before a buyer's villa can be withdrawn or unpublished.
          const [liveHold] = await databaseTx
            .select({ id: holds.id })
            .from(holds)
            .where(
              and(
                eq(holds.villaId, input.villaId),
                eq(holds.status, "active"),
                gt(holds.expiresAt, sql`now()`),
              ),
            )
            .limit(1);
          if (liveHold) return "conflict";

          await databaseTx
            .update(villas)
            .set({
              status: input.status,
              publishedAt:
                input.status === "draft" ? null : sql`coalesce(${villas.publishedAt}, now())`,
            })
            .where(eq(villas.id, input.villaId));
          return "ok";
        },

        async listBookings(input): Promise<StaffBookingRecord[]> {
          const rows = await databaseTx
            .select({
              id: bookings.id,
              reference: bookings.reference,
              villaCode: villas.code,
              status: bookings.status,
              totalAmountMinor: priceSnapshots.totalAmountMinor,
              createdAt: bookings.createdAt,
            })
            .from(bookings)
            .innerJoin(villas, eq(villas.id, bookings.villaId))
            .innerJoin(priceSnapshots, eq(priceSnapshots.id, bookings.priceSnapshotId))
            .orderBy(desc(bookings.createdAt))
            .limit(input.limit)
            .offset(input.offset);
          return rows;
        },

        async listPayments(input): Promise<StaffPaymentRecord[]> {
          const rows = await databaseTx
            .select({
              id: payments.id,
              bookingReference: bookings.reference,
              provider: payments.provider,
              providerOrderId: payments.providerOrderId,
              amountMinor: payments.amountMinor,
              currency: payments.currency,
              status: payments.status,
              createdAt: payments.createdAt,
            })
            .from(payments)
            .innerJoin(bookings, eq(bookings.id, payments.bookingId))
            .orderBy(desc(payments.createdAt))
            .limit(input.limit)
            .offset(input.offset);
          return rows;
        },

        async listRefundRequests(input): Promise<StaffRefundRecord[]> {
          const rows = await databaseTx
            .select({
              id: refundRequests.id,
              paymentId: refundRequests.paymentId,
              bookingReference: bookings.reference,
              amountMinor: refundRequests.amountMinor,
              reason: refundRequests.reason,
              status: refundRequests.status,
              createdAt: refundRequests.createdAt,
            })
            .from(refundRequests)
            .innerJoin(payments, eq(payments.id, refundRequests.paymentId))
            .innerJoin(bookings, eq(bookings.id, payments.bookingId))
            .orderBy(desc(refundRequests.createdAt))
            .limit(input.limit)
            .offset(input.offset);
          return rows;
        },

        async listPlans(input): Promise<StaffPlanRecord[]> {
          const rows = await databaseTx
            .select({
              id: floorPlans.id,
              villaCode: villas.code,
              floorNumber: floorPlans.floorNumber,
              title: floorPlans.title,
              published: floorPlans.published,
              roomCount: sql<number>`(
                select count(*)::int from ${rooms} where ${rooms.floorPlanId} = ${floorPlans.id}
              )`,
            })
            .from(floorPlans)
            .innerJoin(villas, eq(villas.id, floorPlans.villaId))
            .orderBy(asc(villas.code), asc(floorPlans.floorNumber))
            .limit(input.limit)
            .offset(input.offset);
          return rows;
        },

        async createPriceSetting(
          input: Omit<CreatePriceSettingInput, "baseAmountMinor"> & {
            baseAmountMinor: bigint;
            createdBy: string;
          },
        ): Promise<StaffPriceRecord | null> {
          const [villa] = await databaseTx
            .select({ id: villas.id, code: villas.code })
            .from(villas)
            .where(eq(villas.id, input.villaId))
            .limit(1);
          if (!villa) return null;

          const [row] = await databaseTx
            .insert(priceSettings)
            .values({
              villaId: input.villaId,
              currency: "INR",
              baseAmountMinor: input.baseAmountMinor,
              taxRateBps: input.taxRateBps,
              taxPolicy: input.taxPolicy,
              validFrom: input.validFrom,
              validUntil: input.validUntil,
              createdBy: input.createdBy,
            })
            .returning({
              id: priceSettings.id,
              villaId: priceSettings.villaId,
              currency: priceSettings.currency,
              baseAmountMinor: priceSettings.baseAmountMinor,
              taxRateBps: priceSettings.taxRateBps,
              taxPolicy: priceSettings.taxPolicy,
              validFrom: priceSettings.validFrom,
              validUntil: priceSettings.validUntil,
              createdAt: priceSettings.createdAt,
            });
          if (!row) return null;
          return makePriceRecord({ ...row, villaCode: villa.code });
        },

        async getPaymentForRefund(paymentId): Promise<PaymentForRefund | null> {
          const [row] = await databaseTx
            .select({
              id: payments.id,
              bookingId: payments.bookingId,
              bookingReference: bookings.reference,
              amountMinor: payments.amountMinor,
              status: payments.status,
            })
            .from(payments)
            .innerJoin(bookings, eq(bookings.id, payments.bookingId))
            .where(eq(payments.id, paymentId))
            .limit(1);
          return row ?? null;
        },

        async createRefundRequest(input): Promise<{ created: boolean; refund: StaffRefundRecord }> {
          const [inserted] = await databaseTx
            .insert(refundRequests)
            .values({
              paymentId: input.paymentId,
              idempotencyKey: input.idempotencyKey,
              amountMinor: input.amountMinor,
              reason: input.reason,
              status: "requested",
              requestedBy: input.requestedBy,
            })
            .onConflictDoNothing({
              target: [refundRequests.paymentId, refundRequests.idempotencyKey],
            })
            .returning({ id: refundRequests.id });

          const [row] = await databaseTx
            .select({
              id: refundRequests.id,
              paymentId: refundRequests.paymentId,
              bookingReference: bookings.reference,
              amountMinor: refundRequests.amountMinor,
              reason: refundRequests.reason,
              status: refundRequests.status,
              createdAt: refundRequests.createdAt,
            })
            .from(refundRequests)
            .innerJoin(payments, eq(payments.id, refundRequests.paymentId))
            .innerJoin(bookings, eq(bookings.id, payments.bookingId))
            .where(
              and(
                eq(refundRequests.paymentId, input.paymentId),
                eq(refundRequests.idempotencyKey, input.idempotencyKey),
              ),
            )
            .limit(1);
          if (!row) throw new Error("Refund request could not be created");
          return { created: Boolean(inserted), refund: row };
        },
      };

      return operation(tx);
    });
  },
};
