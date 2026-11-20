import { z } from "zod";
import type { NextRequest } from "next/server";

import {
  authorizeStaffRequest,
  json,
  readJsonBody,
  staffFailureStatus,
} from "@/modules/staff/staff-http.server";
import { updateVillaStatus, updateVillaStatusInputSchema } from "@/modules/staff/staff-domain";
import { staffRepository } from "@/modules/staff/staff-repository.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ villaId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await authorizeStaffRequest(request, "inventory:write");
  if (!auth.ok) return auth.response;

  const { villaId } = await context.params;
  if (!z.uuid().safeParse(villaId).success) {
    return json({ error: "not_found" }, 404);
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const input = updateVillaStatusInputSchema.safeParse(body.value);
  if (!input.success) return json({ error: "invalid_request" }, 400);

  try {
    const result = await updateVillaStatus(auth.identity, staffRepository, villaId, input.data);
    if (!result.ok) return json({ error: result.code }, staffFailureStatus(result.code));
    return json({ villa: result.data });
  } catch {
    return json({ error: "staff_data_unavailable" }, 503);
  }
}
