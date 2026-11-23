"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { useMobileFocusTrap } from "@/lib/use-mobile-focus-trap";

import { AssetSitePlan, type SitePlot } from "./asset-site-plan";

type SitePlanViewerProps = {
  /** Optional villa code used only to label the plan's context. */
  villaCode?: string;
};

export function SitePlanViewer({ villaCode }: SitePlanViewerProps) {
  const [selectedPlotId, setSelectedPlotId] = useState<string>();
  const [previewPlotId, setPreviewPlotId] = useState<string>();
  const [plots, setPlots] = useState<SitePlot[]>([]);
  const planRef = useRef<HTMLDivElement>(null);
  const plotPanelRef = useRef<HTMLElement>(null);
  const selectedPlot = plots.find((plot) => plot.id === selectedPlotId);
  const previewPlot = plots.find((plot) => plot.id === previewPlotId);
  const activePlot = previewPlot ?? selectedPlot;
  const plotAnnouncement = useMemo(
    () => (selectedPlot ? `${selectedPlot.name}, ${selectedPlot.area}` : "No plot selected"),
    [selectedPlot],
  );

  const closePlotDetails = useCallback(() => {
    const target = Array.from(
      planRef.current?.querySelectorAll<SVGGElement>(".plot-group") ?? [],
    ).find((group) => group.getAttribute("data-plot") === selectedPlotId);
    setSelectedPlotId(undefined);
    setPreviewPlotId(undefined);
    target?.focus();
  }, [selectedPlotId]);

  useMobileFocusTrap({
    open: Boolean(selectedPlotId),
    containerRef: plotPanelRef,
    onClose: closePlotDetails,
  });

  return (
    <section className="sg-plan-section" aria-labelledby="sg-site-plan-heading">
      <div className="sg-plan-intro">
        <div>
          <p className="sg-eyebrow">Explore the layout</p>
          <h2 id="sg-site-plan-heading">Site plan</h2>
        </div>
        <p className="sg-plan-status">
          {villaCode ? `Villa ${villaCode} · ` : ""}Moolaparambu · six plots
        </p>
      </div>

      <div className="sg-plan-toolbar">
        <span className="sg-plan-caption">
          Traced from the supplied subdivision drawing · select a plot for details
        </span>
      </div>

      <div className="sg-plan-layout">
        <div className="sg-plan-canvas" ref={planRef} aria-describedby="sg-site-plan-description">
          <AssetSitePlan
            selectedPlotId={selectedPlotId}
            onSelect={(plot) => {
              setSelectedPlotId(plot.id);
              setPreviewPlotId(undefined);
            }}
            onPreview={(plot) => setPreviewPlotId(plot?.id)}
            onPlots={setPlots}
          />
          <p id="sg-site-plan-description" className="sg-visually-hidden">
            Moolaparambu subdivision plan with six plots, an internal access road and a southern
            approach. Select a plot to see the area printed on the source drawing.
          </p>
        </div>

        <aside
          ref={plotPanelRef}
          className={`sg-room-panel${selectedPlotId ? " is-open" : ""}`}
          aria-label="Plot details"
          tabIndex={-1}
        >
          <div className="sg-room-panel__topline">
            <span>Plot information</span>
            <span>{activePlot ? "Selected" : "—"}</span>
            {selectedPlotId ? (
              <button className="sg-sheet-close" type="button" onClick={closePlotDetails}>
                Close plot details
              </button>
            ) : null}
          </div>
          {activePlot ? (
            <>
              <p className="sg-eyebrow">Moolaparambu</p>
              <h3>{activePlot.name}</h3>
              <dl className="sg-room-facts">
                <div>
                  <dt>Plot area</dt>
                  <dd>{activePlot.area}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>Site subdivision</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="sg-room-panel__empty">
              <h3>Select a plot</h3>
              <p>Plot area appears here.</p>
            </div>
          )}
        </aside>
      </div>

      <details className="sg-room-picker">
        <summary>Browse plots by number</summary>
        <div className="sg-room-picker__grid">
          {plots.map((plot) => (
            <button
              key={plot.id}
              type="button"
              aria-pressed={plot.id === selectedPlotId}
              onClick={() => {
                setSelectedPlotId(plot.id);
                setPreviewPlotId(undefined);
              }}
            >
              {plot.name} <span>{plot.area}</span>
            </button>
          ))}
        </div>
      </details>

      <p className="sg-sample-disclaimer" role="note">
        The Moolaparambu site plan is reproduced from the supplied subdivision drawing. Plot areas
        and dimensions are as printed in that source and are not approved for construction.
      </p>
      <p className="sg-visually-hidden" role="status" aria-live="polite">
        {plotAnnouncement}
      </p>
    </section>
  );
}
