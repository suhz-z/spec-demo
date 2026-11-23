import { describe, expect, it } from "vitest";

import {
  PLOTS,
  PLOT_AREA_SQFT,
  SITE,
  flowCrumbs,
  formatSqFt,
  getPlot,
  isFlowStepKey,
  plotPrimaryAction,
} from "./flow-data";

describe("Moolaparambu flow data", () => {
  it("reproduces the six equal plots and internal road from the source plan", () => {
    expect(SITE.plotCount).toBe(6);
    expect(SITE.plotAreaLabel).toBe("16.10 cent");
    expect(SITE.roadAreaLabel).toBe("7.00 cent");
    expect(PLOTS).toHaveLength(6);
    expect(PLOTS.map((plot) => plot.id)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(PLOTS.every((plot) => plot.area === "16.10 cent")).toBe(true);
    expect(PLOT_AREA_SQFT).toBe(7013);
    expect(formatSqFt(PLOT_AREA_SQFT)).toBe("7,013 sq.ft");
  });

  it("resolves only plot ids that exist in the plan", () => {
    expect(getPlot("3")?.name).toBe("Plot 3");
    expect(getPlot("9")).toBeUndefined();
    expect(getPlot(null)).toBeUndefined();
    expect(getPlot(undefined)).toBeUndefined();
  });

  it("accepts only the route steps defined for the booking flow", () => {
    expect(isFlowStepKey("")).toBe(true);
    expect(isFlowStepKey("floor-plan")).toBe(true);
    expect(isFlowStepKey("summary")).toBe(true);
    expect(isFlowStepKey("payment/taken")).toBe(true);
    expect(isFlowStepKey("confirmation")).toBe(true);
    expect(isFlowStepKey("checkout")).toBe(false);
  });

  it("offers a floor plan only for plots that actually have one", () => {
    const sitePlanPlot = getPlot("3");
    if (!sitePlanPlot) throw new Error("Plot 3 is missing from the source plan");

    expect(sitePlanPlot.hasFloorPlan).toBe(false);
    expect(plotPrimaryAction(sitePlanPlot)).toEqual({
      label: "View summary",
      href: "/plots/3/summary",
    });

    const withFloorPlan = { ...sitePlanPlot, hasFloorPlan: true };
    expect(plotPrimaryAction(withFloorPlan)).toEqual({
      label: "View floor plan",
      href: "/plots/3/floor-plan",
    });
  });

  it("marks the current step in the breadcrumb trail", () => {
    expect(flowCrumbs("", undefined)).toEqual([{ label: "Home", href: "/" }, { label: "Plots" }]);

    const summary = flowCrumbs("summary", "3");
    expect(summary.map((crumb) => crumb.label)).toEqual(["Home", "Plots", "Plot 3", "Selection"]);
    expect(summary.at(-1)?.href).toBeUndefined();

    const pending = flowCrumbs("payment/pending", "5");
    expect(pending.map((crumb) => crumb.label)).toEqual([
      "Home",
      "Plots",
      "Plot 5",
      "Review",
      "Payment",
      "Pending",
    ]);
    expect(pending.at(-1)?.href).toBeUndefined();
    expect(pending.at(-2)?.href).toBe("/plots/5/payment");
  });
});
