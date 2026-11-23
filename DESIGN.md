# Spectra Gardens — Design and Implementation Brief

**Status:** Phases 1–9 are implemented to the limits recorded below. The sandbox payment boundary, signed webhook, idempotent order creation, payment state transitions, transactional-outbox worker, role-protected staff API, and end-to-end public booking flow exist; live payments remain blocked, notifications stay disabled, and staff screens and approved supporting content remain outstanding. Production inventory, pricing, legal terms, supporting content, and architectural plans remain unapproved.
**Last updated:** 20 November 2026
**Project brief:** `docs/PLAN.md`
**Current phase:** Phase 10 — security, reliability, and end-to-end verification is next (see §15.13).

This document converts the supplied visual and UX sources into implementable decisions. It separates:

- **[Confirmed]** — stated in a source document.
- **[Default]** — a conservative provisional choice made where implementation must proceed.
- **[Inferred]** — derived from the sources but not stated explicitly; validate during build.
- **[Open]** — requires client, legal, finance, or infrastructure approval.

Nothing in this document authorises production inventory, prices, legal text, or live payments.

---

## 1. Sources and precedence

### 1.1 Documents reviewed

| Source | Location | Role | Notes |
|---|---|---|---|
| `PLAN.md` | `docs/PLAN.md` | Project brief; stack, architecture, security, deployment constraints | Highest authority on technical approach |
| `spectra-wireframe-v3.4.html` | `docs/spectra-wireframe-v3.4.html` | Visual design and interaction reference | Latest supplied visual source; modified 18 Nov 2026 |
| `Spectra_Gardens_UX_Spec.pdf` | `docs/Spectra_Gardens_UX_Spec.pdf` | Full UX behaviour and acceptance criteria; 38 pages, Draft 1, 17 Nov 2026 | Reviewed as extracted text |
| `Spectra_Gardens_Minimal_Wireframe_Flow.pdf` | Same | Later, simplified six-screen journey; 24 pages, 18 Nov 2026 | Newer than the UX Spec; resolves some earlier details |
| `Spectra_Gardens_Wireframe_Walkthrough.pdf` | Same | Annotated walkthrough of the six-screen journey; 10 pages | Explains intent and edge cases |
| Earlier variants (`spectra-wireframe-v3` … `v3.3`, `spectra-gardens-ux.html`, `spectra-gardens-print.html`) | Same | Superseded | Not authoritative; do not implement from them |

The UX Spec PDF is present in `docs/` but is untracked. The Minimal Flow and Walkthrough PDFs remain outside the repository in the local Downloads folder. Phase 11 should add approved copies of all three to `docs/` or record an external document register.

### 1.2 Precedence rules [Confirmed]

1. **Architecture, stack, security, and deployment:** `PLAN.md` wins.
2. **UX behaviour, state coverage, and acceptance criteria:** the UX PDFs win.
3. **Visual language, layout rhythm, and component styling:** the V3.4 HTML wireframe wins.
4. **Copy, prices, identities, dimensions, phone numbers, and legal text in any prototype:** never authoritative. Treat as sample content until the client supplies approved data.
5. **Between UX PDFs:** the later document wins where they conflict. The Minimal Flow PDF (18 Nov) and V3.4 HTML (18 Nov) supersede the UX Spec (17 Nov) on journey shape and field count; the UX Spec remains the fuller acceptance checklist.
6. **Accessibility overrides visual fidelity.** Where the wireframe's colours or interaction patterns fail WCAG 2.2 AA, the implementation must correct them and record the deviation.

### 1.3 Known source discrepancies [Confirmed]

These are factual observations from the supplied files, not design preferences.

| # | Discrepancy | Evidence | Resolution |
|---|---|---|---|
| S-1 | File is named **v3.4** but its document title is **V3.3** | `<title>Spectra Gardens — V3.3</title>`; filename `spectra-wireframe-v3.4.html` | Cite as "V3.4 file / V3.3 title". Do not rename the source. Use it as visual reference only. |
| S-2 | Phase prompts describe a **22-villa HTML map**; the committed HTML actually renders **36 villas** | HTML calls `addRow` for A-01…A-10, B-01…B-08, C-01…C-08, D-01…D-10 and its footer says "36 villas". The 22-villa dataset (V01–V22) appears in the Minimal Flow PDF, not the HTML. | Do **not** claim the HTML map has 22 villas. Both datasets are fixtures. See §3 and open decision **D-01**. |
| S-3 | The HTML's 36 IDs match the UX Spec Appendix C IDs, but prices and statuses differ | HTML computes prices from built-up/plot formulas and hardcodes 8 booked / 4 reserved; UX Spec lists its own sample prices and statuses | Never merge the two datasets. Choose one fixture source explicitly. |
| S-4 | Customer details differ: UX Spec shows address, city, PIN, and optional co-applicant; the Minimal Flow, Walkthrough, and HTML show **name, mobile, email, terms only** | UX Spec W6 p.12; Minimal Flow p.12; Walkthrough p.6; HTML `#details` | Adopt the later three-field direction. Address/co-applicant become post-booking or admin data unless the client requires them. |
| S-5 | Hold start point differs | UX Spec starts the 10-minute hold at "Proceed to booking"; Minimal Flow says "held from the next step"; HTML says hold duration "To be confirmed" | Create the hold on the summary → details transition. Hold duration remains open (**D-08**). |
| S-6 | Journey length differs | UX Spec: W1–W7 plus states; Minimal Flow/HTML: six numbered steps | Implement the six-step visual journey; keep all UX Spec edge states. |
| S-7 | Typography differs | HTML uses Inter/system sans + Georgia serif accent; UX Spec starter names Archivo / Inter / JetBrains Mono | Visual source wins by default: Inter + serif accent, tabular numerals. Font licensing and final brand face remain open (**D-19**). |
| S-8 | Filters differ | UX Spec lists BHK, status, price range, facing; HTML implements BHK + "Available only" only | Phase 4 ships BHK + availability; price/facing filters are deferred until data exists. |
| S-9 | Dark mode | UX Spec requires contrast "in light and dark"; HTML has no dark theme | Do not ship a half-built dark theme. Light theme only until brand/theme direction is approved. |
| S-10 | Mini-map on villa page | UX Spec W3 requires a mini-map; HTML omits it | Implemented on the villa page from published plot geometry; missing positions are labelled as pending. See **D-20**. |
| S-11 | Phone panels are described as bottom sheets, but the HTML stacks them below the plan | UX Spec/Walkthrough require bottom sheets; V3.4 uses `.side-panel { position: static; border-top }` under 700px | Implement bottom sheets per UX behaviour; keep the HTML's visual treatment inside the sheet. |

---

## 2. Product scope and journey

### 2.1 Scope [Confirmed]

A modular-monolith public website plus staff administration:

- Map-first public exploration of a gated villa community.
- Villa floor plans, room-level specifications, and availability.
- Transparent price summary with server-calculated totals.
- Short-lived session-owned hold during buyer details and payment.
- Provider-neutral payment boundary; **no live payments**.
- Confirmation only from a verified server-side payment event.
- Supporting project, amenities, location, gallery, enquiry, and legal content when approved content exists.
- Role-protected staff screens for inventory, pricing, holds, bookings, payments/refunds, plans/specs, content, and enquiries.

### 2.2 Public journey [Confirmed]

| Step | Screen | Primary action | Server-authoritative check |
|---|---|---|---|
| 1 | Master layout / map | Select a plot, filter, preview | Published inventory only |
| 2 | Villa floor plan | Inspect floors and rooms | Published plan data only |
| 3 | Summary and pricing | Review itemised price, terms | Live availability and current price |
| 4 | Customer details | Enter name, mobile, email, accept terms | Create/renew hold and price snapshot |
| 5 | Review and pay | Confirm details, hand off to sandbox gateway | Re-check hold, availability, quote |
| 6 | Confirmation | Receipt and next steps | Verified payment event only |

### 2.3 Public URL map [Default, based on UX Spec Appendix A]

```
/                                   Master layout (map-first landing)
/villa/[villaId]                    Floor plan and room details
/villa/[villaId]/summary            Summary and pricing
/booking/[villaId]                  Customer details (hold created)
/booking/[villaId]/review           Review and pay
/booking/pending                    Payment pending / status check
/booking/[bookingRef]               Confirmation and receipt
/amenities  /location  /gallery  /contact  /terms  /refund  /privacy
/admin/...                          Staff (role-protected)
/api/...                            Route handlers (server only)
```

Route names are provisional; preserve the user-visible journey if they change.

---

## 3. Content, fixture, and data policy

### 3.1 Non-production data [Confirmed]

Every price, identity, phone number, dimension, room specification, status, and legal statement in the supplied HTML/PDFs is **sample data**. This includes:

