import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SITE, getPlot, isFlowStepKey } from "@/components/flow/flow-data";
import { FlowRoutePage } from "@/components/flow/flow-route-page";

type PlotFlowPageProps = {
  params: Promise<{ plotId: string; step?: string[] }>;
};

export async function generateMetadata({ params }: PlotFlowPageProps): Promise<Metadata> {
  const { plotId } = await params;
  const plot = getPlot(plotId);
  if (!plot) return { title: "Plot not found" };
  return {
    title: `${plot.name} — ${plot.area}`,
    description: `Plot ${plot.id} at ${SITE.name}: ${plot.area}, served by a ${SITE.roadAreaLabel} internal road.`,
  };
}

export default async function PlotFlowPage({ params }: PlotFlowPageProps) {
  const { plotId, step } = await params;
  const plot = getPlot(plotId);
  if (!plot) notFound();

  const key = (step ?? []).join("/");
  // Plots are land parcels: the journey goes straight from the site plan to
  // the selection summary, so the bare plot URL opens the summary directly.
  if (key === "") redirect(`/plots/${plotId}/summary`);
  if (!isFlowStepKey(key)) notFound();
  if (key === "floor-plan" && !plot.hasFloorPlan) notFound();

  return <FlowRoutePage plot={plot} step={key} />;
}
