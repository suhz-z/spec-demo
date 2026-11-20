import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js reads .env.local first. Mirror that for migration commands, then fall
// back to .env. Never load .env.example: it contains placeholder secrets.
config({ path: ".env.local" });
config();

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
  strict: true,
  verbose: true,
});
