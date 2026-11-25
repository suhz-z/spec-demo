import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPlot } from "./flow-data";
import { FlowProvider } from "./flow-provider";
import { ReviewPage } from "./review-page";

const plot1 = getPlot("1");
if (!plot1) throw new Error("Plot 1 is missing from the source plan");

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  window.scrollTo = vi.fn();
  window.sessionStorage.clear();
  window.sessionStorage.setItem(
    "spectra-gardens-flow-v1",
    JSON.stringify({
      customer: {
        name: "Simile Jamal",
        mobile: "9494949494",
        email: "simile@example.com",
      },
      acceptedTerms: true,
      reference: null,
    }),
  );
});

describe("ReviewPage", () => {
  it("shows the booking, buyer and payment summary with a payment link", () => {
    render(
      <FlowProvider>
        <ReviewPage plot={plot1} />
      </FlowProvider>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Review and pay" })).toBeInTheDocument();
    expect(screen.getAllByText("Plot 1").length).toBeGreaterThan(0);
    expect(screen.getByText("Enquiries open")).toHaveClass("status", "available");
    expect(screen.getByText("Simile Jamal")).toBeInTheDocument();
    expect(screen.getByText("+91 9494949494")).toBeInTheDocument();
    expect(screen.getByText("simile@example.com")).toBeInTheDocument();
    expect(screen.getByText("₹45,00,000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit details/i })).toHaveAttribute(
      "href",
      "/plots/1/details",
    );
    expect(screen.getByRole("link", { name: /continue to payment/i })).toHaveAttribute(
      "href",
      "/plots/1/payment",
    );
  });
});
