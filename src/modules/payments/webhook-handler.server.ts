import "server-only";

import { getServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

import { applyPaymentEvent } from "./payment-domain";
import { paymentRepository } from "./payment-repository.server";
import { createSandboxPaymentProvider, PaymentSignatureError } from "./sandbox-provider";

const logger = createLogger({ module: "payments" });

export type WebhookHttpResult = {
  status: number;
  body: Record<string, unknown>;
};

/**
 * Shared webhook processing for the provider endpoint and the development-only
 * sandbox simulator. Signature validation always runs before any state change.
 */
export async function processPaymentWebhook(input: {
  rawBody: string;
  signature: string | null;
}): Promise<WebhookHttpResult> {
  try {
    const environment = getServerEnv();
    if (!environment.PAYMENT_SANDBOX_SECRET || !environment.PAYMENT_WEBHOOK_SECRET) {
      logger.warn("Payment webhook rejected because sandbox secrets are not configured");
      return { status: 503, body: { error: "payment_unavailable" } };
    }

    const provider = createSandboxPaymentProvider({
      sandboxSecret: environment.PAYMENT_SANDBOX_SECRET,
      webhookSecret: environment.PAYMENT_WEBHOOK_SECRET,
    });

    let event;
    try {
      event = provider.verifyWebhook({ rawBody: input.rawBody, signature: input.signature });
    } catch (error) {
      if (error instanceof PaymentSignatureError) {
        logger.warn("Payment webhook signature rejected", { reason: error.code });
        return {
          status: error.code === "invalid_payload" ? 400 : 401,
          body: { error: error.code },
        };
      }
      throw error;
    }

    const result = await applyPaymentEvent(event, paymentRepository);
    if (!result.ok) {
      const status =
        result.code === "unknown_payment" ? 404 : result.code === "amount_mismatch" ? 422 : 409;
      logger.warn("Payment webhook could not be applied", {
        provider: event.provider,
        eventId: event.eventId,
        reason: result.code,
      });
      return { status, body: { error: result.code } };
    }

    logger.info("Payment webhook applied", {
      provider: event.provider,
      eventId: event.eventId,
      outcome: result.outcome,
      duplicate: result.duplicate,
      ignored: result.ignored,
    });

    return {
      status: 200,
      body: {
        received: true,
        outcome: result.outcome,
        duplicate: result.duplicate,
      },
    };
  } catch (error) {
    logger.error("Payment webhook failed unexpectedly", { error });
    return { status: 500, body: { error: "internal" } };
  }
}
