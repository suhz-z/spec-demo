import { z } from "zod";

export const staffRoleSchema = z.enum(["admin", "sales", "accounts"]);
export type StaffRole = z.infer<typeof staffRoleSchema>;

export const staffPermissionSchema = z.enum([
  "inventory:read",
  "inventory:write",
  "pricing:read",
  "pricing:write",
  "plans:read",
  "bookings:read",
  "payments:read",
  "refunds:read",
  "refunds:write",
]);
export type StaffPermission = z.infer<typeof staffPermissionSchema>;

/**
 * Initial least-privilege matrix (DESIGN.md D-18). It is an assumption for
 * client approval: sales manages publication and reads bookings, accounts
 * reads payment state and raises refund requests, and only admin can change
 * prices. Hiding UI controls is never the control; every operation below
 * rechecks this matrix on the server.
 */
const ROLE_PERMISSIONS: Record<StaffRole, readonly StaffPermission[]> = {
  admin: [...staffPermissionSchema.options],
  sales: ["inventory:read", "inventory:write", "plans:read", "bookings:read"],
  accounts: ["bookings:read", "payments:read", "refunds:read", "refunds:write", "pricing:read"],
};

export function permissionsForRole(role: StaffRole): readonly StaffPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function isAuthorized(role: StaffRole, permission: StaffPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export type StaffIdentity = {
  profileId: string;
  authUserId: string;
  role: StaffRole;
};

export type StaffFailureCode = "forbidden" | "not_found" | "invalid" | "conflict";

export type StaffResult<T> = { ok: true; data: T } | { ok: false; code: StaffFailureCode };

function forbidden<T>(): StaffResult<T> {
  return { ok: false, code: "forbidden" };
}

const moneyMinorSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{0,17}$/, "Amount must be a positive integer in paise")
  .transform((value) => BigInt(value));

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});
export type Pagination = z.infer<typeof paginationSchema>;

/** Staff may only publish, unpublish, or withdraw; live hold/booking states are system-owned. */
export const staffVillaStatusSchema = z.enum(["draft", "available", "withdrawn"]);
export type StaffVillaStatus = z.infer<typeof staffVillaStatusSchema>;

export const updateVillaStatusInputSchema = z.object({
  status: staffVillaStatusSchema,
});
export type UpdateVillaStatusInput = z.infer<typeof updateVillaStatusInputSchema>;

export const createPriceSettingInputSchema = z
  .object({
    villaId: z.uuid(),
    baseAmountMinor: moneyMinorSchema,
    taxRateBps: z.number().int().min(0).max(10_000).default(0),
    taxPolicy: z.enum(["inclusive", "exclusive", "none"]).default("exclusive"),
    validFrom: z.coerce.date(),
    validUntil: z.coerce
      .date()
      .nullish()
      .transform((value) => value ?? null),
  })
  .refine(
    (value) => value.validUntil === null || value.validUntil.getTime() > value.validFrom.getTime(),
    { path: ["validUntil"], message: "validUntil must be after validFrom" },
  );
export type CreatePriceSettingInput = z.infer<typeof createPriceSettingInputSchema>;

export const createStaffRefundInputSchema = z.object({
  paymentId: z.uuid(),
  amountMinor: moneyMinorSchema,
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.uuid(),
});
export type CreateStaffRefundInput = z.infer<typeof createStaffRefundInputSchema>;

export type StaffVillaRecord = {
  id: string;
  code: string;
  configuration: string;
  status: string;
  publishedAt: Date | null;
  displayOrder: number;
  baseAmountMinor: bigint | null;
  currency: string | null;
  priceValidFrom: Date | null;
};

export type StaffBookingRecord = {
  id: string;
  reference: string;
  villaCode: string;
  status: string;
  totalAmountMinor: bigint;
  createdAt: Date;
};

export type StaffPaymentRecord = {
  id: string;
  bookingReference: string;
  provider: string;
  providerOrderId: string | null;
  amountMinor: bigint;
  currency: string;
  status: string;
  createdAt: Date;
};

export type StaffRefundRecord = {
  id: string;
  paymentId: string;
  bookingReference: string;
  amountMinor: bigint;
  reason: string | null;
  status: string;
  createdAt: Date;
};

export type StaffPlanRecord = {
  id: string;
  villaCode: string;
  floorNumber: number;
  title: string;
  published: boolean;
  roomCount: number;
};

export type StaffPriceRecord = {
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
};

export type PaymentForRefund = {
  id: string;
  bookingId: string;
  bookingReference: string;
  amountMinor: bigint;
  status: string;
};

export interface StaffTransaction {
  findActiveStaffByAuthUserId(authUserId: string): Promise<StaffIdentity | null>;
  listVillas(input: Pagination): Promise<StaffVillaRecord[]>;
  updateVillaStatus(input: {
    villaId: string;
    status: StaffVillaStatus;
  }): Promise<"ok" | "not_found" | "conflict">;
  listBookings(input: Pagination): Promise<StaffBookingRecord[]>;
  listPayments(input: Pagination): Promise<StaffPaymentRecord[]>;
  listRefundRequests(input: Pagination): Promise<StaffRefundRecord[]>;
  listPlans(input: Pagination): Promise<StaffPlanRecord[]>;
  createPriceSetting(input: {
    villaId: string;
    baseAmountMinor: bigint;
    taxRateBps: number;
    taxPolicy: string;
    validFrom: Date;
    validUntil: Date | null;
    createdBy: string;
  }): Promise<StaffPriceRecord | null>;
  getPaymentForRefund(paymentId: string): Promise<PaymentForRefund | null>;
  createRefundRequest(input: {
    paymentId: string;
    idempotencyKey: string;
    amountMinor: bigint;
    reason: string;
    requestedBy: string;
  }): Promise<{ created: boolean; refund: StaffRefundRecord }>;
}

