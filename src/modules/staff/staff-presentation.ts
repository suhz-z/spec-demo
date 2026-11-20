import type {
  StaffBookingRecord,
  StaffPaymentRecord,
  StaffPlanRecord,
  StaffPriceRecord,
  StaffRefundRecord,
  StaffVillaRecord,
} from "./staff-domain";

/** BigInt amounts are serialized as decimal strings for JSON responses. */
export function presentVilla(record: StaffVillaRecord) {
  return {
    ...record,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    priceValidFrom: record.priceValidFrom?.toISOString() ?? null,
    baseAmountMinor: record.baseAmountMinor?.toString() ?? null,
  };
}

export function presentBooking(record: StaffBookingRecord) {
  return {
    ...record,
    totalAmountMinor: record.totalAmountMinor.toString(),
    createdAt: record.createdAt.toISOString(),
  };
}

export function presentPayment(record: StaffPaymentRecord) {
  return {
    ...record,
    amountMinor: record.amountMinor.toString(),
    createdAt: record.createdAt.toISOString(),
  };
}

export function presentRefund(record: StaffRefundRecord) {
  return {
    ...record,
    amountMinor: record.amountMinor.toString(),
    createdAt: record.createdAt.toISOString(),
  };
}

export function presentPlan(record: StaffPlanRecord) {
  return { ...record };
}

export function presentPrice(record: StaffPriceRecord) {
  return {
    ...record,
    baseAmountMinor: record.baseAmountMinor.toString(),
    validFrom: record.validFrom.toISOString(),
    validUntil: record.validUntil?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}
