"use client";

import { AssetSitePlan } from "@/components/inventory/asset-site-plan";
import type { SitePlot } from "@/components/inventory/asset-site-plan";

const ignore = () => {};

/**
 * Static site-plan figure for the summary screen. The selected plot is
 * highlighted and zoomed in the same source SVG as the plot picker, retaining
 * nearby site-plan context around the exact parcel they chose.
 */
export function PlotLocationPlan({
  plotId,
  zoomScale,
  onSelect,
}: {
  plotId: string;
  zoomScale: number;
  onSelect: (plot: SitePlot) => void;
}) {
  return (
    <AssetSitePlan
      fitContainer
      selectedPlotId={plotId}
      zoomScale={zoomScale}
      label={`Moolaparambu site plan with Plot ${plotId} highlighted`}
      onSelect={onSelect}
      onPreview={ignore}
      onPlots={ignore}
    />
  );
}
