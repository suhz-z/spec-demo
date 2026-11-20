import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { InventoryPayload, PublicVilla } from "@/modules/inventory/types";

import { VillaLandingHero } from "./villa-landing-hero";

function villa(id: string, type: PublicVilla["type"]): PublicVilla {
  return {
    id,
    type,
    builtUpAreaSqFt: 2450,
    plotAreaSqFt: 2800,
    floors: "Ground + 1",
    corner: false,
    facing: "South",
    status: "available",
    priceAmountMinor: null,
    samplePrice: true,
    mapGeometry: { x: 10, y: 10, width: 80, height: 90 },
  };
}

const inventory: InventoryPayload = {
  state: "ready",
  source: "fixture",
  pollIntervalSeconds: 20,
  villas: [villa("V01", "3BHK"), villa("V02", "4BHK")],
};

describe("VillaLandingHero", () => {
  it("shows the wireframe headline, CTA, and decorative art", () => {
    render(<VillaLandingHero inventory={inventory} />);

    expect(
      screen.getByRole("heading", { name: /find a place to feel at home/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      "#villa-map",
    );
    expect(
      screen.getByRole("img", { name: /abstract residential master plan/i }),
    ).toBeInTheDocument();
  });

  it("derives honest counts from the loaded inventory", () => {
    render(<VillaLandingHero inventory={inventory} />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3 BHK · 4 BHK")).toBeInTheDocument();
    expect(screen.getByText("Sample inventory")).toBeInTheDocument();
  });

  it("does not claim inventory when the feed is unavailable", () => {
    render(
      <VillaLandingHero inventory={{ state: "pending", source: "none", message: "Loading" }} />,
    );

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("Sample inventory")).not.toBeInTheDocument();
  });
});
