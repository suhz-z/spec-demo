import { createHash } from "node:crypto";
import { z } from "zod";

import { calculateHoldQuote, type HoldQuote } from "./hold-pricing";

export const createHoldInputSchema = z.object({
  villaCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{1,32}$/),
  idempotencyKey: z.uuid(),
});

export type CreateHoldInput = z.infer<typeof createHoldInputSchema>;

export const buyerDetailsInputSchema = z.object({
  holdId: z.uuid(),
  fullName: z.string().trim().min(2).max(160),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9][0-9]{9}$/),
  email: z
    .string()
    .trim()
    .max(320)
    .pipe(z.email())
    .transform((value) => value.toLowerCase()),
  acceptedTerms: z.literal(true),
});

export type BuyerDetailsInput = z.infer<typeof buyerDetailsInputSchema>;

export function hashSessionToken(sessionToken: string): string {
  return createHash("sha256").update(sessionToken, "utf8").digest("hex");
}

export type PriceRecord = {
  priceSettingId: string;
  currency: string;
  baseAmountMinor: bigint;
  taxRateBps: number;
  taxPolicy: string;
};

export type HoldRecord = {
  id: string;
  villaId: string;
  villaCode: string;
  sessionIdHash: string;
  idempotencyKey: string;
  status: "active" | "released" | "expired" | "converted";
  expiresAt: Date;
  quote: HoldQuote;
};

export type LockedVilla = {
  id: string;
  code: string;
  status: "draft" | "available" | "reserved" | "booked" | "withdrawn";
  isPublished: boolean;
};

export interface HoldTransaction {
  lockVilla(code: string): Promise<LockedVilla | null>;
  findByIdempotencyKey(
    sessionIdHash: string,
    key: string,
    villaId: string,
  ): Promise<HoldRecord | null>;
  isHoldValid(holdId: string): Promise<boolean>;
  expireHold(holdId: string): Promise<void>;
  expireElapsedHolds(villaId: string): Promise<void>;
  hasActiveHold(villaId: string): Promise<boolean>;
  hasLiveBooking(villaId: string): Promise<boolean>;
  getCurrentPrice(villaId: string): Promise<PriceRecord | null>;
  createHold(input: {
    villaId: string;
    villaCode: string;
    priceSettingId: string;
    sessionIdHash: string;
    idempotencyKey: string;
    quote: HoldQuote;
    durationSeconds: number;
  }): Promise<HoldRecord>;
}

export interface HoldRepository {
  transaction<T>(operation: (tx: HoldTransaction) => Promise<T>): Promise<T>;
}

export type HoldFailureCode = "not_available" | "quote_unavailable" | "idempotency_expired";

export type CreateHoldResult =
  { ok: true; hold: HoldRecord; reused: boolean } | { ok: false; code: HoldFailureCode };

export async function createHold(
  input: CreateHoldInput,
  sessionToken: string,
  repository: HoldRepository,
  options: { durationSeconds: number },
): Promise<CreateHoldResult> {
  if (!Number.isInteger(options.durationSeconds) || options.durationSeconds < 60) {
    throw new RangeError("Hold duration is outside the supported range");
  }
  const sessionIdHash = hashSessionToken(sessionToken);

  return repository.transaction(async (tx) => {
    const villa = await tx.lockVilla(input.villaCode);
    if (!villa || !villa.isPublished) return { ok: false, code: "not_available" };

    const priorRequest = await tx.findByIdempotencyKey(
      sessionIdHash,
      input.idempotencyKey,
      villa.id,
    );
    if (priorRequest) {
      if (priorRequest.status !== "active" || !(await tx.isHoldValid(priorRequest.id))) {
        if (priorRequest.status === "active") await tx.expireHold(priorRequest.id);
        return { ok: false, code: "idempotency_expired" };
      }
      return { ok: true, hold: priorRequest, reused: true };
    }

    await tx.expireElapsedHolds(villa.id);
    const activeHold = await tx.hasActiveHold(villa.id);
    const liveBooking = await tx.hasLiveBooking(villa.id);
    if (villa.status !== "available" || activeHold || liveBooking) {
      return { ok: false, code: "not_available" };
    }

    const price = await tx.getCurrentPrice(villa.id);
    if (
      !price ||
      price.currency !== "INR" ||
      (price.taxPolicy !== "inclusive" &&
        price.taxPolicy !== "exclusive" &&
        price.taxPolicy !== "none")
    ) {
      return { ok: false, code: "quote_unavailable" };
    }

    const quote = calculateHoldQuote({
      baseAmountMinor: price.baseAmountMinor,
      taxRateBps: price.taxRateBps,
      taxPolicy: price.taxPolicy,
    });
    if (quote.totalAmountMinor <= 0n) return { ok: false, code: "quote_unavailable" };

    const hold = await tx.createHold({
      villaId: villa.id,
      villaCode: villa.code,
      priceSettingId: price.priceSettingId,
      sessionIdHash,
      idempotencyKey: input.idempotencyKey,
      quote,
      durationSeconds: options.durationSeconds,
    });
    return { ok: true, hold, reused: false };
  });
}
