import { NextResponse } from "next/server";

import { loadPublicInventory } from "@/modules/inventory/public-inventory.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const inventory = await loadPublicInventory();
  return NextResponse.json(inventory, {
    status: inventory.state === "error" ? 503 : 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
