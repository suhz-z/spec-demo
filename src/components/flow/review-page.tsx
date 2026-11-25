"use client";

import Link from "next/link";

import { ArrowRightIcon, CheckoutScenery, PlotThumbnail, ShieldCheckIcon } from "./checkout-art";
import { FlowPageHead } from "./flow-chrome";
import { FLOW_STEPS, flowCrumbs, formatSqFt, type Plot } from "./flow-data";
import { useFlow } from "./flow-provider";
import { FlowShell } from "./flow-shell";

export function ReviewPage({ plot }: { plot: Plot }) {
  const { hydrated, customer } = useFlow();

  if (!hydrated) {
    return (
      <FlowShell step={FLOW_STEPS.review} crumbs={flowCrumbs("review", plot.id)} variant="checkout">
        <CheckoutScenery />
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
      <FlowShell step={FLOW_STEPS.review} crumbs={flowCrumbs("review", plot.id)} variant="checkout">
        <CheckoutScenery />
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
    <FlowShell step={FLOW_STEPS.review} crumbs={flowCrumbs("review", plot.id)} variant="checkout">
      <CheckoutScenery leaves />
      <FlowPageHead
        backHref={`/plots/${plot.id}/details`}
        backLabel="Back to details"
        title="Review and pay"
      />

      <div className="checkout-grid review-checkout-grid">
        <section className="review-booking-card" aria-label="Booking details">
          <span className="checkout-eyebrow">BOOKING DETAILS</span>
          <div className="booking-summary-head">
            <div>
              <h2>Plot {plot.id}</h2>
              <p>
                {plot.area} <span aria-hidden="true">•</span> {formatSqFt(plot.areaSqFt)}
              </p>
              <span className="status available">On request</span>
            </div>
            <PlotThumbnail label={`Illustration of Plot ${plot.id}`} />
          </div>

          <div className="buyer-block">
            <div className="buyer-head">
              <span className="checkout-eyebrow">BUYER DETAILS</span>
              <Link className="checkout-edit" href={`/plots/${plot.id}/details`}>
                Edit details
              </Link>
            </div>
            <p className="buyer-name">{customer.name}</p>
            <p>+91 {customer.mobile}</p>
            <p>{customer.email}</p>
          </div>
        </section>

        <aside className="review-payment-card" aria-label="Payment summary">
          <span className="checkout-eyebrow">PAYMENT SUMMARY</span>
          <div className="payment-rows">
            <div className="payment-row">
              <span>Plot price</span>
              <b>Price on request</b>
            </div>
            <div className="payment-row">
              <span>Booking advance</span>
              <b>To be confirmed</b>
            </div>
            <div className="payment-row">
              <span>Taxes and charges</span>
              <b>As applicable</b>
            </div>
            <div className="payment-row emphasis">
              <span>Pay now</span>
              <b>To be confirmed</b>
            </div>
          </div>

          <Link className="sg-cta checkout-submit" href={`/plots/${plot.id}/payment`}>
            Continue to payment
            <ArrowRightIcon />
          </Link>
          <p className="secure-note">
            <ShieldCheckIcon />
            Your payment is secure and encrypted.
          </p>
        </aside>
      </div>
    </FlowShell>
  );
}