- The V3.4 HTML's 36 generated plots and computed prices.
- The UX Spec Appendix C 36-villa table.
- The Minimal Flow PDF's 22 plots (V01–V22).
- Room schedules, specifications, and payment schedules.
- The sales number `+91 75105 44444` and email examples.
- All booking references and transaction IDs.

### 3.2 Fixture rules [Default]

1. Keep fixtures in one clearly named module, e.g. `src/fixtures/villas.dev.ts`, with a header comment: `DEVELOPMENT FIXTURE — NOT APPROVED PRODUCTION DATA`.
2. Fixtures are loaded only when `APP_ENV=development` or `APP_ENV=test`.
3. Production startup must fail closed if fixture seeding is requested.
4. Never seed fixtures into a production database.
5. Never copy sample legal text into production pages. Render a visible "Content pending client approval" block instead.
6. Mark sample prices in the UI as "Indicative · sample data" during development. Do not present them as offers.
7. Do not use real buyer details in tests, screenshots, or seed data.

### 3.3 Which fixture layout to use [Selected for development — D-01]

The prompt pack's "22-villa HTML map" does not match the committed HTML. The available options are:

- **A. HTML V3.4 geometry, 36 plots.** Only source with real SVG plot coordinates and map furniture. It is internally consistent with its own generated prices/statuses. Recommended for Phase 4 map development.
- **B. Minimal Flow 22 plots (V01–V22).** Matches the phase prompt wording, but has no committed SVG geometry; the map would need to be redrawn.
- **C. Wait for the client's real master plan and inventory.** Correct for production, but blocks public UI work.

**Selected:** use **B**, the Minimal Flow 22-villa sample, as a visibly marked development fixture. Its PDF supplies the plot IDs and status pattern, but its map is a raster screenshot rather than reusable vector geometry. The SVG plot positions are approximated from that image. Do not fill unspecified configurations, areas, prices, room dimensions, facing, or plot type from the separate 36-villa sources; render those facts as "To be confirmed". This selection approves development fixture use only, not production inventory or geometry.

---

## 4. Visual design system

### 4.1 Design principles [Confirmed from walkthrough]

- **Map first.** The site plan is the landing page, not a hero banner.
- **Nothing forced.** Buyers may inspect rooms without being required to; every step has a clear primary action.
- **Same details on every input.** Hover, keyboard focus, and tap reveal the same information.
- **Honest availability.** Availability and price are re-checked server-side before payment.
- **No dead ends.** Every blocked, failed, or pending state offers retry, wait, or similar villas.

### 4.2 Colour tokens

The HTML has two closely related palettes: the landing/intro palette (root variables) and a slightly cooler flow palette introduced later. Unify them into semantic tokens during Phase 2.

| Semantic token | Source value | Source role | Notes |
|---|---|---|---|
| `--canvas` | `#f6f7f2` / `#f8f9f6` | Page background | Landing vs flow |
| `--surface` | `#ffffff` | Cards, panels | |
| `--ink` | `#1c2922` / `#26342b` | Primary text | |
| `--ink-muted` | `#778078` | Secondary text | **Fails 4.5:1** on canvas (3.79:1) |
| `--ink-subtle` | `#879188`, `#9aa39c` | Captions, labels | **Fails** (2.6–3.3:1 on white) |
| `--line` | `#dfe5dc` / `#e4e9e2` | Borders, dividers | |
| `--brand` | `#1f5945` / `#315e48` / `#214f3d` | Primary green, CTAs | All three appear |
| `--brand-hover` | `#174a38` / `#173f30` | Hover | |
| `--brand-soft` | `#dce9df`, `#edf2eb`, `#e6eee7` | Tints | |
| `--available-fill` | `#e1eee1` | Map plot | |
| `--available-line` | `#82aa89` | Map plot | |
| `--available-text` | `#477653` | Status pill | 4.49:1 on `#e4f0e4` — borderline |
| `--reserved-fill` | `#f5ecd9` | Map plot | |
| `--reserved-line` | `#c39a58` | Map plot, dashed | |
| `--reserved-text` | `#98713a` | Status pill | 3.76:1 — **fails** |
| `--booked-fill` | `#e7ebe7` | Map plot | |
| `--booked-line` | `#adb6ae` | Map plot, dashed | |
| `--booked-text` | `#737d75` | Status pill | 3.59:1 — **fails** |
| `--danger` | `#b45f54` / `#ad554c` | Form errors | |
| `--focus` | `#1f5945` | Focus ring | 2px outline, 4–5px offset |
| `--road` | `#e6e9e2` | Site plan | |
| `--land` | `#eaf0e6` | Landscape | |
| `--water` | `#dbe9e8` | Pool | |

**Accessibility correction [Default]:** implementers must darken muted and status text until it meets 4.5:1. Proposed accessible equivalents (verify with a contrast tool during Phase 2):

- muted text on canvas: `#5f6b62` (5.18:1)
- muted text on white: `#5f6b62` (5.58:1)
- form and secondary-button borders: `#7d8a80` (3.61:1 on white, 3.35:1 on canvas) for non-text contrast
- available status text: `#2f5d3d` on `#e4f0e4` (6.49:1)
- reserved status text: `#7a5620` on `#f5ecd9` (5.62:1)
- booked status text: `#4f5a52` on `#e9ece9` (6.05:1)

Status colour must always be paired with the words **Available**, **Reserved**, or **Booked**. The legend does not replace the text label in the panel.

### 4.3 Typography

**Current visual direction [Confirmed from HTML]:**

| Role | Family | Size / weight | Notes |
|---|---|---|---|
| Display / H1 | Inter fallback stack | `clamp(52px, 6.2vw, 88px)`, 500, tracking `-0.065em`, line-height `.99` | "Find a place to feel *at home.*" |
| Display accent | Georgia / Times serif | 400 italic | Word "at home" |
| Flow H2 | Inter stack | `clamp(27px, 3.2vw, 38px)`, 450–500, tracking `-0.055em` | Screen titles |
| Section H3 | Inter stack | 17–29px, 450–500 | Villa and room names |
| Body | Inter stack | 15px / 1.55 | |
| Small UI | Inter stack | 11–13px | |
| Micro-label | Inter stack | 9–11px, uppercase, tracking `.12–.2em` | Kickers, step counts |
| Numerals | Inter with `font-variant-numeric: tabular-nums` | — | Prices and areas |

The HTML references Inter but does not load it; it falls back to `system-ui`. Phase 2 should self-host via `next/font` or accept the system stack. The UX Spec's Archivo/JetBrains Mono recommendation is not applied to the visual direction; record as **D-19**.

**Known issue:** many micro-labels are 9–10px, below comfortable mobile reading size. Raise the floor to 12px for body-adjacent labels and 11px only for non-essential metadata, while preserving the visual rhythm.

### 4.4 Spacing, layout, and breakpoints

The HTML uses many ad-hoc values (5, 7, 9, 13, 17, 21, 23, 27, 34 px). Normalise to a 4px base scale during implementation [Default]:

```
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80
```

Exceptions are allowed for optical alignment (e.g. 1px underlines, 3px radii), not for spacing.

| Property | Desktop | Tablet | Phone |
|---|---|---|---|
| Page max width | `1320px` landing, `1440px` flow | Fluid | Fluid |
| Gutter | 64–96px | 56px | 36px |
| Main two-column grid | `1fr + 290px`, gap 48px | `1fr + 240–270px`, gap 28px | Single column |
| Summary grid | `1fr + 340px`, gap 80px | `1fr + 300px`, gap 38px | Single column |
| Panel position | Sticky, left border | Sticky | Below content / bottom sheet |
| Map drawing width | 86% of container | 86% | 94% |
| Header height | 76–86px | 76px | 65–70px |
| Minimum tap target | 44px | 44px | 44px |

Breakpoints [Confirmed + Default]:

- `> 900px`: two-column layouts.
- `701–900px`: narrower two-column layouts.
- `≤ 700px`: single column, stacked panels.
- `≤ 860px`: bottom sheets replace the desktop side panel. The Walkthrough says ~860px; the HTML switches panels at 700px. Use **860px for interaction mode** and **700px for page reflow**, and document the difference.

### 4.5 Component foundation

