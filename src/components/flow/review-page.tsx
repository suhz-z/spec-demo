"use client";

import Link from "next/link";

import { AssetSitePlan } from "@/components/inventory/asset-site-plan";

import { ArrowRightIcon, CheckoutScenery, SelectionWave } from "./checkout-art";
import { FlowPageHead } from "./flow-chrome";
import {
  FLOW_STEPS,
  flowCrumbs,
  formatRupees,
  formatSqFt,
  getDemoPlotPricing,
  type Plot,
} from "./flow-data";
import { useFlow } from "./flow-provider";
import { FlowShell } from "./flow-shell";

export function ReviewPage({ plot }: { plot: Plot }) {
  const { hydrated, customer } = useFlow();
  const pricing = getDemoPlotPricing(plot.id);

  if (!hydrated) {
    return (
      <FlowShell step={FLOW_STEPS.review} crumbs={flowCrumbs("review", plot.id)} variant="checkout">
        <CheckoutScenery />
        <FlowPageHead
          backHref={`/plots/${plot.id}/details`}
          backLabel="Back to details"
          title="Review and pay"
        />
        <div className="flow-state-page">
          <div className="review-recovery-card">
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
        <FlowPageHead
          backHref={`/plots/${plot.id}/summary`}
          backLabel="Back to selection"
          title="Review and pay"
        />
        <div className="flow-state-page">
          <div className="review-recovery-card">
            <div className="state-symbol pending" aria-hidden="true">
              !
            </div>
            <div className="aside-label">DETAILS NEEDED</div>
            <h2>Add your details first</h2>
            <p>
              Customer details are held only for this browser session. Enter them to continue to the
              payment review.
            </p>
            <Link className="sg-cta booking-primary state-action" href={`/plots/${plot.id}/details`}>
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
      <CheckoutScenery />
      <FlowPageHead
        backHref={`/plots/${plot.id}/details`}
        backLabel="Back to details"
        title="Review and pay"
      />

      <div className="checkout-grid review-checkout-grid">
        <section className="review-booking-summary" aria-label="Booking details">
          <div className="booking-summary-head">
            <div>
              <h2>Plot {plot.id}</h2>
              <p>
                {plot.area} <span aria-hidden="true">•</span> {formatSqFt(plot.areaSqFt)}
              </p>
              <span className="status available">Enquiries open</span>
            </div>
            <AssetSitePlan
              readOnly
              selectedOnly
              selectedPlotId={plot.id}
              label={`Plot ${plot.id} from the Moolaparambu site plan`}
              onSelect={() => {}}
              onPreview={() => {}}
              onPlots={() => {}}
            />
          </div>

          <div className="buyer-block">
            <div className="buyer-head">
              <h3 className="checkout-eyebrow">CUSTOMER DETAILS</h3>
              <Link className="checkout-edit" href={`/plots/${plot.id}/details`}>
                Edit details
              </Link>
            </div>
            <dl className="buyer-facts">
              <div>
                <dt>Name</dt>
                <dd>{customer.name}</dd>
              </div>
              <div>
                <dt>Mobile</dt>
                <dd>+91 {customer.mobile}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{customer.email}</dd>
              </div>
            </dl>
          </div>
        </section>

        <aside className="review-payment-card" aria-label="Payment summary">
          <span className="checkout-eyebrow">PAYMENT SUMMARY</span>
          <p className="review-payment-intro">Final amounts will be confirmed by the sales team.</p>
          <div className="payment-rows">
            <div className="payment-row">
              <span>Plot price</span>
              <b>{formatRupees(pricing.propertyPrice)}</b>
            </div>
            <div className="payment-row">
              <span>Booking advance</span>
              <b>{formatRupees(pricing.bookingAdvance)}</b>
            </div>
            <div className="payment-row">
              <span>Taxes and charges</span>
              <b>{formatRupees(pricing.taxesAndCharges)}</b>
            </div>
            <div className="payment-row emphasis">
              <span>Amount due now</span>
              <b>{formatRupees(pricing.bookingAdvance)}</b>
            </div>
          </div>

          <Link className="sg-cta checkout-submit" href={`/plots/${plot.id}/payment`}>
            Continue to payment
            <ArrowRightIcon />
          </Link>
          <SelectionWave />
        </aside>
      </div>
    </FlowShell>
  );
}
