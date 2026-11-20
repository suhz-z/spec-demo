import type { NextRequest } from "next/server";

import {
  authorizeStaffRequest,
  json,
  readJsonBody,
  staffFailureStatus,
} from "@/modules/staff/staff-http.server";
import {
  createStaffRefund,
  createStaffRefundInputSchema,
  listStaffRefunds,
  paginationSchema,
} from "@/modules/staff/staff-domain";
import { presentRefund } from "@/modules/staff/staff-presentation";
import { staffRepository } from "@/modules/staff/staff-repository.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authorizeStaffRequest(request, "refunds:read");
  if (!auth.ok) return auth.response;

  const pagination = paginationSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!pagination.success) return json({ error: "invalid_request" }, 400);

  try {
    const result = await listStaffRefunds(auth.identity, staffRepository, pagination.data);
    if (!result.ok) return json({ error: result.code }, staffFailureStatus(result.code));
    return json({
      items: result.data.map(presentRefund),
      limit: pagination.data.limit,
      offset: pagination.data.offset,
    });
  } catch {
    return json({ error: "staff_data_unavailable" }, 503);
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeStaffRequest(request, "refunds:write");
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const input = createStaffRefundInputSchema.safeParse(body.value);
  if (!input.success) return json({ error: "invalid_request" }, 400);

  try {
    const result = await createStaffRefund(auth.identity, staffRepository, input.data);
    if (!result.ok) return json({ error: result.code }, staffFailureStatus(result.code));
    return json(
      { refund: presentRefund(result.data.refund), created: result.data.created },
      result.data.created ? 201 : 200,
    );
  } catch {
    return json({ error: "staff_data_unavailable" }, 503);
  }
}
