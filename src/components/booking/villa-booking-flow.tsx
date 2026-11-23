"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

type HoldQuote = {
  currency: "INR";
  baseAmountMinor: string;
  taxAmountMinor: string;
  totalAmountMinor: string;
  taxRateBps: number;
  taxPolicy: "inclusive" | "exclusive" | "none";
};

type Hold = {
  id: string;
  villaCode: string;
  expiresAt: string;
  /** Present only for a server-verified resumed hold. */
  idempotencyKey?: string;
  quote: HoldQuote;
};

type Buyer = { fullName: string; mobile: string; email: string };
type Booking = { reference: string; status: string };
type PaymentInfo = { status: string; amountMinor: string; currency: string };
type StatusView = {
  bookingReference: string;
  bookingStatus: string;
  villaCode: string;
  confirmed: boolean;
  payment: PaymentInfo | null;
};

type HoldState = "idle" | "pending" | "retry" | "unavailable" | "error" | "held" | "expired";

type Step =
  | "selection"
  | "hold"
  | "details"
  | "review"
  | "processing"
  | "pending"
  | "failed"
  | "cancelled"
  | "unknown"
  | "taken"
  | "confirmed"
  | "resume_missing";

type FieldErrors = {
  name?: string;
  mobile?: string;
  email?: string;
  terms?: string;
};

type VillaSummary = {
  code: string;
  typeLabel: string;
  plotArea: string;
  builtUpArea: string;
  facing: string;
  statusLabel: string;
  priceAmountMinor: string | null;
  samplePrice: boolean;
};

type VillaBookingFlowProps = {
  villaCode: string;
  enabled: boolean;
  /** Server-provided facts for the "Your selection" screen. */
  summary?: VillaSummary | null;
  /** Approved terms gate buyer-detail submission (D-14). */
  termsConfigured?: boolean;
  /** Development/test builds may expose the signed sandbox outcome preview. */
  development?: boolean;
  villaLabel?: string;
  /** The visitor's own active hold, restored from the server after a reload. */
  initialHold?: Hold | null;
  /** Explanation shown when booking is not available on this villa. */
  disabledReason?: string;
};

function formatRupees(amountMinor: string): string {
  const amount = BigInt(amountMinor);
  const rupees = amount / 100n;
  const paise = (amount % 100n).toString().padStart(2, "0");
  return `INR ${new Intl.NumberFormat("en-IN").format(rupees)}.${paise}`;
}

function classifyStatus(view: StatusView): Step {
  if (
    view.confirmed ||
    view.bookingStatus === "confirmed" ||
    view.bookingStatus === "refund_pending" ||
    view.bookingStatus === "refunded"
  ) {
    return "confirmed";
  }
  if (view.bookingStatus === "payment_failed" || view.payment?.status === "failed") return "failed";
  if (view.bookingStatus === "cancelled" || view.payment?.status === "cancelled") {
    return "cancelled";
  }
  if (view.payment?.status === "unknown") return "unknown";
  return "pending";
}

type Crumb = { label: string; href?: string; current?: boolean };

const STEP_NUMBER: Record<Step, string> = {
  selection: "03",
  hold: "03",
  details: "04",
  review: "05",
  processing: "05",
  pending: "05",
  failed: "05",
  cancelled: "05",
  unknown: "05",
  taken: "05",
  confirmed: "06",
  resume_missing: "—",
};

function breadcrumbsFor(step: Step, villaCode: string): Crumb[] {
  const base: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Plots", href: "/#villa-map" },
    { label: "Site plan", href: `/villa/${encodeURIComponent(villaCode)}` },
  ];
  if (step === "selection" || step === "hold") {
    return [...base, { label: "Selection", current: true }];
  }
  if (step === "taken") {
    return [...base, { label: "Unavailable", current: true }];
  }
  if (step === "resume_missing") {
    return [...base, { label: "Booking not found", current: true }];
  }
  const journey: Crumb[] = [...base, { label: "Selection" }];
  if (step === "details") return [...journey, { label: "Details", current: true }];
  journey.push({ label: "Details" });
  if (step === "review") return [...journey, { label: "Review", current: true }];
  journey.push({ label: "Review" });
  if (step === "confirmed") return [...journey, { label: "Confirmation", current: true }];
  return [...journey, { label: "Payment", current: true }];
}

