import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import {
  createPaymentOrder,
  createPaymentOrderInputSchema,
  toPublicPayment,
} from "@/modules/payments/payment-domain";
import { paymentRepository } from "@/modules/payments/payment-repository.server";
import { createSandboxPaymentProvider } from "@/modules/payments/sandbox-provider";
import { getSessionHash, hasSameOrigin } from "@/modules/bookings/session.server";

export const runtime = "nodejs";

const logger = createLogger({ module: "payments-order" });

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
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

  const input = createPaymentOrderInputSchema.safeParse(body);
  if (!input.success) return json({ error: "invalid_request" }, 400);

  try {
    const environment = getServerEnv();
    if (!environment.PAYMENT_SANDBOX_SECRET || !environment.PAYMENT_WEBHOOK_SECRET) {
      return json({ error: "payment_unavailable" }, 503);
    }

    const provider = createSandboxPaymentProvider({
      sandboxSecret: environment.PAYMENT_SANDBOX_SECRET,
      webhookSecret: environment.PAYMENT_WEBHOOK_SECRET,
    });
    const result = await createPaymentOrder(input.data, sessionIdHash, paymentRepository, provider);

    if (!result.ok) {
      const status =
        result.code === "provider_error"
          ? 502
          : result.code === "unavailable" ||
              result.code === "hold_expired" ||
              result.code === "quote_changed" ||
              result.code === "invalid_state"
            ? 409
            : 503;
      return json({ error: result.code }, status);
    }

    return json(
      {
        payment: toPublicPayment(result.payment),
        reused: result.reused,
      },
      result.reused ? 200 : 201,
    );
  } catch (error) {
    logger.error("Payment order creation failed", { error });
    return json({ error: "payment_unavailable" }, 503);
  }
}
