import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
};

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

export const villaStatus = pgEnum("villa_status", [
  "draft",
  "available",
  "reserved",
  "booked",
  "withdrawn",
]);
export const holdStatus = pgEnum("hold_status", ["active", "released", "expired", "converted"]);
export const bookingStatus = pgEnum("booking_status", [
  "pending_payment",
  "confirmed",
  "cancelled",
  "payment_failed",
  "refund_pending",
  "refunded",
]);
export const paymentStatus = pgEnum("payment_status", [
  "created",
  "pending",
  "succeeded",
  "failed",
  "cancelled",
  "unknown",
]);
export const refundStatus = pgEnum("refund_status", [
  "requested",
  "queued",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
]);
export const outboxStatus = pgEnum("outbox_status", [
  "pending",
  "processing",
  "completed",
  "dead_letter",
]);
export const staffRole = pgEnum("staff_role", ["admin", "sales", "accounts"]);

/** Public inventory source; prices and availability are independently versioned. */
export const villas = pgTable(
  "villas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 32 }).notNull(),
    configuration: varchar("configuration", { length: 16 }).notNull(),
    floors: integer("floors").notNull(),
    plotAreaSqFt: integer("plot_area_sq_ft"),
    builtUpAreaSqFt: integer("built_up_area_sq_ft"),
    facing: varchar("facing", { length: 32 }),
    isCorner: boolean("is_corner").notNull().default(false),
    mapX: integer("map_x"),
    mapY: integer("map_y"),
    mapWidth: integer("map_width"),
    mapHeight: integer("map_height"),
    status: villaStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    displayOrder: integer("display_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("villas_code_unique").on(table.code),
    index("villas_public_listing_idx").on(table.status, table.displayOrder),
    check("villas_configuration_check", sql`${table.configuration} in ('3BHK', '4BHK')`),
    check("villas_floors_positive_check", sql`${table.floors} > 0`),
    check(
      "villas_plot_area_positive_check",
      sql`${table.plotAreaSqFt} is null or ${table.plotAreaSqFt} > 0`,
    ),
    check(
      "villas_built_area_positive_check",
      sql`${table.builtUpAreaSqFt} is null or ${table.builtUpAreaSqFt} > 0`,
    ),
    check(
      "villas_map_geometry_complete_check",
      sql`(${table.mapX} is null and ${table.mapY} is null and ${table.mapWidth} is null and ${table.mapHeight} is null) or (${table.mapX} is not null and ${table.mapY} is not null and ${table.mapWidth} is not null and ${table.mapHeight} is not null and ${table.mapX} >= 0 and ${table.mapY} >= 0 and ${table.mapWidth} > 0 and ${table.mapHeight} > 0 and ${table.mapX} + ${table.mapWidth} <= 1000 and ${table.mapY} + ${table.mapHeight} <= 680)`,
    ),
    check(
      "villas_publication_check",
      sql`(${table.status} = 'draft' and ${table.publishedAt} is null) or (${table.status} <> 'draft' and ${table.publishedAt} is not null)`,
    ),
  ],
);

/** Versioned plan asset metadata. The object itself belongs in private Supabase Storage. */
export const floorPlans = pgTable(
  "floor_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    villaId: uuid("villa_id")
      .notNull()
      .references(() => villas.id, { onDelete: "cascade" }),
    floorNumber: integer("floor_number").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    storageBucket: varchar("storage_bucket", { length: 100 }).notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    published: boolean("published").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("floor_plans_villa_floor_unique").on(table.villaId, table.floorNumber),
    uniqueIndex("floor_plans_storage_path_unique").on(table.storageBucket, table.storagePath),
    check("floor_plans_floor_nonnegative_check", sql`${table.floorNumber} >= 0`),
  ],
);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    floorPlanId: uuid("floor_plan_id")
      .notNull()
      .references(() => floorPlans.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    sizeText: varchar("size_text", { length: 80 }),
    areaSqFt: integer("area_sq_ft"),
    specification: jsonb("specification").$type<JsonObject>().notNull().default({}),
    displayOrder: integer("display_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("rooms_plan_code_unique").on(table.floorPlanId, table.code),
    check("rooms_area_positive_check", sql`${table.areaSqFt} is null or ${table.areaSqFt} > 0`),
  ],
);

/** Auth user IDs are issued by Supabase Auth; role assignment stays in this database. */
export const staffProfiles = pgTable(
  "staff_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id").notNull(),
    role: staffRole("role").notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("staff_profiles_auth_user_unique").on(table.authUserId)],
);

