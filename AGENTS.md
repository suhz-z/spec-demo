# Repository Guidelines

## Project Structure & Modules

This is a Next.js App Router application built with React and TypeScript. Routes and layouts live in `src/app/`; reusable UI is in `src/components/`; business capabilities are grouped under `src/modules/` (for example, `bookings`, `inventory`, and `payments`). Shared helpers are in `src/lib/`, database schema in `src/db/`, and development-only fixtures in `src/fixtures/`. SQL migrations and Drizzle snapshots are in `drizzle/`; approved static assets belong in `public/`, and product/design references are in `docs/` and `DESIGN.md`.

## Build, Test & Development

Use Node.js 22.13+ (or 24+) and npm:

- `npm run dev` starts the local Next.js server.
- `npm run build` creates a production build; `npm start` serves it.
- `npm test` runs the Vitest suite once; `npm run test:watch` starts watch mode.
- `npm run lint`, `npm run typecheck`, and `npm run format:check` run ESLint, TypeScript, and Prettier checks.
- `npm run check` runs all checks and the production build.
- `npm run db:generate` creates a Drizzle migration; `npm run db:migrate` applies migrations using configured database credentials.

Copy `.env.example` to a local environment file and fill only development credentials. Never commit secrets or use sample fixture data as production inventory.

## Style & Naming

Prettier uses 2-space indentation, double quotes, semicolons, trailing commas, and a 100-character print width. Follow the existing TypeScript/React patterns: PascalCase component names, camelCase functions and variables, and kebab-case filenames. Keep server-only booking, payment, and database logic on the server. ESLint rejects explicit `any` and requires consistent type-only imports.

## Testing

Vitest with Testing Library runs tests in jsdom. Put tests beside the code they cover using `*.test.ts` or `*.test.tsx` (for example, `src/modules/bookings/hold-domain.test.ts`). Cover domain rules, API boundaries, and user-visible interactions; no repository-wide coverage threshold is configured. Run `npm test` and relevant lint/type checks before submitting.

## Commits & Pull Requests

Recent history includes both short labels and conventional prefixes, so no strict commit format is established. Use a concise imperative subject, optionally scoped (for example, `fix(bookings): reject expired holds`). PRs should explain behavior and rationale, link related work, list checks run, and include screenshots for visible UI changes. Call out database migrations and environment/configuration changes explicitly.

## Security & Data

Treat prices, identities, dimensions, and legal copy in fixtures and design sources as examples only. Keep credentials server-side, validate inputs at boundaries, and do not enable live payment behavior without approved production data and configuration.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