| Component | Visual specification | States to implement |
|---|---|---|
| Brand lockup | Circular cross mark + `SPECTRA / GARDENS` letter-spaced wordmark | Link, focus |
| Landing primary CTA | Pill, 58px, brand fill, 40px circular arrow chip | Default, hover (lift 2px), focus ring, active, disabled |
| Flow text CTA | Brand text + arrow, 1px bottom border, no fill | Default, hover, focus, disabled |
| Filter tab | 12px text, 1px bottom border | Default, hover, `aria-pressed=true`, focus |
| Checkbox | 13–14px, brand accent | Default, checked, focus, disabled, error |
| Status pill | 9–11px, 2px radius, tinted background | Available, Reserved, Booked, Pending |
| Detail row | Label left, value right, 1px bottom divider | Default, emphasis |
| Price block | Large tabular number, small qualifier | Indicative, confirmed, unavailable |
| Map plot | SVG rect with 2px stroke; 4px radius | Available, reserved, booked, hover, focus, selected, dimmed |
| Villa side panel | 290px, sticky, left border in flow | Empty, preview, selected, booked, loading |
| Bottom sheet | Same content as side panel, drag/slide | Closed, open, dragging, dismissed, focus-trapped |
| Floor tab | Text + bottom border | Default, hover, selected, focus |
| Room shape | SVG rect; service tint; dashed outdoor fill | Default, hover, focus, active, no-data |
| Summary fact list | 620px max, 14px rows | Default, changed-price warning |
| Sticky price card | Desktop sticky column; phone bottom bar | Default, price change, hold active, hold expired |
| Form field | Underline input, 46px, no box | Default, focus, filled, invalid, disabled, error text |
| Phone field | `+91` prefix + 10-digit input | Default, focus, invalid, numeric keyboard |
| Booking primary button | 48px, brand fill, label left, arrow right | Default, hover, focus, loading, disabled, success |
| Journey breadcrumbs | 11px links, `/` separators, current step bold | Default, hover, current |
| State screen | Centred 520px, 44px symbol, kicker, heading, body | Processing, pending, failed, taken, success |
| Inline notice | Text + icon; no colour-only meaning | Info, warning, error, success |

### 4.6 Motion [Confirmed]

- Hover transitions: 180–220ms ease.
- CTA lift: 1–2px, never more.
- No parallax, autoplay, or decorative looping animation.
- `prefers-reduced-motion: reduce` disables transitions, smooth scrolling, map fades, and the payment spinner rotation.
- The payment spinner may remain as a static "Processing" indicator under reduced motion.

---

## 5. Map and floor-plan specification

### 5.1 Master map anatomy [Confirmed]

- SVG, generated from data, not a flat image.
- Site outline with a dashed boundary.
- Two 9m internal roads, one 12m entry road, main gate label, north arrow.
- Clubhouse, pool, play area, yoga lawn / garden court, landscaping, trees.
- Numbered plots as focusable/clickable shapes.
- Live counts by status.
- Legend with colour **and** text.
- Zoom controls, pan, and reset on touch and pointer devices.
- A reduced drawing width (86% desktop, 94% phone) keeps the surrounding controls full size.

### 5.2 Plot states [Confirmed]

| State | Fill | Stroke | Text | Interaction |
|---|---|---|---|---|
| Available | `#e1eee1` | `#82aa89`, solid | `#477653` | Selectable |
| Reserved / held / pending | `#f5ecd9` | `#c39a58`, dashed | `#98713a` | View only |
| Booked | `#e7ebe7` | `#adb6ae`, dashed | `#737d75` | View only |
| Hover / focus / selected | `#d3e5d5` | `#1f5945`, 4px | Brand | Thicker outline |
| Filtered out | — | — | — | Opacity `0.19`, labels hidden when possible |

**Non-negotiable:** never rely on fill alone. The accessible name and the panel include the status word.

### 5.3 Map interactions [Confirmed]

- Pointer enter → preview panel; pointer leave → restore selected or empty.
- Keyboard focus → same preview; blur → restore.
- Enter or Space on a focused plot → select.
- Click/tap → select; on phone, first tap opens the bottom-sheet preview (per UX Spec), with an explicit "Open floor plan" action.
- Filters fade non-matching plots rather than removing them; counts update.
- "Available only" excludes reserved/booked from emphasis.
- No match → "No villas match. Clear filters."
- All sold out → waitlist banner with a short form.
- Map data failure → "We couldn't load the layout. Retry." plus the enquiry path, never a blank screen.
- Loading → site-outline skeleton, then villas fade in.
- Status polling every 15–30 seconds; do not re-render the whole map or steal focus. Preserve selection, filters, zoom, and pan. Pause polling when the tab is hidden; resume and refresh on visibility.
- Selected villa persistence across navigation: returning from the plan restores selection and zoom.

### 5.4 Floor plan anatomy [Confirmed]

- Villa header: ID, configuration, status.
- Floor tabs for every floor that exists; default Ground.
- Room shapes with name and dimensions; service rooms tinted; open-to-sky rooms dashed.
- Overall dimensions, front/road side marker, north arrow.
- Room detail panel beside the plan on desktop; bottom sheet on phone.
- Mini-map locating the villa in the community (UX Spec requirement; see **S-10**).
- Caption: "Room areas · Not to scale" until architect drawings are supplied.
- Primary action: "Continue to summary" for available villas; disabled/replaced by "This villa isn't available to book" for booked/reserved.

### 5.5 Room states [Confirmed]

| State | Behaviour |
|---|---|
| No room selected | "Select a room"; size/area placeholders; floor shown |
| Hover / focus | Short tooltip: name, size, area, top 3 specs |
| Selected | Full spec panel: size, area, floor, ceiling, flooring, wardrobe, windows, electrical, bath |
| No data | Show name and size only; never fabricate specs |
| Long text | Wrap, never truncate with ellipsis |
| Floor switch | Swap plan and clear room selection; keep panel position |
| Booked/reserved | View only; similar available villas offered |

### 5.6 Availability vocabulary [Default]

Public labels are **Available**, **Reserved**, and **Booked**. Internally distinguish:

- `villa.availability_status`: `available` | `reserved` | `booked`.
- `hold` row: `active` | `released` | `expired` | `converted`.
- An active hold presents publicly as **Reserved**; only the owning session may continue to payment.
- `payment pending` presents as **Reserved** and must not trigger a second payment.

This keeps the public model simple while preserving operational truth. Phase 3 implements these distinct internal states in the schema.

---

## 6. Screen-by-screen requirements

### 6.1 Master layout (landing)

**Must show:** brand, slim header, location, live total/available/reserved/booked counts, BHK filters, "Available only", map, legend, hint line, supporting content below the fold.

**States:** loading skeleton; data error with retry and enquiry; no filter match with clear filters; all sold out with waitlist; booked/reserved view-only; phone bottom sheet; sticky Call/Enquire.

**Do not:** use a conventional hero carousel; hide availability behind a click; require hover on touch.

### 6.2 Villa floor plan

**Must show:** breadcrumb/back, villa ID, configuration, status, floors, room shapes, dimensions, room panel, price (indicative), CTA.

**States:** plan not uploaded → "Plan coming soon" + enquiry; booked → view only + similar villas; reserved → "Another buyer is completing payment. Check back in 15 minutes." (the 15-minute copy is provisional; see **D-08**).

### 6.3 Summary and pricing

**Must show:** property facts, key specifications, itemised price, total, booking amount, remaining balance, payment schedule when approved, terms accordion, "Proceed to booking", "Download cost sheet" (only when approved), "Talk to sales".

**Critical behaviour:** pressing Proceed re-checks availability and the current price on the server, then creates the hold and snapshot. If the price changed, show the new quote and require explicit confirmation. If unavailable, block and offer similar villas.

**Placeholder handling:** taxes, booking advance, balance, stamp duty, maintenance, and GST must render as "To be confirmed" unless approved values exist. Never compute a plausible-looking total from sample rules.

### 6.4 Customer details

**Fields [Default, per latest sources]:** full name, 10-digit Indian mobile, email, terms checkbox. No address, PAN, Aadhaar, or co-applicant at this step unless the client approves them.

**Behaviour:** inline validation; preserve entered values on back/forward; show hold countdown; clearly state the hold duration once approved; disable the submit button while submitting; handle hold expiry, network failure, and villa-taken states.

### 6.5 Review and pay

**Must show:** villa, buyer, mobile, email, itemised price, pay-now amount, remaining balance, availability note, Pay button with exact amount, edit details, back.

**Behaviour:** server re-checks hold ownership, expiry, availability, and quote; creates an idempotent payment order; browser redirect is never proof of payment. Double-click must not create a second order.

### 6.6 Payment outcomes

Five distinct screens/states, never a generic confirmation:

| Outcome | Message intent | Recovery |
|---|---|---|
| Processing | "Checking availability, then opening the gateway." | Wait; no navigation |
| Pending | "We haven't had confirmation. Do not pay again." | Check status; return later |
| Failed | "No booking was made. No money was taken." | Retry while hold valid; return to plan |
| Villa taken | "Another buyer completed payment first. You were not charged." | Similar available villas; master plan |
| Success | Verified confirmation only | Receipt; view on map |

The sandbox may expose a clearly labelled "Preview a payment outcome" control in development. It must not exist in production builds.

### 6.7 Confirmation

**Must show:** success statement, booking reference, transaction ID, villa, buyer, amount paid, balance, next payment (if approved), download receipt, "See it on the master layout", what happens next.

