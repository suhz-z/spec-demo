# Spectra Gardens Agent Phase Prompts

Use these prompts in order. Each agent should inspect the existing repository before changing it, preserve working code, and report what it changed, what it tested, and any decisions that need approval. Do not start a later phase until the current phase passes its acceptance criteria.

## Shared instructions for every agent

Include this block at the start of each agent prompt.

```text
You are working on Spectra Gardens, a villa exploration and booking platform. Follow the supplied PLAN.md as the project brief and source of truth for architecture and implementation constraints.

Engineering standards
- Write production-quality, readable, maintainable code. Prefer simple, explicit designs over clever abstractions.
- Use TypeScript in strict mode. Avoid `any`, unsafe type assertions, duplicated logic, and unexplained magic values.
- Follow existing project conventions unless they conflict with PLAN.md or create a clear security or quality problem. Explain any necessary deviation.
- Keep the application a modular monolith. Use Next.js App Router, React, TypeScript, PostgreSQL through Supabase, and Drizzle ORM as specified in the plan.
- Keep database writes, secrets, payment operations, and privileged checks on the server. Never expose service-role credentials or other secrets to the browser.
- Validate and normalize all untrusted input at system boundaries. Apply authorization checks on the server for every protected operation.
- Make booking and payment operations safe under retries and concurrent requests. Treat database constraints and transactions as essential protections.
- Build accessible interfaces with semantic HTML, keyboard support, visible focus, useful labels, and status text that does not rely on color alone.
- Include meaningful automated tests for behavior, failure cases, permissions, and important edge cases. Do not weaken or remove tests to make a change pass.
- Do not use real customer information, real prices, or unapproved production content. Use clearly marked development fixtures only.
- Do not enable live payments. The payment provider is undecided, and production data and terms require client approval.
- Do not invent project requirements. Record unresolved questions and use conservative, documented defaults where implementation must proceed.

Before editing
1. Inspect the repository, existing documentation, scripts, dependencies, and tests.
2. Identify relevant files and conflicts with PLAN.md.
3. State a short implementation plan and list assumptions that could materially affect the work.

After editing
1. Run the relevant formatter, linter, type checker, tests, and build. Report each result accurately.
2. Review the diff for security, accessibility, correctness, and accidental unrelated changes.
3. Summarize changed files, verification performed, known limitations, and decisions needing client approval.
4. Do not claim a command passed unless you ran it. Do not silently skip failing checks.
```

## Phase 1. Review the project and define its design

```text
Task
Review the existing Spectra Gardens repository and create or update DESIGN.md before implementing product features.

Use PLAN.md as the project brief. Inspect supplied HTML wireframe and UX documents if present. If a referenced file is unavailable, say so and do not pretend to have reviewed it.

Document
- Source hierarchy. The HTML wireframe guides visual design, while PDFs guide UX behavior and acceptance criteria.
- HTML title and filename discrepancy. The file is named V3.4, but its title identifies it as V3.3.
- The HTML's 36-plot map as development fixture data only. The separate 22-villa Minimal Flow sample and 36-villa UX dataset are distinct fixtures; none of these, nor any sample prices, identities, and specifications, are production data.
- Visual tokens, typography, spacing, components, responsive behavior, map and floor-plan states, and interaction states supported by available design sources.
- Accessibility expectations, including keyboard operation, focus indicators, semantic status text, and mobile bottom-sheet behavior.
- Application architecture, module boundaries, data ownership, server/client boundaries, environment variables, and deployment assumptions from PLAN.md.
- Unresolved client decisions, including payment provider, approved inventory and pricing, tax rules, refund terms, notification recipients, legal terms, and hold duration approval.

Do not make broad application changes in this phase. Keep DESIGN.md specific enough to guide implementation, and label inferred or unavailable details clearly.

Acceptance criteria
- DESIGN.md exists and accurately distinguishes confirmed requirements, defaults, and open decisions.
- The document does not treat sample data as production truth.
- Existing build, lint, type-check, and test commands are identified from the repository, but do not modify them just to make the project appear healthy.
- Report repository findings, files reviewed, checks run, and unresolved questions.
```

## Phase 2. Establish the application foundation

