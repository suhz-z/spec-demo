import Link from "next/link";

import { Container } from "@/components/ui/container";
import type { InventoryPayload } from "@/modules/inventory/types";

type VillaLandingHeroProps = {
  inventory: InventoryPayload;
};

/**
 * Static intro screen from the V3.4 wireframe. The decorative master-plan
 * illustration is development artwork, not approved plot geometry or inventory.
 */
export function VillaLandingHero({ inventory }: VillaLandingHeroProps) {
  const villas = inventory.state === "ready" ? inventory.villas : [];
  const configurations = Array.from(
    new Set(
      villas.map((villa) => villa.type).filter((type): type is "3BHK" | "4BHK" => type !== null),
    ),
  ).sort();
  const configurationLabel = configurations
    .map((type) => (type === "3BHK" ? "3 BHK" : "4 BHK"))
    .join(" · ");
  const isFixture = inventory.state === "ready" && inventory.source === "fixture";

  return (
    <section className="sg-landing-hero" aria-labelledby="landing-title">
      <Container>
        <div className="sg-landing-hero__grid">
          <div className="sg-landing-hero__copy">
            <h1 id="landing-title" className="sg-landing-hero__title">
              Find a place <br />
              to feel <em>at home.</em>
            </h1>
            <p className="sg-landing-hero__lede">
              Explore the layout, compare villa details, and look inside each floor.
            </p>
            <Link className="sg-landing-hero__cta" href="#villa-map">
              <span>Get started</span>
              <span className="sg-landing-hero__arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          </div>

          <div className="sg-landing-hero__art">
            <svg
              viewBox="0 0 740 660"
              role="img"
              aria-label="Abstract residential master plan with villa plots and central green spaces"
              focusable="false"
            >
              <defs>
                <pattern id="sgLandingGrain" width="7" height="7" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r=".55" fill="#dbe5d8" />
                </pattern>
              </defs>
              <rect
                x="72"
                y="35"
                width="596"
                height="590"
                rx="10"
                fill="#f8faf6"
                stroke="#dfe7dc"
                strokeWidth="1.5"
              />
              <rect x="94" y="188" width="552" height="27" rx="2" fill="#e8ece5" />
              <path d="M100 201h540" stroke="#fff" strokeWidth="1.6" strokeDasharray="13 12" />
              <rect x="94" y="416" width="552" height="27" rx="2" fill="#e8ece5" />
              <path d="M100 429h540" stroke="#fff" strokeWidth="1.6" strokeDasharray="13 12" />
              <rect x="352" y="440" width="36" height="170" fill="#e8ece5" />
              <path d="M370 448v155" stroke="#fff" strokeWidth="1.6" strokeDasharray="13 12" />
              <rect x="326" y="225" width="88" height="170" rx="5" fill="#e9f0e6" />
              <rect x="337" y="238" width="66" height="57" rx="3" fill="#fff" stroke="#d3dfd1" />
              <rect
                x="337"
                y="307"
                width="66"
                height="42"
                rx="18"
                fill="#dcebe8"
                stroke="#c5dcd6"
              />
              <rect x="337" y="360" width="31" height="24" rx="2" fill="#fff" stroke="#d3dfd1" />
              <rect x="372" y="360" width="31" height="24" rx="2" fill="#fff" stroke="#d3dfd1" />
              <g fill="#dce9d9" stroke="#a8c4aa" strokeWidth="1.2">
                <rect x="104" y="64" width="43" height="112" rx="3" />
                <rect x="154" y="64" width="43" height="112" rx="3" />
                <rect x="204" y="64" width="43" height="112" rx="3" />
                <rect x="254" y="64" width="43" height="112" rx="3" />
                <rect x="304" y="64" width="43" height="112" rx="3" />
                <rect x="394" y="64" width="43" height="112" rx="3" />
                <rect x="444" y="64" width="43" height="112" rx="3" />
                <rect x="494" y="64" width="43" height="112" rx="3" />
                <rect x="544" y="64" width="43" height="112" rx="3" />
                <rect x="594" y="64" width="43" height="112" rx="3" />
                <rect x="104" y="231" width="43" height="76" rx="3" />
                <rect x="154" y="231" width="43" height="76" rx="3" />
                <rect x="204" y="231" width="43" height="76" rx="3" />
                <rect x="254" y="231" width="43" height="76" rx="3" />
                <rect x="443" y="231" width="43" height="76" rx="3" />
                <rect x="493" y="231" width="43" height="76" rx="3" />
                <rect x="543" y="231" width="43" height="76" rx="3" />
                <rect x="593" y="231" width="43" height="76" rx="3" />
                <rect x="104" y="326" width="43" height="76" rx="3" />
                <rect x="154" y="326" width="43" height="76" rx="3" />
                <rect x="204" y="326" width="43" height="76" rx="3" />
                <rect x="254" y="326" width="43" height="76" rx="3" />
                <rect x="443" y="326" width="43" height="76" rx="3" />
                <rect x="493" y="326" width="43" height="76" rx="3" />
                <rect x="543" y="326" width="43" height="76" rx="3" />
                <rect x="593" y="326" width="43" height="76" rx="3" />
                <rect x="104" y="461" width="43" height="133" rx="3" />
                <rect x="154" y="461" width="43" height="133" rx="3" />
                <rect x="204" y="461" width="43" height="133" rx="3" />
                <rect x="254" y="461" width="43" height="133" rx="3" />
                <rect x="304" y="461" width="43" height="133" rx="3" />
                <rect x="394" y="461" width="43" height="133" rx="3" />
                <rect x="444" y="461" width="43" height="133" rx="3" />
                <rect x="494" y="461" width="43" height="133" rx="3" />
                <rect x="544" y="461" width="43" height="133" rx="3" />
                <rect x="594" y="461" width="43" height="133" rx="3" />
              </g>
              <g fill="#b7cfb4" opacity=".9">
                <circle cx="120" cy="48" r="4" />
                <circle cx="179" cy="48" r="4" />
                <circle cx="238" cy="48" r="4" />
                <circle cx="297" cy="48" r="4" />
                <circle cx="444" cy="48" r="4" />
                <circle cx="503" cy="48" r="4" />
                <circle cx="562" cy="48" r="4" />
                <circle cx="621" cy="48" r="4" />
                <circle cx="120" cy="608" r="4" />
                <circle cx="179" cy="608" r="4" />
                <circle cx="238" cy="608" r="4" />
                <circle cx="297" cy="608" r="4" />
                <circle cx="444" cy="608" r="4" />
                <circle cx="503" cy="608" r="4" />
                <circle cx="562" cy="608" r="4" />
                <circle cx="621" cy="608" r="4" />
              </g>
              <path d="M72 626h596" stroke="#dfe7dc" strokeWidth="1" />
              <path d="M345 625h50" stroke="#6e9a76" strokeWidth="4" strokeLinecap="round" />
              <text
                x="370"
                y="277"
                fontFamily="Inter, sans-serif"
                fontSize="10"
                fill="#728675"
                textAnchor="middle"
                letterSpacing="1.5"
              >
                CLUBHOUSE
              </text>
              <text
                x="370"
                y="332"
                fontFamily="Inter, sans-serif"
                fontSize="9"
                fill="#78918c"
                textAnchor="middle"
              >
                POOL
              </text>
              <text
                x="370"
                y="376"
                fontFamily="Inter, sans-serif"
                fontSize="7"
                fill="#8a9c8c"
                textAnchor="middle"
              >
                GREEN
              </text>
              <text
                x="370"
                y="203"
                fontFamily="Inter, sans-serif"
                fontSize="8"
                fill="#a0aaa0"
                textAnchor="middle"
                letterSpacing="2"
              >
                9 M INTERNAL ROAD
              </text>
              <text
                x="370"
                y="434"
                fontFamily="Inter, sans-serif"
                fontSize="8"
                fill="#a0aaa0"
                textAnchor="middle"
                letterSpacing="2"
              >
                9 M INTERNAL ROAD
              </text>
              <text
                x="370"
                y="620"
                fontFamily="Inter, sans-serif"
                fontSize="8"
                fill="#79927c"
                textAnchor="middle"
                letterSpacing="1.5"
              >
                MAIN GATE
              </text>
              <rect
                x="72"
                y="35"
                width="596"
                height="590"
                rx="10"
                fill="url(#sgLandingGrain)"
                opacity=".2"
              />
            </svg>
          </div>
        </div>

        <div className="sg-landing-hero__foot">
          <span>Kottakkal · Kerala</span>
          <div className="sg-landing-hero__stats">
            <span>
              <b>{villas.length}</b> villas
            </span>
            {configurationLabel ? <span>{configurationLabel}</span> : null}
            {isFixture ? <span>Sample inventory</span> : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