Refresh must keep showing the receipt via a secure booking reference. Never expose another buyer's booking by guessing a reference; use an unguessable token or authenticated access.

### 6.8 Supporting content

Amenities, location, gallery, contact/enquiry, terms, refund, privacy, and RERA/footer content are required by UX but have no approved copy or assets. Phase 9 must render honest "content pending" states rather than inventing claims.

---

## 7. Accessibility requirements

Target: **WCAG 2.2 AA** for the public journey and staff screens.

### 7.1 Keyboard

- Tab reaches every plot and every room.
- Enter and Space select the focused plot/room.
- Visible focus ring: 2px brand outline, 4–5px offset; never removed without replacement.
- A skip link precedes the map.
- Filters and floor tabs use `aria-pressed` (or a correct tab pattern).
- Bottom sheets trap focus while open, close on Escape, and restore focus to the trigger.
- No keyboard trap in the map's zoom/pan controls.
- Roving tabindex is preferred for the dense plot grid; otherwise document the tab order.

### 7.2 Screen readers and semantics

- Plots expose an accessible name including villa ID, type, status, and price where available: e.g. "Villa A-07, 4 BHK, available, indicative price ₹2.08 crore".
- The map has a group label and a short description; decorative map furniture is hidden.
- The villa/room panel uses a polite live region, but do not announce every pointer move. Announce on selection and data change.
- Counts and filter results use `role="status"`.
- Form errors use `role="alert"` and are linked with `aria-describedby`; invalid fields get `aria-invalid="true"`.
- Status is never colour-only.
- Price and area changes are announced without moving focus.
- The hold countdown is not announced every second; announce at meaningful thresholds (e.g. 5 minutes, 1 minute, expiry).

### 7.3 Visual and motor

- 4.5:1 contrast for normal text, 3:1 for large text and UI boundaries.
- 44×44px minimum targets on touch.
- 200% zoom and 320px reflow without loss of content or horizontal scrolling.
- Support `prefers-reduced-motion`.
- Do not require precision hovering; every hover action has a tap and keyboard equivalent.

### 7.4 Current wireframe risks [Confirmed]

The source fails AA in several places and must not be copied verbatim:

- Muted `#778078` on canvas = 3.79:1.
- Micro-labels `#9aa39c` on white = 2.59:1.
- Reserved text `#98713a` on `#f5ecd9` = 3.76:1.
- Booked text `#737d75` on `#e9ece9` = 3.59:1.
- Available text is 4.49:1, effectively at the boundary.
- Many labels are 9–10px.
- SVG `<g role="button">` elements need careful focus and activation handling; prefer real buttons overlaid on the SVG where practical.

---

## 8. Responsive behaviour

| Area | Desktop | Phone |
|---|---|---|
| Map | Side panel, 86% drawing width | Full width, bottom sheet, pinch zoom, 94% drawing width |
| Filters | Inline row | Wrap or bottom sheet; 44px targets |
| Floor plan | Plan + side panel | Plan full width; sticky floor tabs; room sheet |
| Summary | Facts + sticky price card | Single column; sticky bottom bar with total + CTA |
| Details | Two columns | Single column; hold timer top |
| Review | Two columns | Single column; sticky Pay button |
| Header | Slim, nav + Enquire | Logo + menu + call; sticky Call/Enquire |
| State screens | Centred 520px | Centred, safe-area padding |

Safe-area insets must be respected for sticky bars and bottom sheets. On-screen keyboards must not cover the active field or Pay button.

---

## 9. Application architecture

### 9.1 Stack [Confirmed]

- Next.js App Router, React, TypeScript strict mode.
- Vercel Node.js runtime in Mumbai (`bom1`).
- Supabase PostgreSQL in Mumbai (`ap-south-1`), Supabase Auth for staff, Supabase Storage for approved plans/images/receipts.
- Drizzle ORM with versioned SQL migrations.
- Server-rendered public pages; client components for map, floor plans, filters, countdown, and booking states.
- No live payment provider until approved.

### 9.2 Module boundaries [Default]

```
src/
  app/
    (public)/...                 Public routes and layouts
    admin/...                    Staff routes (role-protected)
    api/...                      Route handlers (webhooks, reads that cannot be RSC)
  modules/
    inventory/                   Villas, publication, plans, rooms, media
    pricing/                     Price settings, quote calculation, snapshots
    holds/                       Hold lifecycle and expiry
    bookings/                    Booking lifecycle, buyer details
    payments/                    Provider interface, orders, events, refunds
    notifications/               Email/SMS/WhatsApp adapters (sandboxed)
    outbox/                      Transactional outbox and worker
    staff/                       Staff identity, roles, authorization
    enquiries/                   Public enquiries
    content/                     Approved supporting content
  components/
    map/                         Interactive SVG master plan
    plans/                       Floor-plan SVG and room panel
    booking/                     Booking forms and state screens
    ui/                          Design-system primitives
  db/
    schema/                      Drizzle schema (server-only)
    migrations/                  Versioned SQL
    client.ts                    Server-only database client
  lib/
    env.ts                       Validated environment access
    money.ts                     Integer-minor-unit helpers
    errors.ts                    Safe error taxonomy
    logging.ts                   Structured, redacted logging
    auth.ts                      Session helpers
  fixtures/                      Development-only fixtures
```

This is a modular monolith: one deployable app, one database, explicit module ownership. Avoid premature service extraction.

### 9.3 Data ownership [Default]

| Module | Owns | May read | Must not |
|---|---|---|---|
| Inventory | villas, plans, rooms, specs, media | price settings (read-only via pricing) | write prices or bookings |
| Pricing | price settings, price snapshots, quotes | villa facts | mutate inventory |
| Holds | holds | villa availability, price snapshot | confirm bookings |
| Bookings | bookings, buyer details | holds, payments | write payment events |
| Payments | orders, payment events, refund requests | holds, bookings, quote | mark bookings paid outside its service |
| Outbox | outbox events, attempts | any event payload supplied by owner | mutate source business rows |
| Staff | staff profiles, roles, audit | all admin data through module services | bypass module invariants |
| Content | pages, media references | — | invent approved copy |

No module writes another module's tables directly. Cross-module changes happen through service functions in one database transaction.

### 9.4 Server/client boundary [Confirmed]

- Server Components fetch published inventory and approved content.
- Client Components receive only public DTOs; never database rows, service keys, cost fields, staff data, or internal statuses.
- All writes go through server actions or route handlers with validation and authorization.
- Public API responses expose only published, approved-for-display fields.
- Admin operations re-check role server-side on every request.
- Payment webhooks are server-only, signature-verified, and idempotent.
- The browser never sends authoritative price, status, role, hold ownership, or payment outcome.

### 9.5 Security invariants [Confirmed]

1. Hold creation runs in a transaction that locks the villa row (`SELECT ... FOR UPDATE`) and checks current status plus expired holds.
2. A partial unique index prevents more than one active hold per villa.
3. Hold expiry uses database time, never the browser clock.
4. A hold is owned by a server-issued session identifier; foreign or expired holds are rejected.
5. Price and currency come from the server; the hold stores an immutable price snapshot.
6. Payment order creation is idempotent per hold/attempt key.
7. Bookings are confirmed only from a verified webhook or approved server-verified mechanism.
8. Repeated/delayed webhooks are deduplicated by provider event ID.
9. Refund requests are idempotent and remain requests until an approved provider/policy exists.
10. Service-role keys, database URLs, and webhook secrets are server-only and never logged.
11. Admin access uses Supabase Auth plus server-side role checks; UI hiding is not authorization.
12. Public reads expose only published villas with approved media/content.
13. Errors returned to clients are safe and do not reveal SQL, stack traces, secrets, or personal data.
14. Personal data is minimised: name, mobile, email only at booking; no ID documents in Phase 1–10.
15. Logs redact mobile, email, names, tokens, and payment payloads beyond safe identifiers.

### 9.6 Environment variables [Implemented in Phase 2]

| Variable | Exposure | Purpose |
|---|---|---|
| `APP_ENV` | Server | `development` \| `test` \| `staging` \| `production` |
| `APP_BASE_URL` | Server/public | Canonical origin for links and webhooks |
| `DATABASE_URL` | Server only | Runtime pooled PostgreSQL connection |
| `DIRECT_DATABASE_URL` | Server only | Migration/direct connection |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | RLS-scoped client key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Privileged operations; never `NEXT_PUBLIC_*` |
| `PAYMENT_PROVIDER` | Server | `sandbox` by default; live values rejected until approved |
| `PAYMENT_SANDBOX_SECRET` | Server only | Sandbox order/signature simulation |
| `PAYMENT_WEBHOOK_SECRET` | Server only | Webhook signature verification |
| `PAYMENTS_LIVE_ENABLED` | Server | Must be `false` until written approval |
| `OUTBOX_WORKER_SECRET` | Server only | Authenticates scheduled worker invocation |
| `CRON_SECRET` | Server only | Optional; Vercel Cron Bearer token for the same worker |
| `HOLD_DURATION_SECONDS` | Server | `600` provisional default |
| `INVENTORY_POLL_SECONDS` | Public config | `20` (within the 15–30s range) |
| `LOG_LEVEL` | Server | Structured logging threshold |
| `ENABLE_DEV_FIXTURES` | Server | `false`; refused outside development/test |
| `NOTIFICATION_PROVIDER` | Server | `disabled` until recipients/provider approved (Phase 7) |

