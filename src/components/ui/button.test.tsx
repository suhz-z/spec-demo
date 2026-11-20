import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders a button with a visible label", () => {
    render(<Button>Continue to summary</Button>);

    expect(screen.getByRole("button", { name: "Continue to summary" })).toBeEnabled();
  });

  it("disables the control and exposes busy state while loading", () => {
    render(<Button isLoading>Saving</Button>);

    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("calls the click handler once per activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Pay</Button>);

    await user.click(screen.getByRole("button", { name: "Pay" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
