import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { hashSessionToken } from "./hold-domain";
import {
  GUEST_SESSION_COOKIE,
  getOrCreateGuestSession,
  getSessionHash,
  issueSignedSession,
  verifySignedSession,
} from "./session.server";

const ORIGINAL_SECRET = process.env.GUEST_SESSION_SECRET;

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.GUEST_SESSION_SECRET;
  else process.env.GUEST_SESSION_SECRET = ORIGINAL_SECRET;
});

function requestWithCookie(value?: string): NextRequest {
  const request = new NextRequest("http://localhost:3000/villa/V01");
  if (value) request.cookies.set(GUEST_SESSION_COOKIE, value);
  return request;
}

describe("guest session binding", () => {
  it("issues a signed cookie and accepts it on the next request", () => {
    process.env.GUEST_SESSION_SECRET = "test-secret-at-least-16-characters";
    const response = new NextResponse();
    const token = issueSignedSession(response);
    const cookie = response.cookies.get(GUEST_SESSION_COOKIE)?.value;

    expect(cookie).toMatch(/^[a-f0-9]{64}\.[a-f0-9]{64}$/);
    expect(verifySignedSession(cookie)).toBe(token);
    expect(getSessionHash(requestWithCookie(cookie))).toBe(hashSessionToken(token));
  });

  it("reuses a valid session instead of minting a new identity", () => {
    process.env.GUEST_SESSION_SECRET = "test-secret-at-least-16-characters";
    const issuer = new NextResponse();
    const token = issueSignedSession(issuer);
    const cookie = issuer.cookies.get(GUEST_SESSION_COOKIE)?.value ?? "";

    const response = new NextResponse();
    expect(getOrCreateGuestSession(requestWithCookie(cookie), response)).toBe(token);
    expect(response.cookies.get(GUEST_SESSION_COOKIE)).toBeUndefined();
  });

  it("rejects unsigned, forged, and tampered cookies", () => {
    process.env.GUEST_SESSION_SECRET = "test-secret-at-least-16-characters";
    const response = new NextResponse();
    const token = issueSignedSession(response);
    const cookie = response.cookies.get(GUEST_SESSION_COOKIE)?.value ?? "";
    const [raw, signature] = cookie.split(".");
    const forged = `${"a".repeat(64)}.${signature}`;

    expect(verifySignedSession(raw)).toBeNull();
    expect(verifySignedSession(forged)).toBeNull();
    expect(verifySignedSession(`${raw}.${"0".repeat(64)}`)).toBeNull();
    expect(getSessionHash(requestWithCookie(raw))).toBeNull();
    expect(getSessionHash(requestWithCookie(forged))).toBeNull();
    expect(token).toHaveLength(64);
  });

  it("rotating the server secret invalidates previously issued sessions", () => {
    process.env.GUEST_SESSION_SECRET = "first-secret-at-least-16-characters";
    const issuer = new NextResponse();
    issueSignedSession(issuer);
    const cookie = issuer.cookies.get(GUEST_SESSION_COOKIE)?.value ?? "";

    process.env.GUEST_SESSION_SECRET = "second-secret-at-least-16-characters";
    expect(verifySignedSession(cookie)).toBeNull();
    expect(getSessionHash(requestWithCookie(cookie))).toBeNull();
  });
});
