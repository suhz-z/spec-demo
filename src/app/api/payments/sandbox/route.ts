import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { getSessionHash, hasSameOrigin } from "@/modules/bookings/session.server";
import {
  sandboxSimulationInputSchema,
  type PaymentRecord,
} from "@/modules/payments/payment-domain";
import { paymentRepository } from "@/modules/payments/payment-repository.server";
import { createSandboxPaymentProvider } from "@/modules/payments/sandbox-provider";
import { processPaymentWebhook } from "@/modules/payments/webhook-handler.server";

export const runtime = "nodejs";

const logger = createLogger({ module: "payments-sandbox" });

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Development-only preview of documented payment outcomes. It constructs a
 * signed sandbox event and runs it through the real webhook verification path;
 * it never exists in staging or production.
 */
export async function POST(request: NextRequest) {
  const environment = getServerEnv();
  if (environment.APP_ENV !== "development" && environment.APP_ENV !== "test") {
    return json({ error: "not_found" }, 404);
  }
  if (!hasSameOrigin(request)) return json({ error: "invalid_origin" }, 403);

  const sessionIdHash = getSessionHash(request);
  if (!sessionIdHash) return json({ error: "payment_unavailable" }, 409);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4_096) return json({ error: "invalid_request" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const input = sandboxSimulationInputSchema.safeParse(body);
  if (!input.success) return json({ error: "invalid_request" }, 400);

  try {
    if (!environment.PAYMENT_SANDBOX_SECRET || !environment.PAYMENT_WEBHOOK_SECRET) {
      return json({ error: "payment_unavailable" }, 503);
    }

    const found = await paymentRepository.transaction(async (tx) => {
      const booking = await tx.getBookingByReference(input.data.bookingReference);
      if (!booking || booking.sessionIdHash !== sessionIdHash) return null;
      const payment: PaymentRecord | null = await tx.findLatestPayment(booking.id);
      return payment && payment.providerOrderId ? payment : null;
    });
    if (!found?.providerOrderId) return json({ error: "payment_unavailable" }, 409);

    const provider = createSandboxPaymentProvider({
      sandboxSecret: environment.PAYMENT_SANDBOX_SECRET,
      webhookSecret: environment.PAYMENT_WEBHOOK_SECRET,
    });
    const event = provider.createSandboxWebhookEvent({
      providerOrderId: found.providerOrderId,
      amountMinor: found.amountMinor,
      outcome: input.data.outcome,
    });

    const result = await processPaymentWebhook({
      rawBody: event.rawBody,
      signature: event.signature,
    });
    return json(result.body, result.status);
  } catch (error) {
    logger.error("Sandbox payment simulation failed", { error });
    return json({ error: "payment_unavailable" }, 503);
  }
}