Phase 2 implemented the variables above except `NOTIFICATION_PROVIDER` and the optional `CRON_SECRET`, which arrived with Phase 7.
It fails clearly when values are invalid and never prints secret values.

### 9.7 Deployment assumptions [Confirmed from PLAN + Default]

- Vercel Node.js runtime, Mumbai `bom1`. [Confirmed]
- Supabase PostgreSQL `ap-south-1`. [Confirmed]
- Migrations run as an explicit deployment step, not at application boot. [Default: recommended for reviewability and rollback control]
- Serverless execution means no assumption of a long-running worker. Phase 7 must verify the scheduling model and use a scheduled invocation or approved worker host. [Confirmed constraint; implementation method open]
- No live payments until the provider, merchant account, refund terms, and client approvals exist.

---

## 10. Data model outline

Phase 3 adds the schema in `src/db/schema/index.ts` with versioned migrations in `drizzle/`. It covers the following core records; media/content/enquiries, audit history, and richer architectural geometry remain later work:

| Entity | Key fields / invariants |
|---|---|
| `villas` | Unique code, configuration, areas, floors, facing, corner flag, publication/availability status, optional bounded map coordinates |
| `floor_plans` / `rooms` | Storage metadata, floor, room names, sizes, structured specifications |
| `price_settings` | Versioned INR base price, tax rate/policy, effective dates; overlapping windows are rejected |
| `price_snapshots` | Immutable quote with integer paise `BIGINT` amounts; referenced by hold and booking |
| `holds` | Hashed session owner, idempotency key, status, expiry, quote; partial unique index permits one active hold per villa |
| `bookings` | Unique reference/hold/quote, minimal buyer fields, lifecycle status, confirmation timestamp; one live booking per villa |
| `payments` / `payment_events` | Provider-neutral order, idempotency, quote amount, status; verified provider event ID deduplicates deliveries |
| `refund_requests` | Payment, reason, amount, status, idempotency; active requests cannot exceed a succeeded payment |
| `outbox_events` | Typed aggregate reference, dedupe key, JSON payload, attempts, scheduling and processing state |
| `staff_profiles` | Supabase Auth UUID, database role (`admin`, `sales`, `accounts`), active flag |

**Money:** store integer minor units (paise) in `BIGINT`; currency `INR`; never floating point. Use a single money helper for formatting/arithmetic.

**Time:** store `timestamptz` in UTC; display in `Asia/Kolkata` (IST). Document the convention and use database `now()` for expiry.

**Constraints:** foreign keys, checks for valid money/status combinations, partial unique indexes for active holds and live bookings, idempotency uniqueness, effective-price overlap protection, immutable snapshots, booking/hold/quote consistency, payment/refund amount consistency, status transition guards, UTC `timestamptz`, and revocation of `anon`/`authenticated` privileges on these tables when those Supabase roles exist.

**Public access:** the initial migrations revoke client-role privileges on these domain tables. Phase 4 adds server-only published inventory reads and a narrow public DTO endpoint; direct client-table reads remain disabled. Server authorization remains mandatory.

---

## 11. Error, logging, and privacy conventions

- Use a typed error taxonomy: `validation`, `unauthenticated`, `forbidden`, `not_found`, `conflict` (villa taken / hold expired), `rate_limited`, `provider_error`, `internal`.
- User-facing messages are plain, specific, and actionable; never expose SQL, stack traces, provider payloads, or secrets.
- Log structured events with request ID, route, outcome, and safe entity IDs.
- Redact names, email addresses, mobile numbers, auth tokens, service keys, and full webhook bodies.
- Payment logs may include provider order ID, event ID, status, amount, and timestamp; never card/UPI data.
- Do not log buyer details at info level.
- Surface operational failures (outbox, webhook, expiry) as monitorable events.

---

## 12. Test strategy

| Area | Required tests |
|---|---|
| Map/plans | Filters, selection, keyboard operation, loading/error/empty, booked view-only, mobile sheet |
| Pricing | Integer arithmetic, formatting, snapshot immutability, changed-price confirmation |
| Holds | Concurrent holds, expiry, foreign session, retry, release, DB-time authority |
| Payments | Idempotent order creation, invalid signature, duplicate/delayed webhook, pending/failed/cancelled, browser closure |
| Bookings | Confirmation only from verified event, duplicate prevention, recovery states |
| Admin | Role checks on direct requests, invalid updates, transaction integrity, audit |
| Outbox | Retry, backoff, permanent failure, duplicate processing, worker interruption |
| Accessibility | Keyboard path, focus order, labels, errors, status announcements, contrast, reduced motion |
| Content | Fixture guard, unapproved content blocked, no secrets in bundles |

Tests must not weaken or delete existing coverage. Phase 2 establishes the runner and commands.

---

## 13. Repository findings and checks performed

### 13.1 Repository state [Confirmed 18 Nov 2026]

- `spectra-gardens` is its own Git repository inside the workspace.
- Branch `main` has **no commits**; the working tree is untracked.
- Remote: `https://github.com/ucproind/spectra-gardens.git`.
- Source documents remain in `docs/`; `DESIGN.md`, `README.md`, and the Phase 2 scaffold are untracked.
- Phase 2 added `package.json`, `package-lock.json`, strict `tsconfig.json`, ESLint/Prettier/Vitest configuration, a GitHub Actions workflow, `.env.example`, Drizzle configuration, and the `src/` application tree.
- At the time of the original Phase 2 review, no database tables or migrations existed; Phase 3 now adds the initial schema. No `Dockerfile` exists; deployment remains Vercel + Supabase per §9.7.

### 13.2 Checks run

| Check | Result |
|---|---|
| Repository inventory | Three source docs plus the Phase 2 scaffold |
| `git status` / `git log` | No commits; all files untracked |
| Source inspection | PLAN, full V3.4 HTML, extracted text of all three UX PDFs |
| HTML plot count | 36 plots generated, despite the prompt's "22-villa" wording |
| HTML title check | Title says V3.3; filename says v3.4 |
| Contrast spot-check | Several source colour pairs fail 4.5:1 (see §7.4); corrected tokens implemented |
| `npm run format:check` | **Passed** |
| `npm run lint` | **Passed** |
| `npm run typecheck` | **Passed** (also passed from a clean tree with `.next` and `next-env.d.ts` removed) |
| `npm run test` | **Passed** — 10 files, 34 tests |
| `npm run build` | **Passed** — Next.js 16.4.6, 4 routes |
| `npm run db:generate` | **Passed** during Phase 2 with no schema; Phases 3/4 generated versioned schema migrations and reported no remaining drift |
| Production smoke test | `/` 200, `/design-system` 200, `/api/health` 200, unknown route 404 |
| `npm audit --omit=dev` | **0 production vulnerabilities** |
| `npm audit` (all) | 20 dev-only advisories (4 moderate, 16 high) in lint/build/test tooling; no production dependency affected |

### 13.3 Phase 2 changes

- Added the Next.js App Router scaffold, strict TypeScript, formatting, linting, test, and build scripts.
- Added design tokens with WCAG AA corrections, accessible primitives, a public foundation preview, and an internal design-system reference.
- Added server-only environment parsing, public/server separation, direct configuration tests, fail-closed fixture guarding, structured redacted logging, safe error mapping, and integer-paise money helpers.
- Added a lazy server-only Drizzle client, Drizzle Kit configuration, and an empty schema placeholder.
- Added a health route, error boundaries, a 404 page, a startup configuration check, and CI.
- No live payments, production data, fabricated content, or database tables were added.
- No source document was altered.

---

## 14. Open decisions register

