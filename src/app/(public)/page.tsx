import type { Metadata } from "next";

import { WireframeFlow } from "@/components/wireframe/wireframe-flow";
import "@/components/wireframe/wireframe.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Spectra Gardens — V3.3",
  description: "Explore the Spectra Gardens villa layout and floor plans.",
};

export default function HomePage() {
  return <WireframeFlow />;
}
