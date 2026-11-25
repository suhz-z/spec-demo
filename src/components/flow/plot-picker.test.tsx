import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FlowProvider } from "./flow-provider";
import { PlotPicker } from "./plot-picker";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  window.scrollTo = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      text: async () =>
        readFileSync(resolve(process.cwd(), "public/moolaparambu-site-plan.svg"), "utf8"),
    })),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("PlotPicker", () => {
  it("uses real site-plan data and continues from a plot to its summary", async () => {
    render(
      <FlowProvider>
        <PlotPicker />
      </FlowProvider>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /select a plot/i })).toBeInTheDocument();
    expect(await screen.findByText("6 plots")).toBeInTheDocument();

    const plotThree = await screen.findByRole("button", { name: /Plot 3, 16.10 cent/i });
    fireEvent.click(plotThree);

    expect(screen.getByRole("heading", { level: 2, name: "Plot 3" })).toBeInTheDocument();
    expect(screen.getByText("7,013 sq.ft")).toBeInTheDocument();
    expect(screen.getByText("₹48,30,000")).toBeInTheDocument();
    expect(screen.queryByText(/view floor plan/i)).not.toBeInTheDocument();

    const action = screen.getByRole("link", { name: /view summary/i });
    expect(action).toHaveAttribute("href", "/plots/3/summary");
  });

  it("keeps plot details hidden until a plot is selected", async () => {
    render(
      <FlowProvider>
        <PlotPicker />
      </FlowProvider>,
    );

    const plotFive = await screen.findByRole("button", { name: /Plot 5, 16.10 cent/i });
    fireEvent.pointerOver(plotFive);

    expect(screen.getByText("Plot details")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Select a plot" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Plot 5" })).not.toBeInTheDocument();
  });
});
