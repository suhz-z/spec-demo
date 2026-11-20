import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssetFloorPlan } from "./asset-floor-plan";

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" role="group">
  <style>.room-group { cursor: pointer; }</style>
  <g class="room-group" data-room="living" tabindex="0" role="button" aria-label="Living room, 18′ × 18′, 324 sq.ft">
    <rect class="room-shape" x="10" y="10" width="100" height="80" />
    <text>Living room</text>
  </g>
</svg>`;

afterEach(() => vi.unstubAllGlobals());

describe("AssetFloorPlan", () => {
  it("loads the supplied SVG and keeps its room selectable", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => svg }));
    vi.stubGlobal("fetch", fetchMock);
    const onSelect = vi.fn();
    const onRooms = vi.fn();
    const onPreview = vi.fn();

    render(
      <AssetFloorPlan floor="ground" onSelect={onSelect} onPreview={onPreview} onRooms={onRooms} />,
    );

    expect(fetchMock).toHaveBeenCalledWith("/spectra-ground-floor-plan.svg", {
      cache: "force-cache",
    });
    const room = await screen.findByRole("button", { name: /living room/i });
    expect(onRooms).toHaveBeenCalledWith([
      {
        id: "living",
        name: "Living room",
        size: "18′ × 18′",
        areaSqFt: 324,
        service: false,
        outside: false,
      },
    ]);

    fireEvent.click(room);
    fireEvent.keyDown(room, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "living", name: "Living room", areaSqFt: 324 }),
    );
  });

  it("shows an error instead of injecting a failed or unsafe asset", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, text: async () => `${svg}<script>alert('x')</script>` })),
    );
    render(
      <AssetFloorPlan floor="first" onSelect={vi.fn()} onPreview={vi.fn()} onRooms={vi.fn()} />,
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/could not be loaded/i),
    );
    expect(screen.queryByRole("button", { name: /living room/i })).not.toBeInTheDocument();
  });
});
