import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPlot } from "./flow-data";
import { DetailsPage } from "./details-page";
import { FlowProvider } from "./flow-provider";

const plot3 = getPlot("3");
if (!plot3) throw new Error("Plot 3 is missing from the source plan");

const push = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  window.scrollTo = vi.fn();
  window.sessionStorage.clear();
  push.mockClear();
});

describe("DetailsPage", () => {
  it("validates the form and continues to review with real plot facts", () => {
    render(
      <FlowProvider>
        <DetailsPage plot={plot3} />
      </FlowProvider>,
    );

    expect(screen.getByText("Plot 3 · 16.10 cent")).toBeInTheDocument();
    expect(screen.getAllByText("Price on request").length).toBeGreaterThan(0);
    expect(screen.queryByText("₹2.08 Cr")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /review payment/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/valid 10-digit mobile number/i);
    expect(push).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha Menon" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), {
      target: { value: "98765abc43210" },
    });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "asha@example.com" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /review payment/i }));

    expect(push).toHaveBeenCalledWith("/plots/3/review");
  });
});
