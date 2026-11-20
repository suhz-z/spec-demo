import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { hashSessionToken } from "./hold-domain";

export const GUEST_SESSION_COOKIE = "sg_guest_session";

/** Local-only fallback; production must configure GUEST_SESSION_SECRET. */
const DEVELOPMENT_SESSION_SECRET = "spectra-gardens-local-session-secret-change-me";

const SIGNED_SESSION_PATTERN = /^([a-f0-9]{64})\.([a-f0-9]{64})$/;

function signSessionToken(token: string): string {
  const secret = process.env.GUEST_SESSION_SECRET ?? DEVELOPMENT_SESSION_SECRET;
  return createHmac("sha256", secret).update(token, "utf8").digest("hex");
}

/** Returns the raw token only when the cookie carries a valid server signature. */
export function verifySignedSession(value: string | undefined): string | null {
  if (!value) return null;
  const match = SIGNED_SESSION_PATTERN.exec(value);
  if (!match || match[1] === undefined || match[2] === undefined) return null;
  const token = match[1];
  const signature = match[2];
  const expected = Buffer.from(signSessionToken(token), "hex");
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  return token;
}

export function issueSignedSession(response: NextResponse): string {
  const token = randomBytes(32).toString("hex");
  response.cookies.set(GUEST_SESSION_COOKIE, `${token}.${signSessionToken(token)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export function getOrCreateGuestSession(request: NextRequest, response: NextResponse): string {
  const existing = verifySignedSession(request.cookies.get(GUEST_SESSION_COOKIE)?.value);
  return existing ?? issueSignedSession(response);
}

export function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export function getSessionHash(request: NextRequest): string | null {
  const token = verifySignedSession(request.cookies.get(GUEST_SESSION_COOKIE)?.value);
  return token ? hashSessionToken(token) : null;
}

/** Reads the same verified identity from a server component (no request object). */
export async function getCurrentSessionHash(): Promise<string | null> {
  const store = await cookies();
  const token = verifySignedSession(store.get(GUEST_SESSION_COOKIE)?.value);
  return token ? hashSessionToken(token) : null;
}
