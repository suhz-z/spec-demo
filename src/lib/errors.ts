export type AppErrorCode =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "provider_error"
  | "configuration"
  | "internal";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  provider_error: 502,
  configuration: 500,
  internal: 500,
};

const PUBLIC_MESSAGE_BY_CODE: Record<AppErrorCode, string> = {
  validation: "Please check the information and try again.",
  unauthenticated: "Please sign in to continue.",
  forbidden: "You do not have permission to do that.",
  not_found: "We could not find what you were looking for.",
  conflict: "That action could not be completed because the item changed. Please try again.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
  provider_error: "A service is temporarily unavailable. Please try again.",
  configuration: "The service is not configured correctly. Please contact support.",
  internal: "Something went wrong. Please try again.",
};

export type AppErrorOptions = {
  message?: string;
  publicMessage?: string;
  status?: number;
  cause?: unknown;
};

/**
 * An expected application failure. `publicMessage` is safe to return to a
 * client; `message` is for server logs and must not contain secrets.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly publicMessage: string;

  constructor(code: AppErrorCode, options: AppErrorOptions = {}) {
    super(options.message ?? PUBLIC_MESSAGE_BY_CODE[code], {
      cause: options.cause,
    });
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? STATUS_BY_CODE[code];
    this.publicMessage = options.publicMessage ?? PUBLIC_MESSAGE_BY_CODE[code];
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export type PublicErrorBody = {
  error: {
    code: AppErrorCode;
    message: string;
  };
};

export function toPublicError(error: unknown): { status: number; body: PublicErrorBody } {
  if (isAppError(error)) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.publicMessage,
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "internal",
        message: PUBLIC_MESSAGE_BY_CODE.internal,
      },
    },
  };
}
