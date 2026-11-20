import "server-only";

import { withDevFixtures } from "@/fixtures/guard";
import type { FixtureFloorPlan, FixtureRoom, FixtureVilla } from "@/modules/inventory/types";

const GROUND_ROOMS: readonly FixtureRoom[] = [
  {
    id: "living",
    name: "Living",
    size: "To be confirmed",
    areaSqFt: null,
    x: 70,
    y: 52,
    width: 280,
    height: 170,
  },
  {
    id: "dining",
    name: "Dining",
    size: "To be confirmed",
    areaSqFt: null,
    x: 350,
    y: 52,
    width: 170,
    height: 120,
  },
  {
    id: "kitchen",
    name: "Kitchen",
    size: "To be confirmed",
    areaSqFt: null,
    x: 520,
    y: 52,
    width: 130,
    height: 120,
    service: true,
  },
  {
    id: "bedroom-1",
    name: "Bedroom 1",
    size: "To be confirmed",
    areaSqFt: null,
    x: 350,
    y: 172,
    width: 170,
    height: 150,
  },
  {
    id: "bath",
    name: "Bath",
    size: "To be confirmed",
    areaSqFt: null,
    x: 520,
    y: 172,
    width: 130,
    height: 90,
    service: true,
  },
  {
    id: "stair",
    name: "Stair",
    size: "To be confirmed",
    areaSqFt: null,
    x: 520,
    y: 262,
    width: 130,
    height: 90,
    service: true,
  },
  {
    id: "utility",
    name: "Utility",
    size: "To be confirmed",
    areaSqFt: null,
    x: 70,
    y: 222,
    width: 140,
    height: 100,
    service: true,
  },
  {
    id: "porch",
    name: "Porch",
    size: "To be confirmed",
    areaSqFt: null,
    x: 70,
    y: 352,
    width: 220,
    height: 110,
    outside: true,
  },
  {
    id: "bedroom-2",
    name: "Bedroom 2",
    size: "To be confirmed",
    areaSqFt: null,
    x: 290,
    y: 352,
    width: 230,
    height: 110,
  },
];

const FIRST_ROOMS: readonly FixtureRoom[] = [
  {
    id: "master-bedroom",
    name: "Master bedroom",
    size: "To be confirmed",
    areaSqFt: null,
    x: 70,
    y: 52,
    width: 250,
    height: 160,
  },
  {
    id: "dressing",
    name: "Dressing",
    size: "To be confirmed",
    areaSqFt: null,
    x: 320,
    y: 52,
    width: 130,
    height: 100,
    service: true,
  },
  {
    id: "bath",
    name: "Bath",
    size: "To be confirmed",
    areaSqFt: null,
    x: 450,
    y: 52,
    width: 200,
    height: 100,
    service: true,
  },
  {
    id: "lounge",
    name: "Lounge",
    size: "To be confirmed",
    areaSqFt: null,
    x: 320,
    y: 152,
    width: 270,
    height: 180,
  },
  {
    id: "bedroom-3",
    name: "Bedroom 3",
    size: "To be confirmed",
    areaSqFt: null,
    x: 70,
    y: 212,
    width: 160,
    height: 150,
  },
  {
    id: "bedroom-4",
    name: "Bedroom 4",
    size: "To be confirmed",
    areaSqFt: null,
    x: 450,
    y: 332,
    width: 200,
    height: 100,
  },
  {
    id: "study",
    name: "Study",
    size: "To be confirmed",
    areaSqFt: null,
    x: 230,
    y: 362,
    width: 150,
    height: 70,
  },
  {
    id: "stair",
    name: "Stair",
    size: "To be confirmed",
    areaSqFt: null,
    x: 380,
    y: 332,
    width: 70,
    height: 100,
    service: true,
  },
  {
    id: "balcony",
    name: "Balcony",
    size: "To be confirmed",
    areaSqFt: null,
    x: 70,
    y: 362,
    width: 160,
    height: 70,
    outside: true,
  },
];

const PLANS: readonly FixtureFloorPlan[] = [
  { floorNumber: 0, label: "Ground", rooms: GROUND_ROOMS },
  { floorNumber: 1, label: "First", rooms: FIRST_ROOMS },
];

type VillaFixtureSeed = {
  id: string;
  status: FixtureVilla["status"];
  type: FixtureVilla["type"];
  x: number;
  y: number;
  width: number;
  height: number;
};

const VILLAS: readonly VillaFixtureSeed[] = [
  { id: "V01", status: "available", type: "3BHK", x: 64, y: 58, width: 95, height: 112 },
  { id: "V02", status: "available", type: "3BHK", x: 175, y: 58, width: 95, height: 112 },
  { id: "V03", status: "booked", type: null, x: 286, y: 58, width: 95, height: 112 },
  { id: "V04", status: "available", type: "3BHK", x: 397, y: 58, width: 95, height: 112 },
  { id: "V05", status: "reserved", type: null, x: 508, y: 58, width: 95, height: 112 },
  { id: "V06", status: "booked", type: "4BHK", x: 619, y: 58, width: 95, height: 112 },
  { id: "V07", status: "available", type: "3BHK", x: 730, y: 58, width: 95, height: 112 },
  { id: "V08", status: "available", type: "3BHK", x: 841, y: 58, width: 95, height: 112 },
  { id: "V09", status: "available", type: "4BHK", x: 80, y: 224, width: 90, height: 112 },
  { id: "V10", status: "booked", type: null, x: 182, y: 224, width: 90, height: 112 },
  { id: "V11", status: "available", type: "3BHK", x: 284, y: 224, width: 90, height: 112 },
  { id: "V12", status: "available", type: "4BHK", x: 590, y: 224, width: 90, height: 112 },
  { id: "V13", status: "reserved", type: null, x: 692, y: 224, width: 90, height: 112 },
  { id: "V14", status: "available", type: "3BHK", x: 794, y: 224, width: 90, height: 112 },
  { id: "V15", status: "available", type: "4BHK", x: 80, y: 390, width: 90, height: 112 },
  { id: "V16", status: "available", type: "3BHK", x: 182, y: 390, width: 90, height: 112 },
  { id: "V17", status: "booked", type: null, x: 284, y: 390, width: 90, height: 112 },
  { id: "V18", status: "reserved", type: null, x: 386, y: 390, width: 90, height: 112 },
  { id: "V19", status: "booked", type: null, x: 590, y: 390, width: 90, height: 112 },
  { id: "V20", status: "available", type: "3BHK", x: 692, y: 390, width: 90, height: 112 },
  { id: "V21", status: "available", type: "4BHK", x: 794, y: 390, width: 90, height: 112 },
  { id: "V22", status: "booked", type: null, x: 896, y: 390, width: 90, height: 112 },
];

function makeVilla(seed: VillaFixtureSeed): FixtureVilla {
  return {
    id: seed.id,
    type: seed.type,
    builtUpAreaSqFt: null,
    plotAreaSqFt: null,
    floors: "Ground + First (sample layout)",
    corner: null,
    facing: null,
    status: seed.status,
    priceAmountMinor: null,
    samplePrice: true,
    mapGeometry: { x: seed.x, y: seed.y, width: seed.width, height: seed.height },
    plans: PLANS,
  };
}

/** Twenty-two-villa Minimal Flow sample; all plans are complete, clearly marked placeholders. */
export function getVillaFixtures(): readonly FixtureVilla[] {
  return withDevFixtures(() => VILLAS.map(makeVilla));
}
