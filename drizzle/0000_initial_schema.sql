CREATE TYPE "public"."booking_status" AS ENUM('pending_payment', 'confirmed', 'cancelled', 'payment_failed', 'refund_pending', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."hold_status" AS ENUM('active', 'released', 'expired', 'converted');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'completed', 'dead_letter');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('created', 'pending', 'succeeded', 'failed', 'cancelled', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('requested', 'queued', 'processing', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('admin', 'sales', 'accounts');--> statement-breakpoint
CREATE TYPE "public"."villa_status" AS ENUM('draft', 'available', 'reserved', 'booked', 'withdrawn');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(32) NOT NULL,
	"villa_id" uuid NOT NULL,
	"hold_id" uuid NOT NULL,
	"price_snapshot_id" uuid NOT NULL,
	"status" "booking_status" DEFAULT 'pending_payment' NOT NULL,
	"buyer_name" varchar(160) NOT NULL,
	"buyer_mobile" varchar(24) NOT NULL,
	"buyer_email" varchar(320) NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_buyer_name_check" CHECK (length(trim("bookings"."buyer_name")) >= 2),
	CONSTRAINT "bookings_buyer_mobile_check" CHECK ("bookings"."buyer_mobile" ~ '^\+[1-9][0-9]{7,14}$'),
	CONSTRAINT "bookings_buyer_email_check" CHECK ("bookings"."buyer_email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
	CONSTRAINT "bookings_confirmation_check" CHECK (("bookings"."status" = 'confirmed' and "bookings"."confirmed_at" is not null) or ("bookings"."status" <> 'confirmed' and "bookings"."confirmed_at" is null))
);
--> statement-breakpoint
CREATE TABLE "floor_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"villa_id" uuid NOT NULL,
	"floor_number" integer NOT NULL,
	"title" varchar(120) NOT NULL,
	"storage_bucket" varchar(100) NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "floor_plans_floor_nonnegative_check" CHECK ("floor_plans"."floor_number" >= 0)
);
--> statement-breakpoint
CREATE TABLE "holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"villa_id" uuid NOT NULL,
	"session_id_hash" varchar(128) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"price_snapshot_id" uuid NOT NULL,
	"status" "hold_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "holds_session_hash_check" CHECK (length("holds"."session_id_hash") >= 32),
	CONSTRAINT "holds_lifecycle_check" CHECK (("holds"."status" = 'released' and "holds"."released_at" is not null) or ("holds"."status" <> 'released' and "holds"."released_at" is null))
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_type" varchar(80) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"dedupe_key" varchar(180) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_error_code" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_events_attempts_check" CHECK ("outbox_events"."attempt_count" >= 0),
	CONSTRAINT "outbox_events_lifecycle_check" CHECK (("outbox_events"."status" = 'completed' and "outbox_events"."completed_at" is not null) or ("outbox_events"."status" <> 'completed' and "outbox_events"."completed_at" is null))
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"provider" varchar(40) NOT NULL,
	"provider_event_id" varchar(180) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" "payment_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" varchar(40) DEFAULT 'sandbox' NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"provider_order_id" varchar(160),
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" "payment_status" DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount_minor" > 0),
	CONSTRAINT "payments_currency_check" CHECK ("payments"."currency" = 'INR')
);
--> statement-breakpoint
CREATE TABLE "price_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"villa_id" uuid NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"base_amount_minor" bigint NOT NULL,
	"tax_rate_bps" integer DEFAULT 0 NOT NULL,
	"tax_policy" varchar(32) DEFAULT 'exclusive' NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_settings_currency_check" CHECK ("price_settings"."currency" = 'INR'),
	CONSTRAINT "price_settings_amount_check" CHECK ("price_settings"."base_amount_minor" >= 0),
	CONSTRAINT "price_settings_tax_rate_check" CHECK ("price_settings"."tax_rate_bps" between 0 and 10000),
	CONSTRAINT "price_settings_tax_policy_check" CHECK ("price_settings"."tax_policy" in ('inclusive', 'exclusive', 'none')),
	CONSTRAINT "price_settings_validity_check" CHECK ("price_settings"."valid_until" is null or "price_settings"."valid_until" > "price_settings"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"villa_id" uuid NOT NULL,
	"price_setting_id" uuid,
	"currency" varchar(3) NOT NULL,
	"base_amount_minor" bigint NOT NULL,
	"tax_amount_minor" bigint NOT NULL,
	"total_amount_minor" bigint NOT NULL,
	"tax_rate_bps" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_snapshots_currency_check" CHECK ("price_snapshots"."currency" = 'INR'),
	CONSTRAINT "price_snapshots_amounts_check" CHECK ("price_snapshots"."base_amount_minor" >= 0 and "price_snapshots"."tax_amount_minor" >= 0 and "price_snapshots"."total_amount_minor" >= 0),
	CONSTRAINT "price_snapshots_total_check" CHECK ("price_snapshots"."total_amount_minor" = "price_snapshots"."base_amount_minor" + "price_snapshots"."tax_amount_minor"),
	CONSTRAINT "price_snapshots_tax_rate_check" CHECK ("price_snapshots"."tax_rate_bps" between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE "refund_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"reason" varchar(500),
	"status" "refund_status" DEFAULT 'requested' NOT NULL,
	"requested_by" uuid,
	"provider_refund_id" varchar(180),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refund_requests_amount_check" CHECK ("refund_requests"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"floor_plan_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(120) NOT NULL,
	"size_text" varchar(80),
	"area_sq_ft" integer,
	"specification" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_area_positive_check" CHECK ("rooms"."area_sq_ft" is null or "rooms"."area_sq_ft" > 0)
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"role" "staff_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "villas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"configuration" varchar(16) NOT NULL,
	"floors" integer NOT NULL,
	"plot_area_sq_ft" integer,
	"built_up_area_sq_ft" integer,
	"facing" varchar(32),
	"is_corner" boolean DEFAULT false NOT NULL,
	"status" "villa_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "villas_configuration_check" CHECK ("villas"."configuration" in ('3BHK', '4BHK')),
	CONSTRAINT "villas_floors_positive_check" CHECK ("villas"."floors" > 0),
	CONSTRAINT "villas_plot_area_positive_check" CHECK ("villas"."plot_area_sq_ft" is null or "villas"."plot_area_sq_ft" > 0),
	CONSTRAINT "villas_built_area_positive_check" CHECK ("villas"."built_up_area_sq_ft" is null or "villas"."built_up_area_sq_ft" > 0),
	CONSTRAINT "villas_publication_check" CHECK (("villas"."status" = 'draft' and "villas"."published_at" is null) or ("villas"."status" <> 'draft' and "villas"."published_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_villa_id_villas_id_fk" FOREIGN KEY ("villa_id") REFERENCES "public"."villas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hold_id_holds_id_fk" FOREIGN KEY ("hold_id") REFERENCES "public"."holds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_price_snapshot_id_price_snapshots_id_fk" FOREIGN KEY ("price_snapshot_id") REFERENCES "public"."price_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_villa_id_villas_id_fk" FOREIGN KEY ("villa_id") REFERENCES "public"."villas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_villa_id_villas_id_fk" FOREIGN KEY ("villa_id") REFERENCES "public"."villas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_price_snapshot_id_price_snapshots_id_fk" FOREIGN KEY ("price_snapshot_id") REFERENCES "public"."price_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_settings" ADD CONSTRAINT "price_settings_villa_id_villas_id_fk" FOREIGN KEY ("villa_id") REFERENCES "public"."villas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_settings" ADD CONSTRAINT "price_settings_created_by_staff_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_villa_id_villas_id_fk" FOREIGN KEY ("villa_id") REFERENCES "public"."villas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_price_setting_id_price_settings_id_fk" FOREIGN KEY ("price_setting_id") REFERENCES "public"."price_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_requested_by_staff_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."staff_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floor_plan_id_floor_plans_id_fk" FOREIGN KEY ("floor_plan_id") REFERENCES "public"."floor_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_reference_unique" ON "bookings" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_hold_unique" ON "bookings" USING btree ("hold_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_price_snapshot_unique" ON "bookings" USING btree ("price_snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_one_live_per_villa_unique" ON "bookings" USING btree ("villa_id") WHERE "bookings"."status" in ('pending_payment', 'confirmed', 'refund_pending');--> statement-breakpoint
CREATE UNIQUE INDEX "floor_plans_villa_floor_unique" ON "floor_plans" USING btree ("villa_id","floor_number");--> statement-breakpoint
CREATE UNIQUE INDEX "floor_plans_storage_path_unique" ON "floor_plans" USING btree ("storage_bucket","storage_path");--> statement-breakpoint
CREATE UNIQUE INDEX "holds_idempotency_unique" ON "holds" USING btree ("session_id_hash","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "holds_one_active_per_villa_unique" ON "holds" USING btree ("villa_id") WHERE "holds"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "holds_price_snapshot_unique" ON "holds" USING btree ("price_snapshot_id");--> statement-breakpoint
CREATE INDEX "holds_expiry_scan_idx" ON "holds" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_events_dedupe_unique" ON "outbox_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "outbox_events_claim_idx" ON "outbox_events" USING btree ("status","available_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_provider_event_unique" ON "payment_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "payment_events_payment_idx" ON "payment_events" USING btree ("payment_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotency_unique" ON "payments" USING btree ("booking_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_order_unique" ON "payments" USING btree ("provider","provider_order_id");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX "price_settings_villa_effective_idx" ON "price_settings" USING btree ("villa_id","valid_from","valid_until");--> statement-breakpoint
CREATE UNIQUE INDEX "refund_requests_idempotency_unique" ON "refund_requests" USING btree ("payment_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "refund_requests_provider_refund_unique" ON "refund_requests" USING btree ("provider_refund_id");--> statement-breakpoint
CREATE INDEX "refund_requests_status_idx" ON "refund_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_plan_code_unique" ON "rooms" USING btree ("floor_plan_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_profiles_auth_user_unique" ON "staff_profiles" USING btree ("auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "villas_code_unique" ON "villas" USING btree ("code");--> statement-breakpoint
CREATE INDEX "villas_public_listing_idx" ON "villas" USING btree ("status","display_order");
--> statement-breakpoint
-- Quote records are referenced by holds and bookings and must never drift after display.
CREATE FUNCTION "reject_price_snapshot_mutation"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'price snapshots are immutable' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "price_snapshots_immutable_trigger"
BEFORE UPDATE OR DELETE ON "price_snapshots"
FOR EACH ROW EXECUTE FUNCTION "reject_price_snapshot_mutation"();
--> statement-breakpoint
-- Serialize effective-price changes per villa and reject overlapping validity windows.
CREATE FUNCTION "prevent_price_setting_overlap"() RETURNS trigger AS $$
BEGIN
	PERFORM pg_advisory_xact_lock(hashtextextended(NEW.villa_id::text, 0));
	IF EXISTS (
		SELECT 1 FROM "price_settings" AS existing
		WHERE existing.villa_id = NEW.villa_id
			AND existing.id <> NEW.id
			AND tstzrange(existing.valid_from, existing.valid_until, '[)')
				&& tstzrange(NEW.valid_from, NEW.valid_until, '[)')
	) THEN
		RAISE EXCEPTION 'price setting validity windows cannot overlap' USING ERRCODE = '23P01';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "price_settings_no_overlap_trigger"
BEFORE INSERT OR UPDATE OF villa_id, valid_from, valid_until ON "price_settings"
FOR EACH ROW EXECUTE FUNCTION "prevent_price_setting_overlap"();
--> statement-breakpoint
-- Keep a booking tied to the same villa and quote as the hold that reserved it.
CREATE FUNCTION "validate_booking_hold_quote"() RETURNS trigger AS $$
DECLARE
	hold_row "holds"%ROWTYPE;
	quote_villa_id uuid;
BEGIN
	SELECT * INTO hold_row FROM "holds" WHERE id = NEW.hold_id FOR UPDATE;
	IF NOT FOUND OR hold_row.villa_id <> NEW.villa_id OR hold_row.price_snapshot_id <> NEW.price_snapshot_id THEN
		RAISE EXCEPTION 'booking must match its hold and price snapshot' USING ERRCODE = '23514';
	END IF;
	SELECT villa_id INTO quote_villa_id FROM "price_snapshots" WHERE id = NEW.price_snapshot_id;
	IF quote_villa_id IS DISTINCT FROM NEW.villa_id THEN
		RAISE EXCEPTION 'booking quote belongs to a different villa' USING ERRCODE = '23514';
	END IF;
	IF TG_OP = 'INSERT' AND (hold_row.status <> 'active' OR hold_row.expires_at <= now()) THEN
		RAISE EXCEPTION 'booking requires a current active hold' USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "bookings_hold_quote_trigger"
BEFORE INSERT OR UPDATE OF villa_id, hold_id, price_snapshot_id ON "bookings"
FOR EACH ROW EXECUTE FUNCTION "validate_booking_hold_quote"();
--> statement-breakpoint
CREATE FUNCTION "validate_hold_quote_villa"() RETURNS trigger AS $$
DECLARE
	quote_villa_id uuid;
BEGIN
	SELECT villa_id INTO quote_villa_id FROM "price_snapshots" WHERE id = NEW.price_snapshot_id;
	IF quote_villa_id IS DISTINCT FROM NEW.villa_id THEN
		RAISE EXCEPTION 'hold quote belongs to a different villa' USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "holds_quote_villa_trigger"
BEFORE INSERT OR UPDATE OF villa_id, price_snapshot_id ON "holds"
FOR EACH ROW EXECUTE FUNCTION "validate_hold_quote_villa"();
--> statement-breakpoint
CREATE FUNCTION "prevent_hold_identity_change"() RETURNS trigger AS $$
BEGIN
	IF NEW.villa_id <> OLD.villa_id OR NEW.session_id_hash <> OLD.session_id_hash
		OR NEW.idempotency_key <> OLD.idempotency_key OR NEW.price_snapshot_id <> OLD.price_snapshot_id THEN
		RAISE EXCEPTION 'hold identity and quote are immutable' USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "holds_identity_immutable_trigger"
BEFORE UPDATE ON "holds"
FOR EACH ROW EXECUTE FUNCTION "prevent_hold_identity_change"();
--> statement-breakpoint
CREATE FUNCTION "prevent_booking_identity_change"() RETURNS trigger AS $$
BEGIN
	IF NEW.villa_id <> OLD.villa_id OR NEW.hold_id <> OLD.hold_id
		OR NEW.price_snapshot_id <> OLD.price_snapshot_id OR NEW.reference <> OLD.reference THEN
		RAISE EXCEPTION 'booking identity and quote are immutable' USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "bookings_identity_immutable_trigger"
BEFORE UPDATE ON "bookings"
FOR EACH ROW EXECUTE FUNCTION "prevent_booking_identity_change"();
--> statement-breakpoint
CREATE FUNCTION "prevent_payment_identity_change"() RETURNS trigger AS $$
BEGIN
	IF NEW.booking_id <> OLD.booking_id OR NEW.provider <> OLD.provider
		OR NEW.idempotency_key <> OLD.idempotency_key OR NEW.amount_minor <> OLD.amount_minor
		OR NEW.currency <> OLD.currency
		OR (OLD.provider_order_id IS NOT NULL AND NEW.provider_order_id <> OLD.provider_order_id) THEN
		RAISE EXCEPTION 'payment identity and amount are immutable' USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "payments_identity_immutable_trigger"
BEFORE UPDATE ON "payments"
FOR EACH ROW EXECUTE FUNCTION "prevent_payment_identity_change"();
--> statement-breakpoint
-- Payment amounts must be the server-created quote total for the associated booking.
CREATE FUNCTION "validate_payment_quote_amount"() RETURNS trigger AS $$
DECLARE
	booking_quote_id uuid;
	quote_total bigint;
BEGIN
	SELECT price_snapshot_id INTO booking_quote_id FROM "bookings" WHERE id = NEW.booking_id;
	IF booking_quote_id IS NULL THEN
		RAISE EXCEPTION 'payment booking does not exist' USING ERRCODE = '23503';
	END IF;
	SELECT total_amount_minor INTO quote_total FROM "price_snapshots" WHERE id = booking_quote_id;
	IF NEW.amount_minor <> quote_total THEN
		RAISE EXCEPTION 'payment amount must match the booking quote' USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "payments_quote_amount_trigger"
BEFORE INSERT OR UPDATE OF booking_id, amount_minor ON "payments"
FOR EACH ROW EXECUTE FUNCTION "validate_payment_quote_amount"();
--> statement-breakpoint
-- Serialize refund requests per payment and cap all non-failed/non-cancelled refunds at the charge.
CREATE FUNCTION "validate_refund_total"() RETURNS trigger AS $$
DECLARE
	payment_amount bigint;
	other_refunds bigint;
BEGIN
	SELECT amount_minor INTO payment_amount FROM "payments" WHERE id = NEW.payment_id FOR UPDATE;
	IF payment_amount IS NULL THEN
		RAISE EXCEPTION 'refund payment does not exist' USING ERRCODE = '23503';
	END IF;
	IF (SELECT status FROM "payments" WHERE id = NEW.payment_id) <> 'succeeded' THEN
		RAISE EXCEPTION 'refund requires a succeeded payment' USING ERRCODE = '23514';
	END IF;
	SELECT COALESCE(sum(amount_minor), 0) INTO other_refunds
	FROM "refund_requests"
	WHERE payment_id = NEW.payment_id
		AND id <> NEW.id
		AND status NOT IN ('failed', 'cancelled');
	IF NEW.status NOT IN ('failed', 'cancelled') AND other_refunds + NEW.amount_minor > payment_amount THEN
		RAISE EXCEPTION 'refund total cannot exceed the payment amount' USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "refunds_total_trigger"
BEFORE INSERT OR UPDATE OF payment_id, amount_minor, status ON "refund_requests"
FOR EACH ROW EXECUTE FUNCTION "validate_refund_total"();
--> statement-breakpoint
-- Keep timestamps accurate for mutable records without depending on callers.
CREATE FUNCTION "touch_updated_at"() RETURNS trigger AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
	FOREACH table_name IN ARRAY ARRAY[
		'villas', 'floor_plans', 'rooms', 'staff_profiles', 'price_settings',
		'holds', 'bookings', 'payments', 'refund_requests', 'outbox_events'
	] LOOP
		EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()', table_name || '_touch_updated_at', table_name);
	END LOOP;
END;
$$;
--> statement-breakpoint
-- Status enums constrain values; this transition guard also rejects invalid jumps.
CREATE FUNCTION "enforce_domain_status_transition"() RETURNS trigger AS $$
DECLARE allowed boolean := false;
BEGIN
	IF NEW.status::text = OLD.status::text THEN RETURN NEW; END IF;
	CASE TG_TABLE_NAME
		WHEN 'holds' THEN
			allowed := OLD.status::text = 'active' AND NEW.status::text IN ('released', 'expired', 'converted');
		WHEN 'bookings' THEN
			allowed := (OLD.status::text = 'pending_payment' AND NEW.status::text IN ('confirmed', 'cancelled', 'payment_failed'))
				OR (OLD.status::text = 'payment_failed' AND NEW.status::text IN ('pending_payment', 'cancelled'))
				OR (OLD.status::text = 'confirmed' AND NEW.status::text IN ('refund_pending', 'refunded'))
				OR (OLD.status::text = 'refund_pending' AND NEW.status::text IN ('confirmed', 'refunded'));
		WHEN 'payments' THEN
			allowed := (OLD.status::text = 'created' AND NEW.status::text IN ('pending', 'failed', 'cancelled', 'unknown'))
				OR (OLD.status::text IN ('pending', 'unknown') AND NEW.status::text IN ('succeeded', 'failed', 'cancelled', 'unknown'));
		WHEN 'refund_requests' THEN
			allowed := (OLD.status::text = 'requested' AND NEW.status::text IN ('queued', 'cancelled'))
				OR (OLD.status::text = 'queued' AND NEW.status::text IN ('processing', 'failed', 'cancelled'))
				OR (OLD.status::text = 'processing' AND NEW.status::text IN ('succeeded', 'failed'))
				OR (OLD.status::text = 'failed' AND NEW.status::text IN ('queued', 'cancelled'));
		WHEN 'outbox_events' THEN
			allowed := (OLD.status::text = 'pending' AND NEW.status::text IN ('processing', 'dead_letter'))
				OR (OLD.status::text = 'processing' AND NEW.status::text IN ('pending', 'completed', 'dead_letter'))
				OR (OLD.status::text = 'dead_letter' AND NEW.status::text = 'pending');
	END CASE;
	IF NOT allowed THEN
		RAISE EXCEPTION 'invalid status transition on %: % -> %', TG_TABLE_NAME, OLD.status, NEW.status USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
	FOREACH table_name IN ARRAY ARRAY['holds', 'bookings', 'payments', 'refund_requests', 'outbox_events'] LOOP
		EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OF status ON public.%I FOR EACH ROW EXECUTE FUNCTION enforce_domain_status_transition()', table_name || '_status_transition', table_name);
	END LOOP;
END;
$$;
--> statement-breakpoint
-- Supabase may grant new public-schema tables to client roles by default.
-- These domain tables are server-only until explicit read policies/views are designed.
DO $$
DECLARE role_name text;
DECLARE table_name text;
BEGIN
	FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
		IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
			FOREACH table_name IN ARRAY ARRAY[
				'villas', 'floor_plans', 'rooms', 'staff_profiles', 'price_settings',
				'price_snapshots', 'holds', 'bookings', 'payments', 'payment_events',
				'refund_requests', 'outbox_events'
			] LOOP
				EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, role_name);
			END LOOP;
		END IF;
	END LOOP;
END;
$$;
