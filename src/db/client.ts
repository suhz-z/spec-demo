import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { requireServerEnv } from "@/lib/env";

import * as schema from "./schema";

export type Database = ReturnType<typeof createDatabase>;

/**
 * Connections are created lazily so that static builds and pages that do not
 * touch the database never require DATABASE_URL. Local development against a
 * placeholder URL fails only when a query is actually attempted.
 */
function createDatabase(connectionString: string) {
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  return drizzle(client, { schema, casing: "snake_case" });
}

let cached: Database | undefined;

export function getDb(): Database {
  cached ??= createDatabase(requireServerEnv("DATABASE_URL"));
  return cached;
}

/** Test-only reset; not used by application code. */
export function resetDbForTests(): void {
  cached = undefined;
}
