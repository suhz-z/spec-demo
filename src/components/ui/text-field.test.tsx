import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextField } from "./text-field";

describe("TextField", () => {
  it("associates the label, hint, and error with the input", () => {
    render(
      <TextField
        label="Mobile number"
        name="mobile"
        hint="10-digit Indian mobile number."
        error="Enter a valid 10-digit mobile number."
      />,
    );

    const input = screen.getByLabelText("Mobile number");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "10-digit Indian mobile number. Enter a valid 10-digit mobile number.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid 10-digit mobile number.");
  });

  it("marks required inputs and supports numeric hints", () => {
    render(<TextField label="Email" name="email" type="email" required />);

    const input = screen.getByLabelText("Email *");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("type", "email");
  });
});
