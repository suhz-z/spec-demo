"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export type SitePlot = {
  id: string;
  name: string;
  area: string;
};

type AssetSitePlanProps = {
  selectedPlotId?: string;
  onSelect: (plot: SitePlot) => void;
  onPreview: (plot: SitePlot | null) => void;
  onPlots: (plots: SitePlot[]) => void;
  /** Render the plan as a static figure with only the selected plot marked. */
  readOnly?: boolean;
  /** Render only the selected parcel from the source SVG. */
  selectedOnly?: boolean;
  /** Zoom the source SVG around the selected parcel while keeping nearby map context. */
  zoomToSelected?: boolean;
  /** Fit the full SVG viewBox to the containing stage. */
  fitContainer?: boolean;
  /** Scale the plan within its containing viewport. */
  zoomScale?: number;
  /** Accessible name for the static figure. */
  label?: string;
};

const SITE_PLAN_SRC = "/moolaparambu-site-plan.svg";
const SITE_PREVIEW_SRC = "/moolaparambu-site-plan-preview.png";

function parsePlots(root: Element): SitePlot[] {
  return Array.from(root.querySelectorAll<SVGGElement>("[data-plot]")).flatMap((group) => {
    const id = group.getAttribute("data-plot");
    if (!id) return [];
    const [name = `Plot ${id}`, area = ""] = (group.getAttribute("aria-label") ?? "")
      .split(",")
      .map((part) => part.trim());
    return [{ id, name, area }];
  });
}

/**
 * The site-plan SVG is first-party, but it carries its own <script> to wire up
 * plot selection. Keep its inline <style> (it styles the traced linework) and
 * remove executable content before inserting the SVG with DOM APIs. Selection
 * is then handled here so React remains the single source of interaction state.
 */
function sanitize(svg: Element) {
  svg.querySelectorAll("script, foreignObject").forEach((node) => node.remove());
  svg.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const isEventHandler = /^on/i.test(attribute.name);
      const isScriptLink =
        /^(href|xlink:href)$/i.test(attribute.name) && /^\s*javascript:/i.test(attribute.value);
      if (isEventHandler || isScriptLink) element.removeAttribute(attribute.name);
    });
  });
}

function plotFrom(group: Element, plots: SitePlot[]): SitePlot | null {
  const id = group.getAttribute("data-plot");
  return plots.find((plot) => plot.id === id) ?? null;
}

