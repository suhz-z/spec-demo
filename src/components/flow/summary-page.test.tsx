import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPlot } from "./flow-data";
import { SummaryPage } from "./summary-page";

const plot3 = getPlot("3");
if (!plot3) throw new Error("Plot 3 is missing from the source plan");

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

describe("SummaryPage", () => {
  it("highlights the chosen plot on the source site plan", async () => {
    const { container } = render(<SummaryPage plot={plot3} />);

    expect(screen.getByRole("heading", { name: /your selection/i })).toBeInTheDocument();
    expect(screen.getByText("SELECTED PLOT · SITE PLAN")).toBeInTheDocument();
    expect(screen.getAllByText("Price on request").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /proceed to booking/i })).toHaveAttribute(
      "href",
      "/plots/3/details",
    );
    expect(screen.getByRole("link", { name: /back to site plan/i })).toHaveAttribute(
      "href",
      "/plots",
    );

    await waitFor(() => {
      expect(container.querySelector('[data-plot="3"]')).toHaveClass("selected");
    });
    expect(container.querySelectorAll("[data-plot].selected")).toHaveLength(1);
    expect(
      screen.getByRole("img", { name: /site plan with Plot 3 highlighted/i }),
    ).toBeInTheDocument();
  });
});
