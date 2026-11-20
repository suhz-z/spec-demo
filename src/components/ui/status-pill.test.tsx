import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusPill } from "./status-pill";

describe("StatusPill", () => {
  it("always renders the status word, not colour alone", () => {
    render(
      <>
        <StatusPill status="available" />
        <StatusPill status="reserved" />
        <StatusPill status="booked" />
      </>,
    );

    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Reserved")).toBeInTheDocument();
    expect(screen.getByText("Booked")).toBeInTheDocument();
  });
});
