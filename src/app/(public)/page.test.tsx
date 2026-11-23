import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "./page";

const loadPublicInventory = vi.hoisted(() => vi.fn());

vi.mock("@/modules/inventory/public-inventory.server", () => ({
  loadPublicInventory: () => loadPublicInventory(),
}));

vi.mock("@/components/inventory/villa-landing-hero", () => ({
  VillaLandingHero: ({ inventory }: { inventory: { state: string } }) => (
    <div data-testid="hero" data-state={inventory.state} />
  ),
}));

vi.mock("@/components/inventory/villa-explorer", () => ({
  VillaExplorer: ({
    initialSelectedId,
    initialMapView,
  }: {
    initialSelectedId?: string;
    initialMapView: { scale: number };
  }) => (
    <div
      data-testid="explorer"
      data-selected={initialSelectedId ?? ""}
      data-scale={initialMapView.scale}
    />
  ),
}));

const inventory = {
  state: "ready" as const,
  source: "database" as const,
  pollIntervalSeconds: 20,
  villas: [
    {
      id: "DEMO-A01",
      type: "4BHK" as const,
      builtUpAreaSqFt: 2900,
      plotAreaSqFt: 3480,
      floors: "Ground + 1",
      corner: false,
      facing: "South",
      status: "available" as const,
      priceAmountMinor: "2076000000",
      samplePrice: false,
      mapGeometry: { x: 64, y: 58, width: 95, height: 112 },
    },
  ],
};

describe("public home page", () => {
  beforeEach(() => {
    loadPublicInventory.mockReset();
    loadPublicInventory.mockResolvedValue(inventory);
  });

  it("renders real inventory through the landing and explorer components", async () => {
    render(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(loadPublicInventory).toHaveBeenCalledOnce();
    expect(screen.getByTestId("hero")).toHaveAttribute("data-state", "ready");
    expect(screen.getByTestId("explorer")).toBeInTheDocument();
    expect(document.getElementById("villa-map")).toBeInTheDocument();
  });

  it("selects the requested villa and restores the map view from the query string", async () => {
    render(
      await HomePage({
        searchParams: Promise.resolve({ villa: "demo-a01", mapScale: "1.5", mapX: "0", mapY: "0" }),
      }),
    );

    expect(screen.getByTestId("explorer")).toHaveAttribute("data-selected", "DEMO-A01");
    expect(screen.getByTestId("explorer")).toHaveAttribute("data-scale", "1.5");
  });

  it("ignores a villa that is not in the published inventory", async () => {
    render(await HomePage({ searchParams: Promise.resolve({ villa: "unknown" }) }));

    expect(screen.getByTestId("explorer")).toHaveAttribute("data-selected", "");
  });
});
