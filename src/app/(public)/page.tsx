import type { Metadata } from "next";

import { VillaExplorer } from "@/components/inventory/villa-explorer";
import { VillaLandingHero } from "@/components/inventory/villa-landing-hero";
import { loadPublicInventory } from "@/modules/inventory/public-inventory.server";
import { mapViewSchema } from "@/modules/inventory/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Spectra Gardens — Explore the master layout",
  description: "Explore the Moolaparambu villa plots, floor areas and availability.",
};

type HomePageProps = {
  searchParams: Promise<{
    villa?: string;
    mapScale?: string;
    mapX?: string;
    mapY?: string;
  }>;
};

/**
 * Real, server-driven landing and master layout. It renders the same visual
 * design as the V3.4 wireframe, but the inventory and availability come from
 * the published inventory source instead of the client-only prototype dataset.
 */
export default async function HomePage({ searchParams }: HomePageProps) {
  const query = await searchParams;
  const parsedMapView = mapViewSchema.safeParse({
    scale: Number(query.mapScale ?? 1),
    x: Number(query.mapX ?? 0),
    y: Number(query.mapY ?? 0),
  });
  const initialMapView = parsedMapView.success ? parsedMapView.data : { scale: 1, x: 0, y: 0 };

  const inventory = await loadPublicInventory();
  const requestedVilla = query.villa?.trim().toUpperCase();
  const initialSelectedId =
    inventory.state === "ready" && requestedVilla
      ? (inventory.villas.find((villa) => villa.id === requestedVilla)?.id ?? undefined)
      : undefined;

  return (
    <>
      <VillaLandingHero inventory={inventory} />
      <div id="villa-map">
        <VillaExplorer
          initialPayload={inventory}
          initialSelectedId={initialSelectedId}
          initialMapView={initialMapView}
        />
      </div>
    </>
  );
}
