import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { holds, priceSnapshots, villas } from "@/db/schema";

import { getCurrentSessionHash } from "./session.server";

export type ResumableHold = {
  id: string;
  villaCode: string;
  /** The original client key so retries reuse the same hold. */
  idempotencyKey: string;
  expiresAt: string;
  quote: {
    currency: "INR";
    baseAmountMinor: string;
    taxAmountMinor: string;
    totalAmountMinor: string;
    taxRateBps: number;
    taxPolicy: "inclusive" | "exclusive" | "none";
  };
};

/**
 * Returns only the current visitor's own unexpired hold. A failed lookup is
 * treated as "no hold" so a missing database never blocks public browsing.
 */
export async function getResumableHold(villaCode: string): Promise<ResumableHold | null> {
  if (!process.env.DATABASE_URL) return null;
  const sessionHash = await getCurrentSessionHash();
  if (!sessionHash) return null;

  try {
    const [row] = await getDb()
      .select({
        id: holds.id,
        villaCode: villas.code,
        idempotencyKey: holds.idempotencyKey,
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
          eq(villas.code, villaCode),
          eq(holds.sessionIdHash, sessionHash),
          eq(holds.status, "active"),
          gt(holds.expiresAt, sql`now()`),
        ),
      )
      .limit(1);
    if (!row) return null;

    return {
      id: row.id,
      villaCode: row.villaCode,
      idempotencyKey: row.idempotencyKey,
      expiresAt: row.expiresAt.toISOString(),
      quote: {
        currency: "INR",
        baseAmountMinor: row.baseAmountMinor.toString(),
        taxAmountMinor: row.taxAmountMinor.toString(),
        totalAmountMinor: row.totalAmountMinor.toString(),
        taxRateBps: row.taxRateBps,
        taxPolicy: row.taxPolicy as ResumableHold["quote"]["taxPolicy"],
      },
    };
  } catch {
    return null;
  }
}