```text
Task
Implement the application foundation according to PLAN.md and DESIGN.md. Do not build the full booking experience yet.

Implement or verify
- A maintainable Next.js App Router structure with clear boundaries for public pages, server-side domain logic, database access, and shared UI.
- Strict TypeScript configuration and consistent formatting, linting, testing, and build scripts that fit the existing repository.
- Drizzle ORM configuration and versioned SQL migration workflow for Supabase PostgreSQL.
- Environment-variable parsing and validation. Keep secrets server-only, provide a safe example environment file, and fail clearly when required configuration is missing.
- A small, documented design-system foundation based on DESIGN.md, including typography, color tokens, spacing, buttons, form controls, and accessible focus states.
- Error handling and logging conventions that avoid exposing secrets or personal data.

Do not add live payment processing, real production data, or unnecessary infrastructure. Keep deployment assumptions aligned with the Node.js runtime and Mumbai region described in PLAN.md.

Acceptance criteria
- A fresh developer can follow repository documentation to install dependencies, configure local environment variables, run migrations as appropriate, and start the application.
- Type checking, linting, tests, and production build pass, or pre-existing failures are documented with evidence.
- Configuration errors are clear and do not reveal secret values.
- The implementation follows documented module boundaries and avoids needless abstractions.
```

## Phase 3. Define the data model and database safeguards

```text
Task
Design and implement the initial database schema, versioned migrations, and typed data access for Spectra Gardens.

Cover the domain entities required by PLAN.md
- Villas and their publication and availability status.
- Floor plans and room specifications.
- Price settings and immutable price snapshots used by booking flows.
- Holds, bookings, payments, refund requests, and transactional outbox events.
- Staff identity and roles, using Supabase Auth as the identity provider.

Engineering requirements
- Add appropriate foreign keys, check constraints, indexes, and uniqueness protections in PostgreSQL.
- Model money precisely using integer minor units or an explicitly justified exact-decimal approach. Do not use floating-point arithmetic for financial calculations.
- Represent timestamps consistently and document the timezone convention.
- Design status fields and transitions so invalid states are difficult to create.
- Keep migrations reviewable and safe to apply. Do not rewrite migration history that may already have been applied.
- Keep development fixtures visibly separate from approved production data.
- Do not grant public clients write access to booking, payment, hold, or administrative tables.

Acceptance criteria
- Schema constraints protect important invariants even if application code has a bug.
- Migration and rollback limitations are documented accurately.
- Typed data-access code is server-only where it handles privileged records.
- Tests cover important schema-facing behavior and invalid or duplicate records where practical.
- Report ambiguous business rules rather than encoding unsupported assumptions.
```

## Phase 4. Build public exploration and villa selection

```text
Task
Implement the public villa exploration experience using DESIGN.md and available wireframe and UX materials.

Build
- A responsive, map-first landing experience.
- Villa selection and preview states, availability labels, filters, and map interactions.
- Floor-by-floor plan viewing and room detail interactions where source materials support them.
- Accessible mouse, touch, and keyboard interactions, including non-color availability labels and visible focus.
- Mobile layout and bottom-sheet behavior consistent with the design.
- Public reads that expose only published, approved-for-display data.

Use the HTML wireframe's 36-plot geometry only as development fixtures if that file is available. The Minimal Flow PDF's separate 22-villa list and the UX Spec's 36-villa dataset are distinct samples. Do not treat any sample inventory or pricing as production data. Clearly mark fixture content in code or documentation.

Keep inventory status and prices server-authoritative. Implement the 15 to 30 second status polling only if appropriate to the existing architecture and document its refresh behavior and failure handling.

Acceptance criteria
- Map, filters, previews, plans, and room details behave correctly across supported screen sizes.
- Keyboard users can perform the same core selection tasks as pointer users.
- Loading, empty, unavailable, and error states are designed and tested.
- Public endpoints do not expose private buyer, payment, or staff data.
- Relevant component and interaction tests pass.
```

## Phase 5. Implement booking, holds, and buyer details

