ALTER TABLE "bookings" ADD COLUMN "terms_version" varchar(80);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "terms_accepted_at" timestamp with time zone;
