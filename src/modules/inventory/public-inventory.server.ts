import "server-only";

import { and, asc, eq, gt, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { bookings, holds, priceSettings, villas } from "@/db/schema";
import { getVillaFixtures } from "@/fixtures/villas.dev";
import { createLogger } from "@/lib/logger";
import { getServerEnv } from "@/lib/env";
import {
  inventoryPayloadSchema,
  type FixtureVilla,
  type InventoryPayload,
  type PublicVilla,
} from "./types";

const logger = createLogger({ module: "public-inventory" });

function fixturesPayload(): InventoryPayload {
  return inventoryPayloadSchema.parse({
    state: "ready",
    source: "fixture",
    pollIntervalSeconds: getServerEnv().INVENTORY_POLL_SECONDS,
    villas: getVillaFixtures(),
  });
}

function mapPublicVilla(row: {
  id: string;
  type: string;
  builtUpAreaSqFt: number | null;
  plotAreaSqFt: number | null;
  floors: number;
  facing: string | null;
  isCorner: boolean;
  status: string;
  hasActiveHold: boolean;
  liveBookingStatus: string | null;
  priceAmountMinor: bigint | null;
  mapX: number | null;
  mapY: number | null;
  mapWidth: number | null;
  mapHeight: number | null;
}): PublicVilla | null {
  if (
    (row.type !== "3BHK" && row.type !== "4BHK") ||
    (row.status !== "available" && row.status !== "reserved" && row.status !== "booked") ||
    row.builtUpAreaSqFt === null ||
    row.plotAreaSqFt === null ||
    row.facing === null
  ) {
    return null;
  }

  const mapGeometry =
    row.mapX !== null && row.mapY !== null && row.mapWidth !== null && row.mapHeight !== null
      ? { x: row.mapX, y: row.mapY, width: row.mapWidth, height: row.mapHeight }
      : null;

  const publicStatus =
    row.status === "available" && row.liveBookingStatus === "confirmed"
      ? "booked"
      : row.status === "available" && (row.hasActiveHold || row.liveBookingStatus !== null)
        ? "reserved"
        : row.status;

  return {
    id: row.id,
    type: row.type,
    builtUpAreaSqFt: row.builtUpAreaSqFt,
    plotAreaSqFt: row.plotAreaSqFt,
    floors: row.floors === 2 ? "Ground + 1" : `${row.floors} floors`,
    corner: row.isCorner,
    facing: row.facing,
    status: publicStatus,
    priceAmountMinor: row.priceAmountMinor?.toString() ?? null,
    samplePrice: false,
    mapGeometry,
  };
}

/** Public inventory includes only published homes and never returns staff or buyer fields. */
export async function loadPublicInventory(): Promise<InventoryPayload> {
  const environment = getServerEnv();

  if (
    (environment.APP_ENV === "development" || environment.APP_ENV === "test") &&
    environment.ENABLE_DEV_FIXTURES
  ) {
    return fixturesPayload();
  }

  if (!environment.DATABASE_URL) {
    return {
      state: "pending",
      source: "none",
      message: "Approved villa inventory will appear here when it is available.",
    };
  }

  try {
    const rows = await getDb()
      .select({
        id: villas.code,
        type: villas.configuration,
        builtUpAreaSqFt: villas.builtUpAreaSqFt,
        plotAreaSqFt: villas.plotAreaSqFt,
        floors: villas.floors,
        facing: villas.facing,
        isCorner: villas.isCorner,
        status: villas.status,
        hasActiveHold: sql<boolean>`${holds.id} is not null`,
        liveBookingStatus: bookings.status,
        priceAmountMinor: priceSettings.baseAmountMinor,
        mapX: villas.mapX,
        mapY: villas.mapY,
        mapWidth: villas.mapWidth,
        mapHeight: villas.mapHeight,
      })
      .from(villas)
      .leftJoin(
        priceSettings,
        and(
          eq(priceSettings.villaId, villas.id),
          lte(priceSettings.validFrom, sql`now()`),
          or(isNull(priceSettings.validUntil), gt(priceSettings.validUntil, sql`now()`)),
        ),
      )
      .leftJoin(
        holds,
        and(
          eq(holds.villaId, villas.id),
          eq(holds.status, "active"),
          gt(holds.expiresAt, sql`now()`),
        ),
      )
      .leftJoin(
        bookings,
        and(
          eq(bookings.villaId, villas.id),
          inArray(bookings.status, ["pending_payment", "confirmed", "refund_pending"]),
        ),
      )
      .where(
        and(
          inArray(villas.status, ["available", "reserved", "booked"]),
          isNotNull(villas.publishedAt),
        ),
      )
      .orderBy(asc(villas.displayOrder), asc(villas.code));

    const publicVillas = rows.flatMap((row) => {
      const villa = mapPublicVilla(row);
      return villa ? [villa] : [];
    });

    if (publicVillas.length === 0) {
      return {
        state: "empty",
        source: "database",
        message: "Approved villa inventory will appear here when it is available.",
      };
    }

    return inventoryPayloadSchema.parse({
      state: "ready",
      source: "database",
      pollIntervalSeconds: environment.INVENTORY_POLL_SECONDS,
      villas: publicVillas,
    });
  } catch (error) {
    logger.error("Public villa inventory could not be loaded", { error });
    return {
      state: "error",
      source: "database",
      message: "We could not load the villa layout. Please try again.",
    };
  }
}

export async function getPublicVillaByCode(code: string): Promise<
  | {
      state: "found";
      villa: PublicVilla;
      fixture?: FixtureVilla;
      community: readonly PublicVilla[];
    }
  | { state: "not-found" }
  | { state: "unavailable"; message: string }
> {
  const inventory = await loadPublicInventory();
  if (inventory.state === "pending" || inventory.state === "error") {
    return { state: "unavailable", message: inventory.message };
  }
  if (inventory.state === "empty") return { state: "not-found" };

  const villa = inventory.villas.find((item) => item.id === code);
  if (!villa) return { state: "not-found" };

  if (inventory.source === "fixture") {
    const fixture = getVillaFixtures().find((item) => item.id === code);
    return fixture
      ? { state: "found", villa, fixture, community: inventory.villas }
      : { state: "not-found" };
  }

  return { state: "found", villa, community: inventory.villas };
}
