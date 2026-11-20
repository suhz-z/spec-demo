import { describe, expect, it } from "vitest";

import {
  createPriceSetting,
  createPriceSettingInputSchema,
  createStaffRefund,
  createStaffRefundInputSchema,
  isAuthorized,
  listStaffBookings,
  listStaffPayments,
  listStaffPlans,
  listStaffPricing,
  listStaffRefunds,
  listStaffVillas,
  permissionsForRole,
  updateVillaStatus,
  updateVillaStatusInputSchema,
  type PaymentForRefund,
  type StaffBookingRecord,
  type StaffIdentity,
  type StaffPaymentRecord,
  type StaffPlanRecord,
  type StaffPriceRecord,
  type StaffRefundRecord,
  type StaffRepository,
  type StaffTransaction,
  type StaffVillaRecord,
} from "./staff-domain";

const admin: StaffIdentity = {
  profileId: "profile-admin",
  authUserId: "auth-admin",
  role: "admin",
};
const sales: StaffIdentity = {
  profileId: "profile-sales",
  authUserId: "auth-sales",
  role: "sales",
};
const accounts: StaffIdentity = {
  profileId: "profile-accounts",
  authUserId: "auth-accounts",
  role: "accounts",
};

const VILLA_ID = "11111111-1111-4111-8111-111111111111";
const PAYMENT_ID = "22222222-2222-4222-8222-222222222222";
const REFUND_KEY = "33333333-3333-4333-8333-333333333333";

class MemoryStaff implements StaffRepository {
  villas: StaffVillaRecord[] = [
    {
      id: VILLA_ID,
      code: "V01",
      configuration: "3BHK",
      status: "available",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      displayOrder: 1,
      baseAmountMinor: 10_000_000n,
      currency: "INR",
      priceValidFrom: new Date("2026-01-01T00:00:00Z"),
    },
  ];
  bookings: StaffBookingRecord[] = [
    {
      id: "booking-1",
      reference: "SG-ABCDEF123456",
      villaCode: "V01",
      status: "confirmed",
      totalAmountMinor: 10_500_000n,
      createdAt: new Date("2026-01-01T00:05:00Z"),
    },
  ];
  payments: StaffPaymentRecord[] = [
    {
      id: PAYMENT_ID,
      bookingReference: "SG-ABCDEF123456",
      provider: "sandbox",
      providerOrderId: "sbx_123",
      amountMinor: 10_500_000n,
      currency: "INR",
      status: "succeeded",
      createdAt: new Date("2026-01-01T00:06:00Z"),
    },
  ];
  refunds: StaffRefundRecord[] = [];
  plans: StaffPlanRecord[] = [
    {
      id: "plan-1",
      villaCode: "V01",
      floorNumber: 0,
      title: "Ground floor",
      published: true,
      roomCount: 4,
    },
  ];
  prices: StaffPriceRecord[] = [];
  liveHoldVillaIds = new Set<string>();
  private lock = Promise.resolve();