export const priceSettings = pgTable(
  "price_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    villaId: uuid("villa_id")
      .notNull()
      .references(() => villas.id, { onDelete: "restrict" }),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    baseAmountMinor: bigint("base_amount_minor", { mode: "bigint" }).notNull(),
    taxRateBps: integer("tax_rate_bps").notNull().default(0),
    taxPolicy: varchar("tax_policy", { length: 32 }).notNull().default("exclusive"),
    validFrom: timestamp("valid_from", { withTimezone: true, mode: "date" }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true, mode: "date" }),
    createdBy: uuid("created_by").references(() => staffProfiles.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("price_settings_villa_effective_idx").on(
      table.villaId,
      table.validFrom,
      table.validUntil,
    ),
    check("price_settings_currency_check", sql`${table.currency} = 'INR'`),
    check("price_settings_amount_check", sql`${table.baseAmountMinor} >= 0`),
    check("price_settings_tax_rate_check", sql`${table.taxRateBps} between 0 and 10000`),
    check(
      "price_settings_tax_policy_check",
      sql`${table.taxPolicy} in ('inclusive', 'exclusive', 'none')`,
    ),
    check(
      "price_settings_validity_check",
      sql`${table.validUntil} is null or ${table.validUntil} > ${table.validFrom}`,
    ),
  ],
);

/** Immutable server-generated quote. Holds reference a quote rather than client-supplied numbers. */
export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    villaId: uuid("villa_id")
      .notNull()
      .references(() => villas.id, { onDelete: "restrict" }),
    priceSettingId: uuid("price_setting_id").references(() => priceSettings.id, {
      onDelete: "restrict",
    }),
    currency: varchar("currency", { length: 3 }).notNull(),
    baseAmountMinor: bigint("base_amount_minor", { mode: "bigint" }).notNull(),
    taxAmountMinor: bigint("tax_amount_minor", { mode: "bigint" }).notNull(),
    totalAmountMinor: bigint("total_amount_minor", { mode: "bigint" }).notNull(),
    taxRateBps: integer("tax_rate_bps").notNull(),
    taxPolicy: varchar("tax_policy", { length: 32 }).notNull(),
    snapshot: jsonb("snapshot").$type<JsonObject>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    check("price_snapshots_currency_check", sql`${table.currency} = 'INR'`),
    check(
      "price_snapshots_amounts_check",
      sql`${table.baseAmountMinor} >= 0 and ${table.taxAmountMinor} >= 0 and ${table.totalAmountMinor} >= 0`,
    ),
    check(
      "price_snapshots_tax_policy_check",
      sql`(${table.taxPolicy} = 'exclusive' and ${table.totalAmountMinor} = ${table.baseAmountMinor} + ${table.taxAmountMinor}) or (${table.taxPolicy} = 'inclusive' and ${table.totalAmountMinor} = ${table.baseAmountMinor} and ${table.taxAmountMinor} <= ${table.baseAmountMinor}) or (${table.taxPolicy} = 'none' and ${table.totalAmountMinor} = ${table.baseAmountMinor} and ${table.taxAmountMinor} = 0)`,
    ),
    check("price_snapshots_tax_rate_check", sql`${table.taxRateBps} between 0 and 10000`),
  ],
);

