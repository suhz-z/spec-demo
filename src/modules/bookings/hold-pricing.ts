export type TaxPolicy = "inclusive" | "exclusive" | "none";

export type HoldQuote = {
  currency: "INR";
  baseAmountMinor: bigint;
  taxAmountMinor: bigint;
  totalAmountMinor: bigint;
  taxRateBps: number;
  taxPolicy: TaxPolicy;
};

/** Calculates a quote entirely in integer paise, including tax rounding. */
export function calculateHoldQuote(input: {
  baseAmountMinor: bigint;
  taxRateBps: number;
  taxPolicy: TaxPolicy;
}): HoldQuote {
  const { baseAmountMinor, taxRateBps, taxPolicy } = input;
  if (
    baseAmountMinor < 0n ||
    !Number.isInteger(taxRateBps) ||
    taxRateBps < 0 ||
    taxRateBps > 10_000
  ) {
    throw new RangeError("Invalid price settings");
  }

  const rate = BigInt(taxRateBps);
  const denominator = taxPolicy === "inclusive" ? 10_000n + rate : 10_000n;
  const taxAmountMinor =
    taxPolicy === "none"
      ? 0n
      : taxPolicy === "exclusive"
        ? (baseAmountMinor * rate + 5_000n) / 10_000n
        : (baseAmountMinor * rate + denominator / 2n) / denominator;

  return {
    currency: "INR",
    baseAmountMinor,
    taxAmountMinor,
    totalAmountMinor:
      taxPolicy === "exclusive" ? baseAmountMinor + taxAmountMinor : baseAmountMinor,
    taxRateBps,
    taxPolicy,
  };
}
