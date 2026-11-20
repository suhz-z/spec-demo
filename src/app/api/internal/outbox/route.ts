import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { runOutboxWorker } from "@/modules/outbox/outbox-worker.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const logger = createLogger({ module: "outbox-route" });

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function readSecret(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-outbox-secret");
}

function isAuthorized(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const providedBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return (
    providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes)
  );
}

async function handle(request: NextRequest) {
  let secrets: string[];
  try {
    const environment = getServerEnv();
    secrets = [environment.OUTBOX_WORKER_SECRET, environment.CRON_SECRET].filter(
      (value): value is string => Boolean(value),
    );
  } catch (error) {
    logger.error("Outbox worker configuration is invalid", {
      error: error instanceof Error ? error.name : "configuration_error",
    });
    return json({ error: "worker_unavailable" }, 503);
  }
  if (secrets.length === 0) return json({ error: "worker_unavailable" }, 503);

  const provided = readSecret(request);
  if (!secrets.some((secret) => isAuthorized(provided, secret))) {
    logger.warn("Outbox worker invocation was not authorized");
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const summary = await runOutboxWorker();
    return json({ ok: true, summary });
  } catch (error) {
    logger.error("Outbox worker invocation failed", {
      error: error instanceof Error ? error.name : "worker_error",
    });
    return json({ error: "worker_failed" }, 500);
  }
}

/**
 * Scheduled entry point. Invoke from a scheduler (GET or POST) with
 * `Authorization: Bearer $OUTBOX_WORKER_SECRET`, or set `CRON_SECRET` and let
 * Vercel Cron send that as the Bearer token.
 */
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