function JourneyBreadcrumbs({ crumbs, stepNumber }: { crumbs: Crumb[]; stepNumber: string }) {
  return (
    <nav className="sg-journey-breadcrumbs" aria-label="Booking progress">
      <ol>
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`}>
            {index > 0 ? (
              <span className="sg-journey-breadcrumbs__separator" aria-hidden="true">
                /
              </span>
            ) : null}
            {crumb.current ? (
              <span aria-current="step">{crumb.label}</span>
            ) : crumb.href ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <span>{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
      <span className="sg-journey-breadcrumbs__step">{stepNumber} / 06</span>
    </nav>
  );
}

function persistReference(reference: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("booking", reference);
  window.history.replaceState(null, "", url.toString());
}

async function fetchStatus(reference: string): Promise<StatusView | null> {
  try {
    const response = await fetch(
      `/api/payments/status?reference=${encodeURIComponent(reference)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return (payload?.status as StatusView | undefined) ?? null;
  } catch {
    return null;
  }
}

export function VillaBookingFlow({
  villaCode,
  enabled,
  termsConfigured = false,
  development = false,
  villaLabel,
  summary = null,
  initialHold = null,
  disabledReason,
}: VillaBookingFlowProps) {
  const searchParams = useSearchParams();
  // Read once on mount. persistReference() writes ?booking=... into the URL
  // when payment starts; that must not re-trigger the "resume" effect mid-flow.
  const [resumeReference] = useState(() => searchParams.get("booking"));

  const [step, setStep] = useState<Step>(
    initialHold ? "details" : resumeReference || !summary ? "hold" : "selection",
  );
  const [holdState, setHoldState] = useState<HoldState>(initialHold ? "held" : "idle");
  const [hold, setHold] = useState<Hold | null>(initialHold);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [statusView, setStatusView] = useState<StatusView | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [takenReason, setTakenReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(() => Boolean(resumeReference));

  const holdKey = useRef<string | null>(initialHold?.idempotencyKey ?? null);
  const paymentKey = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const holdActive = step === "hold" || step === "details" || step === "review";

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!hold || !holdActive) return;

    const updateRemaining = () => {
      const left = Math.max(0, Math.ceil((Date.parse(hold.expiresAt) - Date.now()) / 1_000));
      setSecondsLeft(left);
      if (left === 0) {
        setHoldState("expired");
        if (step === "details" || step === "review") {
          setTakenReason("hold_expired");
          setStep("taken");
        }
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1_000);
    return () => window.clearInterval(timer);
  }, [hold, holdActive, step]);

  useEffect(() => {
    if (!resumeReference) return;

    let cancelled = false;
    void fetchStatus(resumeReference).then((view) => {
      if (cancelled) return;
      setResuming(false);
      if (!view) {
        setStep("resume_missing");
        return;
      }
      setBooking({ reference: view.bookingReference, status: view.bookingStatus });
      setStatusView(view);
      if (view.payment) setPayment(view.payment);
      setStep(classifyStatus(view));
    });

    return () => {
      cancelled = true;
    };
  }, [resumeReference]);

  async function requestHold() {
    if (!holdKey.current) holdKey.current = crypto.randomUUID();
    setHoldState("pending");
    setStep("hold");
    try {
      const response = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ villaCode, idempotencyKey: holdKey.current }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setHoldState(
          payload?.error === "idempotency_expired"
            ? "expired"
            : response.status === 409
              ? "unavailable"
              : "error",
        );
        if (response.status !== 503) holdKey.current = null;
        return;
      }
      const nextHold = payload?.hold as Hold | undefined;
      if (!nextHold) {
        setHoldState("error");
        return;
      }
      holdKey.current = null;
      const left = Math.max(0, Math.ceil((Date.parse(nextHold.expiresAt) - Date.now()) / 1_000));
      if (left === 0) {
        setHoldState("expired");
        return;
      }
      setHold(nextHold);
      setSecondsLeft(left);
      setHoldState("held");
      setStep("details");
    } catch {
      setHoldState("retry");
    }
  }

  async function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hold || submitting) return;

    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const mobile = String(form.get("mobile") ?? "").trim();
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const acceptedTerms = form.get("acceptedTerms") === "on";

    const errors: FieldErrors = {};
    if (fullName.length < 2) {
      errors.name = "Enter the full name as it should appear on the booking.";
    }
    if (!/^[6-9][0-9]{9}$/.test(mobile)) {
      errors.mobile = "Enter a 10-digit mobile number starting with 6–9.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (!acceptedTerms) {
      errors.terms = "Accept the booking terms to continue.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setDetailsError("Check the highlighted fields. No details were submitted.");
      return;
    }
    setDetailsError(null);

    if (!termsConfigured) {
      setDetailsError(
        "Approved booking terms are not published yet. Your details were not submitted and no booking was created.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/booking-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdId: hold.id,
          fullName,
          mobile,
          email,
          acceptedTerms: true,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 409) {
          setTakenReason("hold_expired");
          setStep("taken");
          return;
        }
        if (payload?.error === "booking_terms_pending_approval") {
          setDetailsError(
            "Approved booking terms are not published yet. Your details were not submitted.",
          );
          return;
        }
        setDetailsError("We could not save your details. Please try again.");
        return;
      }
      const reference = payload?.booking?.reference as string | undefined;
      if (!reference) {
        setDetailsError("We could not confirm a booking reference. Please retry.");
        return;
      }
      const nextBuyer = { fullName, mobile, email };
      setBuyer(nextBuyer);
      setBooking({ reference, status: "pending_payment" });
      setFieldErrors({});
      setStep("review");
      persistReference(reference);
    } catch {
      setDetailsError("We could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function startPayment(referenceOverride?: string) {
    const reference = referenceOverride ?? booking?.reference;
    if (!reference) return;
    if (!paymentKey.current) paymentKey.current = crypto.randomUUID();

    setPaymentError(null);
    setStep("processing");
    try {
      const response = await fetch("/api/payments/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingReference: reference, idempotencyKey: paymentKey.current }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const error = payload?.error as string | undefined;
        if (response.status === 409) {
          if (error === "invalid_state") {
            const view = await fetchStatus(reference);
            if (view) {
              setBooking({ reference: view.bookingReference, status: view.bookingStatus });
              setStatusView(view);
              if (view.payment) setPayment(view.payment);
              setStep(classifyStatus(view));
              return;
            }
          }
          setTakenReason(
            error === "quote_changed"
              ? "quote_changed"
              : error === "hold_expired"
                ? "hold_expired"
                : "unavailable",
          );
          setStep("taken");
          paymentKey.current = null;
          return;
        }
        setPaymentError(
          "The payment service is unavailable. No payment was taken. You can retry safely.",
        );
        setStep("pending");
        return;
      }
      const nextPayment = payload?.payment as
        { status: string; amountMinor: string; currency: string } | undefined;
      if (nextPayment) {
        setPayment({
          status: nextPayment.status,
          amountMinor: nextPayment.amountMinor,
          currency: nextPayment.currency,
        });
      }
      setBooking({ reference, status: "pending_payment" });
      setStep("pending");
      persistReference(reference);
    } catch {
      setPaymentError(
        "We could not reach the payment service. No payment was taken. You can retry safely.",
      );
      setStep("pending");
    }
  }

  async function syncStatus() {
    const reference = booking?.reference;
    if (!reference) return;
    setPaymentError(null);
    const view = await fetchStatus(reference);
    if (!view) {
      setPaymentError("We could not check the payment status. Please retry.");
      return;
    }
    setStatusView(view);
    if (view.payment) setPayment(view.payment);
    setStep(classifyStatus(view));
  }

  async function previewOutcome(outcome: "succeeded" | "pending" | "failed" | "cancelled") {
    const reference = booking?.reference;
    if (!reference) return;
    setPaymentError(null);
    try {
      const response = await fetch("/api/payments/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingReference: reference, outcome }),
      });
      if (!response.ok) {
        setPaymentError("The development outcome could not be applied.");
        return;
      }
      await syncStatus();
    } catch {
      setPaymentError("The development outcome could not be applied.");
    }
  }

  function downloadSummary() {
    const reference = statusView?.bookingReference ?? booking?.reference ?? "unknown";
    const lines = [
      "Spectra Gardens — booking summary (not a payment receipt)",
      `Reference: ${reference}`,
      `Villa: ${villaCode}`,
      `Booking status: ${statusView?.bookingStatus ?? booking?.status ?? "unknown"}`,
      `Payment status: ${statusView?.payment?.status ?? payment?.status ?? "unknown"}`,
      payment ? `Amount: ${formatRupees(payment.amountMinor)}` : "Amount: unavailable",
      "Receipt delivery is not configured. This summary is not proof of payment.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spectra-gardens-${reference}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const stepHeading: Record<Step, string> = {
    selection: "Your selection",
    hold: "Booking hold",
    details: "Customer details",
    review: "Review and pay",
    processing: "Preparing payment",
    pending: "Payment is pending",
    failed: "Payment didn't go through",
    cancelled: "Payment was cancelled",
    unknown: "Payment status is unconfirmed",
    taken:
      takenReason === "hold_expired"
        ? "Your hold expired"
        : takenReason === "quote_changed"
          ? "The price changed"
          : "This villa is no longer available",
    confirmed: "Booking confirmed",
    resume_missing: "Booking not found",
  };

  if (!enabled) {
    return (
      <section className="sg-hold-panel" aria-labelledby="hold-title">
        <h2 id="hold-title">Booking hold</h2>
        <p>
          {disabledReason ??
            "Temporary holds are available only for published inventory. This development sample is view-only."}
        </p>
      </section>
    );
  }

  if (resuming) {
    return (
      <section className="sg-hold-panel" aria-labelledby="resume-title">
        <h2 id="resume-title" ref={headingRef} tabIndex={-1}>
          Restoring your booking
        </h2>
        <p role="status">Checking the latest server-side booking and payment status…</p>
      </section>
    );
  }

  const quote = hold?.quote ?? null;
  const total = quote ? formatRupees(quote.totalAmountMinor) : null;
  const paymentTotal = payment ? formatRupees(payment.amountMinor) : null;

  return (
    <section className="sg-hold-panel" aria-labelledby="booking-step-title">
      <JourneyBreadcrumbs crumbs={breadcrumbsFor(step, villaCode)} stepNumber={STEP_NUMBER[step]} />
      <h2 id="booking-step-title" ref={headingRef} tabIndex={-1}>
        {stepHeading[step]}
      </h2>

      {step === "selection" && summary && (
        <div className="sg-selection">
          <p className="sg-eyebrow">Selected villa</p>
          <h3 className="sg-selection__title">Villa {summary.code}</h3>
          <p className="sg-selection__type">{summary.typeLabel}</p>
          <dl className="sg-selection__facts">
            <div>
              <dt>Plot area</dt>
              <dd>{summary.plotArea}</dd>
            </div>
            <div>
              <dt>Built-up area</dt>
              <dd>{summary.builtUpArea}</dd>
            </div>
            <div>
              <dt>Facing</dt>
              <dd>{summary.facing}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>{summary.statusLabel}</dd>
            </div>
          </dl>
          <div className="sg-selection__price">
            <span>Total property price</span>
            <strong>
              {summary.samplePrice || !summary.priceAmountMinor
                ? "To be confirmed"
                : formatRupees(summary.priceAmountMinor)}
            </strong>
          </div>
          <dl className="sg-selection__breakdown">
            <div>
              <dt>Taxes and charges</dt>
              <dd>To be confirmed</dd>
            </div>
            <div>
              <dt>Booking advance</dt>
              <dd>To be confirmed</dd>
            </div>
            <div>
              <dt>Remaining balance</dt>
              <dd>To be confirmed</dd>
            </div>
          </dl>
          <details className="sg-selection__terms">
            <summary>Cancellation and refund terms</summary>
            <p>Policy details will be provided by Spectra Gardens before payment.</p>
          </details>
          {holdState === "unavailable" ? (
            <p className="sg-form-error" role="status">
              This villa cannot be held right now. Refresh availability to check its current status.
            </p>
          ) : null}
          <div className="sg-selection__actions">
            <button
              className="sg-button sg-button--primary"
              disabled={holdState === "pending" || holdState === "unavailable"}
              onClick={requestHold}
              type="button"
            >
              {holdState === "pending"
                ? "Checking availability…"
                : holdState === "retry" || holdState === "error"
                  ? "Retry booking request"
                  : "Proceed to booking"}
              <span aria-hidden="true">↗</span>
            </button>
            <Link className="sg-text-link" href="/#villa-map">
              Edit selection
            </Link>
          </div>
          <p className="sg-selection__note">
            Taxes, booking amount, payment schedule, and refund terms await client approval. No
            payment is collected on this screen.
          </p>
        </div>
      )}

      {holdActive && hold && (
        <p className="sg-hold-panel__countdown" role="timer" aria-live="off">
          Hold active · {minutes}:{seconds.toString().padStart(2, "0")} remaining
        </p>
      )}

      {step === "hold" && (
        <>
          {holdState === "unavailable" && (
            <p role="status">
              This villa cannot be held right now. Refresh availability to check its current status.
            </p>
          )}
          {holdState === "retry" && (
            <p role="status">
              The request could not be confirmed. Retry safely to check the same hold request.
            </p>
          )}
          {holdState === "error" && (
            <p role="status">A current price is unavailable. Please try again later.</p>
          )}
          {holdState === "expired" && (
            <p role="status">This hold has expired. Request a new hold to continue.</p>
          )}
          <p>
            Request a temporary hold using the current server price. The configured duration appears
            after the server confirms your hold.
          </p>
          {holdState === "unavailable" ? (
            <button
              type="button"
              className="sg-button sg-button--secondary"
              onClick={() => window.location.reload()}
            >
              Refresh availability
            </button>
          ) : (
            <button
              type="button"
              className="sg-button sg-button--primary"
              onClick={requestHold}
              disabled={holdState === "pending"}
            >
              {holdState === "pending"
                ? "Creating hold…"
                : holdState === "retry" || holdState === "error"
                  ? "Retry hold"
                  : "Request a temporary hold"}
            </button>
          )}
        </>
      )}

      {step === "details" && hold && quote && (
        <div className="sg-booking-grid">
          <form className="sg-booking-form" onSubmit={submitDetails} noValidate>
            {!termsConfigured && (
              <p className="sg-approval-note" role="status">
                Preview only. Approved booking terms are not published, so buyer details cannot be
                submitted and no booking will be created.
              </p>
            )}
            {detailsError && (
              <p className="sg-form-error" role="alert">
                {detailsError}
              </p>
            )}

            <label className="sg-field">
              <span>Full name</span>
              <input
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Name as on ID"
                defaultValue={buyer?.fullName ?? ""}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "error-name" : undefined}
                required
              />
              {fieldErrors.name && (
                <em id="error-name" className="sg-field-error">
                  {fieldErrors.name}
                </em>
              )}
            </label>

            <label className="sg-field">
              <span>Mobile number</span>
              <span className="sg-phone-field">
                <span aria-hidden="true">+91</span>
                <input
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  defaultValue={buyer?.mobile ?? ""}
                  aria-invalid={Boolean(fieldErrors.mobile)}
                  aria-describedby={fieldErrors.mobile ? "error-mobile" : undefined}
                  required
                />
              </span>
              {fieldErrors.mobile && (
                <em id="error-mobile" className="sg-field-error">
                  {fieldErrors.mobile}
                </em>
              )}
            </label>

            <label className="sg-field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                defaultValue={buyer?.email ?? ""}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "error-email" : undefined}
                required
              />
              {fieldErrors.email && (
                <em id="error-email" className="sg-field-error">
                  {fieldErrors.email}
                </em>
              )}
            </label>

            <label className="sg-terms-check">
              <input
                name="acceptedTerms"
                type="checkbox"
                aria-invalid={Boolean(fieldErrors.terms)}
                aria-describedby={fieldErrors.terms ? "error-terms" : undefined}
              />
              <span>
                I accept the booking terms and conditions. Approved terms are not published yet.
              </span>
            </label>
            {fieldErrors.terms && (
              <em id="error-terms" className="sg-field-error">
                {fieldErrors.terms}
              </em>
            )}

            <button type="submit" className="sg-button sg-button--primary" disabled={submitting}>
              {submitting ? "Saving details…" : "Review payment"}
            </button>
            <p className="sg-form-note">
              Hold duration is shown above. Server time and the current price remain authoritative.
            </p>
          </form>

          <aside className="sg-booking-aside" aria-label="Your selection">
            <div className="sg-aside-label">YOUR SELECTION</div>
            <h3>
              Villa {villaCode}
              {villaLabel ? ` · ${villaLabel}` : ""}
            </h3>
            <div className="sg-aside-row">
              <span>
                {quote.taxPolicy === "inclusive" ? "Price including tax" : "Price before tax"}
              </span>
              <b>{formatRupees(quote.baseAmountMinor)}</b>
            </div>
            <div className="sg-aside-row">
              <span>Tax amount</span>
              <b>{formatRupees(quote.taxAmountMinor)}</b>
            </div>
            <div className="sg-aside-row sg-aside-row--emphasis">
              <span>Quoted total</span>
              <b>{total}</b>
            </div>
            <p className="sg-form-note">
              {development
                ? "Development sample amount. Not an approved production price."
                : "Server-calculated quote for this hold."}
            </p>
          </aside>
        </div>
      )}

      {step === "review" && booking && (
        <div className="sg-review-grid">
          <div>
            <div className="sg-review-section">
              <div className="sg-aside-label">VILLA</div>
              <div className="sg-review-row">
                <span>
                  Villa {villaCode}
                  {villaLabel ? ` · ${villaLabel}` : ""}
                </span>
              </div>
            </div>
            <div className="sg-review-section">
              <div className="sg-aside-label">BUYER</div>
              <div className="sg-review-row">
                <span>{buyer?.fullName ?? "Saved with this booking"}</span>
              </div>
              <div className="sg-review-row">
                <span>{buyer ? `+91 ${buyer.mobile}` : "Mobile saved"}</span>
              </div>
              <div className="sg-review-row">
                <span>{buyer?.email ?? "Email saved"}</span>
              </div>
              <button type="button" className="sg-text-link" onClick={() => setStep("details")}>
                Edit details
              </button>
            </div>
          </div>
          <aside className="sg-review-payment" aria-label="Payment summary">
            <div className="sg-aside-label">PAYMENT SUMMARY</div>
            {quote && (
              <>
                <div className="sg-aside-row">
                  <span>Property price</span>
                  <b>{formatRupees(quote.baseAmountMinor)}</b>
                </div>
                <div className="sg-aside-row">
                  <span>Taxes and charges</span>
                  <b>{formatRupees(quote.taxAmountMinor)}</b>
                </div>
                <div className="sg-aside-row sg-aside-row--emphasis">
                  <span>Server quoted total</span>
                  <b>{total}</b>
                </div>
              </>
            )}
            <div className="sg-aside-row">
              <span>Booking advance</span>
              <b>To be confirmed</b>
            </div>
            <div className="sg-aside-row">
              <span>Remaining balance</span>
              <b>To be confirmed</b>
            </div>
            <p className="sg-form-note">
              Availability and price are checked again on the server before payment.{" "}
              {development
                ? "This development amount is not an approved production price."
                : "Payment schedules remain pending approval."}
            </p>
            <button
              type="button"
              className="sg-button sg-button--primary"
              onClick={() => startPayment()}
            >
              Continue to payment
            </button>
            <p className="sg-form-note">
              Reference {booking.reference}. No live payment is collected while the sandbox provider
              is active.
            </p>
          </aside>
        </div>
      )}

      {step === "processing" && (
        <p role="status">
          Rechecking availability and price with the server, then creating a payment order…
        </p>
      )}

      {step === "pending" && (
        <>
          <p>
            The payment provider has not confirmed this transaction yet. Do not pay again. Booking
            reference: {booking?.reference ?? "unavailable"}.
          </p>
          {paymentTotal && (
            <p className="sg-payment-amount">
              Payment amount <b>{paymentTotal}</b>
            </p>
          )}
          {paymentError && (
            <p className="sg-form-error" role="alert">
              {paymentError}
            </p>
          )}
          <div className="sg-state-actions">
            <button type="button" className="sg-button sg-button--primary" onClick={syncStatus}>
              Check payment status
            </button>
            {paymentError && (
              <button
                type="button"
                className="sg-button sg-button--secondary"
                onClick={() => startPayment()}
              >
                Retry payment order
              </button>
            )}
          </div>

          {development && (
            <details className="sg-demo-outcomes">
              <summary>Preview a payment outcome</summary>
              <p>
                Development only. Each choice creates a signed sandbox webhook and runs the real
                server verification path. No payment will be collected.
              </p>
              <div className="sg-outcome-actions">
                <button type="button" onClick={() => previewOutcome("succeeded")}>
                  Successful payment
                </button>
                <button type="button" onClick={() => previewOutcome("pending")}>
                  Payment pending
                </button>
                <button type="button" onClick={() => previewOutcome("failed")}>
                  Payment failed
                </button>
                <button type="button" onClick={() => previewOutcome("cancelled")}>
                  Payment cancelled
                </button>
              </div>
            </details>
          )}
        </>
      )}

      {step === "failed" && (
        <>
          <p>
            No booking is confirmed. You can try payment again or choose another villa. Reference:{" "}
            {booking?.reference ?? "unavailable"}.
          </p>
          {paymentTotal && (
            <p className="sg-payment-amount">
              Attempted amount <b>{paymentTotal}</b>
            </p>
          )}
          <div className="sg-state-actions">
            <button
              type="button"
              className="sg-button sg-button--primary"
              onClick={() => {
                paymentKey.current = null;
                void startPayment();
              }}
            >
              Try payment again
            </button>
            <Link className="sg-button sg-button--secondary" href="/#villa-map">
              Choose another villa
            </Link>
          </div>
        </>
      )}

      {step === "cancelled" && (
        <>
          <p>
            The payment was cancelled and no booking is confirmed. Reference:{" "}
            {booking?.reference ?? "unavailable"}.
          </p>
          <div className="sg-state-actions">
            <Link className="sg-button sg-button--primary" href="/#villa-map">
              Choose another villa
            </Link>
            <button type="button" className="sg-button sg-button--secondary" onClick={syncStatus}>
              Check payment status
            </button>
          </div>
        </>
      )}

      {step === "unknown" && (
        <>
          <p>
            The payment outcome is unconfirmed. Do not pay again. Check the server status before
            taking another action. Reference: {booking?.reference ?? "unavailable"}.
          </p>
          <div className="sg-state-actions">
            <button type="button" className="sg-button sg-button--primary" onClick={syncStatus}>
              Check payment status
            </button>
            <Link className="sg-button sg-button--secondary" href="/#villa-map">
              Back to master plan
            </Link>
          </div>
        </>
      )}

      {step === "taken" && (
        <>
          <p>
            {takenReason === "quote_changed"
              ? "The server price changed before payment. Nothing was charged. Review current availability and start again."
              : takenReason === "hold_expired"
                ? "The temporary hold expired before the booking completed. Nothing was charged. Choose another available villa to continue."
                : "Another session completed a booking for this villa. Nothing was charged. Choose another available villa to continue."}
          </p>
          <div className="sg-state-actions">
            <Link className="sg-button sg-button--primary" href="/#villa-map">
              Check availability
            </Link>
            <button
              type="button"
              className="sg-button sg-button--secondary"
              onClick={() => window.location.reload()}
            >
              Refresh this villa
            </button>
          </div>
        </>
      )}

      {step === "confirmed" && (
        <>
          <p>
            Booking <b>{statusView?.bookingReference ?? booking?.reference}</b> is confirmed by the
            verified server payment status.
          </p>
          {statusView?.bookingStatus === "refund_pending" && (
            <p role="status">
              A refund request is under review. Refunds are not automatic and remain subject to
              approval.
            </p>
          )}
          <div className="sg-confirmation-data">
            <div className="sg-aside-row">
              <span>Villa</span>
              <b>{villaCode}</b>
            </div>
            <div className="sg-aside-row">
              <span>Buyer</span>
              <b>{buyer?.fullName ?? "Saved with this booking"}</b>
            </div>
            <div className="sg-aside-row">
              <span>Reference</span>
              <b>{statusView?.bookingReference ?? booking?.reference}</b>
            </div>
            <div className="sg-aside-row">
              <span>Payment</span>
              <b>{statusView?.payment?.status ?? payment?.status ?? "confirmed"}</b>
            </div>
            {paymentTotal && (
              <div className="sg-aside-row">
                <span>Amount</span>
                <b>{paymentTotal}</b>
              </div>
            )}
          </div>
          <div className="sg-state-actions">
            <button
              type="button"
              className="sg-button sg-button--primary"
              onClick={downloadSummary}
            >
              Download booking summary
            </button>
            <Link className="sg-button sg-button--secondary" href="/#villa-map">
              Done
            </Link>
          </div>
          <p className="sg-form-note">
            This summary is not a payment receipt. Receipt delivery is not configured.
          </p>
        </>
      )}

      {step === "resume_missing" && (
        <>
          <p>
            We could not find a booking for this session. Start a new hold from the master plan.
          </p>
          <Link className="sg-button sg-button--primary" href="/#villa-map">
            Back to master plan
          </Link>
        </>
      )}

      {step !== "hold" && step !== "resume_missing" && (
        <p className="sg-form-note">
          <Link className="sg-text-link" href="/#villa-map">
            Back to master plan
          </Link>
        </p>
      )}
    </section>
  );
}
