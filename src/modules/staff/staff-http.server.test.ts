import { beforeEach, describe, expect, it, vi } from "vitest";

import { authorizeStaffRequest } from "./staff-http.server";
import { authenticateStaff } from "./staff-session.server";

const AUTH_ID = "11111111-1111-4111-8111-111111111111";
const TOKEN = "a".repeat(48);

vi.mock("@/lib/env", () => ({
  getServerEnv: vi.fn(() => ({
    APP_ENV: "test",
    LOG_LEVEL: "error",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  })),
  ConfigurationError: class ConfigurationError extends Error {},
}));

vi.mock("./staff-repository.server", () => ({
  staffRepository: {
    transaction: vi.fn(async (operation: (tx: unknown) => Promise<unknown>) =>
      operation({
        findActiveStaffByAuthUserId: async (id: string) =>
          id === AUTH_ID ? { profileId: "profile-1", authUserId: id, role: "sales" } : null,
      }),
    ),
  },
}));

function request(headers: Record<string, string> = {}): Request {
  return new Request("https://example.test/api/staff/inventory", { headers });
}

function supabaseResponse(id: string | null) {
  return {
    ok: id !== null,
    json: async () => (id ? { id } : { message: "invalid token" }),
  };
}

describe("staff HTTP authorization", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => supabaseResponse(AUTH_ID)),
    );
  });

  it("rejects missing and malformed bearer tokens before calling Supabase", async () => {
    const fetchMock = vi.mocked(fetch);
    expect(await authenticateStaff(request())).toMatchObject({ kind: "unauthenticated" });
    expect(await authenticateStaff(request({ Authorization: "Basic " + TOKEN }))).toMatchObject({
      kind: "unauthenticated",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("derives the role from the staff profile, not the token or request body", async () => {
    const result = await authenticateStaff(request({ Authorization: `Bearer ${TOKEN}` }));
    expect(result).toMatchObject({
      kind: "authenticated",
      identity: { role: "sales", authUserId: AUTH_ID },
    });
  });

  it("denies an authenticated user with no active staff profile", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => supabaseResponse(null)),
    );
    expect(await authenticateStaff(request({ Authorization: `Bearer ${TOKEN}` }))).toMatchObject({
      kind: "unauthenticated",
    });
  });

  it("returns 401 without a token and 403 when the role lacks the permission", async () => {
    const unauthenticated = await authorizeStaffRequest(request(), "inventory:read");
    expect(unauthenticated.ok).toBe(false);
    if (!unauthenticated.ok) expect(unauthenticated.response.status).toBe(401);

    const forbidden = await authorizeStaffRequest(
      request({ Authorization: `Bearer ${TOKEN}` }),
      "pricing:write",
    );
    expect(forbidden.ok).toBe(false);
    if (!forbidden.ok) expect(forbidden.response.status).toBe(403);

    const allowed = await authorizeStaffRequest(
      request({ Authorization: `Bearer ${TOKEN}` }),
      "inventory:write",
    );
    expect(allowed.ok).toBe(true);
  });
});
