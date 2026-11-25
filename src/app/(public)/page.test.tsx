import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "@/app/(public)/page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("HomePage", () => {
  it("shows a generic floor plan and leads into the site plan", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /find a place to feel at home/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /indicative ground-floor layout/i })).toHaveAttribute(
      "src",
      "/spectra-ground-floor-plan-preview.png",
    );
    expect(screen.getByText(/indicative floor plan/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/plots");
    expect(screen.getByRole("link", { name: "+91 90000 00000" })).toHaveAttribute(
      "href",
      "tel:+919000000000",
    );
    expect(screen.queryByText(/16.10/)).not.toBeInTheDocument();
    expect(screen.queryByText(/7.00/)).not.toBeInTheDocument();
  });
});