| ID | Decision | Current default / behaviour | Blocking |
|---|---|---|---|
| D-01 | Which fixture map: 36-plot HTML geometry, 22-plot Minimal Flow, or client master plan | 22-plot Minimal Flow selected for development; map coordinates are approximate redraws. Production plan remains under D-15. | Resolved for development |
| D-02 | Payment provider and merchant account | Provider-neutral sandbox only; order, verification, and refund-request boundaries implemented | Live integration, launch |
| D-03 | Are prices public or "price on request"? | Show indicative sample prices only in dev; production blocked | Phase 4/9 |
| D-04 | Booking amount: fixed or percentage; refundable? | Render "To be confirmed" | Phase 5/9 |
| D-05 | Tax/GST rule, stamp duty, maintenance deposit | Render "To be confirmed"; never compute from samples | Phase 3/9 |
| D-06 | Payment schedule milestones | Not implemented until approved | Phase 9 |
| D-07 | Refund/cancellation terms | Request-only model; no automatic refunds | Phase 6/9 |
| D-08 | Hold duration: 10 or 15 minutes? | 10 minutes, configurable (`600s`) | Phase 5 approval |
| D-09 | Is a reserved villa publicly visible? | Show as Reserved / view-only | Phase 4 |
| D-10 | ID verification at booking vs agreement; OTP? | No ID, no OTP at booking | Phase 5/9 |
| D-11 | Co-applicant at booking? | No | Phase 5/9 |
| D-12 | Notification recipients and channels | Outbox events only; handlers disabled | Phase 7/9 |
| D-13 | Receipt delivery: email, download, or both | Download placeholder; email disabled | Phase 7/9 |
| D-14 | Legal terms, privacy, RERA, contact details | Buyer-details submission is gated on `BOOKING_TERMS_VERSION`; public legal/contact/enquiry pages remain unbuilt because no approved copy exists | Phase 11 |
| D-15 | Real inventory, prices, floor plans, room specs, map geometry | Dev fixtures only | Phase 4/9/11 |
| D-16 | Languages | English only | Phase 9 |
| D-17 | 3D walkthrough / photos | Placeholder, phase 2 | Phase 9 |
| D-18 | Staff role model and audit requirements | Role enum and server-side matrix implemented as an assumption; sensitive-change audit log not modeled; no staff screens or accounts yet | Phase 8/11 |
| D-19 | Brand fonts/logo and dark mode | Inter/system + serif accent; light theme only | Phase 2/4 |
| D-20 | Mini-map on villa page | Implemented using published plot geometry; missing geometry is labelled as pending | Resolved for Phase 4 |
| D-21 | Production hosting/plan and worker scheduling | Vercel bom1 + Supabase ap-south-1; scheduled worker to verify | Phase 7/11 |
| D-22 | Monitoring, backups, operational ownership | Not configured | Phase 10/11 |
| D-23 | Enquiry form destination and spam protection | Store enquiry server-side; no email until approved | Phase 9 |
| D-24 | Analytics/event tracking consent | No analytics until approved | Phase 9/11 |

**Approval rule:** unresolved items must render an honest placeholder or remain disabled. They must never be filled with invented production values.

---

## 15. Phase gates and next steps

### 15.1 Phase 2 delivered

- Next.js App Router scaffold with strict TypeScript and explicit public, UI, database, and library boundaries.
- Formatting, linting, type-checking, test, and build scripts, all runnable through `npm run check`.
- Design-token layer and accessible primitives derived from §4, including corrected contrast, focus rings, status text, and form errors.
- Drizzle configuration and migration workflow; the schema stays empty until Phase 3.
- Environment validation with server-only secret boundaries, a safe example file, and startup validation.
- Error, logging, redaction, and money conventions.
- Repository README with install, run, migration, and phase-status guidance.

### 15.2 Phase 2 exit criteria

- [x] A fresh developer can install, configure, and run the application from the README.
- [x] Formatting, linting, type-checking, tests, and production build pass.
- [x] Configuration failures are clear and do not reveal secret values.
- [x] Module boundaries and server/client separation are documented and enforced.
- [x] No live payments, production data, or unnecessary infrastructure were added.

### 15.3 Phase 3 delivered

- Added 12 typed Drizzle tables for villas, floor plans, rooms, staff profiles, prices, immutable price snapshots, holds, bookings, payments, verified payment events, refund requests, and outbox events.
- Added versioned SQL migrations with foreign keys, value/lifecycle checks, lookup indexes, idempotency constraints, a one-active-hold-per-villa partial unique index, and a one-live-booking-per-villa partial unique index.
- Added database triggers for immutable quote and transaction identities, non-overlapping effective price windows, booking/hold/quote consistency, payment/refund amount limits, status transitions, and `updated_at` maintenance.
- Revoked `anon` and `authenticated` access to these tables when running under Supabase roles. Public inventory reads are not enabled yet.
- Kept staff role profiles linked by Supabase Auth UUID without depending on the managed `auth.users` schema, so a local PostgreSQL migration can run without Supabase internals.
- Documented the expiry-worker requirement: an expired hold remains indexed as active until a transaction changes its status; booking services must expire it before attempting a replacement.

### 15.4 Phase 3 limitations and next steps

- The migration has not been applied to a database in this environment. It is a first-install migration; once applied, changes must be forward migrations. There is no automatic down migration. Recovery from a bad production migration requires a reviewed corrective migration or a database restore.
- `holds` uniqueness is status-based because PostgreSQL partial indexes cannot use the moving `now()` boundary. The hold transaction/expiry worker must mark elapsed holds `expired` using database time before creating another active hold.
- Sensitive booking fields are stored in the database and returned only through server modules; field-level encryption/retention policy requires privacy review before production data is loaded.
- Add transaction/service methods for pricing, hold concurrency, booking lifecycle, webhook handling, and outbox claiming in their owning phases. The schema alone does not implement these workflows.
- Phase 4 extends the schema with optional plot coordinates. The real inventory loader reads only published rows; map coordinates and plan drawings remain client-supplied content.

### 15.5 Phase 4 implementation

- Replaced the foundation preview with the responsive, map-first exploration page and the 22-villa Minimal Flow sample as a guarded development fixture. Availability counts match the sample: 13 available, 6 booked, 3 reserved.
- Added mouse, touch, and keyboard plot selection, 3/4 BHK and available-only filters, status counts, a text legend, selection details, a 44px villa picker, and zoom/pan/reset controls. Filters dim plots and preserve selection.
- Added complete selectable Ground and First floor placeholder plans for every sample villa. They use the room names shown in the 22-villa flow; room positions are schematic, while sizes, areas, specifications, villa areas, prices, and unspecified configurations stay "To be confirmed". Booked and reserved villas remain view-only.
- Added a villa location mini-map that highlights the selected villa among published plot geometry, with a clear pending message when its position is unavailable.
- Added mobile detail-sheet focus trapping, initial focus, Escape handling, and focus restoration to the selected plot or room.
- Added component interaction tests for keyboard villa selection, availability filtering, floor/room selection, both mobile sheet keyboard flows, and mini-map highlighting.
- Added the server-only public inventory loader and `/api/villas` route. Database reads omit drafts and withdrawn villas, return only public fields, use current price settings, expose active unexpired holds as Reserved, and include optional plot coordinates.
- Added configurable 15–30 second polling for database inventory, paused while the tab is hidden and refreshed when it becomes visible. Failed refreshes preserve the last displayed data and show an out-of-date message.
- Added loading, empty, pending-approval, and retryable error states. Local fixture use requires `APP_ENV=development` and explicit `ENABLE_DEV_FIXTURES=true`; sample inventory and prices are never served in production.
- Added bounded map-coordinate migrations to support rendering approved inventory. No production geometry, villa data, or plan assets were loaded.
- Added the V3.4 intro hero above the explorer: full-height headline, "Get started" pill CTA linking to `#villa-map`, the wireframe's abstract 36-plot SVG artwork as decorative illustration, and a footer strip with live villa counts and configuration labels. The explorer keeps its live status counts but omits its duplicate headline. The artwork is explicitly not plot geometry; fixture inventory is labelled "Sample inventory" rather than presenting the wireframe's sample count as real stock.

### 15.6 Phase 4 acceptance limits

- D-01 is resolved for development: the 22-villa Minimal Flow sample is selected. Its site geometry is redrawn approximately from a screenshot and is not approved for production use.
- Real architectural drawings, room geometry, dimensions, prices, areas, and specifications still need client/architect approval and database integration under D-15.
- A waitlist/enquiry submission is not wired because its destination and spam controls remain open under D-23. The all-unavailable state is informational.
- Mobile sheet keyboard behavior is covered by component tests; touch-device behavior and visual layout still need browser/device review.
- Phase 4 visual review remains outstanding. Phase 5 server implementation may proceed independently; live payments remain disabled.

### 15.7 Phase 2 did not authorise

- No live payments.
- No production inventory or prices.
- No fabricated legal/contact/RERA content.
- No admin authorization shortcuts.
- No long-running worker assumption without verifying deployment support.

### 15.8 Phase 1 exit criteria

- [x] `DESIGN.md` exists.
- [x] Confirmed requirements, defaults, and open decisions are separated.
- [x] Sample data is explicitly non-production.
- [x] Source discrepancies are recorded rather than repeated as fact.
- [x] Architecture, boundaries, environment, and deployment assumptions are documented.
- [x] Accessibility requirements and known source failures are documented.
- [x] Repository checks and their limits are reported honestly.
- [ ] Client/owner approval of open decisions D-03, D-04, D-05, D-08, and D-15 before production-facing phases.

