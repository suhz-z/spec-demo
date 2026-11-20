import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import {
  verifiedPaymentEventSchema,
  type PaymentProvider,
  type ProviderOrder,
  type SandboxOutcome,
  type VerifiedPaymentEvent,
} from "./payment-domain";

export const SANDBOX_SIGNATURE_HEADER = "x-sg-signature";
const DEFAULT_TOLERANCE_SECONDS = 300;

export type PaymentSignatureErrorCode =
  "missing_signature" | "invalid_signature" | "stale_signature" | "invalid_payload";

export class PaymentSignatureError extends Error {
  readonly code: PaymentSignatureErrorCode;

  constructor(code: PaymentSignatureErrorCode) {
    super(code);
    this.name = "PaymentSignatureError";
    this.code = code;
  }
}

export function signSandboxWebhook(
  secret: string,
  timestampSeconds: number,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestampSeconds}.${rawBody}`, "utf8")
    .digest("hex");
}

export function formatSandboxSignature(timestampSeconds: number, signatureHex: string): string {
  return `t=${timestampSeconds},v1=${signatureHex}`;
}

function parseSignatureHeader(header: string): { timestamp: number; signature: string } | null {
  const parts = header.split(",");
  let timestamp: number | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const [key, value] = part.trim().split("=", 2);
    if (key === "t" && value && /^[0-9]{1,12}$/.test(value)) {
      timestamp = Number(value);
    }
    if (key === "v1" && value && /^[a-f0-9]{64}$/i.test(value)) {
      signature = value.toLowerCase();
    }
  }

  return timestamp !== null && signature !== null ? { timestamp, signature } : null;
}

function signaturesMatch(expectedHex: string, providedHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(providedHex, "hex");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deterministic sandbox order ID. Retrying the same merchant reference returns
 * the same ID, mirroring a real provider's idempotency-key behaviour.
 */
function sandboxOrderId(secret: string, merchantReference: string): string {
  const digest = createHmac("sha256", secret).update(merchantReference, "utf8").digest("hex");
  return `sbx_${digest.slice(0, 24)}`;
}

export type SandboxProviderOptions = {
  sandboxSecret: string;
  webhookSecret: string;
  toleranceSeconds?: number;
  now?: () => Date;
};

export type SandboxPaymentProvider = PaymentProvider & {
  createSandboxWebhookEvent(input: {
    providerOrderId: string;
    amountMinor: bigint;
    outcome: SandboxOutcome;
    eventId?: string;
    occurredAt?: Date;
  }): { rawBody: string; signature: string };
};

/**
 * Provider-neutral sandbox implementation. No live provider is selected or
 * contacted, and live payments remain blocked by environment validation.
 */
export function createSandboxPaymentProvider(
  options: SandboxProviderOptions,
): SandboxPaymentProvider {
  if (options.sandboxSecret.length < 16 || options.webhookSecret.length < 16) {
    throw new Error("Sandbox payment secrets are not configured");
  }
  const toleranceSeconds = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const now = options.now ?? (() => new Date());

  const provider: SandboxPaymentProvider = {
    name: "sandbox",

    async createOrder(request): Promise<ProviderOrder> {
      if (request.currency !== "INR" || request.amountMinor <= 0n) {
        throw new Error("Invalid sandbox order amount");
      }
      return { providerOrderId: sandboxOrderId(options.sandboxSecret, request.merchantReference) };
    },

    verifyWebhook({ rawBody, signature }): VerifiedPaymentEvent {
      if (!signature) throw new PaymentSignatureError("missing_signature");
      const parsedSignature = parseSignatureHeader(signature);
      if (!parsedSignature) throw new PaymentSignatureError("invalid_signature");

      const currentSeconds = Math.floor(now().getTime() / 1_000);
      if (Math.abs(currentSeconds - parsedSignature.timestamp) > toleranceSeconds) {
        throw new PaymentSignatureError("stale_signature");
      }

      const expected = signSandboxWebhook(
        options.webhookSecret,
        parsedSignature.timestamp,
        rawBody,
      );
      if (!signaturesMatch(expected, parsedSignature.signature)) {
        throw new PaymentSignatureError("invalid_signature");
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        throw new PaymentSignatureError("invalid_payload");
      }
      if (!isPlainRecord(payload)) {
        throw new PaymentSignatureError("invalid_payload");
      }

      const result = verifiedPaymentEventSchema.safeParse({
        ...payload,
        provider: provider.name,
      });
      if (!result.success) throw new PaymentSignatureError("invalid_payload");
      return result.data;
    },

    createSandboxWebhookEvent(input) {
      const occurredAt = input.occurredAt ?? now();
      const payload = {
        provider: provider.name,
        eventId: input.eventId ?? randomUUID(),
        eventType: `payment.${input.outcome}`,
        providerOrderId: input.providerOrderId,
        amountMinor: input.amountMinor.toString(),
        currency: "INR",
        occurredAt: occurredAt.toISOString(),
      };
      const rawBody = JSON.stringify(payload);
      const timestampSeconds = Math.floor(now().getTime() / 1_000);
      const signatureHex = signSandboxWebhook(options.webhookSecret, timestampSeconds, rawBody);
      return {
        rawBody,
        signature: formatSandboxSignature(timestampSeconds, signatureHex),
      };
    },
  };

  return provider;
}
