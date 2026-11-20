import type { PublicVilla } from "@/modules/inventory/types";

type VillaLocationMapProps = {
  villa: PublicVilla;
  community: readonly PublicVilla[];
};

export function VillaLocationMap({ villa, community }: VillaLocationMapProps) {
  if (!villa.mapGeometry) {
    return (
      <aside className="sg-villa-location" aria-labelledby="villa-location-heading">
        <h2 id="villa-location-heading">Location in the community</h2>
        <p>This villa’s position on the site plan has not been added yet.</p>
      </aside>
    );
  }

  return (
    <figure className="sg-villa-location" aria-labelledby="villa-location-heading">
      <h2 id="villa-location-heading">Location in the community</h2>
      <svg
        className="sg-villa-location__map"
        viewBox="0 0 1000 680"
        role="img"
        aria-label={`Community site plan with villa ${villa.id} highlighted`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect className="sg-villa-location__site" x="8" y="8" width="984" height="664" rx="10" />
        <path
          className="sg-villa-location__road"
          d="M16 190h968v30H16zm0 260h968v30H16zm454 30h60v192h-60z"
        />
        <g aria-hidden="true">
          {community.map((item) => {
            if (!item.mapGeometry) return null;
            const { x, y, width, height } = item.mapGeometry;
            const selected = item.id === villa.id;
            return (
              <g
                key={item.id}
                className={`sg-villa-location__plot${selected ? " is-selected" : ""}`}
              >
                <rect x={x} y={y} width={width} height={height} rx="2" />
                {selected ? (
                  <text x={x + width / 2} y={y + height / 2}>
                    {item.id}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
      <figcaption>Villa {villa.id} is highlighted on the site plan.</figcaption>
    </figure>
  );
}