export interface StaffRepository {
  transaction<T>(operation: (tx: StaffTransaction) => Promise<T>): Promise<T>;
}

export async function listStaffVillas(
  identity: StaffIdentity,
  repository: StaffRepository,
  pagination: Pagination,
): Promise<StaffResult<StaffVillaRecord[]>> {
  if (!isAuthorized(identity.role, "inventory:read")) return forbidden();
  const data = await repository.transaction((tx) => tx.listVillas(pagination));
  return { ok: true, data };
}

export async function updateVillaStatus(
  identity: StaffIdentity,
  repository: StaffRepository,
  villaId: string,
  input: UpdateVillaStatusInput,
): Promise<StaffResult<{ villaId: string; status: StaffVillaStatus }>> {
  if (!isAuthorized(identity.role, "inventory:write")) return forbidden();
  const result = await repository.transaction((tx) =>
    tx.updateVillaStatus({ villaId, status: input.status }),
  );
  if (result === "not_found") return { ok: false, code: "not_found" };
  if (result === "conflict") return { ok: false, code: "conflict" };
  return { ok: true, data: { villaId, status: input.status } };
}

export async function listStaffPricing(
  identity: StaffIdentity,
  repository: StaffRepository,
  pagination: Pagination,
): Promise<StaffResult<StaffVillaRecord[]>> {
  if (!isAuthorized(identity.role, "pricing:read")) return forbidden();
  const data = await repository.transaction((tx) => tx.listVillas(pagination));
  return { ok: true, data };
}

export async function listStaffBookings(
  identity: StaffIdentity,
  repository: StaffRepository,
  pagination: Pagination,
): Promise<StaffResult<StaffBookingRecord[]>> {
  if (!isAuthorized(identity.role, "bookings:read")) return forbidden();
  const data = await repository.transaction((tx) => tx.listBookings(pagination));
  return { ok: true, data };
}

export async function listStaffPayments(
  identity: StaffIdentity,
  repository: StaffRepository,
  pagination: Pagination,
): Promise<StaffResult<StaffPaymentRecord[]>> {
  if (!isAuthorized(identity.role, "payments:read")) return forbidden();
  const data = await repository.transaction((tx) => tx.listPayments(pagination));
  return { ok: true, data };
}

export async function listStaffRefunds(
  identity: StaffIdentity,
  repository: StaffRepository,
  pagination: Pagination,
): Promise<StaffResult<StaffRefundRecord[]>> {
  if (!isAuthorized(identity.role, "refunds:read")) return forbidden();
  const data = await repository.transaction((tx) => tx.listRefundRequests(pagination));
  return { ok: true, data };
}

export async function listStaffPlans(
  identity: StaffIdentity,
  repository: StaffRepository,
  pagination: Pagination,
): Promise<StaffResult<StaffPlanRecord[]>> {
  if (!isAuthorized(identity.role, "plans:read")) return forbidden();
  const data = await repository.transaction((tx) => tx.listPlans(pagination));
  return { ok: true, data };
}

export async function createPriceSetting(
  identity: StaffIdentity,
  repository: StaffRepository,
  input: CreatePriceSettingInput,
): Promise<StaffResult<StaffPriceRecord>> {
  if (!isAuthorized(identity.role, "pricing:write")) return forbidden();
  const price = await repository.transaction((tx) =>
    tx.createPriceSetting({
      villaId: input.villaId,
      baseAmountMinor: input.baseAmountMinor,
      taxRateBps: input.taxRateBps,
      taxPolicy: input.taxPolicy,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      createdBy: identity.profileId,
    }),
  );
  if (!price) return { ok: false, code: "not_found" };
  return { ok: true, data: price };
}

/**
 * Refunds remain requests. A staff member may raise one only for a succeeded
 * payment, for no more than the captured amount, and idempotently by key.
 */
export async function createStaffRefund(
  identity: StaffIdentity,
  repository: StaffRepository,
  input: CreateStaffRefundInput,
): Promise<StaffResult<{ created: boolean; refund: StaffRefundRecord }>> {
  if (!isAuthorized(identity.role, "refunds:write")) return forbidden();

  return repository.transaction(async (tx) => {
    const payment = await tx.getPaymentForRefund(input.paymentId);
    if (!payment) return { ok: false as const, code: "not_found" as const };
    if (payment.status !== "succeeded") {
      return { ok: false as const, code: "invalid" as const };
    }
    if (input.amountMinor > payment.amountMinor) {
      return { ok: false as const, code: "invalid" as const };
    }

    const result = await tx.createRefundRequest({
      paymentId: payment.id,
      idempotencyKey: input.idempotencyKey,
      amountMinor: input.amountMinor,
      reason: input.reason,
      requestedBy: identity.profileId,
    });
    return { ok: true as const, data: result };
  });
}
