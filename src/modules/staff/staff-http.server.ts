import "server-only";

import { NextResponse } from "next/server";

import { createLogger } from "@/lib/logger";

import {
  isAuthorized,
  type StaffFailureCode,
  type StaffIdentity,
  type StaffPermission,
} from "./staff-domain";
import { authenticateStaff } from "./staff-session.server";

const logger = createLogger({ module: "staff-http" });

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export type BodyResult = { ok: true; value: unknown } | { ok: false; response: NextResponse };

export async function readJsonBody(request: Request, maxBytes = 16_384): Promise<BodyResult> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: json({ error: "invalid_request" }, 400) };
  }
  if (text.length > maxBytes) {
    return { ok: false, response: json({ error: "invalid_request" }, 413) };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: json({ error: "invalid_request" }, 400) };
  }
}

export type AuthorizationResult =
  { ok: true; identity: StaffIdentity } | { ok: false; response: NextResponse };

/**
 * Server-side authorization for every staff operation. Role checks happen here
 * and again in the domain functions; UI visibility is not a security control.
 */
export async function authorizeStaffRequest(
  request: Request,
  permission: StaffPermission,
): Promise<AuthorizationResult> {
  let authentication;
  try {
    authentication = await authenticateStaff(request);
  } catch (error) {
    logger.error("Staff authentication failed unexpectedly", { error });
    return { ok: false, response: json({ error: "staff_auth_unavailable" }, 503) };
  }

  if (authentication.kind === "unavailable") {
    return { ok: false, response: json({ error: "staff_auth_unavailable" }, 503) };
  }
  if (authentication.kind === "unauthenticated") {
    return { ok: false, response: json({ error: "unauthorized" }, 401) };
  }
  if (!isAuthorized(authentication.identity.role, permission)) {
    logger.warn("Staff request denied by role", {
      permission,
      role: authentication.identity.role,
    });
    return { ok: false, response: json({ error: "forbidden" }, 403) };
  }

  return { ok: true, identity: authentication.identity };
}

export function staffFailureStatus(code: StaffFailureCode): number {
  switch (code) {
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "invalid":
      return 422;
    case "conflict":
      return 409;
  }
}
