import { afterEach, describe, expect, it, vi } from "vitest";

import { resetServerEnvForTests } from "@/lib/env";
import { getVillaFixtures } from "./villas.dev";

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvForTests();
});

describe("Minimal Flow development fixture", () => {
  it("contains all 22 villas and the sample availability counts", () => {
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("ENABLE_DEV_FIXTURES", "true");
    resetServerEnvForTests();

    const villas = getVillaFixtures();
    expect(villas).toHaveLength(22);
    expect(villas.map((villa) => villa.id)).toEqual(
      Array.from({ length: 22 }, (_, index) => `V${String(index + 1).padStart(2, "0")}`),
    );
    expect(villas.filter((villa) => villa.status === "available")).toHaveLength(13);
    expect(villas.filter((villa) => villa.status === "booked")).toHaveLength(6);
    expect(villas.filter((villa) => villa.status === "reserved")).toHaveLength(3);
  });

  it("keeps unspecified sample facts blank and labels both complete placeholder floors", () => {
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("ENABLE_DEV_FIXTURES", "true");
    resetServerEnvForTests();

    const villa = getVillaFixtures()[8];
    if (!villa) throw new Error("Expected V09 in the 22-villa fixture");
    expect(villa).toMatchObject({
      id: "V09",
      type: "4BHK",
      plotAreaSqFt: null,
      builtUpAreaSqFt: null,
      facing: null,
      corner: null,
      priceAmountMinor: null,
      floors: "Ground + First (sample layout)",
    });
    expect(villa.plans.map((plan) => plan.label)).toEqual(["Ground", "First"]);
    expect(villa.plans[0]?.rooms.map((room) => room.name)).toEqual([
      "Living",
      "Dining",
      "Kitchen",
      "Bedroom 1",
      "Bath",
      "Stair",
      "Utility",
      "Porch",
      "Bedroom 2",
    ]);
    expect(villa.plans[1]?.rooms.map((room) => room.name)).toEqual([
      "Master bedroom",
      "Dressing",
      "Bath",
      "Lounge",
      "Bedroom 3",
      "Bedroom 4",
      "Study",
      "Stair",
      "Balcony",
    ]);
    expect(villa.plans.flatMap((plan) => plan.rooms).every((room) => room.areaSqFt === null)).toBe(
      true,
    );
  });
});
