"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";

import type { SitePlot } from "@/components/inventory/asset-site-plan";

import { FlowPageHead } from "./flow-chrome";
import {
  FLOW_STEPS,
  SITE,
  flowCrumbs,
  formatRupees,
  formatSqFt,
  getDemoPlotPricing,
  getPlot,
  type Plot,
} from "./flow-data";
import { FlowShell } from "./flow-shell";
import { PlotLocationPlan } from "./plot-location-plan";

function splitValue(label: string): [string, string] {
  const separator = label.indexOf(" ");
  return separator === -1 ? [label, ""] : [label.slice(0, separator), label.slice(separator + 1)];
}

export function SummaryPage({ plot }: { plot: Plot }) {
  const [selectedId, setSelectedId] = useState(plot.id);
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const selectedPlot = getPlot(selectedId) ?? plot;
  const pricing = getDemoPlotPricing(selectedPlot.id);
  const [areaValue, areaUnit] = splitValue(selectedPlot.area);
  const [sqFtValue, sqFtUnit] = splitValue(formatSqFt(selectedPlot.areaSqFt));
  const [roadValue] = splitValue(SITE.roadAreaLabel);

  const selectPlot = (selected: SitePlot) => setSelectedId(selected.id);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === mapRef.current);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const handleWheelZoom = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const zoomDelta = event.deltaY < 0 ? 0.1 : -0.1;
    setZoomScale((scale) => Math.min(2.5, Math.max(0.8, scale + zoomDelta)));
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === mapRef.current) {
        await document.exitFullscreen();
      } else {
        await mapRef.current?.requestFullscreen();
      }
    } catch {
      setIsFullscreen(false);
    }
  };

  const handlePanStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest(".plot-summary-zoom")) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
    didDragRef.current = false;
    setIsDragging(true);
    const target = event.target as Element & {
      setPointerCapture?: (pointerId: number) => void;
    };
    target.setPointerCapture?.(event.pointerId);
  };

  const handlePanMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) didDragRef.current = true;
    if (didDragRef.current) {
      setPan({ x: drag.startPanX + deltaX, y: drag.startPanY + deltaY });
      event.preventDefault();
    }
  };

  const handlePanEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <FlowShell step={FLOW_STEPS.summary} crumbs={flowCrumbs("summary", selectedPlot.id)}>
      <FlowPageHead
        backHref={selectedPlot.hasFloorPlan ? `/plots/${selectedPlot.id}/floor-plan` : "/plots"}
        backLabel={selectedPlot.hasFloorPlan ? "Back to floor plan" : "Back to site plan"}
        title={selectedPlot.name}
      />

      <div className="flow-summary-grid">
        <section className="flow-summary-card" aria-label="Selected plot details">
          <div
            ref={mapRef}
            className={`flow-summary-plan${isDragging ? " flow-summary-plan--dragging" : ""}`}
            style={{ "--plan-pan-x": `${pan.x}px`, "--plan-pan-y": `${pan.y}px` } as CSSProperties}
            onPointerDown={handlePanStart}
            onPointerMove={handlePanMove}
            onPointerUp={handlePanEnd}
            onPointerCancel={handlePanEnd}
            onWheel={handleWheelZoom}
            onClickCapture={(event) => {
              if (!didDragRef.current) return;
              event.preventDefault();
              event.stopPropagation();
              didDragRef.current = false;
            }}
          >
            <PlotLocationPlan
              plotId={selectedPlot.id}
              zoomScale={zoomScale}
              onSelect={selectPlot}
            />
            <div className="plot-summary-zoom" aria-label="Map zoom controls">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={zoomScale <= 0.8}
                onClick={() => setZoomScale((scale) => Math.max(0.8, scale - 0.1))}
              >
                −
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={zoomScale >= 2.5}
                onClick={() => setZoomScale((scale) => Math.min(2.5, scale + 0.1))}
              >
                +
              </button>
              <button
                type="button"
                aria-label={isFullscreen ? "Exit fullscreen map" : "View map fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
                onClick={() => void toggleFullscreen()}
              >
                {isFullscreen ? "⤢" : "⛶"}
              </button>
            </div>
          </div>
        </section>

        <aside className="flow-payment-card">
          <div className="price-intro">
            <span>{`PLOT ${selectedPlot.id} PRICE`}</span>
            <div className="price-title-row">
              <strong>{formatRupees(pricing.propertyPrice)}</strong>
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
              <b>{formatRupees(pricing.bookingAdvance)}</b>
            </div>
            <div className="detail-row">
              <span>Taxes &amp; charges</span>
              <b>{formatRupees(pricing.taxesAndCharges)}</b>
            </div>
            <div className="detail-row">
              <span>Remaining balance</span>
              <b>{formatRupees(pricing.remainingBalance)}</b>
            </div>
          </div>
          <div className="pay-total">
            <span>Final payable amount</span>
            <b>{formatRupees(pricing.totalPayable)}</b>
          </div>
          <details className="terms-inline">
            <summary>
              Payment and cancellation terms <span aria-hidden="true">＋</span>
            </summary>
            <p>
              The payment schedule and cancellation policy are shared by Spectra Gardens before any
              payment.
            </p>
          </details>
          <Link className="sg-cta booking-primary" href={`/plots/${selectedPlot.id}/details`}>
            Proceed to booking <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      </div>
    </FlowShell>
  );
}
