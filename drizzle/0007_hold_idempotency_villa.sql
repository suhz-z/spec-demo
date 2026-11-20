-- Idempotency keys are unique per session AND villa. A client replaying a key
-- for a different plot must create a fresh hold request, not receive another
-- villa's hold from the cache.
DROP INDEX IF EXISTS "public"."holds_idempotency_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "holds_idempotency_unique" ON "holds" USING btree ("session_id_hash","villa_id","idempotency_key");