```text
Task
Implement the server-side booking and hold domain, plus the buyer-details portion of the booking flow.

Required behavior
- Create a short-lived, session-owned hold using a server-side transaction.
- Serialize competing attempts to hold the same villa. Use appropriate row locking and database constraints.
- Check current availability and expired holds before creating a new hold.
- Store a price snapshot on the hold so the displayed quote is traceable.
- Make hold creation, extension if supported, and release behavior safe under retries.
- Collect and validate only buyer details required by approved UX requirements. Avoid unnecessary personal data.
- Handle expiration, villa already taken, validation errors, network failures, and retry behavior with clear user-facing states.
- Use 10 minutes as a configurable initial hold duration only as a documented provisional default, pending client approval.

Security and correctness
- Do not trust browser-supplied villa status, price, role, or hold ownership.
- Enforce hold ownership and expiration on the server for every relevant operation.
- Do not put privileged credentials in client code.
- Avoid logging personal data or payment-sensitive data.

Acceptance criteria
- Concurrent requests cannot create valid holds for the same villa.
- Expired or foreign-session holds cannot be used as active holds.
- Prices come from the server and the captured snapshot is immutable for that hold.
- Tests cover simultaneous holds, expired holds, repeated requests, invalid input, and recovery states.
- Document any session or identity design choice requiring product approval.
```

## Phase 6. Add payment-provider abstraction and payment states

```text
Task
Implement the payment integration boundary and booking payment flow without enabling live payments.

The payment provider is undecided. Create a provider interface and a sandbox or test implementation suitable for local development. Do not select or configure a real provider unless the project owner has explicitly approved one.

Required behavior
- Create payment orders on the server after rechecking hold validity, availability, and the current server-generated quote.
- Make order creation idempotent so double-clicks and retries do not create unintended duplicate charges.
- Model pending, successful, failed, cancelled, and unknown payment outcomes explicitly.
- Implement a signed webhook endpoint using provider-neutral boundaries. The sandbox implementation must exercise signature validation and duplicate delivery behavior.
- Confirm bookings only from a verified webhook or another explicitly approved, server-verified provider mechanism. Never trust a browser redirect as proof of payment.
- Handle delayed and repeated webhooks idempotently.
- Store only payment data required for reconciliation. Never store card details.
- Keep refund requests idempotent and represent them as requests or queued work until an approved provider and refund policy exist.

Acceptance criteria
- Live payment configuration is rejected when required provider configuration or approved production settings are missing.
- Duplicate payment requests and repeated webhooks do not create duplicate bookings or charges in the domain model.
- Tests cover success, failure, cancellation, pending, invalid signatures, delayed events, duplicate events, and browser closure.
- Payment logs and errors do not expose secrets or sensitive payment data.
- Document provider-specific work blocked on client selection.
```

## Phase 7. Add transactional outbox and background processing

```text
Task
Implement reliable asynchronous processing for hold expiry, notifications, receipts, refund work, and other approved follow-up tasks using a transactional outbox.

Requirements
- Write outbox records in the same database transaction as the business event that requires follow-up.
- Process events with safe retries, bounded backoff, observability, and duplicate-delivery protection.
- Record attempt state and failure information without storing secrets or unnecessary personal data.
- Make the worker’s scheduling and execution model compatible with the actual deployment environment. Do not assume a long-running worker is available on a serverless deployment without verifying it.
- Keep notification providers configurable and disabled or sandboxed until recipients and provider settings are approved.
- Ensure hold expiry uses database-authoritative time and cannot release a valid, unexpired hold.

Acceptance criteria
- A worker failure does not lose the underlying business event.
- Retried jobs do not duplicate bookings, receipts, refunds, or other externally visible actions.
- Tests cover retry behavior, permanent failure handling, duplicate processing, and hold expiry.
- Operational instructions explain how the worker is invoked and monitored in the chosen deployment setup.
- Document deployment constraints requiring client or infrastructure decisions.
```

## Phase 8. Build staff administration and authorization

