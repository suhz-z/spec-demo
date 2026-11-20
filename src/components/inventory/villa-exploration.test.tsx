import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VillaExplorer } from "./villa-explorer";
import { VillaLocationMap } from "./villa-location-map";
import { VillaPlanViewer } from "./villa-plan-viewer";
import type { FixtureFloorPlan, PublicVilla } from "@/modules/inventory/types";

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

describe("villa exploration", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("selects villas by keyboard and filters the villa list", async () => {
    const user = userEvent.setup();
    const available = villa("A-01");
    const reserved = villa("A-02", {
      status: "reserved",
      mapGeometry: { x: 136, y: 40, width: 84, height: 140 },
    });
    render(
      <VillaExplorer
        initialPayload={{
          state: "ready",
          source: "fixture",
          pollIntervalSeconds: 20,
          villas: [available, reserved],
        }}
        initialMapView={{ scale: 1, x: 0, y: 0 }}
      />,
    );

    const plot = screen.getByRole("button", { name: /Villa A-01, 3 BHK, Available/ });
    act(() => plot.focus());
    await user.keyboard("{Enter}");
    const details = screen.getByRole("complementary", { name: "Villa details" });
    expect(within(details).getByRole("heading", { name: "Villa A-01" })).toBeInTheDocument();
    expect(within(details).getByText("Available")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Available only"));
    const picker = screen.getByText("Choose by villa number").closest("details");
    expect(picker).not.toBeNull();
    expect(within(picker as HTMLDetailsElement).queryByRole("button", { name: /A-02/ })).toBeNull();
  });

  it("traps focus in the mobile villa sheet and restores it to the selected plot on close", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    render(
      <VillaExplorer
        initialPayload={{
          state: "ready",
          source: "fixture",
          pollIntervalSeconds: 20,
          villas: [villa("A-01")],
        }}
        initialMapView={{ scale: 1, x: 0, y: 0 }}
      />,
    );

    const plot = screen.getByRole("button", { name: /Villa A-01/ });
    await user.click(plot);
    const close = screen.getByRole("button", { name: "Close details" });
    const explore = screen.getByRole("link", { name: /Explore this villa/ });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(explore).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Close details" })).not.toBeInTheDocument();
    expect(plot).toHaveFocus();
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

  it("explains when approved inventory is pending and keeps fixture instructions in development", () => {
    render(
      <VillaExplorer
        initialPayload={{
          state: "pending",
          source: "none",
          message: "Approved villa inventory will appear here when it is available.",
        }}
        initialMapView={{ scale: 1, x: 0, y: 0 }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Villa details are being prepared" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Local preview fixtures are disabled/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Try again/ })).not.toBeInTheDocument();
  });

  it("shows empty inventory honestly and retries a temporary inventory error", async () => {
    const user = userEvent.setup();
    const emptyResult = render(
      <VillaExplorer
        initialPayload={{
          state: "empty",
          source: "database",
          message: "Approved villa inventory will appear here when it is available.",
        }}
        initialMapView={{ scale: 1, x: 0, y: 0 }}
      />,
    );
    expect(
      screen.getByText("Approved villa inventory will appear here when it is available."),
    ).toBeInTheDocument();
    emptyResult.unmount();

    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <VillaExplorer
        initialPayload={{
          state: "error",
          source: "database",
          message: "We could not load the villa layout. Please try again.",
        }}
        initialMapView={{ scale: 1, x: 0, y: 0 }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Try again/ }));
    expect(fetchMock).toHaveBeenCalledWith("/api/villas", { cache: "no-store" });
    expect(
      screen.getByRole("heading", { name: "The layout is temporarily unavailable" }),
    ).toBeInTheDocument();
  });
});
