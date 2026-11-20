/**
 * Runs once when the Node.js server starts. Invalid configuration should stop
 * the process before it serves traffic, rather than surfacing on the first
 * database or payment request. Static builds do not execute this hook.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getServerEnv } = await import("@/lib/env");
  getServerEnv();
}
