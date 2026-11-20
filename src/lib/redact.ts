const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = [
  /token/i,
  /secret/i,
  /password/i,
  /authorization/i,
  /cookie/i,
  /api[-_]?key/i,
  /service[-_]?role/i,
  /card/i,
  /cvv/i,
  /\bupi\b/i,
  /account[-_]?number/i,
  /email/i,
  /mobile/i,
  /phone/i,
  /full[-_]?name/i,
  /buyer[-_]?name/i,
  /customer[-_]?name/i,
  /postcode/i,
  /pincode/i,
  /address/i,
];

const EXACT_SENSITIVE_KEYS = new Set(["name", "email", "mobile", "phone", "address"]);

const REDACTED = "[redacted]";
const MAX_DEPTH = 6;

export function isSensitiveKey(key: string): boolean {
  if (EXACT_SENSITIVE_KEYS.has(key)) return true;
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Returns a deep copy safe for logging. Personal data and credential-like keys
 * are replaced, and the input is never mutated.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > MAX_DEPTH) return "[max-depth]";

  if (value === null || typeof value !== "object") return value;

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: REDACTED,
    };
  }

  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1, seen));
  }

  if (!isPlainObject(value)) return "[unserializable]";

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redact(item, depth + 1, seen);
  }
  return output;
}

export function redactRecord(record: Record<string, unknown>): Record<string, unknown> {
  const redacted = redact(record);
  return isPlainObject(redacted) ? redacted : {};
}
