import Link from "next/link";

import { FlowPageHead } from "./flow-chrome";
import { FLOW_STEPS, SITE, flowCrumbs, formatSqFt, type Plot } from "./flow-data";
import { FlowShell } from "./flow-shell";
import { PlotLocationPlan } from "./plot-location-plan";

export function SummaryPage({ plot }: { plot: Plot }) {
  return (
    <FlowShell step={FLOW_STEPS.summary} crumbs={flowCrumbs("summary", plot.id)}>
      <FlowPageHead
        backHref={plot.hasFloorPlan ? `/plots/${plot.id}/floor-plan` : "/plots"}
        backLabel={plot.hasFloorPlan ? "Back to floor plan" : "Back to site plan"}
        title={plot.name}
        aside="Check the facts before continuing"
      />

      <div className="flow-summary-grid">
        <section className="flow-summary-card" aria-label="Selected plot details">
          <div className="flow-summary-plan">
            <PlotLocationPlan plotId={plot.id} />
          </div>
          <div className="flow-summary-facts">
            <div className="summary-eyebrow">SELECTED PLOT · SITE PLAN</div>
            <p>
              {SITE.name} · {SITE.region}
            </p>
            <div className="fact-list">
              <div className="detail-row">
                <span>Plot area</span>
                <b>{plot.area}</b>
              </div>
              <div className="detail-row">
                <span>Area in sq.ft</span>
                <b>{formatSqFt(plot.areaSqFt)}</b>
              </div>
              <div className="detail-row">
                <span>Internal road</span>
                <b>{SITE.roadAreaLabel} site-wide</b>
              </div>
              <div className="detail-row">
                <span>Availability</span>
                <b>On request</b>
              </div>
              <div className="detail-row">
                <span>Source drawing</span>
                <b>{SITE.sourceLabel}</b>
              </div>
            </div>
          </div>
        </section>

        <aside className="flow-payment-card">
          <div className="price-intro">
            <span>PLOT PRICE</span>
            <strong>Price on request</strong>
          </div>
          <div className="price-breakdown">
            <div className="detail-row">
              <span>Booking advance</span>
              <b>To be confirmed</b>
            </div>
            <div className="detail-row">
              <span>Taxes &amp; charges</span>
              <b>As applicable</b>
            </div>
            <div className="detail-row">
              <span>Remaining balance</span>
              <b>To be confirmed</b>
            </div>
          </div>
          <div className="pay-total">
            <span>Final payable amount</span>
            <b>To be confirmed</b>
          </div>
          <details className="terms-inline">
            <summary>
              Payment and cancellation terms <span aria-hidden="true">＋</span>
            </summary>
            <p>
              The payment schedule and cancellation policy are shared by Spectra Gardens before any
              payment. This prototype does not publish unapproved terms.
            </p>
          </details>
          <Link className="booking-primary" href={`/plots/${plot.id}/details`}>
            Proceed to booking <span aria-hidden="true">↗</span>
          </Link>
          <p className="prototype-note">
            Design preview only. No real payment or booking is created.
          </p>
        </aside>
      </div>
    </FlowShell>
  );
}
