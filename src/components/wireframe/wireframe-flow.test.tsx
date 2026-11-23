import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WireframeFlow } from "./wireframe-flow";

beforeEach(() => {
  window.scrollTo = vi.fn();
  window.history.replaceState({}, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const match = /\/spectra-(ground|first)-floor-plan\.svg/.exec(String(input));
      if (!match) return { ok: false, status: 404 };
      return {
        ok: true,
        text: async () =>
          readFileSync(resolve(process.cwd(), `public/spectra-${match[1]}-floor-plan.svg`), "utf8"),
      };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("WireframeFlow", () => {
  it("follows the full six-screen wireframe journey with demo outcomes", async () => {
    render(<WireframeFlow />);

    expect(
      screen.getByRole("heading", { name: /find a place to feel at home/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));

    expect(screen.getByRole("heading", { level: 2, name: /select a plot/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Villa A-07, 4 BHK, available/i }));
    fireEvent.click(screen.getByRole("button", { name: /view villa/i }));

    expect(screen.getByRole("heading", { name: /floor plan/i })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /Kitchen, 13/ }));
    expect(screen.getByRole("heading", { name: "Kitchen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue to summary/i }));

    expect(screen.getByRole("heading", { name: /your selection/i })).toBeInTheDocument();
    expect(screen.getByText("₹2.08 Cr")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /proceed to booking/i }));

    expect(screen.getByRole("heading", { name: /customer details/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha Menon" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "9876543210" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "asha@example.com" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /review payment/i }));

    expect(screen.getByRole("heading", { name: /review and pay/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));

    expect(screen.getByRole("heading", { name: /payment gateway preview/i })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Preview a payment outcome"));
    fireEvent.click(screen.getByRole("button", { name: /successful payment/i }));

    expect(screen.getByRole("heading", { name: /booking flow complete/i })).toBeInTheDocument();
    expect(screen.getByText("Asha Menon")).toBeInTheDocument();
    expect(screen.getByText(/SG-PREVIEW-/)).toBeInTheDocument();
  });

  it("shows the taken state when booking an unavailable plot", () => {
    render(<WireframeFlow />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /Villa A-02, 4 BHK, booked/i }));
    fireEvent.click(screen.getByRole("button", { name: /view details/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue to summary/i }));
    fireEvent.click(screen.getByRole("button", { name: /proceed to booking/i }));

    expect(
      screen.getByRole("heading", { name: /Villa A-02 is no longer available/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /A-03/i })).toBeInTheDocument();
  });

  it("opens the previewed villa when hover differs from the selected plot", () => {
    render(<WireframeFlow />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /Villa A-01, 4 BHK, available/i }));
    fireEvent.pointerOver(screen.getByRole("button", { name: /Villa A-02, 4 BHK, booked/i }));

    fireEvent.click(screen.getByRole("button", { name: /view details/i }));

    expect(screen.getByText("Villa A-02")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /floor plan/i })).toBeInTheDocument();
  });

  it("uses the supplied SVG floor plan assets and switches them with the floor tabs", async () => {
    render(<WireframeFlow />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /Villa A-01, 4 BHK, available/i }));
    fireEvent.click(screen.getByRole("button", { name: /view villa/i }));

    expect(await screen.findByRole("button", { name: /Kitchen, 13/ })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/spectra-ground-floor-plan.svg", {
      cache: "force-cache",
    });

    fireEvent.click(screen.getByRole("button", { name: /first floor/i }));
    expect(await screen.findByRole("button", { name: /Master bedroom/ })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/spectra-first-floor-plan.svg", {
      cache: "force-cache",
    });
  });

  it("lands on the plot picker with the requested villa when arriving from the villa page", () => {
    window.history.replaceState({}, "", "/?villa=A-07&mapScale=1&mapX=0&mapY=0#villa-map");
    render(<WireframeFlow />);

    expect(screen.getByRole("heading", { level: 2, name: /select a plot/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Villa A-07" })).toBeInTheDocument();
    expect(document.getElementById("villa-map")).toBeInTheDocument();
  });

  it("opens the plot picker from the shared /#villa-map link", () => {
    window.history.replaceState({}, "", "/#villa-map");
    render(<WireframeFlow />);

    expect(screen.getByRole("heading", { level: 2, name: /select a plot/i })).toBeInTheDocument();
    expect(document.getElementById("villa-map")).toBeInTheDocument();
  });
});
