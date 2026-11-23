"use client";

import { AssetSitePlan } from "@/components/inventory/asset-site-plan";

const ignore = () => {};

/**
 * Static site-plan figure for the summary screen. The selected plot is
 * highlighted using the same source SVG as the plot picker, so the buyer sees
 * the exact parcel they chose rather than a generic image.
 */
export function PlotLocationPlan({ plotId }: { plotId: string }) {
  return (
    <AssetSitePlan
      readOnly
      selectedPlotId={plotId}
      label={`Moolaparambu site plan with Plot ${plotId} highlighted`}
      onSelect={ignore}
      onPreview={ignore}
      onPlots={ignore}
    />
  );
}
