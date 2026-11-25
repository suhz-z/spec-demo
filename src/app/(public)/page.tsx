import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { FlowFooter } from "@/components/site-footer";
import { FlowHeader } from "@/components/flow/flow-chrome";

import "@/components/flow/flow.css";
import "@/components/wireframe/wireframe.css";

export const metadata: Metadata = {
  title: "Spectra Gardens — Moolaparambu plots",
  description:
    "Six plots of 16.10 cent each at Moolaparambu, Kerala, served by a 7.00 cent internal road.",
};

export default function HomePage() {
  return (
    <div id="wireframe-app" className="flow-root">
      <div className="flow-page landing-page">
        <div className="flow-width">
          <FlowHeader />

          <main className="landing-grid" id="main-content">
            <div className="landing-copy">
              <h1>
                Find a place <br />
                to feel <em>at home.</em>
              </h1>
              <Link className="sg-cta primary landing-cta" href="/plots">
                <span>Get started</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="landing-art">
              <figure className="landing-plan-frame">
                <Image
                  className="landing-plan-image"
                  src="/spectra-ground-floor-plan-preview.png"
                  alt="Indicative ground-floor layout of a Spectra Gardens villa"
                  width={1000}
                  height={700}
                  priority
                  unoptimized
                />
                <figcaption>Indicative floor plan · not to scale</figcaption>
              </figure>
            </div>
          </main>

          <FlowFooter />
        </div>
      </div>
    </div>
  );
}
