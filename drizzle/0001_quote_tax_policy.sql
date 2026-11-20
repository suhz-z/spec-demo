ALTER TABLE "bookings" DROP CONSTRAINT "bookings_confirmation_check";--> statement-breakpoint
ALTER TABLE "price_snapshots" DROP CONSTRAINT "price_snapshots_total_check";--> statement-breakpoint
ALTER TABLE "price_snapshots" DROP CONSTRAINT "price_snapshots_price_setting_id_price_settings_id_fk";
--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD COLUMN "tax_policy" varchar(32) DEFAULT 'exclusive' NOT NULL;--> statement-breakpoint
ALTER TABLE "price_snapshots" ALTER COLUMN "tax_policy" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_price_setting_id_price_settings_id_fk" FOREIGN KEY ("price_setting_id") REFERENCES "public"."price_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_confirmation_check" CHECK (("bookings"."status" in ('confirmed', 'refund_pending', 'refunded') and "bookings"."confirmed_at" is not null) or ("bookings"."status" not in ('confirmed', 'refund_pending', 'refunded') and "bookings"."confirmed_at" is null));--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_tax_policy_check" CHECK (("price_snapshots"."tax_policy" = 'exclusive' and "price_snapshots"."total_amount_minor" = "price_snapshots"."base_amount_minor" + "price_snapshots"."tax_amount_minor") or ("price_snapshots"."tax_policy" = 'inclusive' and "price_snapshots"."total_amount_minor" = "price_snapshots"."base_amount_minor" and "price_snapshots"."tax_amount_minor" <= "price_snapshots"."base_amount_minor") or ("price_snapshots"."tax_policy" = 'none' and "price_snapshots"."total_amount_minor" = "price_snapshots"."base_amount_minor" and "price_snapshots"."tax_amount_minor" = 0));
