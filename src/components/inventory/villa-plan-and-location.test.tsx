import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FixtureFloorPlan, PublicVilla } from "@/modules/inventory/types";

import { VillaLocationMap } from "./villa-location-map";
import { VillaPlanViewer } from "./villa-plan-viewer";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function villa(id: string, options: Partial<PublicVilla> = {}): PublicVilla {
  return {
    id,
    type: "3BHK",
    builtUpAreaSqFt: 2450,
    plotAreaSqFt: 2800,
    floors: "Ground + 1",
    corner: false,
    facing: "North",
    status: "available",
    priceAmountMinor: "2500000000",
    samplePrice: true,
    mapGeometry: { x: 44, y: 40, width: 84, height: 140 },
    ...options,
  };
}

const groundRooms: FixtureFloorPlan = {
  floorNumber: 0,
  label: "Ground floor",
  rooms: [
    {
      id: "kitchen",
      name: "Kitchen",
      size: "10′ × 10′",
      areaSqFt: 100,
      x: 70,
      y: 48,
      width: 180,
      height: 120,
    },
  ],
};

const firstFloor: FixtureFloorPlan = {
  floorNumber: 1,
  label: "First floor",
  rooms: [
    {
      id: "bedroom",
      name: "Bedroom",
      size: "12′ × 12′",
      areaSqFt: 144,
      x: 70,
      y: 48,
      width: 180,
      height: 120,
    },
  ],
};

describe("villa floor plan and location map", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("changes floors and exposes room details through selectable room shapes", async () => {
    const user = userEvent.setup();
    render(<VillaPlanViewer villa={villa("A-01")} plans={[groundRooms, firstFloor]} />);

    await user.click(screen.getByRole("button", { name: "Kitchen, 10′ × 10′, 100 square feet" }));
    expect(screen.getByRole("heading", { name: "Kitchen" })).toBeInTheDocument();
    expect(screen.getByText("100 sq.ft")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "First floor" }));
    expect(
      screen.getByRole("button", { name: "Bedroom, 12′ × 12′, 144 square feet" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Select a room")).toBeInTheDocument();
  });

  it("traps focus in the mobile room sheet and closes it with Escape", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    render(<VillaPlanViewer villa={villa("A-01")} plans={[groundRooms]} />);

    const room = screen.getByRole("button", { name: "Kitchen, 10′ × 10′, 100 square feet" });
    await user.click(room);
    const close = screen.getByRole("button", { name: "Close room details" });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Close room details" })).not.toBeInTheDocument();
    expect(room).toHaveFocus();
  });

  it("shows the selected villa highlighted in the community mini-map", () => {
    const selected = villa("A-01");
    const nearby = villa("A-02", { mapGeometry: { x: 136, y: 40, width: 84, height: 140 } });
    render(<VillaLocationMap villa={selected} community={[selected, nearby]} />);

    expect(
      screen.getByRole("img", { name: "Community site plan with villa A-01 highlighted" }),
    ).toBeInTheDocument();
    expect(screen.getByText("A-01")).toBeInTheDocument();
    expect(screen.getByText("Villa A-01 is highlighted on the site plan.")).toBeInTheDocument();
  });
});