  async transaction<T>(operation: (tx: StaffTransaction) => Promise<T>): Promise<T> {
    const previous = this.lock;
    let unlock!: () => void;
    this.lock = new Promise<void>((resolve) => (unlock = resolve));
    await previous;
    try {
      return await operation({
        findActiveStaffByAuthUserId: async (authUserId) =>
          [admin, sales, accounts].find((identity) => identity.authUserId === authUserId) ?? null,
        listVillas: async ({ limit, offset }) => this.villas.slice(offset, offset + limit),
        updateVillaStatus: async ({ villaId, status }) => {
          const villa = this.villas.find((item) => item.id === villaId);
          if (!villa) return "not_found";
          if (villa.status === "reserved" || villa.status === "booked") return "conflict";
          if (this.liveHoldVillaIds.has(villaId)) return "conflict";
          villa.status = status;
          villa.publishedAt =
            status === "draft" ? null : (villa.publishedAt ?? new Date("2026-01-02T00:00:00Z"));
          return "ok";
        },
        listBookings: async ({ limit, offset }) => this.bookings.slice(offset, offset + limit),
        listPayments: async ({ limit, offset }) => this.payments.slice(offset, offset + limit),
        listRefundRequests: async ({ limit, offset }) => this.refunds.slice(offset, offset + limit),
        listPlans: async ({ limit, offset }) => this.plans.slice(offset, offset + limit),
        createPriceSetting: async (input) => {
          const villa = this.villas.find((item) => item.id === input.villaId);
          if (!villa) return null;
          const price: StaffPriceRecord = {
            id: `price-${this.prices.length + 1}`,
            villaId: input.villaId,
            villaCode: villa.code,
            currency: "INR",
            baseAmountMinor: input.baseAmountMinor,
            taxRateBps: input.taxRateBps,
            taxPolicy: input.taxPolicy,
            validFrom: input.validFrom,
            validUntil: input.validUntil,
            createdAt: new Date("2026-01-02T00:00:00Z"),
          };
          this.prices.push(price);
          return price;
        },
        getPaymentForRefund: async (paymentId): Promise<PaymentForRefund | null> => {
          const payment = this.payments.find((item) => item.id === paymentId);
          if (!payment) return null;
          return {
            id: payment.id,
            bookingId: "booking-1",
            bookingReference: payment.bookingReference,
            amountMinor: payment.amountMinor,
            status: payment.status,
          };
        },
        createRefundRequest: async (input) => {
          const existing = this.refunds.find(
            (refund) =>
              refund.paymentId === input.paymentId &&
              refund.id === `refund-${input.idempotencyKey}`,
          );
          if (existing) return { created: false, refund: existing };
          const refund: StaffRefundRecord = {
            id: `refund-${input.idempotencyKey}`,
            paymentId: input.paymentId,
            bookingReference: "SG-ABCDEF123456",
            amountMinor: input.amountMinor,
            reason: input.reason,
            status: "requested",
            createdAt: new Date("2026-01-02T00:00:00Z"),
          };
          this.refunds.push(refund);
          return { created: true, refund };
        },
      });
    } finally {
      unlock();
    }
  }
}

describe("staff permission matrix", () => {
  it("grants admin every permission", () => {
    expect(isAuthorized("admin", "inventory:write")).toBe(true);
    expect(isAuthorized("admin", "pricing:write")).toBe(true);
    expect(isAuthorized("admin", "refunds:write")).toBe(true);
    expect(permissionsForRole("admin")).toHaveLength(9);
  });

  it("limits sales to inventory and read-only operational data", () => {
    expect(isAuthorized("sales", "inventory:write")).toBe(true);
    expect(isAuthorized("sales", "bookings:read")).toBe(true);
    expect(isAuthorized("sales", "pricing:read")).toBe(false);
    expect(isAuthorized("sales", "pricing:write")).toBe(false);
    expect(isAuthorized("sales", "payments:read")).toBe(false);
    expect(isAuthorized("sales", "refunds:write")).toBe(false);
  });

  it("limits accounts to payment and refund work", () => {
    expect(isAuthorized("accounts", "payments:read")).toBe(true);
    expect(isAuthorized("accounts", "refunds:write")).toBe(true);
    expect(isAuthorized("accounts", "pricing:read")).toBe(true);
    expect(isAuthorized("accounts", "inventory:read")).toBe(false);
    expect(isAuthorized("accounts", "inventory:write")).toBe(false);
    expect(isAuthorized("accounts", "pricing:write")).toBe(false);
  });
});

