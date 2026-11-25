"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { FlowPageHead } from "./flow-chrome";
import { FLOW_STEPS, flowCrumbs, type Plot } from "./flow-data";
import { makeReference, useFlow } from "./flow-provider";
import { FlowShell } from "./flow-shell";

export function PaymentPage({ plot }: { plot: Plot }) {
  const router = useRouter();
  const { setReference } = useFlow();

  const choose = (outcome: "success" | "pending" | "failed" | "taken") => {
    if (outcome === "success") {
      setReference(makeReference());
      router.push(`/plots/${plot.id}/confirmation`);
      return;
    }
    router.push(`/plots/${plot.id}/payment/${outcome}`);
  };

  return (
    <FlowShell step={FLOW_STEPS.payment} crumbs={flowCrumbs("payment", plot.id)}>
      <FlowPageHead
        backHref={`/plots/${plot.id}/review`}
        backLabel="Back to review"
        title="Payment"
        compact
      />

      <div className="flow-state-page flow-payment-page">
        <div className="state-screen">
          <div className="processing-mark" aria-hidden="true">
            <span />
          </div>
          <div className="aside-label">PAYMENT</div>
          <h2>Payment gateway</h2>
          <p>Choose an outcome to continue.</p>
          <p className="state-reference">Plot {plot.id}</p>

          <details className="demo-outcomes">
            <summary>Choose an outcome</summary>
            <div className="outcome-actions">
              <button type="button" data-outcome="success" onClick={() => choose("success")}>
                Successful payment
              </button>
              <button type="button" data-outcome="pending" onClick={() => choose("pending")}>
                Payment pending
              </button>
              <button type="button" data-outcome="failed" onClick={() => choose("failed")}>
                Payment failed
              </button>
              <button type="button" data-outcome="taken" onClick={() => choose("taken")}>
                Plot no longer available
              </button>
            </div>
          </details>

          <Link
            className="text-back back-icon"
            href={`/plots/${plot.id}/review`}
            aria-label="Back to payment review"
            title="Back to payment review"
          >
            ←
          </Link>
        </div>
      </div>
    </FlowShell>
  );
}
