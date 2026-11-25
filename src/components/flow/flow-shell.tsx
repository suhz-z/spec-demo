import type { ReactNode } from "react";

import { FlowFooter } from "@/components/site-footer";

import { CheckoutScenery } from "./checkout-art";
import { FlowHeader } from "./flow-chrome";
import type { FlowCrumb } from "./flow-data";

export function FlowShell({
  step,
  crumbs,
  variant,
  children,
}: {
  step?: string;
  crumbs?: readonly FlowCrumb[];
  variant?: "checkout";
  children: ReactNode;
}) {
  return (
    <div className={`flow-page flow-page--fixed${variant ? ` flow-page--${variant}` : ""}`}>
      <div className="flow-width">
        <FlowHeader step={step} crumbs={crumbs} />
        <div className="flow-page-body" id="main-content">
          {variant !== "checkout" ? <CheckoutScenery /> : null}
          {children}
        </div>
        <FlowFooter />
      </div>
    </div>
  );
}

export function FlowPlanStage({ children }: { children: ReactNode }) {
  return <div className="flow-plan-stage">{children}</div>;
}
