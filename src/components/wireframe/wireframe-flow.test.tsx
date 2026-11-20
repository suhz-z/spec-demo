import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WireframeFlow } from "./wireframe-flow";

beforeEach(() => {
  window.scrollTo = vi.fn();
});

describe("WireframeFlow", () => {
  it("follows the full six-screen wireframe journey with demo outcomes", () => {
    render(<WireframeFlow />);

    expect(
      screen.getByRole("heading", { name: /find a place to feel at home/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));

    expect(screen.getByRole("heading", { level: 2, name: /select a plot/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Villa A-07, 4 BHK, available/i }));
    fireEvent.click(screen.getByRole("button", { name: /view villa/i }));

    expect(screen.getByRole("heading", { name: /floor plan/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Kitchen, 13/ }));
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
});
