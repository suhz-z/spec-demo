import { describe, expect, it } from "vitest";

import {
  createSandboxPaymentProvider,
  formatSandboxSignature,
  PaymentSignatureError,
  signSandboxWebhook,
} from "./sandbox-provider";

const sandboxSecret = "sandbox-secret-for-tests-1234";
const webhookSecret = "webhook-secret-for-tests-1234";

function createProvider(now = new Date("2026-01-01T10:00:00.000Z")) {
  return createSandboxPaymentProvider({
    sandboxSecret,
    webhookSecret,
    toleranceSeconds: 300,
    now: () => now,
  });
}

describe("sandbox payment provider", () => {
  it("derives a stable order ID for retried merchant references", async () => {
    const provider = createProvider();
    const first = await provider.createOrder({
      merchantReference: "payment-1",
      idempotencyKey: "10000000-0000-4000-8000-000000000001",
      amountMinor: 10_000n,
      currency: "INR",
    });
    const retry = await provider.createOrder({
      merchantReference: "payment-1",
      idempotencyKey: "10000000-0000-4000-8000-000000000001",
      amountMinor: 10_000n,
      currency: "INR",
    });
    const other = await provider.createOrder({
      merchantReference: "payment-2",
      idempotencyKey: "10000000-0000-4000-8000-000000000002",
      amountMinor: 10_000n,
      currency: "INR",
    });

    expect(first.providerOrderId).toBe(retry.providerOrderId);
    expect(first.providerOrderId).not.toBe(other.providerOrderId);
    expect(first.providerOrderId).toMatch(/^sbx_[a-f0-9]{24}$/);
  });

  it("accepts a correctly signed event and normalises the amount", () => {
    const provider = createProvider();
    const event = provider.createSandboxWebhookEvent({
      providerOrderId: "sbx_123",
      amountMinor: 10_500_000n,
      outcome: "succeeded",
      eventId: "event-1",
    });

    const verified = provider.verifyWebhook(event);
    expect(verified).toMatchObject({
      provider: "sandbox",
      eventId: "event-1",
      eventType: "payment.succeeded",
      amountMinor: 10_500_000n,
      currency: "INR",
    });
  });

  it("rejects missing, malformed, tampered, stale, and wrong-secret signatures", () => {
    const provider = createProvider();
    const event = provider.createSandboxWebhookEvent({
      providerOrderId: "sbx_123",
      amountMinor: 10_500_000n,
      outcome: "failed",
    });

    expect(() => provider.verifyWebhook({ rawBody: event.rawBody, signature: null })).toThrow(
      PaymentSignatureError,
    );
    expect(() =>
      provider.verifyWebhook({ rawBody: event.rawBody, signature: "not-a-signature" }),
    ).toThrow(PaymentSignatureError);

    const tampered = event.rawBody.replace("payment.failed", "payment.succeeded");
    expect(() => provider.verifyWebhook({ rawBody: tampered, signature: event.signature })).toThrow(
      PaymentSignatureError,
    );

    const wrongSecret = createSandboxPaymentProvider({
      sandboxSecret,
      webhookSecret: "another-webhook-secret-1234",
      now: () => new Date("2026-01-01T10:00:00.000Z"),
    });
    expect(() => wrongSecret.verifyWebhook(event)).toThrow(PaymentSignatureError);

    const later = createProvider(new Date("2026-01-01T11:00:00.000Z"));
    expect(() => later.verifyWebhook(event)).toThrow(PaymentSignatureError);
  });

  it("rejects a signed but invalid payload", () => {
    const provider = createProvider();
    const timestamp = Math.floor(Date.parse("2026-01-01T10:00:00.000Z") / 1_000);
    const rawBody = JSON.stringify({ eventType: "payment.succeeded" });
    const signature = formatSandboxSignature(
      timestamp,
      signSandboxWebhook(webhookSecret, timestamp, rawBody),
    );

    expect(() => provider.verifyWebhook({ rawBody, signature })).toThrow(PaymentSignatureError);
  });
});
