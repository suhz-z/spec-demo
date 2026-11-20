import "server-only";

import { ConfigurationError, parseServerEnv, type ServerEnv } from "./env-schema";

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

export function requireServerEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = getServerEnv()[key];

  if (value === undefined || value === null || value === "") {
    throw new ConfigurationError([`${String(key)}: is required for this operation`]);
  }

  return value as NonNullable<ServerEnv[K]>;
}

/** Test-only reset; not exported from a production code path. */
export function resetServerEnvForTests(): void {
  cached = undefined;
}
