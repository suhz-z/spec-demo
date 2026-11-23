import type { Metadata } from "next";

import { PlotPicker } from "@/components/flow/plot-picker";

export const metadata: Metadata = {
  title: "Select a plot",
  description:
    "Explore the six 16.10 cent plots in the Moolaparambu land subdivision plan and choose one to continue.",
};

export default function PlotsPage() {
  return <PlotPicker />;
}