export const holds = pgTable(
  "holds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    villaId: uuid("villa_id")
      .notNull()
      .references(() => villas.id, { onDelete: "restrict" }),
    sessionIdHash: varchar("session_id_hash", { length: 128 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    priceSnapshotId: uuid("price_snapshot_id")
      .notNull()
      .references(() => priceSnapshots.id, { onDelete: "restrict" }),
    status: holdStatus("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("holds_idempotency_unique").on(
      table.sessionIdHash,
      table.villaId,
      table.idempotencyKey,
    ),
    uniqueIndex("holds_one_active_per_villa_unique")
      .on(table.villaId)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex("holds_price_snapshot_unique").on(table.priceSnapshotId),
    index("holds_expiry_scan_idx").on(table.status, table.expiresAt),
    check("holds_session_hash_check", sql`length(${table.sessionIdHash}) >= 32`),
    check(
      "holds_lifecycle_check",
      sql`(${table.status} = 'released' and ${table.releasedAt} is not null) or (${table.status} <> 'released' and ${table.releasedAt} is null)`,
    ),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: varchar("reference", { length: 32 }).notNull(),
    villaId: uuid("villa_id")
      .notNull()
      .references(() => villas.id, { onDelete: "restrict" }),
    holdId: uuid("hold_id")
      .notNull()
      .references(() => holds.id, { onDelete: "restrict" }),
    priceSnapshotId: uuid("price_snapshot_id")
      .notNull()
      .references(() => priceSnapshots.id, { onDelete: "restrict" }),
    status: bookingStatus("status").notNull().default("pending_payment"),
    buyerName: varchar("buyer_name", { length: 160 }).notNull(),
    buyerMobile: varchar("buyer_mobile", { length: 24 }).notNull(),
    buyerEmail: varchar("buyer_email", { length: 320 }).notNull(),
    termsVersion: varchar("terms_version", { length: 80 }),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true, mode: "date" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("bookings_reference_unique").on(table.reference),
    uniqueIndex("bookings_hold_unique").on(table.holdId),
    uniqueIndex("bookings_price_snapshot_unique").on(table.priceSnapshotId),
    uniqueIndex("bookings_one_live_per_villa_unique")
      .on(table.villaId)
      .where(sql`${table.status} in ('pending_payment', 'confirmed', 'refund_pending')`),
    check("bookings_buyer_name_check", sql`length(trim(${table.buyerName})) >= 2`),
    check("bookings_buyer_mobile_check", sql`${table.buyerMobile} ~ '^\\+[1-9][0-9]{7,14}$'`),
    check(
      "bookings_terms_acceptance_pair_check",
      sql`(${table.termsVersion} is null and ${table.termsAcceptedAt} is null) or (${table.termsVersion} is not null and ${table.termsAcceptedAt} is not null)`,
    ),
    check(
      "bookings_buyer_email_check",
      sql`${table.buyerEmail} ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'`,
    ),
    check(
      "bookings_confirmation_check",
      sql`(${table.status} in ('confirmed', 'refund_pending', 'refunded') and ${table.confirmedAt} is not null) or (${table.status} not in ('confirmed', 'refund_pending', 'refunded') and ${table.confirmedAt} is null)`,
    ),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    provider: varchar("provider", { length: 40 }).notNull().default("sandbox"),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    providerOrderId: varchar("provider_order_id", { length: 160 }),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    status: paymentStatus("status").notNull().default("created"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("payments_idempotency_unique").on(table.bookingId, table.idempotencyKey),
    uniqueIndex("payments_provider_order_unique").on(table.provider, table.providerOrderId),
    index("payments_booking_idx").on(table.bookingId, table.createdAt),
    check("payments_amount_check", sql`${table.amountMinor} > 0`),
    check("payments_currency_check", sql`${table.currency} = 'INR'`),
  ],
);

/** Provider event IDs deduplicate webhook deliveries; raw payload is intentionally not stored. */
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    provider: varchar("provider", { length: 40 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 180 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "date" }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    outcome: paymentStatus("outcome").notNull(),
  },
  (table) => [
    uniqueIndex("payment_events_provider_event_unique").on(table.provider, table.providerEventId),
    index("payment_events_payment_idx").on(table.paymentId, table.receivedAt),
  ],
);

export const refundRequests = pgTable(
  "refund_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    reason: varchar("reason", { length: 500 }),
    status: refundStatus("status").notNull().default("requested"),
    requestedBy: uuid("requested_by").references(() => staffProfiles.id, { onDelete: "set null" }),
    providerRefundId: varchar("provider_refund_id", { length: 180 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("refund_requests_idempotency_unique").on(table.paymentId, table.idempotencyKey),
    uniqueIndex("refund_requests_provider_refund_unique").on(table.providerRefundId),
    index("refund_requests_status_idx").on(table.status, table.createdAt),
    check("refund_requests_amount_check", sql`${table.amountMinor} > 0`),
  ],
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aggregateType: varchar("aggregate_type", { length: 80 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    dedupeKey: varchar("dedupe_key", { length: 180 }).notNull(),
    payload: jsonb("payload").$type<JsonObject>().notNull().default({}),
    status: outboxStatus("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    lastErrorCode: varchar("last_error_code", { length: 80 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("outbox_events_dedupe_unique").on(table.dedupeKey),
    index("outbox_events_claim_idx").on(table.status, table.availableAt, table.createdAt),
    check("outbox_events_attempts_check", sql`${table.attemptCount} >= 0`),
    check(
      "outbox_events_lifecycle_check",
      sql`(${table.status} = 'completed' and ${table.completedAt} is not null) or (${table.status} <> 'completed' and ${table.completedAt} is null)`,
    ),
  ],
);