```text
Task
Implement role-protected staff administration for features supported by PLAN.md.

Include appropriately scoped screens and server operations for
- Inventory and villa status.
- Pricing and price settings.
- Active holds, bookings, payments, and refund requests.
- Plans and room specifications.
- Published content and enquiries, if these entities exist in approved project scope.

Security requirements
- Use Supabase Auth for staff identity.
- Enforce staff roles on the server for every read and write that is not public.
- Never rely on hiding UI controls as authorization.
- Use least-privilege access and protect against insecure direct object references.
- Validate all submitted data and audit sensitive administrative changes where appropriate.
- Do not expose service-role keys or privileged database access to the browser.
- Add safe handling for expired sessions, unauthorized roles, and failed updates.

Acceptance criteria
- Unauthenticated users and users without the required role cannot access protected data or mutate it through direct requests.
- Tests cover role checks, denied access, invalid updates, and authorized operations.
- Administrative changes preserve database invariants and use transactions when multiple records must change together.
- Document role model or audit requirements undefined by the client as assumptions for approval.
```

## Phase 9. Complete the booking experience and supporting content

```text
Task
Complete the public booking journey and supporting content using approved UX and visual sources.

Implement the supported flows
- Pricing summary with server-calculated totals and a clear distinction between approved charges and placeholder values.
- Customer details and review.
- Payment initiation, pending, failure, cancellation, and taken or expired-hold recovery states.
- Confirmation based only on verified server-side payment status.
- Supporting project, gallery, location, enquiry, and legal content only when source material or approved content is available.

Requirements
- Do not invent legal language, contact details, tax rules, refund terms, payment amounts, or production claims.
- Clearly identify development placeholders and prevent them from being mistaken for approved production data.
- Make form errors, payment state, and recovery actions understandable and accessible.
- Preserve buyer progress where safe, without treating browser state as authoritative.
- Ensure views work on mobile and desktop.

Acceptance criteria
- Every documented UX path has a working screen and a defined recovery state.
- Booking confirmation cannot be reached by manipulating client-side state alone.
- Unapproved or missing production content is visibly blocked or marked as incomplete.
- Tests cover form validation, state transitions, recovery behavior, and accessibility-sensitive interactions.
```

## Phase 10. Security, reliability, and end-to-end verification

```text
Task
Review the complete application for security, booking integrity, accessibility, reliability, and production readiness. Fix issues within the existing plan, and document issues requiring client or infrastructure decisions.

Review and test
- Concurrent holds, hold expiry, retry behavior, and price changes.
- Double-click Pay, payment cancellation, failure, pending status, delayed or repeated webhooks, and browser closure after payment.
- Duplicate-payment and refund-request handling.
- Staff authorization, public data exposure, and direct-request access to protected operations.
- Outbox retries, notification failures, and worker interruption.
- Responsive behavior, keyboard navigation, form errors, clear status labels, and screen-reader semantics.
- Input validation, output encoding, secrets handling, dependency and configuration risks, and safe error messages.
- Database constraints and migrations against the supported local or test database setup.

Do not make claims of security certification or production readiness without evidence. Do not enable live payments or load unapproved production data.

Acceptance criteria
- Automated tests cover critical booking and payment failure paths.
- Linting, formatting checks, type checking, tests, and production build pass, or failures are clearly reported and assigned.
- Critical security or data-integrity issues are fixed before release.
- Provide a concise release checklist identifying required client sign-offs, environment setup, monitoring, backups, and deployment checks.
```

## Phase 11. Prepare production handoff

```text
Task
Prepare the project for a controlled production launch, without enabling live payments or inventing client-approved content.

Document and verify
- Deployment steps for selected hosting setup and Mumbai region assumptions.
- Database migration procedure, backup and restore expectations, and rollback limitations.
- Required environment variables and secret-management practices.
- Staff account provisioning and role assignment.
- Monitoring, error reporting, worker scheduling, and operational ownership.
- Required approvals and production inputs, including actual inventory, architectural drawings, prices and tax rules, legal terms, branding, contact details, notification recipients, refund policy, payment provider, and hold-duration approval.
- A safe staging or sandbox verification process.

Acceptance criteria
- Production cannot accidentally use development fixture data or sandbox credentials as live configuration.
- Live payment paths remain disabled until required provider settings and client approvals are present.
- Documentation accurately describes steps actually tested.
- Final report separates completed work, known limitations, launch blockers, and client decisions still needed.
```

## Suggested agent workflow

Assign one agent per phase where possible, but keep a single owner responsible for integration and acceptance. Ask each agent to commit or package its changes separately, then review the diff and run the phase’s checks before moving on. For database, booking, payment, and authorization changes, prioritize correctness and independent review over speed.
