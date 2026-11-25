import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { SiteBrand } from "@/components/site-brand";
import { SiteMenu } from "@/components/site-menu";

import type { FlowCrumb } from "./flow-data";

export type { FlowCrumb };

export function FlowBrand() {
  return <SiteBrand className="sub-brand" />;
}

function stepProgress(step: string): number {
  const [current = 0, total = 0] = step.split("/").map((value) => Number.parseInt(value, 10));
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}

function StepMeta({ step }: { step: string }) {
  return (
    <div className="flow-meta" aria-label={`Step ${step.replace(" / ", " of ")}`}>
      <span className="flow-step-label">{step}</span>
      <span className="flow-progress" aria-hidden="true">
        <i style={{ width: `${stepProgress(step)}%` }} />
      </span>
    </div>
  );
}

export function FlowHeader({ step, crumbs }: { step?: string; crumbs?: readonly FlowCrumb[] }) {
  const hasCrumbs = Boolean(crumbs && crumbs.length);

  return (
    <>
      <header className="flow-header">
        <FlowBrand />
        {step && !hasCrumbs ? <StepMeta step={step} /> : null}
        <SiteMenu />
      </header>
      {hasCrumbs ? (
        <nav className="journey-breadcrumbs" aria-label="Booking progress">
          <div className="journey-breadcrumbs__trail">
            {crumbs?.map((crumb, index) => (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 ? (
                  <span className="crumb-separator" aria-hidden="true">
                    /
                  </span>
                ) : null}
                {crumb.href ? (
                  <Link href={crumb.href}>{crumb.label}</Link>
                ) : (
                  <span aria-current="step">{crumb.label}</span>
                )}
              </Fragment>
            ))}
          </div>
          {step ? <StepMeta step={step} /> : null}
        </nav>
      ) : null}
    </>
  );
}

export function FlowBack({ href, label }: { href: string; label: string }) {
  return (
    <Link className="flow-back" href={href} aria-label={label} title={label}>
      <span aria-hidden="true">←</span>
    </Link>
  );
}

export function FlowPageHead({
  backHref,
  backLabel,
  title,
  subtitle,
  aside,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flow-page-head">
      <div className="flow-page-heading">
        <FlowBack href={backHref} label={backLabel} />
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {aside ? <div className="flow-page-aside">{aside}</div> : null}
    </div>
  );
}
