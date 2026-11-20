import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

/**
 * Live payments are deliberately blocked until the payment provider, merchant
 * account, refund terms, and client approvals exist.
 */
const sandboxOnlyPaymentProvider = z
  .string()
  .default("sandbox")
  .superRefine((value, context) => {
    if (value !== "sandbox") {
      context.addIssue({
        code: "custom",
        message:
          "Only the sandbox payment provider is permitted until a provider is approved by the client.",
      });
    }
  })
  .transform(() => "sandbox" as const);

const livePaymentsDisabled = z
  .enum(["true", "false"])
  .default("false")
  .superRefine((value, context) => {
    if (value === "true") {
      context.addIssue({
        code: "custom",
        message:
          "Live payments are disabled. Do not enable them without written client approval and production provider configuration.",
      });
    }
  })
  .transform((value) => value === "true");

export const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    APP_BASE_URL: z.url().default("http://localhost:3000"),

    DATABASE_URL: z.string().min(1).optional(),
    DIRECT_DATABASE_URL: z.string().min(1).optional(),

    NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
    /** Newer Supabase projects issue publishable keys instead of anon keys. */
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

    PAYMENT_PROVIDER: sandboxOnlyPaymentProvider,
    PAYMENTS_LIVE_ENABLED: livePaymentsDisabled,
    PAYMENT_SANDBOX_SECRET: z.string().min(16).optional(),
    PAYMENT_WEBHOOK_SECRET: z.string().min(16).optional(),
    OUTBOX_WORKER_SECRET: z.string().min(16).optional(),
    /** Vercel Cron sends this value as a Bearer token when configured. */
    CRON_SECRET: z.string().min(16).optional(),
    /** Signs guest-session cookies so browsers cannot choose their own session identity. */
    GUEST_SESSION_SECRET: z.string().min(16).optional(),
    NOTIFICATION_PROVIDER: z.enum(["disabled", "sandbox"]).default("disabled"),

    HOLD_DURATION_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
    BOOKING_TERMS_VERSION: z.string().trim().min(1).max(80).optional(),
    INVENTORY_POLL_SECONDS: z.coerce.number().int().min(15).max(30).default(20),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

    ENABLE_DEV_FIXTURES: booleanString.default(false),
  })
  .superRefine((environment, context) => {
    if (environment.APP_ENV === "production" && environment.ENABLE_DEV_FIXTURES) {
      context.addIssue({
        code: "custom",
        path: ["ENABLE_DEV_FIXTURES"],
        message: "Development fixtures cannot be enabled in production.",
      });
    }

    if (environment.APP_ENV === "production" && !environment.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required in production.",
      });
    }

    if (environment.APP_ENV === "production" && environment.APP_BASE_URL.startsWith("http://")) {
      context.addIssue({
        code: "custom",
        path: ["APP_BASE_URL"],
        message: "APP_BASE_URL must use HTTPS in production.",
      });
    }

    if (environment.APP_ENV === "production") {
      const requiredSecrets = [
        "GUEST_SESSION_SECRET",
        "PAYMENT_SANDBOX_SECRET",
        "PAYMENT_WEBHOOK_SECRET",
        "OUTBOX_WORKER_SECRET",
      ] as const;
      for (const key of requiredSecrets) {
        if (!environment[key]) {
          context.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required in production.`,
          });
        }
      }
    }
  });

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

/** Supports both current publishable keys and legacy anon keys. */
export function supabasePublicKey(
  environment: Pick<
    ServerEnv,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  >,
): string | undefined {
  return (
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? environment.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export class ConfigurationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid environment configuration:\n${issues.join("\n")}`);
    this.name = "ConfigurationError";
    this.issues = issues;
  }
}

/**
 * Zod's default messages can include the received value. Environment values can
 * be secrets, so configuration errors only report the field and a safe reason.
 */
function safeIssueReason(issue: z.core.$ZodIssue): string {
  switch (issue.code) {
    case "invalid_type":
      return "is missing or has the wrong type";
    case "invalid_value":
    case "invalid_union":
    case "invalid_key":
    case "invalid_element":
      return "is not an allowed value";
    case "invalid_format":
      return "has an invalid format";
    case "too_small":
      return "is below the allowed minimum";
    case "too_big":
      return "is above the allowed maximum";
    case "not_multiple_of":
      return "is not a valid increment";
    case "unrecognized_keys":
      return "contains unrecognised keys";
    case "custom":
      return issue.message;
    default:
      return "is invalid";
  }
}

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${safeIssueReason(issue)}`;
  });
}

function parseWithSafeErrors<T>(schema: z.ZodType<T>, raw: Record<string, unknown>): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ConfigurationError(formatIssues(result.error));
  }
  return result.data;
}

export function parseServerEnv(raw: Record<string, unknown>): ServerEnv {
  return parseWithSafeErrors(serverEnvSchema, raw);
}

export function parsePublicEnv(raw: Record<string, unknown>): PublicEnv {
  return parseWithSafeErrors(publicEnvSchema, raw);
}
