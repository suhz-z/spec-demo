import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SitePlanViewer } from "./site-plan-viewer";

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 215 370 430" role="group">
  <g class="plot-group" data-plot="3" tabindex="0" role="button" aria-label="Plot 3, 16.10 cent">
    <path class="plot-shape" d="M149.6 315 L147.2 273.84 Z" />
  </g>
  <g class="plot-group" data-plot="4" tabindex="0" role="button" aria-label="Plot 4, 16.10 cent">
    <path class="plot-shape" d="M296.36 251.52 L318.32 259.44 Z" />
  </g>
</svg>`;

describe("SitePlanViewer", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, text: async () => svg })),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("replaces the villa floor plan with the interactive site plan and plot details", async () => {
    const user = userEvent.setup();
    const { container } = render(<SitePlanViewer villaCode="V01" />);

    expect(screen.getByRole("heading", { name: "Site plan" })).toBeInTheDocument();
    expect(screen.getByText(/Villa V01/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ground floor" })).toBeNull();

    const plot = await screen.findByRole("button", { name: /plot 3/i });
    await user.click(plot);
    const panel = screen.getByRole("complementary", { name: "Plot details" });
    expect(panel.querySelector("h3")).toHaveTextContent("Plot 3");
    expect(panel).toHaveTextContent("16.10 cent");

    const picker = screen.getByText("Browse plots by number").closest("details");
    expect(picker).not.toBeNull();
    await user.click(screen.getByRole("button", { name: /plot 4/i, pressed: false }));
    await waitFor(() => expect(panel.querySelector("h3")).toHaveTextContent("Plot 4"));

    await user.click(screen.getByRole("button", { name: "Close plot details" }));
    expect(screen.getByText("Select a plot")).toBeInTheDocument();
    expect(container.querySelector("[data-plot='4']")).toHaveFocus();
  });
});
