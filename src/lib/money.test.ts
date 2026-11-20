import { describe, expect, it } from "vitest";

import { formatPaise, formatPaiseCompact, PAISE_PER_RUPEE } from "./money";

describe("money", () => {
  it("formats paise using Indian digit grouping", () => {
    expect(formatPaise(20_800_000)).toBe("₹2,08,000.00");
    expect(formatPaise(100_000_00)).toBe("₹1,00,000.00");
    expect(formatPaise(123_456_789)).toBe("₹12,34,567.89");
  });

  it("keeps two fraction digits for whole rupees", () => {
    expect(formatPaise(5 * PAISE_PER_RUPEE)).toBe("₹5.00");
    expect(formatPaise(0)).toBe("₹0.00");
  });

  it("formats a compact value without fraction digits", () => {
    expect(formatPaiseCompact(20_800_000)).toBe("₹2,08,000");
  });

  it("rejects unsafe, fractional, and negative values", () => {
    expect(() => formatPaise(1.5)).toThrow(RangeError);
    expect(() => formatPaise(-1)).toThrow(RangeError);
    expect(() => formatPaise(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});
