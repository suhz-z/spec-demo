import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createHold, createHoldInputSchema } from "@/modules/bookings/hold-domain";
import { holdRepository } from "@/modules/bookings/hold-repository.server";
import { getOrCreateGuestSession, hasSameOrigin } from "@/modules/bookings/session.server";

export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) return json({ error: "invalid_origin" }, 403);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4_096) return json({ error: "invalid_request" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const input = createHoldInputSchema.safeParse(body);
  if (!input.success) return json({ error: "invalid_request" }, 400);

  const response = json({ error: "temporarily_unavailable" }, 503);
  const sessionToken = getOrCreateGuestSession(request, response);
  const withSessionCookie = (result: NextResponse) => {
    const cookie = response.cookies.get("sg_guest_session");
    if (cookie) result.cookies.set(cookie.name, cookie.value, cookie);
    return result;
  };
  try {
    const env = getServerEnv();
    const result = await createHold(input.data, sessionToken, holdRepository, {
      durationSeconds: env.HOLD_DURATION_SECONDS,
    });
    if (!result.ok) {
      const status =
        result.code === "not_available" || result.code === "idempotency_expired" ? 409 : 503;
      return withSessionCookie(json({ error: result.code }, status));
    }
    return withSessionCookie(
      json(
        {
          hold: {
            id: result.hold.id,
            villaCode: result.hold.villaCode,
            expiresAt: result.hold.expiresAt.toISOString(),
            quote: {
              currency: result.hold.quote.currency,
              baseAmountMinor: result.hold.quote.baseAmountMinor.toString(),
              taxAmountMinor: result.hold.quote.taxAmountMinor.toString(),
              totalAmountMinor: result.hold.quote.totalAmountMinor.toString(),
              taxRateBps: result.hold.quote.taxRateBps,
              taxPolicy: result.hold.quote.taxPolicy,
            },
            reused: result.reused,
          },
        },
        result.reused ? 200 : 201,
      ),
    );
  } catch {
    return response;
  }
}
