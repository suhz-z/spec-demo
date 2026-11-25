"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { AssetSitePlan, type SitePlot } from "@/components/inventory/asset-site-plan";

import { FlowPageHead } from "./flow-chrome";
import {
  FLOW_STEPS,
  SITE,
  flowCrumbs,
  formatSqFt,
  getPlot,
  plotPrimaryAction,
  type Plot,
} from "./flow-data";
import { FlowPlanStage, FlowShell } from "./flow-shell";

function PanelDetails({ plot }: { plot: Plot }) {
  const next = plotPrimaryAction(plot);
  return (
    <div className="panel-detail">
      <div className="villa-title">
        <h2>{plot.name}</h2>
        <span className="status available">Enquiries open</span>
      </div>
      <div className="villa-type">Residential plot · {SITE.name}</div>
      <div className="details">
        <div className="detail-row">
          <span>Plot area</span>
          <b>{plot.area}</b>
        </div>
        <div className="detail-row">
          <span>In square feet</span>
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
      </div>
      <div className="price-line">
        <span>Price</span>
        <b>Price on request</b>
        <small>No approved price is published for this plot.</small>
      </div>
      <Link className="sg-cta panel-cta" href={next.href}>
        <span>{next.label}</span>
        <span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}

export function PlotPicker() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadedCount, setLoadedCount] = useState<number | null>(null);

  const selected = getPlot(selectedId);

  const handleSelect = useCallback((plot: SitePlot) => {
    setSelectedId(plot.id);
  }, []);

  const handlePlots = useCallback((plots: SitePlot[]) => {
    setLoadedCount(plots.length);
  }, []);

  return (
    <FlowShell step={FLOW_STEPS.plots} crumbs={flowCrumbs("", undefined)}>
      <FlowPageHead backHref="/" backLabel="Back to home" title="Select a plot" />

      <div className={`flow-plan-layout${selected ? " flow-plan-layout--selected" : ""}`}>
        <div className="flow-plan-main">
          <div className="flow-plan-toolbar">
            <span className="flow-plan-summary">
              {loadedCount === null ? "Loading survey plan…" : `${loadedCount} plots`}
            </span>
            <span className="flow-plan-legend">
              <i className="swatch" style={{ background: "#eef3ec", color: "#536459" }} />
              Plot boundary
            </span>
          </div>
          <FlowPlanStage>
            <AssetSitePlan
              selectedPlotId={selected?.id}
              onSelect={handleSelect}
              onPreview={() => {}}
              onPlots={handlePlots}
            />
          </FlowPlanStage>
          <div className="flow-plan-note">
            <span>Source: {SITE.sourceLabel} · not to scale</span>
          </div>
        </div>

        {selected ? (
          <aside className="flow-side-panel" aria-live="polite">
            <div className="panel-top">
              <span>Plot details</span>
              <span>{`PLOT ${selected.id}`}</span>
            </div>
            <PanelDetails plot={selected} />
          </aside>
        ) : null}
      </div>
    </FlowShell>
  );
}
