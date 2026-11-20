# Spectra Gardens

Map-first villa exploration and booking platform for Spectra Gardens, Kottakkal.

**Current phase:** Phases 1–9 are implemented to the limits recorded in `DESIGN.md` §15. Phase 5 holds,
quote/countdown/retry UI, buyer-details API, and session-owned hold resume are in place; database
integration and approved terms remain outstanding. Phase 6 adds the provider-neutral sandbox payment boundary, signed
webhook, idempotent order creation, and session-scoped status reads. Phase 7 adds the transactional
outbox, bounded retry worker, database-time hold expiry, and protected scheduler endpoint. Phase 8 adds
Supabase-Auth token verification, a server-enforced staff role matrix, and protected inventory, pricing,
booking, payment, refund, and plan APIs. Phase 9 adds the end-to-end public booking flow: server-quoted
details and review, payment initiation, pending/failed/cancelled/unknown recovery, taken/expired-hold
recovery, and server-verified confirmation. Staff screens, live provider integration, notification
delivery, and approved supporting content remain outstanding. Do not treat any sample content as
production data.

The design and implementation brief is in [`DESIGN.md`](./DESIGN.md). The project brief is in
[`docs/PLAN.md`](./docs/PLAN.md).

## Requirements

- Node.js 22.13+, 24.x, or 26+ (developed on Node 26)
- npm 11 or newer
- PostgreSQL 15+ when applying migrations; the app builds without a database

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit values
npm run dev
```

Open <http://localhost:3000>. Useful routes:

| Route | Purpose |
|---|---|
| `/` | Villa map and floor-plan exploration (development fixture when explicitly enabled) |
| `/villa/V01` | Development villa detail with complete placeholder floors |
| `/design-system` | Internal token and component reference (noindex) |
| `/api/health` | Safe runtime/environment probe; returns no secrets |
| `/api/holds` | Server-owned, price-snapshotted temporary hold |
| `/api/booking-details` | Session-owned buyer details; requires approved terms configuration |
| `/api/payments/orders` | Idempotent sandbox payment order for a session-owned booking |
| `/api/payments/status` | Session-scoped booking/payment status |
| `/api/payments/webhook` | Signed, idempotent sandbox provider webhook |
| `/api/payments/sandbox` | Development/test-only payment outcome simulator (404 in staging/production) |
| `/api/internal/outbox` | Scheduled outbox/hold-expiry worker; requires a Bearer worker secret |
| `/api/staff/inventory` | Role-protected inventory read; `PATCH /api/staff/inventory/:villaId` publishes/withdraws |
| `/api/staff/pricing` | Role-protected price read and admin-only price-setting create |
| `/api/staff/bookings` | Role-protected booking read (no buyer PII) |
| `/api/staff/payments` | Role-protected payment read |
| `/api/staff/refunds` | Role-protected refund read and idempotent request creation |
| `/api/staff/plans` | Role-protected floor-plan/room-summary read |

## Tooling notes

- ESLint is pinned to `9.39.5` because `eslint-config-next@16.4` bundles plugins that declare
  support only through ESLint 9. The 9.x line is end-of-life upstream, so this pin is temporary;
  move to ESLint 10 when those plugins declare support.
- Vitest 5 uses Vite 8 and requires Node 22.12+, 24.x, or 26+.
- `npm audit --omit=dev` reports **0 production vulnerabilities**. The remaining advisories are
  dev-only, in lint/build/test tooling.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint with Next.js core-web-vitals and TypeScript rules |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (single run) |
| `npm run test:watch` | Vitest watch mode |
| `npm run db:generate` | Generate SQL from the Drizzle schema |
| `npm run db:migrate` | Apply migrations using `DIRECT_DATABASE_URL` (or `DATABASE_URL`) |
| `npm run db:studio` | Drizzle Studio |
| `npm run check` | Format, lint, type-check, test, and build in sequence |

CI (`.github/workflows/ci.yml`) runs the same verification steps on pushes to `main` and pull
requests.

## Environment

Copy `.env.example` to `.env.local`. Never commit `.env.local` or real secrets.

- `NEXT_PUBLIC_*` values are browser-visible. Only expose values that are safe with RLS.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are also used by the staff API to
  verify Supabase access tokens. Tokens are checked against Supabase Auth and then matched to an
  active `staff_profiles` row; the service-role key is never used. Without these values every staff
  endpoint returns `503`. A missing, expired, or unknown account returns `401`; a valid account
  without the required permission returns `403`.
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and payment secrets are server-only. Import them
  through `src/lib/env.ts` (`server-only`), never from a client component.
- `PAYMENT_PROVIDER` must remain `sandbox`, and `PAYMENTS_LIVE_ENABLED` must remain `false` until
  the client approves a provider, merchant account, and refund terms. The schema rejects anything
  else.
- `PAYMENT_SANDBOX_SECRET` derives deterministic sandbox order IDs. `PAYMENT_WEBHOOK_SECRET` signs
  and verifies sandbox webhook events. Both are server-only and must be long random values.
- The sandbox outcome simulator is available only when `APP_ENV` is `development` or `test`; it
  returns 404 in staging and production. It constructs a signed event and runs the real webhook
  verification path, so no payment state can be changed from the browser without a valid signature.
- `OUTBOX_WORKER_SECRET` authenticates scheduled worker calls to `/api/internal/outbox` with
  `Authorization: Bearer <secret>`. `CRON_SECRET` is an optional alternative when a scheduler can
  only send Vercel Cron's Bearer token. Both are server-only.
- `NOTIFICATION_PROVIDER` defaults to `disabled`, which leaves notification events `pending` and
  performs no delivery. `sandbox` logs a redacted suppression line and still performs no external
  delivery. Do not enable a real provider until recipients, channels, and consent are approved.
- The outbox worker is a stateless HTTP batch, not a long-running process. `vercel.json` schedules
  `GET /api/internal/outbox` every five minutes; Vercel sends `CRON_SECRET` as its Bearer token.
  For another host, invoke the endpoint every 1–5 minutes with `OUTBOX_WORKER_SECRET`. Monitor
  HTTP status, the returned `summary`, and rows with `status = 'dead_letter'` or a stale `locked_at`.
  Missing worker configuration returns `503`; unauthorized calls return `401`.
- `GUEST_SESSION_SECRET` signs guest-session cookies so a browser cannot choose its own session
  identity. It is required in staging/production; rotating it invalidates existing guest holds.
- `ENABLE_DEV_FIXTURES` must remain `false` by default. Fixtures are refused outside development
  and test, and in production the process fails closed.
- To view the local sample map, set `ENABLE_DEV_FIXTURES=true` in `.env.local`. This serves only
  development fixture data; it must stay disabled in staging and production.
- `HOLD_DURATION_SECONDS` defaults to 600 seconds as a provisional value. `BOOKING_TERMS_VERSION`
  must be set only after approved booking terms are published; buyer-detail submissions return a
  pending-approval response while it is unset.
- `drizzle.config.ts` loads `.env.local`, then `.env`, so migration commands use the same values as
  the app. Production migrations should read `DIRECT_DATABASE_URL` from the deployment environment.
- `src/instrumentation.ts` validates server configuration when the Node.js server starts. An invalid
  production configuration stops the process instead of failing on the first request.

## Staff roles

The initial role-to-permission matrix is an assumption pending D-18 approval:

| Role | Allowed |
|---|---|
| `admin` | Every staff permission, including price changes |
| `sales` | Inventory read/write, plan read, booking read |
| `accounts` | Booking read, payment read, refund read/write, pricing read |

Role assignment lives in `staff_profiles.auth_user_id` and `role`. There is no self-service staff
signup, invitation UI, or sensitive-change audit log yet. Seed or provision staff rows through a
controlled migration/operations step once account provisioning is approved.

## Architecture

```text
src/
  app/            Routes, layouts, route handlers (App Router)
  components/     Shared UI and (later) map, plan, and booking components
  db/             Server-only Drizzle client and typed schema
  fixtures/       Development-only data guard and, later, fixtures
  lib/            Environment, errors, logging, redaction, money, utilities
  modules/        Server-side domain modules (inventory, bookings, payments, outbox, notifications, staff)
