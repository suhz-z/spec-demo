import type { NextRequest } from "next/server";

import { authorizeStaffRequest, json, staffFailureStatus } from "@/modules/staff/staff-http.server";
import { listStaffBookings, paginationSchema } from "@/modules/staff/staff-domain";
import { presentBooking } from "@/modules/staff/staff-presentation";
import { staffRepository } from "@/modules/staff/staff-repository.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authorizeStaffRequest(request, "bookings:read");
  if (!auth.ok) return auth.response;

  const pagination = paginationSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!pagination.success) return json({ error: "invalid_request" }, 400);

  try {
    const result = await listStaffBookings(auth.identity, staffRepository, pagination.data);
    if (!result.ok) return json({ error: result.code }, staffFailureStatus(result.code));
    return json({
      items: result.data.map(presentBooking),
      limit: pagination.data.limit,
      offset: pagination.data.offset,
    });
  } catch {
    return json({ error: "staff_data_unavailable" }, 503);
  }
}
