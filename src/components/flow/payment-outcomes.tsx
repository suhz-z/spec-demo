"use client";

import Link from "next/link";
import { useState } from "react";

import { FlowPageHead } from "./flow-chrome";
import { FLOW_STEPS, PLOTS, flowCrumbs, type Plot } from "./flow-data";
import { FlowShell } from "./flow-shell";

export function PaymentPendingPage({ plot }: { plot: Plot }) {
  const [feedback, setFeedback] = useState("");

  return (
    <FlowShell step={FLOW_STEPS.outcome} crumbs={flowCrumbs("payment/pending", plot.id)}>
      <FlowPageHead
        backHref={`/plots/${plot.id}/payment`}
        backLabel="Back to payment"
        title="Payment pending"
        subtitle={`Plot ${plot.id} · ${plot.area}`}
      />

      <div className="flow-state-page">
        <div className="state-screen">
          <div className="state-symbol pending" aria-hidden="true">
            ◷
          </div>
          <div className="aside-label">PAYMENT PENDING</div>
          <h2>Payment is pending</h2>
          <p>The payment provider has not confirmed this transaction yet. Do not pay again.</p>
          <p className="state-reference">Plot {plot.id}</p>
          <button
            type="button"
            className="booking-primary state-action"
            onClick={() =>
              setFeedback(
                "Status updates are unavailable right now.",
              )
            }
          >
            Check status
          </button>
          {feedback ? (
            <p className="state-feedback" role="status">
              {feedback}
            </p>
          ) : null}
          <div className="flow-state-links">
            <Link className="text-back" href={`/plots/${plot.id}/payment`}>
              Back to payment
            </Link>
            <Link className="text-back" href="/plots">
              Choose another plot
            </Link>
          </div>
        </div>
      </div>
    </FlowShell>
  );
}

export function PaymentFailedPage({ plot }: { plot: Plot }) {
  return (
    <FlowShell step={FLOW_STEPS.outcome} crumbs={flowCrumbs("payment/failed", plot.id)}>
      <FlowPageHead
        backHref={`/plots/${plot.id}/payment`}
        backLabel="Back to payment"
        title="Payment failed"
        subtitle={`Plot ${plot.id} · ${plot.area}`}
      />

      <div className="flow-state-page">
        <div className="state-screen">
          <div className="state-symbol failed" aria-hidden="true">
            ×
          </div>
          <div className="aside-label">PAYMENT FAILED</div>
          <h2>Payment didn&apos;t go through</h2>
          <p>
            No booking has been created. You can return to payment review or choose another plot.
          </p>
          <p className="state-reference">Plot {plot.id}</p>
          <Link className="booking-primary state-action" href={`/plots/${plot.id}/payment`}>
            Try payment again <span aria-hidden="true">↗</span>
          </Link>
          <div className="flow-state-links">
            <Link className="text-back" href={`/plots/${plot.id}/review`}>
              Back to review
            </Link>
            <Link className="text-back" href="/plots">
              Choose another plot
            </Link>
          </div>
        </div>
      </div>
    </FlowShell>
  );
}

export function PlotTakenPage({ plot }: { plot: Plot }) {
  const alternatives = PLOTS.filter((candidate) => candidate.id !== plot.id);

  return (
    <FlowShell step={FLOW_STEPS.outcome} crumbs={flowCrumbs("payment/taken", plot.id)}>
      <FlowPageHead
        backHref={`/plots/${plot.id}/payment`}
        backLabel="Back to payment"
        title="Availability changed"
        subtitle={`Plot ${plot.id} · ${plot.area}`}
      />

      <div className="flow-state-page">
        <div className="state-screen">
          <div className="state-symbol pending" aria-hidden="true">
            !
          </div>
          <div className="aside-label">PLOT UNAVAILABLE</div>
          <h2>Plot {plot.id} is no longer available</h2>
          <p>
            Availability changed before payment completed. Choose another plot to continue.
          </p>
          <div className="similar-villas" aria-label="Other plots">
            {alternatives.map((alternative) => (
              <Link key={alternative.id} href={`/plots/${alternative.id}`}>
                Plot {alternative.id}
              </Link>
            ))}
          </div>
          <Link className="booking-primary state-action" href="/plots">
            Back to the site plan <span aria-hidden="true">↗</span>
          </Link>
          <div className="flow-state-links">
            <Link className="text-back" href={`/plots/${plot.id}/payment`}>
              Back to payment
            </Link>
          </div>
        </div>
      </div>
    </FlowShell>
  );
}
