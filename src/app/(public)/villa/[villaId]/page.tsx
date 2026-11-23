import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { StatusPill } from "@/components/ui/status-pill";
import { SitePlanViewer } from "@/components/inventory/site-plan-viewer";
import { VillaLocationMap } from "@/components/inventory/villa-location-map";
import { VillaBookingFlow } from "@/components/booking/villa-booking-flow";
import { getServerEnv } from "@/lib/env";
import { getResumableHold } from "@/modules/bookings/active-hold.server";
import { getPublicVillaByCode } from "@/modules/inventory/public-inventory.server";
import { mapViewSchema } from "@/modules/inventory/types";

export const dynamic = "force-dynamic";

type VillaPageProps = {
  params: Promise<{ villaId: string }>;
  searchParams: Promise<{ mapScale?: string; mapX?: string; mapY?: string }>;
};

export async function generateMetadata({ params }: VillaPageProps): Promise<Metadata> {
  const { villaId } = await params;
  return {
    title: `Villa ${villaId}`,
    description: "Explore villa details and the Moolaparambu site plan.",
  };
}

export default async function VillaPage({ params, searchParams }: VillaPageProps) {
  const [{ villaId }, query] = await Promise.all([params, searchParams]);
  const parsedMapView = mapViewSchema.safeParse({
    scale: Number(query.mapScale ?? 1),
    x: Number(query.mapX ?? 0),
    y: Number(query.mapY ?? 0),
  });
  const mapView = parsedMapView.success ? parsedMapView.data : { scale: 1, x: 0, y: 0 };
  const result = await getPublicVillaByCode(villaId.toUpperCase());
  if (result.state === "unavailable") {
    return (
      <Container>
        <div className="sg-plan-unavailable">
          <h1>Villa details are temporarily unavailable</h1>
          <p>{result.message}</p>
          <Link className="sg-text-link" href="/#villa-map">
            Back to the master plan <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Container>
    );
  }
  if (result.state === "not-found") notFound();

  const { villa, fixture, community } = result;
  const environment = getServerEnv();
  const villaLabel = villa.type === "3BHK" ? "3 BHK" : villa.type === "4BHK" ? "4 BHK" : undefined;
  const summary = {
    code: villa.id,
    typeLabel: villaLabel ?? "Configuration to be confirmed",
    plotArea:
      villa.plotAreaSqFt === null
        ? "To be confirmed"
        : `${villa.plotAreaSqFt.toLocaleString("en-IN")} sq.ft`,
    builtUpArea:
      villa.builtUpAreaSqFt === null
        ? "To be confirmed"
        : `${villa.builtUpAreaSqFt.toLocaleString("en-IN")} sq.ft`,
    facing: villa.facing ?? "To be confirmed",
    statusLabel: villa.status.charAt(0).toUpperCase() + villa.status.slice(1),
    priceAmountMinor: villa.priceAmountMinor,
    samplePrice: villa.samplePrice,
  };
  // A public "reserved" status may be this visitor's own unexpired hold.
  const resumableHold =
    !fixture && villa.status === "reserved" ? await getResumableHold(villa.id) : null;
  const bookingEnabled = !fixture && (villa.status === "available" || resumableHold !== null);
  const disabledReason = fixture
    ? "This is a development sample. Holds are only available on published inventory."
    : villa.status === "reserved"
      ? "Another buyer currently holds this villa. Please check back shortly."
      : undefined;
  return (
    <section className="sg-villa-page" aria-labelledby="villa-title">
      <Container>
        <div className="sg-villa-page__topline">
          <Link
            className="sg-text-link"
            href={`/?villa=${encodeURIComponent(villa.id)}&mapScale=${mapView.scale}&mapX=${mapView.x}&mapY=${mapView.y}#villa-map`}
          >
            <span aria-hidden="true">←</span> Back to master plan
          </Link>
          <span className="sg-step-label">VILLA DETAILS</span>
        </div>
        <div className="sg-villa-page__heading">
          <div>
            <p className="sg-eyebrow">
              {villa.type === "3BHK"
                ? "3 BHK"
                : villa.type === "4BHK"
                  ? "4 BHK"
                  : "Configuration to be confirmed"}{" "}
              · {villa.floors}
            </p>
            <h1 id="villa-title">Villa {villa.id}</h1>
          </div>
          <StatusPill status={villa.status} />
        </div>
        <div className="sg-villa-facts" aria-label="Villa details">
          <div>
            <span>Plot area</span>
            <strong>
              {villa.plotAreaSqFt === null
                ? "To be confirmed"
                : `${villa.plotAreaSqFt.toLocaleString("en-IN")} sq.ft`}
            </strong>
          </div>
          <div>
            <span>Built-up area</span>
            <strong>
              {villa.builtUpAreaSqFt === null
                ? "To be confirmed"
                : `${villa.builtUpAreaSqFt.toLocaleString("en-IN")} sq.ft`}
            </strong>
          </div>
          <div>
            <span>Facing</span>
            <strong>{villa.facing ?? "To be confirmed"}</strong>
          </div>
          <div>
            <span>Plot</span>
            <strong>
              {villa.corner === null ? "To be confirmed" : villa.corner ? "Corner" : "Regular"}
            </strong>
          </div>
        </div>
        {(villa.status === "available" || villa.status === "reserved" || fixture) && (
          <VillaBookingFlow
            villaCode={villa.id}
            villaLabel={villaLabel}
            summary={summary}
            enabled={bookingEnabled}
            initialHold={resumableHold}
            disabledReason={disabledReason}
            termsConfigured={Boolean(environment.BOOKING_TERMS_VERSION)}
            development={environment.APP_ENV === "development" || environment.APP_ENV === "test"}
          />
        )}
        <VillaLocationMap villa={villa} community={community} />
        <SitePlanViewer villaCode={villa.id} />
      </Container>
    </section>
  );
}
