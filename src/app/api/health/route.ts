import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe. It reports safeguards, not secrets, and performs no
 * database query so that a database outage is distinguishable from a dead app.
 */
export function GET() {
  const environment = getServerEnv();

  return NextResponse.json({
    status: "ok",
    environment: environment.APP_ENV,
    payments: {
      provider: environment.PAYMENT_PROVIDER,
      liveEnabled: environment.PAYMENTS_LIVE_ENABLED,
    },
    fixturesEnabled: environment.ENABLE_DEV_FIXTURES,
    time: new Date().toISOString(),
  });
}
