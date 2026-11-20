import "server-only";

import { and, desc, eq, gt, lte, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { bookings, holds, priceSettings, priceSnapshots, villas } from "@/db/schema";

import type { HoldRecord, HoldRepository, HoldTransaction, PriceRecord } from "./hold-domain";
import type { HoldQuote } from "./hold-pricing";

function makeHoldRecord(row: {
  id: string;
  villaId: string;
  villaCode: string;
  sessionIdHash: string;
  idempotencyKey: string;
  status: HoldRecord["status"];
  expiresAt: Date;
  currency: string;
  baseAmountMinor: bigint;
  taxAmountMinor: bigint;
  totalAmountMinor: bigint;
  taxRateBps: number;
  taxPolicy: string;
}): HoldRecord {
  return {
    id: row.id,
    villaId: row.villaId,
    villaCode: row.villaCode,
    sessionIdHash: row.sessionIdHash,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    expiresAt: row.expiresAt,
    quote: {
      currency: "INR",
      baseAmountMinor: row.baseAmountMinor,
      taxAmountMinor: row.taxAmountMinor,
      totalAmountMinor: row.totalAmountMinor,
      taxRateBps: row.taxRateBps,
      taxPolicy: row.taxPolicy as HoldQuote["taxPolicy"],
    },
  };
}

export const holdRepository: HoldRepository = {
  async transaction<T>(operation: (tx: HoldTransaction) => Promise<T>): Promise<T> {
    return getDb().transaction(async (databaseTx) => {
      const tx: HoldTransaction = {
        async lockVilla(code) {
          const [row] = await databaseTx
            .select({
              id: villas.id,
              code: villas.code,
              status: villas.status,
              publishedAt: villas.publishedAt,
            })
            .from(villas)
            .where(eq(villas.code, code))
            .for("update");
          return row
            ? {
                id: row.id,
                code: row.code,
                status: row.status,
                isPublished: row.publishedAt !== null,
              }
            : null;
        },
        async findByIdempotencyKey(sessionIdHash, key, villaId) {
          const [row] = await databaseTx
            .select({
              id: holds.id,
              villaId: holds.villaId,
              villaCode: villas.code,
              sessionIdHash: holds.sessionIdHash,
              idempotencyKey: holds.idempotencyKey,
              status: holds.status,
              expiresAt: holds.expiresAt,
              currency: priceSnapshots.currency,
              baseAmountMinor: priceSnapshots.baseAmountMinor,
              taxAmountMinor: priceSnapshots.taxAmountMinor,
              totalAmountMinor: priceSnapshots.totalAmountMinor,
              taxRateBps: priceSnapshots.taxRateBps,
              taxPolicy: priceSnapshots.taxPolicy,
            })
            .from(holds)
            .innerJoin(villas, eq(villas.id, holds.villaId))
            .innerJoin(priceSnapshots, eq(priceSnapshots.id, holds.priceSnapshotId))
            .where(
              and(
                eq(holds.sessionIdHash, sessionIdHash),
                eq(holds.idempotencyKey, key),
                eq(holds.villaId, villaId),
              ),
            )
            .limit(1);
          return row ? makeHoldRecord(row) : null;
        },
        async isHoldValid(holdId) {
          const [row] = await databaseTx
            .select({ id: holds.id })
            .from(holds)
            .where(
              and(
                eq(holds.id, holdId),
                eq(holds.status, "active"),
                gt(holds.expiresAt, sql`now()`),
              ),
            )
            .limit(1);
          return Boolean(row);
        },
        async expireHold(holdId) {
          await databaseTx
            .update(holds)
            .set({ status: "expired", updatedAt: sql`now()` })
            .where(
              and(
                eq(holds.id, holdId),
                eq(holds.status, "active"),
                lte(holds.expiresAt, sql`now()`),
              ),
            );
        },
        async expireElapsedHolds(villaId) {
          await databaseTx
            .update(holds)
            .set({ status: "expired", updatedAt: sql`now()` })
            .where(
              and(
                eq(holds.villaId, villaId),
                eq(holds.status, "active"),
                lte(holds.expiresAt, sql`now()`),
              ),
            );
        },
        async hasActiveHold(villaId) {
          const [row] = await databaseTx
            .select({ id: holds.id })
            .from(holds)
            .where(
              and(
                eq(holds.villaId, villaId),
                eq(holds.status, "active"),
                gt(holds.expiresAt, sql`now()`),
              ),
            )
            .limit(1);
          return Boolean(row);
        },
        async hasLiveBooking(villaId) {
          const [row] = await databaseTx
            .select({ id: bookings.id })
            .from(bookings)
            .where(
              and(
                eq(bookings.villaId, villaId),
                sql`${bookings.status} in ('pending_payment', 'confirmed', 'refund_pending')`,
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
                sql`(${priceSettings.validUntil} is null or ${priceSettings.validUntil} > now())`,
              ),
            )
            .orderBy(desc(priceSettings.validFrom))
            .limit(1);
          return row ?? null;
        },
        async createHold(input) {
          const [snapshot] = await databaseTx
            .insert(priceSnapshots)
            .values({
              villaId: input.villaId,
              priceSettingId: input.priceSettingId,
              currency: input.quote.currency,
              baseAmountMinor: input.quote.baseAmountMinor,
              taxAmountMinor: input.quote.taxAmountMinor,
              totalAmountMinor: input.quote.totalAmountMinor,
              taxRateBps: input.quote.taxRateBps,
              taxPolicy: input.quote.taxPolicy,
              snapshot: {
                source: "hold_creation",
                villaCode: input.villaCode,
              },
            })
            .returning({ id: priceSnapshots.id });
          if (!snapshot) throw new Error("Price snapshot could not be created");

          const [row] = await databaseTx
            .insert(holds)
            .values({
              villaId: input.villaId,
              sessionIdHash: input.sessionIdHash,
              idempotencyKey: input.idempotencyKey,
              priceSnapshotId: snapshot.id,
              expiresAt: sql`now() + (${input.durationSeconds} * interval '1 second')`,
            })
            .returning({
              id: holds.id,
              villaId: holds.villaId,
              sessionIdHash: holds.sessionIdHash,
              idempotencyKey: holds.idempotencyKey,
              status: holds.status,
              expiresAt: holds.expiresAt,
            });
          if (!row) throw new Error("Hold could not be created");
          return {
            ...row,
            villaCode: input.villaCode,
            quote: input.quote,
          };
        },
      };
      return operation(tx);
    });
  },
};
