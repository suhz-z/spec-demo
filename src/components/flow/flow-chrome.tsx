import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import type { FlowCrumb } from "./flow-data";

export type { FlowCrumb };

export function FlowBrand() {
  return (
    <Link className="sub-brand" href="/" aria-label="Spectra Gardens home">
      SPECTRA <span>GARDENS</span>
    </Link>
  );
}

export function FlowHeader({ step, crumbs }: { step?: string; crumbs?: readonly FlowCrumb[] }) {
  return (
    <>
      <header className="flow-header">
        <FlowBrand />
        {step ? (
          <div className="flow-meta" aria-label={`Step ${step.replace(" / ", " of ")}`}>
            {step}
          </div>
        ) : (
          <span className="flow-location">Moolaparambu · Kerala</span>
        )}
      </header>
      {crumbs && crumbs.length ? (
        <nav className="journey-breadcrumbs" aria-label="Booking progress">
          {crumbs.map((crumb, index) => (
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
