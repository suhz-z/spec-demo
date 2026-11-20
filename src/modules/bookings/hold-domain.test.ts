import { describe, expect, it } from "vitest";

import {
  createHold,
  createHoldInputSchema,
  buyerDetailsInputSchema,
  type HoldRecord,
  type HoldRepository,
  type HoldTransaction,
} from "./hold-domain";
import { calculateHoldQuote } from "./hold-pricing";

class MemoryHolds implements HoldRepository {
  now = new Date("2026-01-01T00:00:00.000Z");
  villas = [
    { id: "villa-1", code: "V01", status: "available" as const, isPublished: true },
    { id: "villa-2", code: "V02", status: "available" as const, isPublished: true },
  ];
  holds: HoldRecord[] = [];
  hasBooking = false;
  private lock = Promise.resolve();

  async transaction<T>(operation: (tx: HoldTransaction) => Promise<T>): Promise<T> {
    const previous = this.lock;
    let unlock!: () => void;
    this.lock = new Promise<void>((resolve) => (unlock = resolve));
    await previous;
    try {
      return await operation({
        lockVilla: async (code) => this.villas.find((villa) => villa.code === code) ?? null,
        findByIdempotencyKey: async (sessionIdHash, key, villaId) =>
          this.holds.find(
            (hold) =>
              hold.sessionIdHash === sessionIdHash &&
              hold.idempotencyKey === key &&
              hold.villaId === villaId,
          ) ?? null,
        isHoldValid: async (holdId) => {
          const hold = this.holds.find((item) => item.id === holdId);
          return Boolean(hold && hold.status === "active" && hold.expiresAt > this.now);
        },
        expireHold: async (holdId) => {
          const hold = this.holds.find((item) => item.id === holdId);
          if (hold && hold.expiresAt <= this.now) hold.status = "expired";
        },
        expireElapsedHolds: async (villaId) => {
          for (const hold of this.holds) {
            if (
              hold.villaId === villaId &&
              hold.status === "active" &&
              hold.expiresAt <= this.now
            ) {
              hold.status = "expired";
            }
          }
        },
        hasActiveHold: async (villaId) =>
          this.holds.some(
            (hold) =>
              hold.villaId === villaId && hold.status === "active" && hold.expiresAt > this.now,
          ),
        hasLiveBooking: async () => this.hasBooking,
        getCurrentPrice: async () => ({
          priceSettingId: "price-setting-1",
          currency: "INR",
          baseAmountMinor: 10_000_000n,
          taxRateBps: 500,
          taxPolicy: "exclusive",
        }),
        createHold: async (input) => {
          const hold: HoldRecord = {
            id: `hold-${this.holds.length + 1}`,
            villaId: input.villaId,
            villaCode: input.villaCode,
            sessionIdHash: input.sessionIdHash,
            idempotencyKey: input.idempotencyKey,
            status: "active",
            expiresAt: new Date(this.now.getTime() + input.durationSeconds * 1_000),
            quote: input.quote,
          };
          this.holds.push(hold);
          return hold;
        },
      });
    } finally {
      unlock();
    }
  }
}

const input = (key: string) => ({ villaCode: "V01", idempotencyKey: key });

