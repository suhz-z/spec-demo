import "server-only";

import { getServerEnv } from "./env";
import { redactRecord } from "./redact";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type Logger = {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
};

function readLogConfiguration(): { level: LogLevel; includeErrorDetails: boolean } {
  try {
    const environment = getServerEnv();
    return {
      level: environment.LOG_LEVEL,
      includeErrorDetails: environment.APP_ENV !== "production",
    };
  } catch {
    // Logging must remain available when configuration is invalid.
    return { level: "info", includeErrorDetails: false };
  }
}

function serializeError(error: unknown, includeDetails: boolean): unknown {
  if (!(error instanceof Error)) return error;

  if (!includeDetails) return { name: error.name };

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function write(level: LogLevel, message: string, context: LogFields, fields: LogFields): void {
  const configuration = readLogConfiguration();
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[configuration.level]) return;

  const prepared: LogFields = { ...context, ...fields };
  if ("error" in prepared) {
    prepared.error = serializeError(prepared.error, configuration.includeErrorDetails);
  }

  const record = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redactRecord(prepared),
  };

  const line = `${JSON.stringify(record)}\n`;
  if (level === "warn" || level === "error") {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

export function createLogger(context: LogFields = {}): Logger {
  return {
    debug(message, fields = {}) {
      write("debug", message, context, fields);
    },
    info(message, fields = {}) {
      write("info", message, context, fields);
    },
    warn(message, fields = {}) {
      write("warn", message, context, fields);
    },
    error(message, fields = {}) {
      write("error", message, context, fields);
    },
    child(fields) {
      return createLogger({ ...context, ...fields });
    },
  };
}
