import { randomBytes } from "node:crypto";
import { and, eq, gt, ne, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db/client";
import { bookings, holds, villas } from "@/db/schema";
import { getServerEnv } from "@/lib/env";
import { buyerDetailsInputSchema } from "@/modules/bookings/hold-domain";
import { getSessionHash, hasSameOrigin } from "@/modules/bookings/session.server";

export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) return json({ error: "invalid_origin" }, 403);
  const sessionIdHash = getSessionHash(request);
  if (!sessionIdHash) return json({ error: "hold_unavailable" }, 409);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 8_192) return json({ error: "invalid_request" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const parsed = buyerDetailsInputSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);

  const termsVersion = getServerEnv().BOOKING_TERMS_VERSION;
  if (!termsVersion) return json({ error: "booking_terms_pending_approval" }, 503);

  try {
    const result = await getDb().transaction(async (tx) => {
      const [owner] = await tx
        .select({ villaId: holds.villaId, sessionIdHash: holds.sessionIdHash })
        .from(holds)
        .where(eq(holds.id, parsed.data.holdId))
        .limit(1);
      if (!owner || owner.sessionIdHash !== sessionIdHash) return { kind: "unavailable" as const };

      const [villa] = await tx
        .select({ id: villas.id, status: villas.status })
        .from(villas)
        .where(eq(villas.id, owner.villaId))
        .for("update");
      if (!villa || (villa.status !== "available" && villa.status !== "reserved")) {
        return { kind: "unavailable" as const };
      }

      const [otherLiveBooking] = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.villaId, owner.villaId),
            ne(bookings.holdId, parsed.data.holdId),
            sql`${bookings.status} in ('pending_payment', 'confirmed', 'refund_pending')`,
          ),
        )
        .limit(1);
      if (otherLiveBooking) return { kind: "unavailable" as const };

      const [existing] = await tx
        .select({ reference: bookings.reference })
        .from(bookings)
        .innerJoin(holds, eq(holds.id, bookings.holdId))
        .where(and(eq(bookings.holdId, parsed.data.holdId), eq(holds.sessionIdHash, sessionIdHash)))
        .limit(1);
      if (existing)
        return { kind: "created" as const, reference: existing.reference, reused: true };

      const [activeHold] = await tx
        .select({ id: holds.id, priceSnapshotId: holds.priceSnapshotId })
        .from(holds)
        .where(
          and(
            eq(holds.id, parsed.data.holdId),
            eq(holds.villaId, owner.villaId),
            eq(holds.sessionIdHash, sessionIdHash),
            eq(holds.status, "active"),
            gt(holds.expiresAt, sql`now()`),
          ),
        )
        .for("update")
        .limit(1);
      if (!activeHold) return { kind: "unavailable" as const };

      const reference = `SG-${randomBytes(6).toString("hex").toUpperCase()}`;
      const [booking] = await tx
        .insert(bookings)
        .values({
          reference,
          villaId: owner.villaId,
          holdId: activeHold.id,
          priceSnapshotId: activeHold.priceSnapshotId,
          buyerName: parsed.data.fullName,
          buyerMobile: `+91${parsed.data.mobile}`,
          buyerEmail: parsed.data.email,
          termsVersion,
          termsAcceptedAt: sql`now()`,
        })
        .returning({ reference: bookings.reference });
      if (booking) {
        await tx
          .update(holds)
          .set({ status: "converted", updatedAt: sql`now()` })
          .where(eq(holds.id, activeHold.id));
      }
      return booking
        ? { kind: "created" as const, reference: booking.reference, reused: false }
        : { kind: "unavailable" as const };
    });

    if (result.kind !== "created") return json({ error: "hold_unavailable" }, 409);
    return json(
      {
        booking: { reference: result.reference, status: "pending_payment" },
        reused: result.reused,
      },
      result.reused ? 200 : 201,
    );
  } catch {
    return json({ error: "temporarily_unavailable" }, 503);
  }
}
