import { describe, expect, it } from "vitest";

import { redact, redactRecord } from "./redact";

describe("redact", () => {
  it("redacts personal and credential-like fields at any depth", () => {
    const result = redact({
      bookingId: "bk_123",
      buyer: {
        name: "Asha Menon",
        email: "asha@example.com",
        mobile: "+919876543210",
      },
      headers: { authorization: "Bearer secret-token" },
    });

    expect(result).toEqual({
      bookingId: "bk_123",
      buyer: {
        name: "[redacted]",
        email: "[redacted]",
        mobile: "[redacted]",
      },
      headers: { authorization: "[redacted]" },
    });
  });

  it("does not mutate the input", () => {
    const input = { mobile: "+919876543210", nested: { token: "abc" } };
    redact(input);

    expect(input.mobile).toBe("+919876543210");
    expect(input.nested.token).toBe("abc");
  });

  it("handles circular references without throwing", () => {
    const input: Record<string, unknown> = { id: "1" };
    input.self = input;

    expect(redact(input)).toEqual({ id: "1", self: "[circular]" });
  });

  it("preserves safe scalar values", () => {
    expect(redactRecord({ status: "booked", amount: 20800000, ok: true })).toEqual({
      status: "booked",
      amount: 20800000,
      ok: true,
    });
  });
});
