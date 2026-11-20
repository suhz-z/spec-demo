"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import { StatusPill } from "@/components/ui/status-pill";
import { useMobileFocusTrap } from "@/lib/use-mobile-focus-trap";
import {
  inventoryPayloadSchema,
  type MapView,
  type InventoryPayload,
  type PublicVilla,
} from "@/modules/inventory/types";

type VillaExplorerProps = {
  initialPayload: InventoryPayload;
  initialSelectedId?: string;
  initialMapView: MapView;
  /** The landing hero supplies the headline; keep the live counts above the map. */
  showHeadline?: boolean;
};

type VillaTypeFilter = "all" | Exclude<PublicVilla["type"], null>;

const STATUS_LABEL: Record<PublicVilla["status"], string> = {
  available: "Available",
  reserved: "Reserved",
  booked: "Booked",
};

const EMPTY_VILLAS: PublicVilla[] = [];

function formatVillaType(type: PublicVilla["type"]): string {
  if (type === "3BHK") return "3 BHK";
  if (type === "4BHK") return "4 BHK";
  return "Configuration to be confirmed";
}

function formatArea(areaSqFt: number | null): string {
  return areaSqFt === null ? "To be confirmed" : `${areaSqFt.toLocaleString("en-IN")} sq.ft`;
}

function formatPrice(amountMinor: string): string {
  const amount = BigInt(amountMinor);
  const croreMinor = 1_000_000_000n;
  const roundedHundredthCrore = (amount * 100n + croreMinor / 2n) / croreMinor;
  const whole = roundedHundredthCrore / 100n;
  const decimal = String(roundedHundredthCrore % 100n).padStart(2, "0");
  return `₹${whole}.${decimal} Cr`;
}

function statusCounts(villas: readonly PublicVilla[]) {
  return villas.reduce(
    (counts, villa) => {
      counts[villa.status] += 1;
      return counts;
    },
    { available: 0, reserved: 0, booked: 0 },
  );
}

function MapFurniture() {
  const trees: [number, number][] = [];
  for (let x = 95; x <= 450; x += 58) trees.push([x, 545]);
  for (let x = 550; x <= 905; x += 58) trees.push([x, 545]);
  trees.push([380, 248], [620, 248], [380, 320], [620, 320]);

  return (
    <g aria-hidden="true" className="sg-map-furniture">
      <rect className="sg-site-outline" x="8" y="8" width="984" height="664" rx="10" />
      <rect className="sg-landscape" x="38" y="515" width="420" height="118" rx="8" />
      <rect className="sg-landscape" x="542" y="515" width="420" height="118" rx="8" />
      <rect className="sg-road" x="16" y="184" width="968" height="28" />
      <line className="sg-road-mark" x1="24" y1="198" x2="976" y2="198" />
      <rect className="sg-road" x="16" y="350" width="968" height="28" />
      <line className="sg-road-mark" x1="24" y1="364" x2="976" y2="364" />
      <rect className="sg-road" x="478" y="500" width="44" height="156" />
      <line className="sg-road-mark" x1="500" y1="506" x2="500" y2="648" />
      <rect className="sg-map-amenity" x="400" y="232" width="184" height="48" rx="6" />
      <text x="492" y="261" className="sg-map-label">
        Clubhouse
      </text>
      <rect className="sg-map-pool" x="420" y="292" width="76" height="36" rx="18" />
      <text x="458" y="315" className="sg-map-small">
        Pool
      </text>
      <rect className="sg-map-amenity" x="508" y="292" width="76" height="36" rx="6" />
      <text x="546" y="315" className="sg-map-small">
        Garden
      </text>
      <text x="500" y="199" className="sg-map-small">
        Internal road
      </text>
      <text x="500" y="365" className="sg-map-small">
        Internal road
      </text>
      <text x="500" y="618" className="sg-map-gate">
        Main gate
      </text>
      {trees.map(([x, y], index) => (
        <circle key={`${x}-${y}-${index}`} className="sg-map-tree" cx={x} cy={y} r="7" />
      ))}
    </g>
  );
}