describe("hold domain", () => {
  it("validates requests and calculates tax in integer paise", () => {
    expect(
      createHoldInputSchema.safeParse({ villaCode: "V01", idempotencyKey: "bad" }).success,
    ).toBe(false);
    expect(
      calculateHoldQuote({ baseAmountMinor: 10_000n, taxRateBps: 500, taxPolicy: "exclusive" }),
    ).toMatchObject({ taxAmountMinor: 500n, totalAmountMinor: 10_500n });
  });

  it("requires the approved buyer fields and explicit terms acceptance", () => {
    const valid = {
      holdId: "10000000-0000-4000-8000-000000000001",
      fullName: "Sample Buyer",
      mobile: "9876543210",
      email: " buyer@example.test ",
      acceptedTerms: true,
    };
    expect(buyerDetailsInputSchema.safeParse(valid)).toMatchObject({
      success: true,
      data: { email: "buyer@example.test" },
    });
    expect(buyerDetailsInputSchema.safeParse({ ...valid, acceptedTerms: false }).success).toBe(
      false,
    );
    expect(buyerDetailsInputSchema.safeParse({ ...valid, mobile: "123" }).success).toBe(false);
  });

  it("reuses a retry by the same session and idempotency key", async () => {
    const repository = new MemoryHolds();
    const first = await createHold(
      input("10000000-0000-4000-8000-000000000001"),
      "session-a",
      repository,
      {
        durationSeconds: 600,
      },
    );
    const retry = await createHold(
      input("10000000-0000-4000-8000-000000000001"),
      "session-a",
      repository,
      {
        durationSeconds: 600,
      },
    );
    expect(first.ok && first.reused).toBe(false);
    expect(retry.ok && retry.reused).toBe(true);
    expect(repository.holds).toHaveLength(1);
  });

  it("does not reuse an idempotency key for a different villa", async () => {
    const repository = new MemoryHolds();
    const key = "10000000-0000-4000-8000-000000000001";
    const first = await createHold(input(key), "session-a", repository, { durationSeconds: 600 });
    const other = await createHold(
      { villaCode: "V02", idempotencyKey: key },
      "session-a",
      repository,
      { durationSeconds: 600 },
    );

    expect(first.ok && first.reused).toBe(false);
    expect(other.ok && other.reused).toBe(false);
    expect(repository.holds).toHaveLength(2);
    expect(repository.holds.map((hold) => hold.villaCode)).toEqual(["V01", "V02"]);
  });

  it("serializes competing sessions so only one can hold the villa", async () => {
    const repository = new MemoryHolds();
    const results = await Promise.all([
      createHold(input("10000000-0000-4000-8000-000000000001"), "session-a", repository, {
        durationSeconds: 600,
      }),
      createHold(input("10000000-0000-4000-8000-000000000002"), "session-b", repository, {
        durationSeconds: 600,
      }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(repository.holds).toHaveLength(1);
  });

  it("expires a stale hold and lets a different session retry", async () => {
    const repository = new MemoryHolds();
    const created = await createHold(
      input("10000000-0000-4000-8000-000000000001"),
      "session-a",
      repository,
      {
        durationSeconds: 60,
      },
    );
    if (!created.ok) throw new Error("expected first hold");
    repository.now = new Date(created.hold.expiresAt.getTime());
    const retry = await createHold(
      input("10000000-0000-4000-8000-000000000002"),
      "session-b",
      repository,
      {
        durationSeconds: 60,
      },
    );
    expect(retry.ok).toBe(true);
    expect(repository.holds[0]?.status).toBe("expired");
  });

  it("does not let another session replay a hold", async () => {
    const repository = new MemoryHolds();
    await createHold(input("10000000-0000-4000-8000-000000000001"), "session-a", repository, {
      durationSeconds: 600,
    });
    const result = await createHold(
      input("10000000-0000-4000-8000-000000000001"),
      "session-b",
      repository,
      {
        durationSeconds: 600,
      },
    );
    expect(result).toMatchObject({ ok: false, code: "not_available" });
  });

  it("keeps a villa unavailable while a pending booking exists", async () => {
    const repository = new MemoryHolds();
    const first = await createHold(
      input("10000000-0000-4000-8000-000000000001"),
      "session-a",
      repository,
      {
        durationSeconds: 60,
      },
    );
    if (!first.ok) throw new Error("expected first hold");
    repository.now = first.hold.expiresAt;
    repository.hasBooking = true;
    const retry = await createHold(
      input("10000000-0000-4000-8000-000000000002"),
      "session-b",
      repository,
      {
        durationSeconds: 60,
      },
    );
    expect(retry).toMatchObject({ ok: false, code: "not_available" });
  });
});
