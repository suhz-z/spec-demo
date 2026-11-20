import "server-only";

import { ConfigurationError } from "@/lib/env-schema";
import { getServerEnv } from "@/lib/env";

/**
 * Fixtures are development conveniences, never production data.
 *
 * DESIGN.md §3 requires a fail-closed guard: if fixture access is requested in
 * any environment that is not clearly local/test, or without the explicit
 * opt-in flag, the application must refuse instead of silently serving sample
 * inventory, prices, or identities.
 */
export function assertDevFixturesAllowed(): void {
  const environment = getServerEnv();

  if (environment.APP_ENV !== "development" && environment.APP_ENV !== "test") {
    throw new ConfigurationError([
      "ENABLE_DEV_FIXTURES: development fixtures cannot be used outside development or test.",
    ]);
  }

  if (!environment.ENABLE_DEV_FIXTURES) {
    throw new ConfigurationError([
      "ENABLE_DEV_FIXTURES: set to true to load development fixtures.",
    ]);
  }
}

/**
 * Wraps a fixture module so it can only be evaluated after the guard passes.
 * Phase 4 uses this for the development map dataset.
 */
export function withDevFixtures<T>(load: () => T): T {
  assertDevFixturesAllowed();
  return load();
}
