import { NextResponse, type NextRequest } from "next/server";

import { SANDBOX_SIGNATURE_HEADER } from "@/modules/payments/sandbox-provider";
import { processPaymentWebhook } from "@/modules/payments/webhook-handler.server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (rawBody.length > 64_384) {
    return NextResponse.json({ error: "invalid_request" }, { status: 413 });
  }

  const result = await processPaymentWebhook({
    rawBody,
    signature: request.headers.get(SANDBOX_SIGNATURE_HEADER),
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