describe("staff reads", () => {
  it("allows the role with the read permission and denies others", async () => {
    const repository = new MemoryStaff();

    expect((await listStaffVillas(sales, repository, { limit: 10, offset: 0 })).ok).toBe(true);
    expect((await listStaffPricing(accounts, repository, { limit: 10, offset: 0 })).ok).toBe(true);
    expect((await listStaffBookings(accounts, repository, { limit: 10, offset: 0 })).ok).toBe(true);
    expect((await listStaffPayments(accounts, repository, { limit: 10, offset: 0 })).ok).toBe(true);
    expect((await listStaffRefunds(accounts, repository, { limit: 10, offset: 0 })).ok).toBe(true);
    expect((await listStaffPlans(sales, repository, { limit: 10, offset: 0 })).ok).toBe(true);

    expect(await listStaffVillas(accounts, repository, { limit: 10, offset: 0 })).toMatchObject({
      ok: false,
      code: "forbidden",
    });
    expect(await listStaffPricing(sales, repository, { limit: 10, offset: 0 })).toMatchObject({
      ok: false,
      code: "forbidden",
    });
    expect(await listStaffPayments(sales, repository, { limit: 10, offset: 0 })).toMatchObject({
      ok: false,
      code: "forbidden",
    });
  });

  it("applies pagination without exposing more rows than requested", async () => {
    const repository = new MemoryStaff();
    const result = await listStaffVillas(admin, repository, { limit: 1, offset: 0 });
    expect(result.ok && result.data).toHaveLength(1);
  });
});

describe("staff inventory writes", () => {
  it("publishes and withdraws a villa with role checks", async () => {
    const repository = new MemoryStaff();
    const published = await updateVillaStatus(sales, repository, VILLA_ID, { status: "available" });
    expect(published).toMatchObject({ ok: true, data: { status: "available" } });

    const withdrawn = await updateVillaStatus(sales, repository, VILLA_ID, { status: "withdrawn" });
    expect(withdrawn).toMatchObject({ ok: true, data: { status: "withdrawn" } });
    expect(repository.villas[0]?.publishedAt).not.toBeNull();

    const draft = await updateVillaStatus(sales, repository, VILLA_ID, { status: "draft" });
    expect(draft.ok).toBe(true);
    expect(repository.villas[0]?.publishedAt).toBeNull();
  });

  it("rejects accounts, unknown villas, and invalid status input", async () => {
    const repository = new MemoryStaff();
    expect(
      await updateVillaStatus(accounts, repository, VILLA_ID, { status: "withdrawn" }),
    ).toMatchObject({ ok: false, code: "forbidden" });

    const missing = "44444444-4444-4444-8444-444444444444";
    expect(
      await updateVillaStatus(admin, repository, missing, { status: "available" }),
    ).toMatchObject({ ok: false, code: "not_found" });

    expect(updateVillaStatusInputSchema.safeParse({ status: "booked" }).success).toBe(false);
    expect(updateVillaStatusInputSchema.safeParse({ status: "reserved" }).success).toBe(false);
  });

  it("refuses to overwrite system-owned reserved or booked states", async () => {
    const repository = new MemoryStaff();
    repository.villas[0]!.status = "booked";

    expect(
      await updateVillaStatus(admin, repository, VILLA_ID, { status: "available" }),
    ).toMatchObject({ ok: false, code: "conflict" });
    expect(repository.villas[0]?.status).toBe("booked");
  });

  it("refuses to withdraw a villa that has a live buyer hold", async () => {
    const repository = new MemoryStaff();
    repository.liveHoldVillaIds.add(VILLA_ID);

    expect(
      await updateVillaStatus(admin, repository, VILLA_ID, { status: "withdrawn" }),
    ).toMatchObject({ ok: false, code: "conflict" });
    expect(repository.villas[0]?.status).toBe("available");
  });
});