### 15.9 Phase 5 implementation and acceptance limits

- Added `POST /api/holds`: validates villa code and idempotency key, issues an opaque HttpOnly guest-session cookie, locks the published villa row, marks elapsed holds expired with PostgreSQL time, reads the active server price, stores an immutable quote snapshot linked to its price setting, and creates a time-limited hold. Existing idempotency and one-active-hold indexes remain database guards.
- Added quote calculation in integer paise and tests for input validation, tax rounding, retry reuse, competing sessions, expiry recovery, and foreign-session conflict. Concurrency tests use an in-memory serialized repository; PostgreSQL row-lock/index integration has not run.
- Added `POST /api/booking-details` with server-side session ownership and expiry checks, minimal name/mobile/email fields, one booking per hold, and idempotent replay. Creating the pending booking converts its hold; later hold attempts also check for live bookings. Raw session tokens and buyer fields are not logged.
- Added nullable terms-version and acceptance-time columns so existing rows do not acquire fabricated consent. New booking writes require explicit acceptance and a configured `BOOKING_TERMS_VERSION`; the endpoint stays closed while approved legal terms are unavailable.
- Added migrations `0004` and `0005`. They have not been applied because no database is configured in this environment.
- Phase 5 remains in progress: the villa page connects the hold request, server quote, expiry countdown, and retry states for published available inventory; the buyer-details form is not connected because approved terms/version are absent. The 600-second duration remains provisional (D-08), and database concurrency integration must run after migrations are applied. Production inventory and pricing are also absent; fixture villas cannot be held because the API accepts only published database records.

### 15.10 Phase 6 implementation and acceptance limits

- Added a provider-neutral `PaymentProvider` interface and a sandbox adapter. It derives deterministic sandbox order IDs by merchant reference, signs webhook bodies with HMAC-SHA256, validates timestamp freshness, compares signatures with a constant-time function, and rejects malformed payloads. No live provider is selected or contacted.
- Added `POST /api/payments/orders`. It requires the guest session, locks the booking, hold, villa, and quote rows, rechecks ownership, hold expiry using database time, villa status, competing live bookings, and the current server price against the immutable hold snapshot. It creates an idempotent `pending` payment row before contacting the provider, so retries reuse the same merchant reference.
- Added `POST /api/payments/webhook`. It reads the raw body, verifies the `x-sg-signature` header, deduplicates by provider event ID, checks amount and currency against the stored payment, and applies the outcome inside one transaction. Bookings are confirmed only by a verified success event; failure and cancellation remain unconfirmed.
- Added `GET /api/payments/status`. It is session-scoped and returns only the caller's booking and latest payment status. A guessed reference returns the same not-found response as an unknown one.
- Added a development/test-only `POST /api/payments/sandbox` endpoint that creates a signed sandbox event and runs it through the real webhook verification path. It returns 404 in staging and production.
- Late success events may follow a failure or cancellation. The booking transition is `payment_failed → pending_payment → confirmed`; migration `0006` allows the corresponding `failed`/`cancelled → succeeded` payment transition. A post-cancellation success is recorded and creates an idempotent refund request instead of reviving the booking.
- A duplicate successful payment for an already-confirmed booking is recorded and creates a `requested` refund record keyed by payment. Refunds remain requests; no provider refund is attempted (D-07).
- Public inventory now treats a live pending or confirmed booking as Reserved or Booked even if the villa status row has not yet been updated. This closes the gap left by converting an active hold into a booking.
- Tests cover order validation, ownership, expiry, current-price drift, provider failure and retry, success, pending, unknown, failure, cancellation, delayed success, repeated delivery, late failure after success, amount mismatch, duplicate payments, refund requests, and status scoping. `format:check`, `lint`, `typecheck`, the full test suite, and the production build pass.
- Limits: the migration and PostgreSQL row-lock behaviour have not been exercised against a running database because none is configured in this environment. Provider order creation runs inside the application request; a real provider integration must confirm its idempotency-key behaviour or move order creation into durable work. Payment and confirmation screens are Phase 9. Live payments stay blocked by both environment validation and the missing client approvals (D-02, D-07).

### 15.11 Phase 7 implementation and acceptance limits

- Added a transactional outbox. `booking.confirmed` and `refund.requested` records are written in the same database transaction as the payment/booking change that requires follow-up, deduplicated by a stable key such as `booking.confirmed:<bookingId>`.
- Added a bounded batch worker (`runOutboxBatch`) with `FOR UPDATE SKIP LOCKED` claiming, attempt counts, exponential backoff capped at one hour, stale-claim recovery, dead-lettering, and safe error codes. Handlers run outside the claim transaction, so every handler must be idempotent; the documented contract is at-least-once delivery.
- Added database-authoritative hold expiry in the same worker transaction. Only `active` holds whose `expires_at` is at or before PostgreSQL `now()` are marked `expired`; a valid unexpired hold cannot be released.
- Added `GET|POST /api/internal/outbox`, protected by a constant-time comparison against `OUTBOX_WORKER_SECRET`, or `CRON_SECRET` when the scheduler can only send Vercel Cron's Bearer token. Missing configuration returns `503`; unauthorized calls return `401`.
- Notification handlers are configurable through `NOTIFICATION_PROVIDER`. `disabled` maps to no handlers, so queued notification events stay `pending` rather than being discarded or sent. `sandbox` logs a redacted delivery-suppression line and performs no external delivery.
- Tests cover successful completion and no re-claim, retry with backoff, permanent failure/dead-letter, duplicate enqueue, abandoned-claim recovery, retry-time gating, hold expiry, and disabled notification handlers processing.
- Operational model: the worker is a stateless HTTP batch, not a long-running process. Invoke it from an external scheduler every 1–5 minutes, or configure a Vercel Cron entry that calls `/api/internal/outbox` with `CRON_SECRET`. Monitor HTTP status, the returned `summary`, and rows with `status = 'dead_letter'` or a stale `locked_at`. Do not point the scheduler at the endpoint without a secret.
- Limits: the outbox migration/schema already exists, but no database is configured here, so `SKIP LOCKED` concurrency, real PostgreSQL time, and cron invocation have not been exercised. Scheduling ownership, batch frequency, alert thresholds, and notification recipients/providers remain client/infrastructure decisions (D-12, D-13, D-21). Notifications stay disabled until approved.

### 15.12 Phase 8 implementation and acceptance limits

- Added a server-only staff authorization boundary. A Supabase access token is verified by calling Supabase Auth's `/auth/v1/user` endpoint with the public anon key; the returned user ID must match an active `staff_profiles` row. Tokens, email addresses, and raw auth responses are never logged.
- Added an explicit least-privilege matrix as an assumption for D-18 approval: `admin` has every permission; `sales` manages inventory publication and reads plans/bookings; `accounts` reads pricing/bookings/payments/refunds and may raise refund requests. Prices are admin-only. Every route rechecks the matrix on the server; hiding UI is never the control.
- Added protected endpoints: `GET /api/staff/inventory`, `PATCH /api/staff/inventory/:villaId`, `GET|POST /api/staff/pricing`, `GET /api/staff/bookings`, `GET /api/staff/payments`, `GET|POST /api/staff/refunds`, and `GET /api/staff/plans`.
- Inventory writes are limited to `draft`, `available`, and `withdrawn`. Publishing sets `published_at` once; returning to draft clears it. `reserved` and `booked` are system-owned from live holds/bookings and return `409` rather than being overwritten.
- Price-setting writes validate integer paise, tax rate bounds, tax policy, and `validUntil > validFrom`, and record the acting staff profile as `created_by`.
- Refund creation is idempotent per payment/key, limited to succeeded payments, capped at the captured amount, stored as `requested`, and attributed through `requested_by`. No provider refund is attempted.
- Admin reads deliberately omit buyer names, mobile numbers, and email addresses. They expose references, villa codes, statuses, amounts, and timestamps only. Enquiry, content, and audit-log entities do not exist yet.
- Tests cover the role matrix, allowed and denied reads, inventory publishing/withdrawal/conflict handling, price validation, refund idempotency, and invalid refund states.
- Limits: no Supabase project or staff accounts are configured, so live token verification, role assignment, and the HTTP endpoints have not been exercised. Staff screens are not built, plan/room writes are not implemented, and enquiry/content entities do not exist. The sensitive-change audit log remains unmodeled (D-18). Role-to-permission mapping and account provisioning are assumptions requiring client approval. No service-role key is used or exposed.

### 15.13 Phase 9 implementation and acceptance limits

