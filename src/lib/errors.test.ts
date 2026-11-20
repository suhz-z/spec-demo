import { describe, expect, it } from "vitest";

import { AppError, isAppError, toPublicError } from "./errors";

describe("AppError", () => {
  it("maps codes to HTTP statuses and safe public messages", () => {
    const error = new AppError("conflict");

    expect(error.status).toBe(409);
    expect(error.publicMessage).toBe(
      "That action could not be completed because the item changed. Please try again.",
    );
    expect(isAppError(error)).toBe(true);
  });

  it("keeps internal detail on the server-only message", () => {
    const error = new AppError("internal", {
      message: "database connection refused",
      publicMessage: "Something went wrong. Please try again.",
    });

    expect(error.message).toBe("database connection refused");
    expect(toPublicError(error)).toEqual({
      status: 500,
      body: {
        error: {
          code: "internal",
          message: "Something went wrong. Please try again.",
        },
      },
    });
  });

  it("does not leak unexpected errors", () => {
    const result = toPublicError(new Error("SQL: password=hunter2"));

    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("internal");
    expect(JSON.stringify(result)).not.toContain("hunter2");
  });
});
