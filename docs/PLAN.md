# Spectra Gardens: Design and Platform Build

## Summary

Create `DESIGN.md`, then build the responsive villa exploration and booking platform as a **modular monolith**: one Next.js application, one PostgreSQL database, and clear server-side modules for inventory, pricing, holds, payments, admin, and notifications. This keeps the initial build manageable while allowing the booking rules to live in one transactional system.

The supplied [HTML wireframe](spectra-wireframe-v3.4.html) guides visual design; available UX PDFs guide behavior and acceptance criteria. Its title identifies itself as V3.3 despite the V3.4 filename, and its map renders 36 plots. The separate Minimal Flow PDF describes a 22-villa sample dataset; do not conflate the two. Use either dataset only as clearly marked development fixtures, never as production inventory. All example prices, identities, dimensions, and specifications are samples. See [UX specification](Spectra_Gardens_UX_Spec.pdf) and the source reconciliation in `DESIGN.md`.

## Architecture and Stack

- **Web app:** Next.js App Router, React, and TypeScript, deployed to Vercel using the Node.js runtime in Mumbai (`bom1`). Use server-rendered pages for public content and inventory reads; use client components for the interactive SVG map, floor plans, filters, and booking states. Next.js supports App Router route handlers and full-featured Node.js deployments; configure compute near the database to reduce request latency. ([Next.js routing](https://nextjs.org/docs/app), [route handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [deployment](https://nextjs.org/docs/app/getting-started/deploying), [Vercel regions](https://vercel.com/docs/regions))
- **Data, staff access, and assets:** Supabase PostgreSQL in Mumbai (`ap-south-1`), Supabase Auth for staff accounts, and Supabase Storage for approved plans, images, and receipts. Use Drizzle ORM with versioned SQL migrations. Keep booking writes server-only; give public visitors read-only access to published inventory and keep admin access role-checked. ([Supabase regions](https://supabase.com/docs/guides/platform/regions), [Drizzle transactions](https://orm.drizzle.team/docs/transactions), [Drizzle migrations](https://orm.drizzle.team/docs/migrations))
- **Booking integrity:** In a short PostgreSQL transaction, lock the villa row, check its current status and any expired hold, and create a session-owned hold with a price snapshot. Back this with database uniqueness constraints. Recheck availability and the current quote when the buyer pays. Trust only a verified gateway webhook to confirm a booking; make order creation, webhook handling, and refund requests idempotent. PostgreSQL row locks serialize competing updates, and unique indexes enforce database-level uniqueness. ([PostgreSQL locking](https://www.postgresql.org/docs/19/explicit-locking.html), [unique indexes](https://www.postgresql.org/docs/current/indexes-unique.html))
- **Payments and follow-up work:** Keep the gateway provider undecided as requested; implement a provider interface and sandbox flow, then add the client-selected provider. Write notification, receipt, refund, and hold-expiry work to a transactional outbox and process it with a scheduled worker, retrying failures safely. Use 10 minutes as the configurable initial hold duration, subject to client approval.
- **Updates to open maps:** Poll for inventory status changes every 15–30 seconds as specified in the UX material; keep status and price authoritative on the server.

## Implementation Changes

- **`DESIGN.md`:** Capture the HTML’s visual tokens, typography, spacing, map and plan styles, responsive rules, and component states. Document the precedence between visual and UX sources, and identify fixture data and client-supplied content.
- **Public experience:** Build the map-first landing page, villa previews and filters, floor-by-floor plans, room specifications, pricing summary, customer details, payment and pending/failure/taken states, confirmation, and the supporting project, gallery, location, enquiry, and legal content. Preserve keyboard access, clear non-color status labels, phone bottom sheets, and the HTML’s visual direction.
- **Admin and API:** Add role-protected staff screens for inventory and status, pricing, active holds, bookings/payments/refunds, plans/specifications, content, and enquiries. Define typed records for villas, plans, rooms, price settings, holds, bookings, payments, and outbox events; expose public inventory/plan reads, server-side booking and payment operations, and a signed gateway webhook.
- **Production setup:** Load the approved villa inventory, architectural drawings, prices/tax rules, legal terms, branding, and contact details. Configure the chosen gateway and notification channels. Do not enable live payments while sample data or unapproved terms remain.

## Test Plan and Assumptions

- Test map/plan interactions, filters, room details, responsive layouts, keyboard navigation, form errors, updated prices, and booked/reserved view-only behavior.
- Test simultaneous holds for one villa, hold expiry and retry, double-click Pay, payment cancellation/failure/pending, delayed or repeated webhooks, browser closure after payment, duplicate-payment refund handling, and notification retries.
- Test staff roles, inventory and pricing changes, status updates across open maps, and that production payment setup rejects missing client data or gateway configuration.
- Use the HTML's 36 plot geometry or the Minimal Flow's separate 22-villa sample only as clearly marked development fixtures. Gateway selection, real inventory and pricing, refund terms, notification recipients, and other unanswered UX-spec decisions remain client sign-offs.