export function AssetSitePlan({
  selectedPlotId,
  onSelect,
  onPreview,
  onPlots,
  readOnly = false,
  selectedOnly = false,
  zoomToSelected = false,
  fitContainer = false,
  zoomScale = 1.1,
  label,
}: AssetSitePlanProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const plotsRef = useRef<SitePlot[]>([]);
  const callbacks = useRef({ onSelect, onPreview, onPlots });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const layoutPlotId = selectedOnly || zoomToSelected ? selectedPlotId : undefined;
  const hostClassName = [
    "sg-demo-plan",
    selectedOnly ? "sg-selected-plot checkout-thumb" : "",
    zoomToSelected || fitContainer ? "sg-zoomed-plan" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    callbacks.current = { onSelect, onPreview, onPlots };
  }, [onSelect, onPreview, onPlots]);

  useEffect(() => {
    let cancelled = false;
    let detachListeners: (() => void) | undefined;
    const currentHost = hostRef.current;
    if (!currentHost) return;
    const container: HTMLDivElement = currentHost;

    async function load() {
      setStatus("loading");
      container.replaceChildren();
      try {
        const response = await fetch(SITE_PLAN_SRC, { cache: "force-cache" });
        if (!response.ok) throw new Error(`site plan request failed: ${response.status}`);
        const text = await response.text();
        const parsed = new DOMParser().parseFromString(text, "image/svg+xml");
        if (parsed.querySelector("parsererror")) throw new Error("invalid site plan asset");
        if (cancelled) return;

        const svg = parsed.documentElement;
        sanitize(svg);
        if (readOnly) {
          svg.setAttribute("aria-hidden", "true");
          svg.querySelectorAll("[data-plot]").forEach((group) => {
            group.removeAttribute("tabindex");
            group.removeAttribute("role");
          });
        }
        const plots = parsePlots(svg);
        if (plots.length === 0) throw new Error("site plan has no selectable plots");
        plotsRef.current = plots;
        container.replaceChildren(svg);
        callbacks.current.onPlots(plots);

        if (selectedOnly) {
          const selectedGroup = Array.from(svg.querySelectorAll<SVGGElement>("[data-plot]")).find(
            (group) => group.getAttribute("data-plot") === layoutPlotId,
          );
          if (!selectedGroup) throw new Error("selected plot is missing from the site plan");

          selectedGroup.classList.add("selected");
          Array.from(svg.children).forEach((child) => {
            if (child !== svg.querySelector("defs") && child !== selectedGroup) child.remove();
          });

          const bounds = selectedGroup.getBBox();
          const padding = Math.max(bounds.width, bounds.height) * 0.09;
          const viewBoxX = bounds.x - padding;
          const viewBoxY = bounds.y - padding;
          const viewBoxWidth = bounds.width + padding * 2;
          const viewBoxHeight = bounds.height + padding * 2;
          svg.setAttribute("viewBox", `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
          setStatus("ready");
          return;
        }

        if (zoomToSelected) {
          const selectedGroup = Array.from(svg.querySelectorAll<SVGGElement>("[data-plot]")).find(
            (group) => group.getAttribute("data-plot") === layoutPlotId,
          );
          if (!selectedGroup) throw new Error("selected plot is missing from the site plan");

          selectedGroup.classList.add("selected");
          const bounds = selectedGroup.getBBox();
          const padding = Math.max(bounds.width, bounds.height) * 0.45;
          const viewBoxX = bounds.x - padding;
          const viewBoxY = bounds.y - padding;
          const viewBoxWidth = bounds.width + padding * 2;
          const viewBoxHeight = bounds.height + padding * 2;
          svg.setAttribute("viewBox", `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
        }

        if (readOnly) {
          setStatus("ready");
          return;
        }

        const closestPlot = (target: EventTarget | null): Element | null =>
          target instanceof Element ? target.closest("[data-plot]") : null;
        const handleClick = (event: MouseEvent) => {
          const group = closestPlot(event.target);
          const plot = group ? plotFrom(group, plotsRef.current) : null;
          if (plot) callbacks.current.onSelect(plot);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          const group = closestPlot(event.target);
          if (!group) return;
          event.preventDefault();
          const plot = plotFrom(group, plotsRef.current);
          if (plot) callbacks.current.onSelect(plot);
        };
        const handlePreview = (event: PointerEvent) => {
          const group = closestPlot(event.target);
          if (!group) return;
          const related = event.relatedTarget;
          const leaving =
            event.type === "pointerout" && !(related instanceof Node && group.contains(related));
          callbacks.current.onPreview(leaving ? null : plotFrom(group, plotsRef.current));
        };

        container.addEventListener("click", handleClick);
        container.addEventListener("keydown", handleKeyDown);
        container.addEventListener("pointerover", handlePreview);
        container.addEventListener("pointerout", handlePreview);
        detachListeners = () => {
          container.removeEventListener("click", handleClick);
          container.removeEventListener("keydown", handleKeyDown);
          container.removeEventListener("pointerover", handlePreview);
          container.removeEventListener("pointerout", handlePreview);
        };
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
      detachListeners?.();
    };
  }, [layoutPlotId, readOnly, selectedOnly, zoomToSelected]);

  useEffect(() => {
    const container = hostRef.current;
    if (!container || status !== "ready") return;
    container.querySelectorAll("[data-plot]").forEach((group) => {
      const selected = group.getAttribute("data-plot") === selectedPlotId;
      // The SVG's own stylesheet uses `.selected`; `.active` is kept for the
      // app-level focus ring declared in globals.css.
      group.classList.toggle("selected", selected);
      group.classList.toggle("active", selected);
    });
  }, [selectedPlotId, status]);

  return (
    <>
      {/* React must not own these children: the validated SVG is inserted with DOM APIs. */}
      <div
        className={hostClassName}
        ref={hostRef}
        style={{ "--plan-zoom": zoomScale } as CSSProperties}
        data-static={readOnly ? "true" : undefined}
        role={readOnly ? "img" : undefined}
        aria-label={readOnly ? (label ?? "Moolaparambu land subdivision plan") : undefined}
      />
      {status === "loading" && !selectedOnly ? (
        <p className="sg-plan-loading">Loading site plan…</p>
      ) : null}
      {status === "error" && !selectedOnly ? (
        <div className="sg-plan-fallback">
          <Image
            src={SITE_PREVIEW_SRC}
            alt="Moolaparambu land subdivision plan showing six plots and the internal access road"
            width={1110}
            height={1290}
            unoptimized
          />
          <p className="sg-plan-loading" role="status">
            The interactive site plan could not be loaded. A static preview is shown instead.
          </p>
        </div>
      ) : null}
    </>
  );
}
