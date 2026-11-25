import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FlowFooter, SiteFooter } from "./site-footer";

describe("site and flow footers", () => {
  it.each([
    ["site footer", <SiteFooter key="site" />],
    ["flow footer", <FlowFooter key="flow" />],
  ])("shows demo contact details in the %s", (_label, footer) => {
    render(footer);

    expect(screen.getByText("Contact us")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+91 90000 00000" })).toHaveAttribute(
      "href",
      "tel:+919000000000",
    );
    expect(screen.queryByRole("link", { name: /back to top/i })).not.toBeInTheDocument();
  });
});