function MapPlot({
  villa,
  selected,
  dimmed,
  onPreview,
  onClearPreview,
  onSelect,
}: {
  villa: PublicVilla;
  selected: boolean;
  dimmed: boolean;
  onPreview: (id: string) => void;
  onClearPreview: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const geometry = villa.mapGeometry;
  if (!geometry) return null;

  const label = `Villa ${villa.id}, ${formatVillaType(villa.type)}, ${STATUS_LABEL[villa.status]}${villa.priceAmountMinor ? `, indicative sample price ${formatPrice(villa.priceAmountMinor)}` : ""}`;
  return (
    <g
      aria-label={label}
      aria-pressed={selected}
      className={`sg-plot sg-plot--${villa.status}${selected ? " is-selected" : ""}${dimmed ? " is-dimmed" : ""}`}
      data-villa-id={villa.id}
      onBlur={() => onClearPreview(villa.id)}
      onClick={() => onSelect(villa.id)}
      onFocus={() => onPreview(villa.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(villa.id);
        }
      }}
      onPointerEnter={() => onPreview(villa.id)}
      onPointerLeave={() => onClearPreview(villa.id)}
      role="button"
      tabIndex={0}
    >
      <rect x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} />
      <text x={geometry.x + geometry.width / 2} y={geometry.y + geometry.height / 2}>
        {villa.id}
      </text>
    </g>
  );
}

function Counts({ villas }: { villas: readonly PublicVilla[] }) {
  const counts = statusCounts(villas);
  return (
    <dl className="sg-map-counts" aria-label="Villa availability counts">
      <div>
        <dt>Total</dt>
        <dd>{villas.length}</dd>
      </div>
      <div>
        <dt>Available</dt>
        <dd>{counts.available}</dd>
      </div>
      <div>
        <dt>Reserved</dt>
        <dd>{counts.reserved}</dd>
      </div>
      <div>
        <dt>Booked</dt>
        <dd>{counts.booked}</dd>
      </div>
    </dl>
  );
}

function AvailabilityLegend() {
  return (
    <ul className="sg-map-legend" aria-label="Map availability legend">
      <li>
        <span className="sg-legend-swatch sg-legend-swatch--available" aria-hidden="true" />
        Available
      </li>
      <li>
        <span className="sg-legend-swatch sg-legend-swatch--reserved" aria-hidden="true" />
        Reserved
      </li>
      <li>
        <span className="sg-legend-swatch sg-legend-swatch--booked" aria-hidden="true" />
        Booked
      </li>
    </ul>
  );
}

function VillaDetails({ villa, mapView }: { villa?: PublicVilla; mapView: MapView }) {
  if (!villa) {
    return (
      <div className="sg-villa-panel__empty">
        <span className="sg-panel-symbol" aria-hidden="true">
          ⌂
        </span>
        <h3>Select a plot</h3>
        <p>Choose a villa on the map to see its details.</p>
      </div>
    );
  }

  return (
    <>
      <div className="sg-villa-panel__heading">
        <div>
          <p className="sg-eyebrow">Villa details</p>
          <h3>Villa {villa.id}</h3>
        </div>
        <StatusPill status={villa.status} />
      </div>
      <p className="sg-villa-panel__type">
        {formatVillaType(villa.type)} · {villa.floors}
      </p>
      <dl className="sg-villa-facts sg-villa-facts--panel">
        <div>
          <dt>Plot area</dt>
          <dd>{formatArea(villa.plotAreaSqFt)}</dd>
        </div>
        <div>
          <dt>Built-up area</dt>
          <dd>{formatArea(villa.builtUpAreaSqFt)}</dd>
        </div>
        <div>
          <dt>Facing</dt>
          <dd>{villa.facing ?? "To be confirmed"}</dd>
        </div>
        <div>
          <dt>Plot</dt>
          <dd>{villa.corner === null ? "To be confirmed" : villa.corner ? "Corner" : "Regular"}</dd>
        </div>
      </dl>
      <div className="sg-villa-panel__price">
        <span>{villa.samplePrice ? "Indicative sample price" : "Indicative property price"}</span>
        <strong>
          {villa.priceAmountMinor
            ? formatPrice(villa.priceAmountMinor)
            : villa.samplePrice
              ? "To be confirmed"
              : "Price on request"}
        </strong>
        <small>
          {villa.samplePrice
            ? "Sample only · not an offer"
            : "Taxes and other charges may be additional"}
        </small>
      </div>
      <Link
        className="sg-text-link sg-text-link--action"
        href={`/villa/${encodeURIComponent(villa.id)}?mapScale=${mapView.scale}&mapX=${mapView.x}&mapY=${mapView.y}`}
      >
        {villa.status === "available" ? "Explore this villa" : "View villa details"}
        <span aria-hidden="true">→</span>
      </Link>
    </>
  );
}

