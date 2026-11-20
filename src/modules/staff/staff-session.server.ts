import "server-only";

import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { supabasePublicKey } from "@/lib/env-schema";
import { createLogger } from "@/lib/logger";

import type { StaffIdentity } from "./staff-domain";
import { staffRepository } from "./staff-repository.server";

const logger = createLogger({ module: "staff-auth" });

const supabaseUserSchema = z.object({ id: z.uuid() });

export type StaffAuthentication =
  | { kind: "authenticated"; identity: StaffIdentity }
  | { kind: "unauthenticated" }
  | { kind: "unavailable" };

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return /^[A-Za-z0-9._~+/-]{20,4096}$/.test(token) ? token : null;
}

async function verifySupabaseUser(token: string): Promise<string | null> {
  const environment = getServerEnv();
  const baseUrl = environment.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = supabasePublicKey(environment);
  if (!baseUrl || !anonKey) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    method: "GET",
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return null;

  const payload: unknown = await response.json().catch(() => null);
  const parsed = supabaseUserSchema.safeParse(payload);
  return parsed.success ? parsed.data.id : null;
}

/**
 * Resolves a staff identity from a Supabase access token and the database role
 * assignment. Missing configuration is reported as unavailable so the caller
 * fails closed with 503 instead of treating every request as an ordinary guest.
 */
export async function authenticateStaff(request: Request): Promise<StaffAuthentication> {
  let environment;
  try {
    environment = getServerEnv();
  } catch (error) {
    logger.error("Staff authentication configuration is invalid", { error });
    return { kind: "unavailable" };
  }

  if (!environment.NEXT_PUBLIC_SUPABASE_URL || !supabasePublicKey(environment)) {
    logger.warn("Staff authentication is unavailable because Supabase Auth is not configured");
    return { kind: "unavailable" };
  }

  const token = readBearerToken(request);
  if (!token) return { kind: "unauthenticated" };

  let authUserId: string | null;
  try {
    authUserId = await verifySupabaseUser(token);
  } catch (error) {
    logger.warn("Staff token verification failed", { error });
    return { kind: "unauthenticated" };
  }
  if (!authUserId) return { kind: "unauthenticated" };

  try {
    const identity = await staffRepository.transaction((tx) =>
      tx.findActiveStaffByAuthUserId(authUserId),
    );
    if (!identity) {
      logger.warn("Authenticated user has no active staff profile");
      return { kind: "unauthenticated" };
    }
    return { kind: "authenticated", identity };
  } catch (error) {
    logger.error("Staff role lookup failed", { error });
    return { kind: "unavailable" };
  }
}
