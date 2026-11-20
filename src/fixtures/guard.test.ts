import { afterEach, describe, expect, it, vi } from "vitest";

import { resetServerEnvForTests } from "@/lib/env";

import { assertDevFixturesAllowed, withDevFixtures } from "./guard";

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvForTests();
});

describe("development fixture guard", () => {
  it("refuses fixtures without the explicit opt-in flag", () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("ENABLE_DEV_FIXTURES", "false");

    expect(() => assertDevFixturesAllowed()).toThrow(/ENABLE_DEV_FIXTURES/);
  });

  it("fails closed when production enables fixtures", () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("APP_BASE_URL", "https://spectragardens.example");
    vi.stubEnv("DATABASE_URL", "postgresql://example");
    vi.stubEnv("ENABLE_DEV_FIXTURES", "true");

    expect(() => assertDevFixturesAllowed()).toThrow(/cannot be enabled in production/);
  });

  it("refuses fixtures in staging even when the opt-in flag is set", () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("ENABLE_DEV_FIXTURES", "true");

    expect(() => assertDevFixturesAllowed()).toThrow(/outside development or test/);
  });

  it("allows fixtures only when both conditions are met", () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("ENABLE_DEV_FIXTURES", "true");

    expect(() => assertDevFixturesAllowed()).not.toThrow();
    expect(withDevFixtures(() => ["fixture"])).toEqual(["fixture"]);
  });
});
