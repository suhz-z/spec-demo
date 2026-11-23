import type { ReactNode } from "react";

import { FlowHeader } from "./flow-chrome";
import type { FlowCrumb } from "./flow-data";

export function FlowShell({
  step,
  crumbs,
  children,
}: {
  step?: string;
  crumbs?: readonly FlowCrumb[];
  children: ReactNode;
}) {
  return (
    <div className="flow-page flow-page--fixed">
      <div className="flow-width">
        <FlowHeader step={step} crumbs={crumbs} />
        <div className="flow-page-body">{children}</div>
      </div>
    </div>
  );
}

export function FlowPlanStage({ children }: { children: ReactNode }) {
  return <div className="flow-plan-stage">{children}</div>;
}