- Replaced the standalone hold panel with a single client flow at `/villa/[villaId]`: hold, customer details, review, payment processing, pending, failed, cancelled, unconfirmed outcome, taken/expired-hold recovery, confirmation, and missing-session recovery.
- Every amount shown comes from the server quote returned with the hold or the verified payment record. The review step distinguishes the server-quoted total from the unapproved booking advance and remaining balance, which stay "To be confirmed".
- Buyer details are validated in the browser for usability and again by the server. Submissions are blocked while `BOOKING_TERMS_VERSION` is unset, and the development banner states that no booking will be created.
- Payment initiation reuses one idempotency key per attempt; retries after a transport failure reuse it. A failed/cancelled payment starts a new key on retry. `quote_changed`, `hold_expired`, and unavailable inventory map to explicit recovery screens with no charge.
- The confirmation screen is rendered only from `GET /api/payments/status`, which is session-scoped. Client state cannot produce a confirmed booking.
- Booking progress is preserved through the `?booking=` reference only; the reference is re-read from the server on load, and an unknown or foreign-session reference shows a recovery screen instead of leaking details.
- The development-only sandbox outcome controls remain available only when `APP_ENV` is `development` or `test`; they call the signed sandbox webhook path rather than mutating client state.
- Tests cover view-only fixtures, quote display, field validation and ARIA error wiring, the approved-terms gate, the full hold-to-confirmed path, URL-based restoration, price-change recovery, and idempotency-key stability.
- Limits: no approved terms, tax rules, refund policy, contact details, payment schedule, project/gallery/enquiry/legal content, or production prices exist, so those sections are omitted rather than invented. Receipt delivery is not implemented. The sandbox provider is still the only provider, and no database is configured here, so the flow has only been tested against mocked HTTP responses. Mobile layout is CSS-only and has not been visually reviewed on a device.

### 15.14 Phase 5–8 verification fixes

- Guest sessions are now HMAC-signed with `GUEST_SESSION_SECRET`. `getSessionHash` and server components reject unsigned, forged, tampered, or stale-secret cookies instead of treating any client-supplied 64-hex value as an identity. Production config fails closed when the secret is absent.
- Hold idempotency is scoped to `(session, villa, key)` in application code and in migration `0007`. Replaying another villa's key no longer returns that villa's hold.
- `POST /api/booking-details` now re-checks the locked villa's status and other live bookings before creating a pending booking; staff cannot publish/withdraw a villa with an unexpired active hold (`staff-repository.server.ts`).
- A visitor whose active hold makes a villa appear `reserved` can resume: `getResumableHold` returns only that session's own unexpired hold, and the booking flow restarts at buyer details with the original idempotency key. Another buyer's hold stays view-only with an explanatory message.
- Order creation refuses a second key while an earlier payment is still `created`, `pending`, `unknown`, or `succeeded`, and a finished payment can no longer be replayed as a "ready" order. Duplicate provider successes are still recorded and converted into idempotent refund requests; actual refund execution remains blocked on D-07.
- The outbox worker is scheduled by `vercel.json` (five-minute cron using `CRON_SECRET`). Stale-claim recovery now advances `availableAt`, so a timed-out job cannot be re-claimed immediately without backoff. Worker route errors log error names only.
- Added tests for signed-session round trips and forgery, cross-villa idempotency, live-hold withdrawal conflicts, resumed holds, payment-in-progress blocking, and HTTP-level staff token/role checks. `format:check`, `lint`, `typecheck`, tests, and build pass.
- Remaining limits: all concurrency, `SKIP LOCKED`, unique-index, and database-time claims still need integration tests against PostgreSQL. No staff screens, holds admin, plan writes, or audit trail exist. Notification handlers remain at-least-once; a real provider must be idempotent or add a delivery ledger. Refunds stay requests only, and no live provider or approved content is configured.

### 15.15 Wireframe alignment additions

- Added journey breadcrumbs to the booking flow with the wireframe's path labels (Home / Plots / Floor plan / Selection / Details / Review / Payment / Confirmation), a `03 / 06`-style step counter, `aria-current="step"` on the active crumb, and real links only for Home, Plots, and Floor plan. Intermediate crumbs are plain text so they cannot trigger unsafe client-state jumps.
- Added a "Your selection" screen as the first booking step on published villas: server-provided villa facts, the server price (hidden as "To be confirmed" for development fixtures), unapproved tax/booking/remaining lines left as "To be confirmed", expandable refund-terms placeholder, "Edit selection" link, and "Proceed to booking" which creates the hold. When no summary is supplied, the flow keeps the earlier hold-first behavior.
- Consolidated status colours onto the WCAG-AA-darkened tokens: map plot fills, strokes, and labels now share `--sg-available-*`, `--sg-reserved-*`, and `--sg-booked-*` with the status pills and legend, so colour is supplementary to the always-visible status word (§1.2 rule 6 / §7.4 override).
- Tests cover the selection screen, breadcrumb current-step/counter, and the transition to customer details. `format:check`, `lint`, `typecheck`, tests, and build pass.

### 15.16 Demo floor-plan assets

- The supplied `public/spectra-ground-floor-plan.svg` and `public/spectra-first-floor-plan.svg` are loaded on demand for fixture villas by `asset-floor-plan.tsx` and inserted inline so their room groups stay pointer- and keyboard-selectable. The supplied PNGs remain standalone previews and are not used by the app.
- Each asset is validated before insertion (XML parse, no `<script>`/inline event attributes), its internal `<style>` is removed, and styling comes from scoped `.sg-demo-plan` rules. Room names, sizes, and areas are parsed from the SVG `aria-label` values for the existing room-details panel.
- `VillaPlanViewer` takes `useDemoAssets`; the original data-driven SVG remains the default and the fallback for any non-demo caller. A failed asset load shows an explicit error instead of a blank plan.
- These assets are schematic demo content (per `public/README-spectra-floorplans.md`), not approved architectural drawings. Production database plans still need storage, staff write endpoints, and a renderer.

### 15.17 Wireframe flow as the root experience

- `/` now renders `WireframeFlow`, a faithful React port of the V3.4 HTML's full click-through: intro → 36-plot plot picker (A-01…D-10) → floor plan → Your selection → Customer details → Review and pay → payment gateway preview with simulated outcomes → pending/failed/taken → demo confirmation. It uses the HTML's dataset, `ROOM_DATA`, SVG map/plan builders, `01 / 06` step counters, journey breadcrumbs, and simulated payment controls.
- `wireframe.css` is generated from the HTML's `<style>` block and scoped under `#wireframe-app` so it cannot leak into other pages. The shared header and footer are hidden when this demo is mounted.
- This is a **design preview**: payment outcomes are simulated client-side and no holds, bookings, or charges are created. The real server-authoritative flow and the earlier fixture pages remain available under `/villa/[villaId]` and the booking APIs, but they are no longer the root landing experience.
- A click-through test covers the complete happy path and the booked-villa recovery state.

### 15.18 Supabase client setup

- Installed `@supabase/supabase-js` and `@supabase/ssr`. Added server-only (`src/lib/supabase/server.ts`) and browser (`src/lib/supabase/client.ts`) client factories; service-role credentials are never imported into client code.
- Environment parsing supports both `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (current projects) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy), via `supabasePublicKey()`. Staff token verification now accepts either.
- The shadcn `supabase-client-nextjs` block was deliberately not installed: this project uses hand-authored `sg-*`/wireframe CSS, not Tailwind, so the registry components would introduce a conflicting styling system. The two client factories provide the equivalent client/server setup without that dependency.

### 15.19 Route-based Moolaparambu plot prototype

- `/` is a fit-to-viewport landing page showing the supplied indicative ground-floor PNG (`spectra-ground-floor-plan-preview.png`). The title and "Get started" call to action sit under the same header and share the same content width as every flow page; no kicker or subtitle is shown above the title. "Get started" leads to the plot picker; the landing artwork is a floor plan and is not presented as a plot survey.
- `/plots` renders the first-party `public/moolaparambu-site-plan.svg` as the selectable site plan. Its six plots are all 16.10 cent, served by a 7.00 cent internal road. The selected plot's action is data-driven: `plotPrimaryAction()` shows "View floor plan" only when `plot.hasFloorPlan` is true, otherwise "View summary". The Moolaparambu plots are site-plan parcels with no floor-plan asset, so they go straight to the summary and `/plots/[plotId]/floor-plan` is not available for them.
- `/plots/[plotId]` redirects to `/plots/[plotId]/summary`. Further steps are real routes (`summary`, `details`, `review`, `payment`, `payment/pending|failed|taken`, `confirmation`) driven by a session-scoped client store. Every screen fits the viewport without page scrolling; long content scrolls inside its own panel on mobile.
- The summary shows the **same source SVG** with the chosen plot highlighted, rather than a generic image. Prices, availability, advance and balance remain "Price on request" / "To be confirmed" because the source drawing contains no such values.
- Tests cover the source facts, plot selection and hover preview, the highlighted summary plot, form validation and hand-off, the landing artwork/link, and the full six-screen click-through.
