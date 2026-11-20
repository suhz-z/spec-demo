import { describe, expect, it } from "vitest";

import {
  ConfigurationError,
  parsePublicEnv,
  parseServerEnv,
  supabasePublicKey,
} from "./env-schema";

describe("server environment", () => {
  it("applies safe defaults for local development", () => {
    const env = parseServerEnv({});

    expect(env.APP_ENV).toBe("development");
    expect(env.APP_BASE_URL).toBe("http://localhost:3000");
    expect(env.PAYMENT_PROVIDER).toBe("sandbox");
    expect(env.PAYMENTS_LIVE_ENABLED).toBe(false);
    expect(env.HOLD_DURATION_SECONDS).toBe(600);
    expect(env.INVENTORY_POLL_SECONDS).toBe(20);
    expect(env.ENABLE_DEV_FIXTURES).toBe(false);
  });

  it("rejects live payments and non-sandbox providers", () => {
    expect(() => parseServerEnv({ PAYMENTS_LIVE_ENABLED: "true" })).toThrow(ConfigurationError);
    expect(() => parseServerEnv({ PAYMENT_PROVIDER: "razorpay" })).toThrow(ConfigurationError);
  });

  it("rejects fixtures in production", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "production",
        APP_BASE_URL: "https://spectragardens.example",
        DATABASE_URL: "postgresql://example",
        ENABLE_DEV_FIXTURES: "true",
      }),
    ).toThrow(ConfigurationError);
  });

  it("requires a database URL and HTTPS in production", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "production",
        APP_BASE_URL: "https://spectragardens.example",
      }),
    ).toThrow(/DATABASE_URL/);

    expect(() =>
      parseServerEnv({
        APP_ENV: "production",
        APP_BASE_URL: "http://spectragardens.example",
        DATABASE_URL: "postgresql://example",
      }),
    ).toThrow(/APP_BASE_URL/);
  });

  it("fails closed when production secrets are missing", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "production",
        APP_BASE_URL: "https://spectragardens.example",
        DATABASE_URL: "postgresql://example",
      }),
    ).toThrow(/GUEST_SESSION_SECRET/);
  });

  it("enforces hold and polling bounds", () => {
    expect(() => parseServerEnv({ HOLD_DURATION_SECONDS: "30" })).toThrow(ConfigurationError);
    expect(() => parseServerEnv({ INVENTORY_POLL_SECONDS: "60" })).toThrow(ConfigurationError);
  });

  it("does not echo secret values in configuration errors", () => {
    try {
      parseServerEnv({
        PAYMENT_WEBHOOK_SECRET: "short",
      });
      throw new Error("expected parse to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as Error).message).not.toContain("short");
      expect((error as Error).message).toContain("PAYMENT_WEBHOOK_SECRET");
    }
  });
});

describe("public environment", () => {
  it("allows an unconfigured local environment", () => {
    expect(parsePublicEnv({})).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
    });
  });

  it("prefers a publishable key over a legacy anon key", () => {
    expect(
      supabasePublicKey({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-anon-key",
      }),
    ).toBe("sb_publishable_example");
    expect(
      supabasePublicKey({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-anon-key",
      }),
    ).toBe("legacy-anon-key");
  });

  it("rejects a malformed Supabase URL", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).toThrow(
      ConfigurationError,
    );
  });
});