describe("staff pricing writes", () => {
  it("creates a price only with the write permission", async () => {
    const repository = new MemoryStaff();
    const input = createPriceSettingInputSchema.parse({
      villaId: VILLA_ID,
      baseAmountMinor: "12500000",
      taxRateBps: 500,
      taxPolicy: "exclusive",
      validFrom: "2026-02-01T00:00:00.000Z",
      validUntil: "2026-03-01T00:00:00.000Z",
    });

    const created = await createPriceSetting(admin, repository, input);
    expect(created.ok && created.data.baseAmountMinor).toBe(12_500_000n);
    expect(repository.prices).toHaveLength(1);

    expect(await createPriceSetting(sales, repository, input)).toMatchObject({
      ok: false,
      code: "forbidden",
    });
    expect(await createPriceSetting(accounts, repository, input)).toMatchObject({
      ok: false,
      code: "forbidden",
    });
  });

  it("rejects invalid amounts, rates, and date ranges", () => {
    const base = {
      villaId: VILLA_ID,
      taxRateBps: 500,
      taxPolicy: "exclusive",
      validFrom: "2026-02-01T00:00:00.000Z",
    };

    expect(createPriceSettingInputSchema.safeParse({ ...base, baseAmountMinor: "0" }).success).toBe(
      false,
    );
    expect(
      createPriceSettingInputSchema.safeParse({ ...base, baseAmountMinor: "-100" }).success,
    ).toBe(false);
    expect(
      createPriceSettingInputSchema.safeParse({
        ...base,
        baseAmountMinor: "100",
        taxRateBps: 10_001,
      }).success,
    ).toBe(false);
    expect(
      createPriceSettingInputSchema.safeParse({
        ...base,
        baseAmountMinor: "100",
        validUntil: "2026-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});

describe("staff refund requests", () => {
  it("creates an idempotent request for a succeeded payment", async () => {
    const repository = new MemoryStaff();
    const input = createStaffRefundInputSchema.parse({
      paymentId: PAYMENT_ID,
      amountMinor: "500000",
      reason: "Client-approved partial refund",
      idempotencyKey: REFUND_KEY,
    });

    const first = await createStaffRefund(accounts, repository, input);
    expect(first).toMatchObject({ ok: true, data: { created: true } });
    expect(repository.refunds).toHaveLength(1);

    const retry = await createStaffRefund(accounts, repository, input);
    expect(retry).toMatchObject({ ok: true, data: { created: false } });
    expect(repository.refunds).toHaveLength(1);
  });

  it("rejects non-accounts roles, missing payments, failed payments, and over-capture amounts", async () => {
    const repository = new MemoryStaff();
    const rawInput = {
      paymentId: PAYMENT_ID,
      amountMinor: "500000",
      reason: "Client-approved partial refund",
      idempotencyKey: REFUND_KEY,
    };
    const input = createStaffRefundInputSchema.parse(rawInput);

    expect(await createStaffRefund(sales, repository, input)).toMatchObject({
      ok: false,
      code: "forbidden",
    });

    const missing = createStaffRefundInputSchema.parse({
      ...rawInput,
      paymentId: "55555555-5555-4555-8555-555555555555",
    });
    expect(await createStaffRefund(accounts, repository, missing)).toMatchObject({
      ok: false,
      code: "not_found",
    });

    repository.payments[0]!.status = "pending";
    expect(await createStaffRefund(accounts, repository, input)).toMatchObject({
      ok: false,
      code: "invalid",
    });

    repository.payments[0]!.status = "succeeded";
    const tooMuch = createStaffRefundInputSchema.parse({
      ...rawInput,
      amountMinor: "100000000",
    });
    expect(await createStaffRefund(accounts, repository, tooMuch)).toMatchObject({
      ok: false,
      code: "invalid",
    });
    expect(repository.refunds).toHaveLength(0);
  });

  it("requires a sensible reason and a UUID idempotency key", () => {
    expect(
      createStaffRefundInputSchema.safeParse({
        paymentId: PAYMENT_ID,
        amountMinor: "100",
        reason: "x",
        idempotencyKey: REFUND_KEY,
      }).success,
    ).toBe(false);
    expect(
      createStaffRefundInputSchema.safeParse({
        paymentId: PAYMENT_ID,
        amountMinor: "100",
        reason: "Valid reason",
        idempotencyKey: "not-a-uuid",
      }).success,
    ).toBe(false);
  });
});
