/**
 * Facts reproduced from `public/moolaparambu-site-plan.svg`, which traces the
 * supplied Moolaparambu land-subdivision drawing:
 * six plots of 16.10 cent each and a 7.00 cent internal access road.
 *
 * The source drawing carries no prices, availability, villa type or built-up
 * areas. Plot prices below are display-only prototype values and must not be
 * used for inventory, payment calculations or production pricing.
 */
export const SQFT_PER_CENT = 435.6;

export const SITE = {
  name: "Moolaparambu",
  region: "Kerala",
  plotCount: 6,
  plotAreaCent: 16.1,
  plotAreaLabel: "16.10 cent",
  roadAreaCent: 7,
  roadAreaLabel: "7.00 cent",
  sourceLabel: "Moolaparambu land subdivision plan",
} as const;

export const PLOT_AREA_SQFT = Math.round(SITE.plotAreaCent * SQFT_PER_CENT);

const DEMO_PLOT_PRICE = 4_830_000;
const DEMO_BOOKING_ADVANCE = 500_000;

export const DEMO_PLOT_PRICING = {
  propertyPrice: DEMO_PLOT_PRICE,
  bookingAdvance: DEMO_BOOKING_ADVANCE,
  taxesAndCharges: 241_500,
  remainingBalance: DEMO_PLOT_PRICE - DEMO_BOOKING_ADVANCE,
  totalPayable: DEMO_PLOT_PRICE + 241_500,
} as const;

export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export type Plot = {
  id: string;
  name: string;
  area: string;
  areaSqFt: number;
  /** True only when a floor-plan asset actually exists for this plot. */
  hasFloorPlan: boolean;
};

export const PLOTS: readonly Plot[] = Array.from({ length: SITE.plotCount }, (_, index) => {
  const id = String(index + 1);
  return {
    id,
    name: `Plot ${id}`,
    area: SITE.plotAreaLabel,
    areaSqFt: PLOT_AREA_SQFT,
    // The supplied Moolaparambu drawing is a site plan: it traces plot
    // boundaries only. No per-plot floor plan is published, so these plots
    // lead straight to the summary rather than to a floor-plan screen.
    hasFloorPlan: false,
  };
});

export function getPlot(id: string | null | undefined): Plot | undefined {
  return id ? PLOTS.find((plot) => plot.id === id) : undefined;
}

/** The next screen depends on whether this plot has a real floor plan. */
export function plotPrimaryAction(plot: Plot): { label: string; href: string } {
  return plot.hasFloorPlan
    ? { label: "View floor plan", href: `/plots/${plot.id}/floor-plan` }
    : { label: "View summary", href: `/plots/${plot.id}/summary` };
}

export function formatSqFt(value: number): string {
  return `${value.toLocaleString("en-IN")} sq.ft`;
}

export const FLOW_STEPS = {
  plots: "01 / 06",
  floorPlan: "02 / 06",
  summary: "02 / 06",
  details: "03 / 06",
  review: "04 / 06",
  payment: "05 / 06",
  outcome: "05 / 06",
  confirmation: "06 / 06",
} as const;

export const FLOW_STEP_KEYS = [
  "",
  "floor-plan",
  "summary",
  "details",
  "review",
  "payment",
  "payment/pending",
  "payment/failed",
  "payment/taken",
  "confirmation",
] as const;

export type FlowStepKey = (typeof FLOW_STEP_KEYS)[number];

export function isFlowStepKey(value: string): value is FlowStepKey {
  return (FLOW_STEP_KEYS as readonly string[]).includes(value);
}

export type FlowCrumb = {
  label: string;
  href?: string;
};

export function flowCrumbs(step: FlowStepKey, plotId?: string): FlowCrumb[] {
  const home: FlowCrumb = { label: "Home", href: "/" };
  const plots: FlowCrumb = { label: "Plots", href: "/plots" };

  if (!plotId) return [home, { label: "Plots" }];

  const plotLabel = `Plot ${plotId}`;
  const plotHref = `/plots/${plotId}`;
  const review: FlowCrumb = { label: "Review", href: `${plotHref}/review` };
  const payment: FlowCrumb = { label: "Payment", href: `${plotHref}/payment` };
  const base: FlowCrumb[] = [home, plots, { label: plotLabel, href: plotHref }];

  switch (step) {
    case "":
      return [...base, { label: "Selection" }];
    case "floor-plan":
      return [...base, { label: "Floor plan" }];
    case "summary":
      return [...base, { label: "Selection" }];
    case "details":
      return [...base, { label: "Details" }];
    case "review":
      return [...base, { label: "Review" }];
    case "payment":
      return [...base, review, { label: "Payment" }];
    case "payment/pending":
      return [...base, review, payment, { label: "Pending" }];
    case "payment/failed":
      return [...base, review, payment, { label: "Failed" }];
    case "payment/taken":
      return [...base, review, payment, { label: "Unavailable" }];
    case "confirmation":
      return [...base, { label: "Confirmation" }];
  }
}
