-- Payment providers may deliver an authoritative success after an earlier
-- failure, cancellation, or unknown outcome. Keep the transition guard strict
-- for every other jump while allowing that late confirmation.
CREATE OR REPLACE FUNCTION "enforce_domain_status_transition"() RETURNS trigger AS $$
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
				OR (OLD.status::text IN ('pending', 'unknown') AND NEW.status::text IN ('succeeded', 'failed', 'cancelled', 'unknown'))
				OR (OLD.status::text IN ('failed', 'cancelled') AND NEW.status::text IN ('succeeded', 'unknown'));
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