function InventoryMessage({
  payload,
  onRetry,
}: {
  payload: Exclude<InventoryPayload, { state: "ready" }>;
  onRetry?: () => void;
}) {
  const isError = payload.state === "error";
  return (
    <section className="sg-inventory-message" aria-labelledby="inventory-message-title">
      <span className="sg-panel-symbol" aria-hidden="true">
        ⌂
      </span>
      <div>
        <p className="sg-eyebrow">Master layout</p>
        <h2 id="inventory-message-title">
          {isError ? "The layout is temporarily unavailable" : "Villa details are being prepared"}
        </h2>
        <p>{payload.message}</p>
        {payload.state === "pending" ? (
          <p className="sg-note">
            Local preview fixtures are disabled. Set <code>ENABLE_DEV_FIXTURES=true</code> in
            <code> .env.local</code> to view the marked sample map.
          </p>
        ) : null}
        {isError && onRetry ? (
          <button className="sg-text-link sg-text-link--button" type="button" onClick={onRetry}>
            Try again <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function VillaExplorer({
  initialPayload,
  initialSelectedId,
  initialMapView,
  showHeadline = true,
}: VillaExplorerProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [previewId, setPreviewId] = useState<string>();
  const [typeFilter, setTypeFilter] = useState<VillaTypeFilter>("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const mapRef = useRef<SVGSVGElement>(null);
  const villaPanelRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const [mapTransform, setMapTransform] = useState(initialMapView);
  const refreshLock = useRef(false);

  const villas = payload.state === "ready" ? payload.villas : EMPTY_VILLAS;
  const selectedVilla = villas.find((villa) => villa.id === selectedId);
  const previewVilla = villas.find((villa) => villa.id === previewId);
  const displayedVilla = previewVilla ?? selectedVilla;

  const filteredVillas = useMemo(
    () =>
      villas.filter(
        (villa) =>
          (typeFilter === "all" || villa.type === typeFilter) &&
          (!availableOnly || villa.status === "available"),
      ),
    [availableOnly, typeFilter, villas],
  );
  const filteredIds = useMemo(
    () => new Set(filteredVillas.map((villa) => villa.id)),
    [filteredVillas],
  );
  const mapVillas = useMemo(() => villas.filter((villa) => villa.mapGeometry !== null), [villas]);
  const unpositionedVillas = useMemo(
    () => villas.filter((villa) => villa.mapGeometry === null),
    [villas],
  );
  const activeCounts = statusCounts(filteredVillas);
  const resultSummary = `${filteredVillas.length} villas match these filters. ${activeCounts.available} available, ${activeCounts.reserved} reserved, ${activeCounts.booked} booked.`;

  const payloadState = payload.state;
  const payloadSource = payload.state === "ready" ? payload.source : undefined;
  const refresh = useCallback(async () => {
    if (payloadState === "ready" && payloadSource === "fixture") return;
    if (refreshLock.current) return;
    refreshLock.current = true;
    setIsRefreshing(true);
    setRefreshError(false);
    try {
      const response = await fetch("/api/villas", { cache: "no-store" });
      if (!response.ok) throw new Error("Inventory request failed");
      const nextPayload = inventoryPayloadSchema.parse(await response.json());
      setPayload(nextPayload);
      setRefreshError(false);
    } catch {
      setRefreshError(true);
    } finally {
      refreshLock.current = false;
      setIsRefreshing(false);
    }
  }, [payloadSource, payloadState]);

  useEffect(() => {
    if (payload.state !== "ready" || payload.source !== "database") return;

    let timer: ReturnType<typeof setInterval> | undefined;
    const startPolling = () => {
      if (document.visibilityState !== "visible" || timer) return;
      timer = setInterval(() => void refresh(), payload.pollIntervalSeconds * 1000);
    };
    const stopPolling = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [payload, refresh]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setPreviewId(undefined);
  };

  const closeVillaDetails = useCallback(() => {
    const target = Array.from(mapRef.current?.querySelectorAll<SVGGElement>(".sg-plot") ?? []).find(
      (plot) => plot.dataset.villaId === selectedId,
    );
    setSelectedId(undefined);
    target?.focus();
  }, [selectedId]);

  useMobileFocusTrap({
    open: Boolean(selectedId),
    containerRef: villaPanelRef,
    onClose: closeVillaDetails,
  });

  const adjustZoom = (delta: number) => {
    setMapTransform((current) => {
      const scale = Math.min(2.4, Math.max(1, current.scale + delta));
      const xLimit = (scale - 1) * 500;
      const yLimit = (scale - 1) * 340;
      return {
        scale,
        x: Math.max(-xLimit, Math.min(xLimit, current.x)),
        y: Math.max(-yLimit, Math.min(yLimit, current.y)),
      };
    });
  };

  const panMap = (x: number, y: number) => {
    setMapTransform((current) => {
      const xLimit = (current.scale - 1) * 500;
      const yLimit = (current.scale - 1) * 340;
      return {
        ...current,
        x: Math.max(-xLimit, Math.min(xLimit, current.x + x)),
        y: Math.max(-yLimit, Math.min(yLimit, current.y + y)),
      };
    });
  };

  const startMapDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest("[data-villa-id]"))
    )
      return;
    const svg = mapRef.current;
    if (!svg) return;
    svg.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialX: mapTransform.x,
      initialY: mapTransform.y,
    };
  };

  const moveMapDrag = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const svg = mapRef.current;
    if (!drag || !svg || drag.pointerId !== event.pointerId) return;
    const bounds = svg.getBoundingClientRect();
    const scaleX = 1000 / bounds.width;
    const scaleY = 680 / bounds.height;
    const xLimit = (mapTransform.scale - 1) * 500;
    const yLimit = (mapTransform.scale - 1) * 340;
    setMapTransform((current) => ({
      ...current,
      x: Math.max(
        -xLimit,
        Math.min(xLimit, drag.initialX + (event.clientX - drag.startX) * scaleX),
      ),
      y: Math.max(
        -yLimit,
        Math.min(yLimit, drag.initialY + (event.clientY - drag.startY) * scaleY),
      ),
    }));
  };

  const stopMapDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (mapRef.current?.hasPointerCapture(event.pointerId)) {
      mapRef.current.releasePointerCapture(event.pointerId);
    }
  };

  if (payload.state !== "ready") {
    return <InventoryMessage payload={payload} onRetry={refresh} />;
  }

  const hasAvailable = activeCounts.available > 0;
  return (
    <section
      className="sg-explorer"
      aria-labelledby={showHeadline ? "explore-heading" : undefined}
      aria-label={showHeadline ? undefined : "Villa layout"}
    >
      <div className="sg-explorer__intro">
        {showHeadline ? (
          <div>
            <p className="sg-kicker">Kottakkal · Kerala</p>
            <h1 id="explore-heading">
              Find a place to feel <em>at home.</em>
            </h1>
            <p className="sg-explorer__lede">
              Explore the layout, compare villa details, and look inside each floor.
            </p>
          </div>
        ) : null}
        <Counts villas={villas} />
      </div>

      {payload.source === "fixture" ? (
        <div className="sg-sample-banner" role="note">
          <strong>Development preview.</strong> Villas, availability, plans, and prices are sample
          data. No booking or payment is available.
        </div>
      ) : null}

      <div className="sg-explorer__layout">
        <div className="sg-map-card">
          <div className="sg-map-tools">
            <div
              className="sg-map-filters"
              role="group"
              aria-label="Filter villas by configuration"
            >
              {(
                [
                  ["all", "All villas"],
                  ["3BHK", "3 BHK"],
                  ["4BHK", "4 BHK"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={typeFilter === value}
                  className="sg-map-filter"
                  onClick={() => setTypeFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="sg-available-filter">
              <input
                checked={availableOnly}
                onChange={(event) => setAvailableOnly(event.target.checked)}
                type="checkbox"
              />
              Available only
            </label>
          </div>

          <p className="sg-visually-hidden" role="status">
            {resultSummary}
          </p>
          <p className="sg-visually-hidden" role="status" aria-live="polite">
            {selectedVilla
              ? `Selected Villa ${selectedVilla.id}, ${STATUS_LABEL[selectedVilla.status]}.`
              : ""}
          </p>
          <div className="sg-map-controls" role="group" aria-label="Map zoom and pan controls">
            <button
              type="button"
              aria-label="Zoom out"
              title="Zoom out"
              onClick={() => adjustZoom(-0.25)}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              onClick={() => adjustZoom(0.25)}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Pan map left"
              title="Pan left"
              disabled={mapTransform.scale === 1}
              onClick={() => panMap(-50, 0)}
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Pan map up"
              title="Pan up"
              disabled={mapTransform.scale === 1}
              onClick={() => panMap(0, -50)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Pan map down"
              title="Pan down"
              disabled={mapTransform.scale === 1}
              onClick={() => panMap(0, 50)}
            >
              ↓
            </button>
            <button
              type="button"
              aria-label="Pan map right"
              title="Pan right"
              disabled={mapTransform.scale === 1}
              onClick={() => panMap(50, 0)}
            >
              →
            </button>
            <button
              type="button"
              aria-label="Reset map view"
              title="Reset map view"
              onClick={() => setMapTransform({ scale: 1, x: 0, y: 0 })}
            >
              Reset
            </button>
          </div>
          <div className="sg-map-frame">
            <div className="sg-map-north" aria-hidden="true">
              N
            </div>
            <svg
              aria-describedby="sg-map-description"
              aria-label="Interactive Spectra Gardens master plan"
              className="sg-master-map"
              ref={mapRef}
              role="group"
              viewBox="0 0 1000 680"
              xmlns="http://www.w3.org/2000/svg"
              onPointerDown={startMapDrag}
              onPointerMove={moveMapDrag}
              onPointerUp={stopMapDrag}
              onPointerCancel={stopMapDrag}
            >
              <g
                transform={`translate(${500 + mapTransform.x} ${340 + mapTransform.y}) scale(${mapTransform.scale}) translate(-500 -340)`}
              >
                <MapFurniture />
                {mapVillas.map((villa) => (
                  <MapPlot
                    key={villa.id}
                    villa={villa}
                    selected={selectedId === villa.id}
                    dimmed={!filteredIds.has(villa.id)}
                    onPreview={setPreviewId}
                    onClearPreview={(id) =>
                      setPreviewId((current) => (current === id ? undefined : current))
                    }
                    onSelect={handleSelect}
                  />
                ))}
              </g>
            </svg>
          </div>
          <p id="sg-map-description" className="sg-map-description">
            Select a villa plot with a mouse, touch, or keyboard. Availability is shown by colour
            and text labels.
          </p>
          <AvailabilityLegend />

          <details className="sg-villa-picker">
            <summary>Choose by villa number</summary>
            <div className="sg-villa-picker__grid">
              {filteredVillas.map((villa) => (
                <button
                  key={villa.id}
                  aria-pressed={villa.id === selectedId}
                  className={`sg-villa-picker__item sg-villa-picker__item--${villa.status}`}
                  onClick={() => handleSelect(villa.id)}
                  type="button"
                >
                  <span>{villa.id}</span>
                  <small>{STATUS_LABEL[villa.status]}</small>
                </button>
              ))}
            </div>
          </details>

          {filteredVillas.length === 0 ? (
            <div className="sg-filter-empty" role="status">
              <p>No villas match these filters.</p>
              <button
                type="button"
                className="sg-text-link sg-text-link--button"
                onClick={() => {
                  setTypeFilter("all");
                  setAvailableOnly(false);
                }}
              >
                Clear filters <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : null}
          {!hasAvailable ? (
            <p className="sg-sold-out-note">
              No villas are currently available in this view. Availability may change.
            </p>
          ) : null}
          {unpositionedVillas.length > 0 ? (
            <div className="sg-unmapped-list">
              <h2>Other published villas</h2>
              <p>Map positions are not available for these listings yet.</p>
              <div>
                {unpositionedVillas.map((villa) => (
                  <button key={villa.id} type="button" onClick={() => handleSelect(villa.id)}>
                    Villa {villa.id} · {formatVillaType(villa.type)} · {STATUS_LABEL[villa.status]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside
          ref={villaPanelRef}
          className={`sg-villa-panel${selectedId ? " is-open" : ""}`}
          aria-label="Villa details"
          tabIndex={-1}
        >
          <div className="sg-villa-panel__topline">
            <span>Selected plot</span>
            <span>{displayedVilla?.id ?? "—"}</span>
            {selectedId ? (
              <button className="sg-sheet-close" type="button" onClick={closeVillaDetails}>
                Close details
              </button>
            ) : null}
          </div>
          <VillaDetails villa={displayedVilla} mapView={mapTransform} />
        </aside>
      </div>
      <p className="sg-map-note">
        {payload.source === "fixture"
          ? "Illustrative development layout only · Map geometry and specifications are not approved for sale."
          : isRefreshing
            ? "Updating availability…"
            : refreshError
              ? "The latest availability could not be checked. The displayed status may be out of date."
              : "Availability updates automatically while this page is open."}
      </p>
      {refreshError ? (
        <button
          type="button"
          className="sg-text-link sg-text-link--button"
          onClick={() => void refresh()}
        >
          Refresh availability <span aria-hidden="true">→</span>
        </button>
      ) : null}
    </section>
  );
}
