/**
 * Money is stored and passed around as integer paise. Floating point is never
 * used for authoritative amounts (DESIGN.md §10).
 */

export const PAISE_PER_RUPEE = 100;

export function assertPaise(value: number, label = "amount"): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer number of paise.`);
  }
  if (value < 0) {
    throw new RangeError(`${label} must not be negative.`);
  }
  return value;
}

function groupIndianDigits(value: number): string {
  const digits = String(value);
  if (digits.length <= 3) return digits;

  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${lastThree}`;
}

/** Formats integer paise as Indian rupees, e.g. 20800000 → "₹2,08,000.00". */
export function formatPaise(paise: number): string {
  assertPaise(paise);
  const rupees = Math.floor(paise / PAISE_PER_RUPEE);
  const fraction = paise % PAISE_PER_RUPEE;
  return `₹${groupIndianDigits(rupees)}.${String(fraction).padStart(2, "0")}`;
}

/** Formats integer paise without a fractional part, for compact display. */
export function formatPaiseCompact(paise: number): string {
  assertPaise(paise);
  return `₹${groupIndianDigits(Math.round(paise / PAISE_PER_RUPEE))}`;
}