```

- Modular monolith: one Next.js app and one PostgreSQL database, with explicit module boundaries.
- Server Components by default. Client Components only for interaction such as maps, forms, timers,
  and booking state.
- Server-authoritative pricing, availability, holds, and payment outcomes. The browser never sends
  authoritative amounts or statuses.
- Money is integer paise; timestamps are UTC and displayed in `Asia/Kolkata`.
- Public errors are safe; structured logs redact names, email addresses, mobile numbers, tokens,
  and payment payloads.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Design review (`DESIGN.md`) | Complete |
| 2 | Application foundation | Complete |
| 3 | Database schema and migrations | Complete |
| 4 | Master map and villa plans | Core complete; visual device review remains |
| 5 | Pricing, holds, bookings | Hold UI/API and booking API implemented; DB integration and buyer form remain |
| 6 | Payment sandbox | Provider boundary, idempotent orders, signed webhook, status API, and domain tests complete; payment screens, DB integration, and live provider remain |
| 7 | Notifications and outbox worker | Transactional outbox, retry worker, database-time hold expiry, protected scheduler endpoint, and domain tests complete; scheduling, delivery, and DB integration remain |
| 8 | Staff administration | Supabase-Auth token verification, server role matrix, inventory/pricing/booking/payment/refund/plan APIs implemented; staff screens, accounts, and audit log remain |
| 9 | Supporting content | End-to-end booking flow, payment/recovery states, and server-verified confirmation implemented; approved supporting content and legal copy remain |
| 10 | Hardening and testing | In progress; §15.14 verification fixes applied, no PostgreSQL integration suite yet |
| 11 | Deployment readiness | Not started |

## Constraints

- No live payments in any phase until a provider is approved and configured.
- No production inventory, prices, identities, legal text, RERA details, or contact details exist in
  this repository.
- Unapproved content must render an honest placeholder, never invented copy.
- Accessibility target is WCAG 2.2 AA. The source wireframe's failing contrast values are corrected
  in `src/app/globals.css`.

## Repository notes

- The source PDFs are not committed; see `DESIGN.md` §1.1.
- The wireframe file is `spectra-wireframe-v3.4.html` but its document title says V3.3.
- The wireframe renders 36 development plots, not the 22 described in the phase prompts. Fixture
  choice remains open decision D-01 in `DESIGN.md`.
