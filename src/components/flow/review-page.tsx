"use client";

import Link from "next/link";

import { FlowPageHead } from "./flow-chrome";
import { FLOW_STEPS, flowCrumbs, formatSqFt, type Plot } from "./flow-data";
import { useFlow } from "./flow-provider";
import { FlowShell } from "./flow-shell";

export function ReviewPage({ plot }: { plot: Plot }) {
  const { hydrated, customer } = useFlow();

  if (!hydrated) {
    return (
      <FlowShell step={FLOW_STEPS.review} crumbs={flowCrumbs("review", plot.id)}>
        <div className="flow-state-page">
          <div className="state-screen">
            <div className="aside-label">REVIEW</div>
            <h2>Loading your details</h2>
            <p>Reading the details held for this browser session.</p>
          </div>
        </div>
      </FlowShell>
    );
  }

  if (!customer) {
    return (
      <FlowShell step={FLOW_STEPS.review} crumbs={flowCrumbs("review", plot.id)}>
        <div className="flow-state-page">
          <div className="state-screen">
            <div className="state-symbol pending" aria-hidden="true">
              !
            </div>
            <div className="aside-label">DETAILS NEEDED</div>
            <h2>Add your details first</h2>
            <p>
              Customer details are held only for this browser session. Enter them to continue to the
              payment review.
            </p>
            <Link className="booking-primary state-action" href={`/plots/${plot.id}/details`}>
              Add customer details <span aria-hidden="true">↗</span>
            </Link>
            <Link className="text-back" href={`/plots/${plot.id}/summary`}>
              Back to selection
            </Link>
          </div>
        </div>
      </FlowShell>
    );
  }

  return (
    <FlowShell step={FLOW_STEPS.review} crumbs={flowCrumbs("review", plot.id)}>
      <FlowPageHead
        backHref={`/plots/${plot.id}/details`}
        backLabel="Back to details"
        title="Review and pay"
        subtitle={`Plot ${plot.id} · ${plot.area}`}
        aside="Availability is rechecked before payment"
      />

      <div className="flow-review-grid">
        <div className="review-main">
          <div className="review-section">
            <div className="aside-label">PLOT</div>
            <div className="review-row">
              <span>
                Plot {plot.id} · {plot.area} · {formatSqFt(plot.areaSqFt)}
              </span>
              <Link className="plain-edit" href={`/plots`}>
                Change
              </Link>
            </div>
          </div>

          <div className="review-section">
            <div className="aside-label">BUYER</div>
            <div className="review-row">
              <span>{customer.name}</span>
            </div>
            <div className="review-row">
              <span>+91 {customer.mobile}</span>
            </div>
            <div className="review-row">
              <span>{customer.email}</span>
            </div>
            <Link className="plain-edit review-edit" href={`/plots/${plot.id}/details`}>
              Edit details
            </Link>
          </div>

          <p className="form-note">
            The payment step in this prototype does not contact a payment provider.
          </p>
        </div>

        <aside className="review-payment">
          <div className="aside-label">PAYMENT SUMMARY</div>
          <div className="aside-row">
            <span>Plot price</span>
            <b>Price on request</b>
          </div>
          <div className="aside-row">
            <span>Booking advance</span>
            <b>To be confirmed</b>
          </div>
          <div className="aside-row">
            <span>Taxes and charges</span>
            <b>As applicable</b>
          </div>
          <div className="aside-row emphasis">
            <span>Pay now to book</span>
            <b>To be confirmed</b>
          </div>
          <div className="aside-row">
            <span>Remaining balance</span>
            <b>To be confirmed</b>
          </div>
          <p className="payment-note">
            Availability is checked again before payment. No amount is collected in this preview.
          </p>
          <Link className="booking-primary" href={`/plots/${plot.id}/payment`}>
            Continue to payment <span aria-hidden="true">↗</span>
          </Link>
          <p className="prototype-note">Preview only. No payment will be collected.</p>
        </aside>
      </div>
    </FlowShell>
  );
}
