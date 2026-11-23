import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssetSitePlan } from "./asset-site-plan";

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 215 370 430" role="group">
  <style>.plot-shape { fill: #eef3ec; } .plot-group.selected .plot-shape { fill: #dce9dc; }</style>
  <g id="plot-3" class="plot-group" data-plot="3" tabindex="0" role="button" aria-label="Plot 3, 16.10 cent">
    <title>Plot 3 - 16.10 cent</title>
    <path class="plot-shape" d="M149.6 315 L147.2 273.84 Z" />
  </g>
  <script><![CDATA[document.dispatchEvent(new Event('plotselect'));]]></script>
</svg>`;

afterEach(() => vi.unstubAllGlobals());

describe("AssetSitePlan", () => {
  it("loads the supplied site-plan SVG and keeps its plots selectable", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => svg }));
    vi.stubGlobal("fetch", fetchMock);
    const onSelect = vi.fn();
    const onPlots = vi.fn();
    const onPreview = vi.fn();

    const { container } = render(
      <AssetSitePlan onSelect={onSelect} onPreview={onPreview} onPlots={onPlots} />,
    );

    expect(fetchMock).toHaveBeenCalledWith("/moolaparambu-site-plan.svg", {
      cache: "force-cache",
    });
    const plot = await screen.findByRole("button", { name: /plot 3/i });
    expect(onPlots).toHaveBeenCalledWith([{ id: "3", name: "Plot 3", area: "16.10 cent" }]);

    // Its own linework styling survives, but executable content does not.
    expect(container.querySelector("style")?.textContent).toContain(".plot-shape");
    expect(container.querySelector("script")).toBeNull();

    fireEvent.click(plot);
    fireEvent.keyDown(plot, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith({ id: "3", name: "Plot 3", area: "16.10 cent" });
  });

  it("marks the selected plot and clears the previous selection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, text: async () => svg })),
    );
    const { container } = render(
      <AssetSitePlan selectedPlotId="3" onSelect={vi.fn()} onPreview={vi.fn()} onPlots={vi.fn()} />,
    );

    await screen.findByRole("button", { name: /plot 3/i });
    await waitFor(() =>
      expect(container.querySelector("[data-plot='3']")).toHaveClass("selected", "active"),
    );

    const { container: next } = render(
      <AssetSitePlan selectedPlotId="4" onSelect={vi.fn()} onPreview={vi.fn()} onPlots={vi.fn()} />,
    );
    await waitFor(() =>
      expect(next.querySelector("[data-plot='3']")?.classList.contains("selected")).toBe(false),
    );
  });

  it("falls back to the supplied preview image when the SVG cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404 })),
    );

    render(<AssetSitePlan onSelect={vi.fn()} onPreview={vi.fn()} onPlots={vi.fn()} />);

    expect(
      await screen.findByRole("img", { name: /moolaparambu land subdivision plan/i }),
    ).toHaveAttribute("src", "/moolaparambu-site-plan-preview.png");
    expect(screen.getByRole("status")).toHaveTextContent(/static preview/i);
  });
});
