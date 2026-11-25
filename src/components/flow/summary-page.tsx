import Link from "next/link";

import { FlowPageHead } from "./flow-chrome";
import { FLOW_STEPS, SITE, flowCrumbs, formatSqFt, type Plot } from "./flow-data";
import { FlowShell } from "./flow-shell";
import { PlotLocationPlan } from "./plot-location-plan";

function splitValue(label: string): [string, string] {
  const separator = label.indexOf(" ");
  return separator === -1 ? [label, ""] : [label.slice(0, separator), label.slice(separator + 1)];
}

export function SummaryPage({ plot }: { plot: Plot }) {
  const [areaValue, areaUnit] = splitValue(plot.area);
  const [sqFtValue, sqFtUnit] = splitValue(formatSqFt(plot.areaSqFt));
  const [roadValue] = splitValue(SITE.roadAreaLabel);

  return (
    <FlowShell step={FLOW_STEPS.summary} crumbs={flowCrumbs("summary", plot.id)}>
      <FlowPageHead
        backHref={plot.hasFloorPlan ? `/plots/${plot.id}/floor-plan` : "/plots"}
        backLabel={plot.hasFloorPlan ? "Back to floor plan" : "Back to site plan"}
        title={plot.name}
      />

      <div className="flow-summary-grid">
        <section className="flow-summary-card" aria-label="Selected plot details">
          <div className="flow-summary-plan">
            <PlotLocationPlan plotId={plot.id} />
          </div>
        </section>

        <aside className="flow-payment-card">
          <div className="price-intro">
            <span>PLOT PRICE</span>
            <div className="price-title-row">
              <strong>Price on request</strong>
              <span className="status available">On request</span>
            </div>
          </div>
          <div className="price-facts">
            <div className="price-fact">
              <b>{areaValue}</b>
              <span>{areaUnit}</span>
            </div>
            <div className="price-fact">
              <b>{sqFtValue}</b>
              <span>{sqFtUnit}</span>
            </div>
            <div className="price-fact">
              <b>{roadValue}</b>
              <span>cent site-wide</span>
            </div>
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
          <Link className="sg-cta booking-primary" href={`/plots/${plot.id}/details`}>
            Proceed to booking <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      </div>
    </FlowShell>
  );
}
