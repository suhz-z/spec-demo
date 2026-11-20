import { describe, expect, it, vi } from "vitest";

import { createLogger } from "./logger";
import { resetServerEnvForTests } from "./env";

describe("logger", () => {
  it("writes structured JSON and redacts personal data", () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    resetServerEnvForTests();

    createLogger({ requestId: "req_1" }).info("booking created", {
      bookingId: "bk_1",
      mobile: "+919876543210",
      email: "asha@example.com",
      status: "ok",
    });

    const line = String(write.mock.calls.at(-1)?.[0] ?? "");
    const record = JSON.parse(line) as Record<string, unknown>;

    expect(record.level).toBe("info");
    expect(record.message).toBe("booking created");
    expect(record.requestId).toBe("req_1");
    expect(record.bookingId).toBe("bk_1");
    expect(record.status).toBe("ok");
    expect(record.mobile).toBe("[redacted]");
    expect(record.email).toBe("[redacted]");
    expect(line).not.toContain("+919876543210");
    expect(line).not.toContain("asha@example.com");
  });

  it("honours the configured level", () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    resetServerEnvForTests();

    createLogger().info("quiet");
    expect(write).not.toHaveBeenCalled();

    createLogger().warn("visible");
    expect(write).toHaveBeenCalledTimes(1);
  });
});
