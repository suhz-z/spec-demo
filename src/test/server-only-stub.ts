/**
 * Vitest resolves `server-only` to this stub so server modules can be imported
 * in tests. Application bundles still use the real package, which fails if a
 * server module is imported into a client component.
 */
export {};
