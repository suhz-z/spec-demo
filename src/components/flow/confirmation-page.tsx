"use client";

import Link from "next/link";

import { FlowPageHead } from "./flow-chrome";
import { FLOW_STEPS, SITE, flowCrumbs, formatSqFt, type Plot } from "./flow-data";
import { useFlow } from "./flow-provider";
import { FlowShell } from "./flow-shell";

function downloadSummary(plot: Plot, buyer: string, reference: string) {
  const lines = [
    "SPECTRA GARDENS - BOOKING FLOW PREVIEW",
    "This is a design preview. No real payment or booking has been created.",
    "",
    `Site: ${SITE.name}, ${SITE.region}`,
    `Plot: ${plot.name}`,
    `Plot area: ${plot.area} (${formatSqFt(plot.areaSqFt)})`,
    `Buyer: ${buyer}`,
    `Reference: ${reference}`,
    "Payment status: Not collected",
    "Price: On request",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "spectra-gardens-booking-preview.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ConfirmationPage({ plot }: { plot: Plot }) {
  const { hydrated, customer, reference } = useFlow();

  if (!hydrated) {
    return (
      <FlowShell step={FLOW_STEPS.confirmation} crumbs={flowCrumbs("confirmation", plot.id)}>
        <div className="flow-state-page">
          <div className="state-screen">
            <div className="aside-label">CONFIRMATION</div>
            <h2>Loading your preview</h2>
            <p>Reading the details held for this browser session.</p>
          </div>
        </div>
      </FlowShell>
    );
  }

  if (!customer || !reference) {
    return (
      <FlowShell step={FLOW_STEPS.confirmation} crumbs={flowCrumbs("confirmation", plot.id)}>
        <div className="flow-state-page">
          <div className="state-screen">
            <div className="state-symbol pending" aria-hidden="true">
              !
            </div>
            <div className="aside-label">NOTHING TO CONFIRM</div>
            <h2>No preview payment in this session</h2>
            <p>
              A confirmation is created only after the preview payment step. No real payment or
              booking exists.
            </p>
            <Link className="booking-primary state-action" href={`/plots/${plot.id}/payment`}>
              Open the payment preview <span aria-hidden="true">↗</span>
            </Link>
            <Link className="text-back" href="/plots">
              Back to the site plan
            </Link>
          </div>
        </div>
      </FlowShell>
    );
  }

  return (
    <FlowShell step={FLOW_STEPS.confirmation} crumbs={flowCrumbs("confirmation", plot.id)}>
      <FlowPageHead
        backHref={`/plots/${plot.id}/summary`}
        backLabel="Back to summary"
        title="Confirmation"
        subtitle={`Plot ${plot.id} · ${plot.area}`}
        aside="Design preview"
      />

      <div className="flow-state-page">
        <div className="state-screen confirmation-screen">
          <div className="state-symbol success" aria-hidden="true">
            ✓
          </div>
          <div className="aside-label">DEMO CONFIRMATION</div>
          <h2>Booking flow complete</h2>
          <p>This is a design preview. No real payment or booking has been created.</p>
          <div className="confirmation-data">
            <div className="aside-row">
              <span>Plot</span>
              <b>
                Plot {plot.id} · {plot.area}
              </b>
            </div>
            <div className="aside-row">
              <span>Buyer</span>
              <b>{customer.name}</b>
            </div>
            <div className="aside-row">
              <span>Reference</span>
              <b>{reference}</b>
            </div>
            <div className="aside-row">
              <span>Payment</span>
              <b>Not collected</b>
            </div>
          </div>
          <div className="flow-confirmation-actions">
            <button
              type="button"
              className="booking-primary state-action"
              onClick={() => downloadSummary(plot, customer.name, reference)}
            >
              Download summary <span aria-hidden="true">↓</span>
            </button>
            <Link className="text-back" href="/plots">
              Done
            </Link>
          </div>
          <p className="form-note">
            The reference exists only in this browser session. Price and payment terms remain on
            request.
          </p>
        </div>
      </div>
    </FlowShell>
  );
}
