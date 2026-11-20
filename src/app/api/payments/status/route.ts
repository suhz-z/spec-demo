import { NextResponse, type NextRequest } from "next/server";

import { createLogger } from "@/lib/logger";
import { getPaymentStatus, paymentReferenceQuerySchema } from "@/modules/payments/payment-domain";
import { paymentRepository } from "@/modules/payments/payment-repository.server";
import { getSessionHash } from "@/modules/bookings/session.server";

export const runtime = "nodejs";

const logger = createLogger({ module: "payments-status" });

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const sessionIdHash = getSessionHash(request);
  if (!sessionIdHash) return json({ error: "not_found" }, 404);

  const parsed = paymentReferenceQuerySchema.safeParse({
    reference: request.nextUrl.searchParams.get("reference") ?? "",
  });
  if (!parsed.success) return json({ error: "not_found" }, 404);

  try {
    const status = await getPaymentStatus(parsed.data.reference, sessionIdHash, paymentRepository);
    if (!status) return json({ error: "not_found" }, 404);
    return json({ status });
  } catch (error) {
    logger.error("Payment status read failed", { error });
    return json({ error: "status_unavailable" }, 503);
  }
}
