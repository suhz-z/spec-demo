"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { AssetSitePlan, type SitePlot } from "@/components/inventory/asset-site-plan";

import { FlowPageHead } from "./flow-chrome";
import {
  FLOW_STEPS,
  PLOT_AREA_SQFT,
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
      <Link className="panel-action" href={next.href}>
        <span>{next.label}</span>
        <span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}

export function PlotPicker() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loadedCount, setLoadedCount] = useState<number | null>(null);

  const shown = getPlot(hoveredId ?? selectedId);
  const selected = getPlot(selectedId);

  const handleSelect = useCallback((plot: SitePlot) => {
    setSelectedId(plot.id);
    setHoveredId(null);
  }, []);

  const handlePreview = useCallback((plot: SitePlot | null) => {
    setHoveredId(plot?.id ?? null);
  }, []);

  const handlePlots = useCallback((plots: SitePlot[]) => {
    setLoadedCount(plots.length);
  }, []);

  return (
    <FlowShell step={FLOW_STEPS.plots} crumbs={flowCrumbs("", undefined)}>
      <FlowPageHead
        backHref="/"
        backLabel="Back to home"
        title="Select a plot"
        subtitle={`Six plots of ${SITE.plotAreaLabel} each, served by a ${SITE.roadAreaLabel} internal road.`}
        aside={`${SITE.name} · ${SITE.region}`}
      />

      <div className="flow-plan-layout">
        <div className="flow-plan-main">
          <div className="flow-plan-toolbar">
            <span className="flow-plan-summary">
              {loadedCount === null ? "Loading survey plan…" : `${loadedCount} plots · equal area`}
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
              onPreview={handlePreview}
              onPlots={handlePlots}
            />
          </FlowPlanStage>
          <div className="flow-plan-note">
            <span>Source: {SITE.sourceLabel} · not to scale</span>
            <span>Click, Enter or Space to select a plot</span>
          </div>
        </div>

        <aside className="flow-side-panel" aria-live="polite">
          <div className="panel-top">
            <span>{hoveredId ? "Plot preview" : "Plot details"}</span>
            <span>{shown ? `PLOT ${shown.id}` : "—"}</span>
          </div>
          {shown ? (
            <PanelDetails plot={shown} />
          ) : (
            <div className="panel-empty">
              <h2>Select a plot</h2>
              <p>
                All six plots measure {SITE.plotAreaLabel}. Choose a parcel on the survey plan to
                see its details.
              </p>
            </div>
          )}
        </aside>
      </div>

      <div className="flow-page-foot">
        <span>
          {SITE.plotCount} plots · {SITE.plotAreaLabel} each
        </span>
        <span>
          Internal road {SITE.roadAreaLabel} · 1 cent = 435.6 sq.ft · {formatSqFt(PLOT_AREA_SQFT)}{" "}
          per plot
        </span>
      </div>
    </FlowShell>
  );
}
