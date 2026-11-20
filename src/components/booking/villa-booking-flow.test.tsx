import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VillaBookingFlow } from "./villa-booking-flow";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
}));

const HOLD_ID = "10000000-0000-4000-8000-000000000001";
const REFERENCE = "SG-ABCDEF123456";
const summary = {
  code: "V01",
  typeLabel: "4 BHK",
  plotArea: "3,480 sq.ft",
  builtUpArea: "2,900 sq.ft",
  facing: "South",
  statusLabel: "Available",
  priceAmountMinor: null,
  samplePrice: true,
};

function holdResponse(expiresInMs = 600_000) {
  return {
    ok: true,
    status: 201,
    json: async () => ({
      hold: {
        id: HOLD_ID,
        villaCode: "V01",
        expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
        quote: {
          currency: "INR",
          baseAmountMinor: "10000000",
          taxAmountMinor: "500000",
          totalAmountMinor: "10500000",
          taxRateBps: 500,
          taxPolicy: "exclusive",
        },
      },
    }),
  };
}

function statusPayload(overrides: Record<string, unknown> = {}) {
  return {
    status: {
      bookingReference: REFERENCE,
      bookingStatus: "pending_payment",
      villaCode: "V01",
      confirmed: false,
      payment: {
        status: "pending",
        amountMinor: "10500000",
        currency: "INR",
      },
      ...overrides,
    },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

function routeFetch(handlers: Record<string, () => unknown>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    for (const [prefix, handler] of Object.entries(handlers)) {
      if (url.startsWith(prefix)) return handler();
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

async function fillDetails() {
  fireEvent.change(screen.getByLabelText(/full name/i), {
    target: { value: "Asha Menon" },
  });
  fireEvent.change(screen.getByLabelText(/mobile number/i), {
    target: { value: "9876543210" },
  });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: "asha@example.com" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /review payment/i }));
}

describe("VillaBookingFlow", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/villa/V01");
    vi.stubGlobal("crypto", { randomUUID: () => HOLD_ID });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps development fixtures view-only", () => {
    render(<VillaBookingFlow villaCode="V01" enabled={false} />);
    expect(screen.getByText(/development sample is view-only/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hold/i })).not.toBeInTheDocument();
  });

  it("resumes an active server-verified hold without requesting another", async () => {
    const fetchMock = routeFetch({});
    vi.stubGlobal("fetch", fetchMock);
    const initialHold = {
      id: HOLD_ID,
      villaCode: "V01",
      idempotencyKey: HOLD_ID,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      quote: {
        currency: "INR" as const,
        baseAmountMinor: "10000000",
        taxAmountMinor: "500000",
        totalAmountMinor: "10500000",
        taxRateBps: 500,
        taxPolicy: "exclusive" as const,
      },
    };

    render(<VillaBookingFlow villaCode="V01" enabled termsConfigured initialHold={initialHold} />);

    expect(await screen.findByRole("heading", { name: /customer details/i })).toBeInTheDocument();
    expect(screen.getByText("INR 1,05,000.00")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows Your selection with breadcrumbs before requesting a hold", async () => {
    const fetchMock = routeFetch({ "/api/holds": () => holdResponse() });
    vi.stubGlobal("fetch", fetchMock);

    render(<VillaBookingFlow villaCode="V01" enabled termsConfigured summary={summary} />);

    expect(screen.getByRole("heading", { name: /your selection/i })).toBeInTheDocument();
    const progress = screen.getByRole("navigation", { name: /booking progress/i });
    expect(within(progress).getByText("Selection")).toHaveAttribute("aria-current", "step");
    expect(within(progress).getByText(/03 \/ 06/)).toBeInTheDocument();
    expect(screen.getByText("3,480 sq.ft")).toBeInTheDocument();
    expect(screen.getAllByText("To be confirmed").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /proceed to booking/i }));

    expect(await screen.findByRole("heading", { name: /customer details/i })).toBeInTheDocument();
    const updatedProgress = screen.getByRole("navigation", { name: /booking progress/i });
    expect(within(updatedProgress).getByText("Details")).toHaveAttribute("aria-current", "step");
    expect(within(updatedProgress).getByText(/04 \/ 06/)).toBeInTheDocument();
  });

  it("shows the server quote after creating a hold", async () => {
    const fetchMock = routeFetch({ "/api/holds": () => holdResponse() });
    vi.stubGlobal("fetch", fetchMock);

    render(<VillaBookingFlow villaCode="V01" enabled termsConfigured />);
    fireEvent.click(screen.getByRole("button", { name: /request a temporary hold/i }));

    expect(await screen.findByRole("heading", { name: /customer details/i })).toBeInTheDocument();
    expect(screen.getByText("INR 1,05,000.00")).toBeInTheDocument();
    expect(screen.getByText("INR 5,000.00")).toBeInTheDocument();
    expect(screen.getByText(/hold active/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/holds",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ villaCode: "V01", idempotencyKey: HOLD_ID }),
      }),
    );
  });

  it("blocks buyer details until approved terms exist", async () => {
    const fetchMock = routeFetch({ "/api/holds": () => holdResponse() });
    vi.stubGlobal("fetch", fetchMock);

    render(<VillaBookingFlow villaCode="V01" enabled />);
    fireEvent.click(screen.getByRole("button", { name: /request a temporary hold/i }));
    await screen.findByRole("heading", { name: /customer details/i });

    expect(screen.getByText(/approved booking terms are not published/i)).toBeInTheDocument();
    await fillDetails();

    expect(await screen.findByRole("alert")).toHaveTextContent(/your details were not submitted/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("validates buyer fields before calling the server", async () => {
    const fetchMock = routeFetch({ "/api/holds": () => holdResponse() });
    vi.stubGlobal("fetch", fetchMock);

    render(<VillaBookingFlow villaCode="V01" enabled termsConfigured />);
    fireEvent.click(screen.getByRole("button", { name: /request a temporary hold/i }));
    await screen.findByRole("heading", { name: /customer details/i });

    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: "12345" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: /review payment/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/check the highlighted fields/i);
    expect(screen.getByLabelText(/mobile number/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("walks from hold to a server-confirmed booking", async () => {
    const fetchMock = routeFetch({
      "/api/holds": () => holdResponse(),
      "/api/booking-details": () =>
        jsonResponse({ booking: { reference: REFERENCE, status: "pending_payment" } }),
      "/api/payments/orders": () =>
        jsonResponse(
          {
            payment: {
              status: "pending",
              amountMinor: "10500000",
              currency: "INR",
            },
          },
          201,
        ),
      "/api/payments/status": () =>
        jsonResponse(
          statusPayload({
            bookingStatus: "confirmed",
            confirmed: true,
            payment: {
              status: "succeeded",
              amountMinor: "10500000",
              currency: "INR",
            },
          }),
        ),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<VillaBookingFlow villaCode="V01" villaLabel="4 BHK" enabled termsConfigured />);

    fireEvent.click(screen.getByRole("button", { name: /request a temporary hold/i }));
    await screen.findByRole("heading", { name: /customer details/i });
    await fillDetails();

    expect(await screen.findByRole("heading", { name: /review and pay/i })).toBeInTheDocument();
    expect(screen.getByText(/villa v01 · 4 bhk/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));

    expect(await screen.findByRole("heading", { name: /payment is pending/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(REFERENCE))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /check payment status/i }));

    expect(await screen.findByRole("heading", { name: /booking confirmed/i })).toBeInTheDocument();
    expect(screen.getByText(/verified server payment status/i)).toBeInTheDocument();
  });

  it("restores a booking from the reference in the URL", async () => {
    window.history.replaceState(null, "", `/villa/V01?booking=${REFERENCE}`);
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/payments/status": () =>
          jsonResponse(
            statusPayload({
              bookingStatus: "confirmed",
              confirmed: true,
              payment: { status: "succeeded", amountMinor: "10500000", currency: "INR" },
            }),
          ),
      }),
    );

    render(<VillaBookingFlow villaCode="V01" enabled termsConfigured />);

    expect(await screen.findByRole("heading", { name: /booking confirmed/i })).toBeInTheDocument();
    expect(screen.getAllByText(REFERENCE).length).toBeGreaterThan(0);
  });

  it("reports a price change instead of paying", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/holds": () => holdResponse(),
        "/api/booking-details": () => jsonResponse({ booking: { reference: REFERENCE } }),
        "/api/payments/orders": () => jsonResponse({ error: "quote_changed" }, 409),
      }),
    );

    render(<VillaBookingFlow villaCode="V01" enabled termsConfigured />);
    fireEvent.click(screen.getByRole("button", { name: /request a temporary hold/i }));
    await screen.findByRole("heading", { name: /customer details/i });
    await fillDetails();
    await screen.findByRole("heading", { name: /review and pay/i });

    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));

    expect(await screen.findByRole("heading", { name: /the price changed/i })).toBeInTheDocument();
    expect(screen.getByText(/nothing was charged/i)).toBeInTheDocument();
  });

  it("keeps retryable hold requests on the same idempotency key", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);
    render(<VillaBookingFlow villaCode="V01" enabled termsConfigured />);

    fireEvent.click(screen.getByRole("button", { name: /request a temporary hold/i }));
    fireEvent.click(await screen.findByRole("button", { name: /retry hold/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const firstBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    const retryBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(retryBody).toEqual(firstBody);
  });
});
