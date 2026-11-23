"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from "react";

import { AssetFloorPlan } from "@/components/inventory/asset-floor-plan";

import {
  mapSVG,
  moneyCr,
  ROOM_DATA,
  sqft,
  TYPE,
  VILLAS,
  type Villa,
  type VillaType,
} from "./wireframe-data";

type Screen =
  | "intro"
  | "explore"
  | "villa"
  | "summary"
  | "details"
  | "review"
  | "processing"
  | "paymentPending"
  | "paymentFailed"
  | "villaTaken"
  | "confirmation";

type Floor = "ground" | "first";
type FieldErrors = { name?: boolean; mobile?: boolean; email?: boolean };

const JOURNEY: Record<Screen, [Screen, string][]> = {
  intro: [],
  explore: [
    ["intro", "Home"],
    ["explore", "Plots"],
  ],
  villa: [
    ["intro", "Home"],
    ["explore", "Plots"],
    ["villa", "Floor plan"],
  ],
  summary: [
    ["intro", "Home"],
    ["explore", "Plots"],
    ["villa", "Floor plan"],
    ["summary", "Selection"],
  ],
  details: [
    ["intro", "Home"],
    ["explore", "Plots"],
    ["villa", "Floor plan"],
    ["summary", "Selection"],
    ["details", "Details"],
  ],
  review: [
    ["intro", "Home"],
    ["explore", "Plots"],
    ["villa", "Floor plan"],
    ["summary", "Selection"],
    ["details", "Details"],
    ["review", "Review"],
  ],
  processing: [
    ["intro", "Home"],
    ["explore", "Plots"],
    ["villa", "Floor plan"],
    ["summary", "Selection"],
    ["details", "Details"],
    ["review", "Review"],
    ["processing", "Payment"],
  ],
  paymentPending: [
    ["intro", "Home"],
    ["explore", "Plots"],
    ["villa", "Floor plan"],
    ["summary", "Selection"],
    ["details", "Details"],
    ["review", "Review"],
    ["processing", "Payment"],
    ["paymentPending", "Pending"],
  ],
  paymentFailed: [
    ["intro", "Home"],
    ["explore", "Plots"],
    ["villa", "Floor plan"],
    ["summary", "Selection"],
    ["details", "Details"],
    ["review", "Review"],
    ["paymentFailed", "Failed"],
  ],
  villaTaken: [
    ["intro", "Home"],
    ["explore", "Plots"],
    ["villa", "Floor plan"],
    ["villaTaken", "Unavailable"],
  ],
  confirmation: [
    ["intro", "Home"],
    ["explore", "Plots"],
    ["villa", "Floor plan"],
    ["summary", "Selection"],
    ["details", "Details"],
    ["review", "Review"],
    ["confirmation", "Confirmation"],
  ],
};

const STEP: Record<Screen, string> = {
  intro: "",
  explore: "01 / 06",
  villa: "02 / 06",
  summary: "03 / 06",
  details: "04 / 06",
  review: "05 / 06",
  processing: "05 / 06",
  paymentPending: "05 / 06",
  paymentFailed: "05 / 06",
  villaTaken: "05 / 06",
  confirmation: "06 / 06",
};

function getVilla(id: string | null): Villa | undefined {
  return id ? VILLAS.find((villa) => villa.id === id) : undefined;
}

function roomOf(floor: Floor, id: string | null) {
  return id ? ROOM_DATA[floor].find((room) => room.id === id) : undefined;
}

function targetId(target: EventTarget | null, attribute: string): string | null {
  if (!(target instanceof Element)) return null;
  return target.closest(`[${attribute}]`)?.getAttribute(attribute) ?? null;
}

export function WireframeFlow() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"all" | VillaType>("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [activeFloor, setActiveFloor] = useState<Floor>("ground");
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [takenTitle, setTakenTitle] = useState("This villa is no longer available");
  const [confirmation, setConfirmation] = useState({ villa: "", buyer: "", reference: "PREVIEW" });
  const mapRef = useRef<SVGSVGElement>(null);

  // Arriving from /villa/[villaId] (or any /#villa-map link) should land on the
  // plot picker with the requested villa selected, not on the intro screen.
  useEffect(() => {
    const applyUrlState = () => {
      const requested = new URLSearchParams(window.location.search).get("villa");
      const villaFromUrl = requested ? getVilla(requested) : undefined;
      if (villaFromUrl) {
        setSelected(villaFromUrl.id);
        setHovered(null);
        setActiveFloor("ground");
        setActiveRoom(null);
      }
      if (villaFromUrl || window.location.hash === "#villa-map") setScreen("explore");
    };
    applyUrlState();
    window.addEventListener("hashchange", applyUrlState);
    window.addEventListener("popstate", applyUrlState);
    return () => {
      window.removeEventListener("hashchange", applyUrlState);
      window.removeEventListener("popstate", applyUrlState);
    };
  }, []);

  const villa = getVilla(selected);
  const panelVilla = getVilla(hovered ?? selected);
  const room = roomOf(activeFloor, activeRoom);
  const counts = {
    available: VILLAS.filter((item) => item.status === "available").length,
    reserved: VILLAS.filter((item) => item.status === "reserved").length,
    booked: VILLAS.filter((item) => item.status === "booked").length,
  };

  const showScreen = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const openVilla = (id: string) => {
    setSelected(id);
    setActiveFloor("ground");
    setActiveRoom(null);
    showScreen("villa");
  };

  const showTaken = () => {
    const current = getVilla(selected);
    setTakenTitle(
      current ? `Villa ${current.id} is no longer available` : "This villa is no longer available",
    );
    showScreen("villaTaken");
  };

  const mapMarkup = mapSVG({ activeType, availableOnly, selected, villas: VILLAS });

  const onMapPointer = (event: PointerEvent<SVGSVGElement>) =>
    setHovered(targetId(event.target, "data-id"));
  const onMapClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    const id = targetId(event.target, "data-id");
    if (id) {
      setSelected(id);
      setHovered(null);
    }
  };
  const onMapKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const id = targetId(event.target, "data-id");
    if (id) {
      event.preventDefault();
      setSelected(id);
      setHovered(null);
    }
  };
  const crumb = (
    target: Screen,
    label: string,
    index: number,
    items: readonly [Screen, string][],
  ) => (
    <Fragment key={`${target}-${index}`}>
      {index > 0 ? (
        <span className="crumb-separator" aria-hidden="true">
          /
        </span>
      ) : null}
      {index === items.length - 1 ? (
        <span aria-current="step">{label}</span>
      ) : (
        <button
          type="button"
          data-crumb-target={target}
          onClick={() => {
            if (target === "villa") {
              setActiveRoom(null);
              showScreen("villa");
            } else {
              showScreen(target);
            }
          }}
        >
          {label}
        </button>
      )}
    </Fragment>
  );

  const breadcrumbs = (
    <nav className="journey-breadcrumbs" aria-label="Booking progress">
      {JOURNEY[screen].map(([target, label], index) =>
        crumb(target, label, index, JOURNEY[screen]),
      )}
    </nav>
  );

  const flowHeader = (number: string) => (
    <>
      <header className="flow-header">
        <a className="sub-brand" href="#" onClick={(event) => event.preventDefault()}>
          SPECTRA <span>GARDENS</span>
        </a>
        <div className="flow-meta">{number}</div>
      </header>
      {breadcrumbs}
    </>
  );

  const backButton = (label: string, target: Screen, icon = true) => (
    <button
      className={icon ? "back-link back-icon" : "back-link"}
      type="button"
      aria-label={label}
      title={label}
      onClick={() => showScreen(target)}
    >
      ←
    </button>
  );

  const submitDetails = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: FieldErrors = {};
    const messages: string[] = [];
    if (name.trim().length < 2) {
      errors.name = true;
      messages.push("Enter your full name.");
    }
    if (!/^\d{10}$/.test(mobile)) {
      errors.mobile = true;
      messages.push("Enter a valid 10-digit mobile number.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = true;
      messages.push("Enter a valid email address.");
    }
    if (!accepted) messages.push("Accept the booking terms to continue.");
    setFieldErrors(errors);
    if (messages.length) {
      setFormError(messages.join(" "));
      return;
    }
    setFormError("");
    if (!villa || villa.status !== "available") {
      showTaken();
      return;
    }
    showScreen("review");
  };

  const applyOutcome = (outcome: string) => {
    const current = getVilla(selected);
    if (!current) return;
    if (outcome === "success") {
      current.status = "booked";
      setConfirmation({
        villa: `Villa ${current.id} · ${TYPE[current.type].label}`,
        buyer: name.trim(),
        reference: `SG-PREVIEW-${Math.floor(100000 + Math.random() * 900000)}`,
      });
      showScreen("confirmation");
    } else if (outcome === "pending") {
      setFeedback("");
      showScreen("paymentPending");
    } else if (outcome === "failed") {
      showScreen("paymentFailed");
    } else if (outcome === "taken") {
      current.status = "booked";
      showTaken();
    }
  };

  const similar = VILLAS.filter(
    (item) => item.id !== selected && item.status === "available" && item.type === villa?.type,
  ).slice(0, 3);
  const fallbackSimilar = VILLAS.filter(
    (item) => item.id !== selected && item.status === "available",
  ).slice(0, 3);
  const suggestions = similar.length ? similar : fallbackSimilar;

  const downloadReceipt = () => {
    const current = getVilla(selected);
    if (!current) return;
    const lines = [
      "SPECTRA GARDENS - BOOKING FLOW PREVIEW",
      "This is a design preview. No real payment or booking has been created.",
      "",
      `Villa: ${current.id}`,
      `Configuration: ${TYPE[current.type].label}`,
      `Buyer: ${name.trim()}`,
      `Mobile: +91 ${mobile}`,
      `Email: ${email.trim()}`,
      `Property price (sample): ${moneyCr(current.price)}`,
      "Payment status: Not collected",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spectra-gardens-booking-preview.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="wireframe-app">
      {screen === "intro" ? (
        <section id="intro">
          <div className="wrap">
            <header className="topline">
              <a
                className="brand"
                href="#"
                onClick={(event) => event.preventDefault()}
                aria-label="Spectra Gardens home"
              >
                <span className="brand-mark" aria-hidden="true" />
                <span className="brand-copy">
                  <strong>SPECTRA</strong>
                  <span>GARDENS</span>
                </span>
              </a>
              <div className="top-meta">Kottakkal · Kerala</div>
            </header>
            <main className="intro-grid">
              <div className="intro-copy">
                <h1>
                  Find a place <br />
                  to feel <em>at home.</em>
                </h1>
                <button className="primary" type="button" onClick={() => showScreen("explore")}>
                  <span>Get started</span>
                  <span className="arrow-circle" aria-hidden="true">
                    ↗
                  </span>
                </button>
              </div>
              <div
                className="art"
                aria-label="Abstract illustration of the Spectra Gardens master layout"
              >
                <svg
                  className="art-map"
                  viewBox="0 0 740 660"
                  role="img"
                  aria-label="Abstract residential master plan with villa plots and central green spaces"
                >
                  <defs>
                    <pattern id="grain" width="7" height="7" patternUnits="userSpaceOnUse">
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
                  <rect
                    x="337"
                    y="238"
                    width="66"
                    height="57"
                    rx="3"
                    fill="#fff"
                    stroke="#d3dfd1"
                  />
                  <rect
                    x="337"
                    y="307"
                    width="66"
                    height="42"
                    rx="18"
                    fill="#dcebe8"
                    stroke="#c5dcd6"
                  />
                  <rect
                    x="337"
                    y="360"
                    width="31"
                    height="24"
                    rx="2"
                    fill="#fff"
                    stroke="#d3dfd1"
                  />
                  <rect
                    x="372"
                    y="360"
                    width="31"
                    height="24"
                    rx="2"
                    fill="#fff"
                    stroke="#d3dfd1"
                  />
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
                    fill="url(#grain)"
                    opacity=".2"
                  />
                </svg>
              </div>
            </main>
            <footer className="intro-foot">
              <span>KOTTAKKAL · KERALA</span>
              <div className="foot-stats">
                <span>
                  <b>36</b> villas
                </span>
                <span>
                  <b>3 &amp; 4</b> BHK
                </span>
              </div>
            </footer>
          </div>
        </section>
      ) : null}

      {screen === "explore" ? (
        <section id="explore">
          <div className="wrap">
            {flowHeader(STEP.explore)}
            <div className="flow-intro">
              <div className="title-with-back">
                {backButton("Back", "intro")}
                <h2>Select a plot</h2>
              </div>
            </div>
            <div className="flow-layout" id="villa-map">
              <div className="map-area">
                <div className="map-tools">
                  <div className="filters" role="group" aria-label="Filter villas">
                    {(["all", "3BHK", "4BHK"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className="filter"
                        data-type={value}
                        aria-pressed={activeType === value}
                        onClick={() => setActiveType(value)}
                      >
                        {value === "all" ? "All villas" : TYPE[value].label}
                      </button>
                    ))}
                  </div>
                  <label className="only-available">
                    <input
                      type="checkbox"
                      checked={availableOnly}
                      onChange={(event) => setAvailableOnly(event.target.checked)}
                    />
                    Available only
                  </label>
                </div>
                <div className="map-frame" id="mapFrame">
                  <div className="north">N</div>
                  <svg
                    id="masterMap"
                    ref={mapRef}
                    viewBox="0 0 1000 680"
                    role="group"
                    aria-label="Interactive Spectra Gardens master plan"
                    dangerouslySetInnerHTML={{ __html: mapMarkup }}
                    onClick={onMapClick}
                    onKeyDown={onMapKeyDown}
                    onPointerOver={onMapPointer}
                    onPointerOut={() => setHovered(null)}
                    onFocus={(event) => setHovered(targetId(event.target, "data-id"))}
                    onBlur={() => setHovered(null)}
                  />
                </div>
                <div className="map-legend">
                  <span className="legend-item">
                    <i className="swatch" style={{ background: "#e1eee1", color: "#82aa89" }} />
                    Available
                  </span>
                  <span className="legend-item">
                    <i className="swatch" style={{ background: "#f5ecd9", color: "#c39a58" }} />
                    Reserved
                  </span>
                  <span className="legend-item">
                    <i
                      className="swatch"
                      style={{ background: "#e7ebe7", color: "#adb6ae", borderStyle: "dashed" }}
                    />
                    Booked
                  </span>
                </div>
              </div>
              <aside className="side-panel" id="villaPanel" aria-live="polite">
                <div className="panel-top">
                  <span>Villa details</span>
                  <span>{panelVilla?.id ?? "—"}</span>
                </div>
                {panelVilla ? (
                  <div id="detailPanel">
                    <div className="panel-detail">
                      <div className="villa-title">
                        <h3>Villa {panelVilla.id}</h3>
                        <span className={`status ${panelVilla.status}`}>
                          {panelVilla.status.charAt(0).toUpperCase() + panelVilla.status.slice(1)}
                        </span>
                      </div>
                      <div className="villa-type">
                        {TYPE[panelVilla.type].label} · {panelVilla.floors}
                      </div>
                      <div className="details">
                        <div className="detail-row">
                          <span>Plot area</span>
                          <b>{sqft(panelVilla.plot)}</b>
                        </div>
                        <div className="detail-row">
                          <span>Built-up area</span>
                          <b>{sqft(panelVilla.builtUp)}</b>
                        </div>
                        <div className="detail-row">
                          <span>Facing</span>
                          <b>{panelVilla.facing}</b>
                        </div>
                        <div className="detail-row">
                          <span>Plot position</span>
                          <b>{panelVilla.corner ? "Corner plot" : "Regular"}</b>
                        </div>
                      </div>
                      <div className="price-line">
                        <b>{moneyCr(panelVilla.price)}</b>
                      </div>
                    </div>
                    <button
                      className="panel-action"
                      type="button"
                      onClick={() => panelVilla && openVilla(panelVilla.id)}
                    >
                      <span>
                        {panelVilla.status === "available" ? "View villa" : "View details"}
                      </span>
                      <span>↗</span>
                    </button>
                  </div>
                ) : (
                  <div className="panel-empty" id="emptyPanel">
                    <h3>Select a plot</h3>
                  </div>
                )}
              </aside>
            </div>
            <div className="flow-footer">
              <span>
                {counts.available} Available · {counts.reserved} Reserved · {counts.booked} Booked
              </span>
              <span>Hover a villa to preview · click to open</span>
            </div>
          </div>
        </section>
      ) : null}

      {screen === "villa" && villa ? (
        <section id="villa">
          <div className="wrap villa-screen">
            {flowHeader(STEP.villa)}
            <div className="villa-heading">
              <div className="villa-heading-main">
                {backButton("Back to layout", "explore")}
                <div>
                  <div className="villa-context">Villa {villa.id}</div>
                  <h2>Floor plan</h2>
                  <p>
                    {TYPE[villa.type].label} · {villa.floors} · {sqft(villa.plot)} plot
                  </p>
                </div>
              </div>
              <div className={`status ${villa.status}`}>
                {villa.status.charAt(0).toUpperCase() + villa.status.slice(1)}
              </div>
            </div>
            <div className="villa-grid">
              <div className="plan-card">
                <div className="plan-toolbar">
                  <div className="floor-tabs">
                    {(["ground", "first"] as const).map((floor) => (
                      <button
                        key={floor}
                        type="button"
                        className="floor-tab"
                        data-floor={floor}
                        aria-pressed={activeFloor === floor}
                        onClick={() => {
                          setActiveFloor(floor);
                          setActiveRoom(null);
                        }}
                      >
                        {floor === "ground" ? "Ground floor" : "First floor"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="plan-art">
                  <AssetFloorPlan
                    floor={activeFloor}
                    selectedRoomId={activeRoom ?? undefined}
                    onSelect={(assetRoom) => {
                      setActiveRoom(assetRoom.id);
                    }}
                    onPreview={() => {}}
                    onRooms={() => {}}
                  />
                </div>
                <div className="plan-caption">
                  <span>Room areas · Not to scale</span>
                </div>
              </div>
              <aside className="room-card" aria-live="polite">
                <div className="panel-top">
                  <span>Room details</span>
                  <span>{room ? "ROOM" : "—"}</span>
                </div>
                <h3>{room?.name ?? "Select a room"}</h3>
                <p id="roomIntro" hidden />
                <div className="room-data" id="roomData">
                  <div>
                    <span>Room size</span>
                    <b>{room?.size ?? "—"}</b>
                  </div>
                  <div>
                    <span>Area</span>
                    <b>{room?.area ?? "—"}</b>
                  </div>
                  <div>
                    <span>Floor</span>
                    <b>{activeFloor === "ground" ? "Ground" : "First"}</b>
                  </div>
                </div>
                <button
                  className="panel-action"
                  type="button"
                  onClick={() => showScreen("summary")}
                >
                  <span>Continue to summary</span>
                  <span>↗</span>
                </button>
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      {screen === "summary" && villa ? (
        <section id="summary">
          <div className="wrap">
            {flowHeader(STEP.summary)}
            <div className="summary-heading">
              <div className="title-with-back">
                {backButton("Back to floor plan", "villa")}
                <h2>Your selection</h2>
              </div>
            </div>
            <div className="summary-grid">
              <section className="summary-card" aria-label="Selected villa details">
                <div className="summary-lead">
                  <div className="summary-eyebrow">SELECTED VILLA</div>
                  <h3>Villa {villa.id}</h3>
                  <p>
                    {TYPE[villa.type].label} · {villa.floors}
                  </p>
                </div>
                <div className="fact-list">
                  <div className="detail-row">
                    <span>Plot area</span>
                    <b>{sqft(villa.plot)}</b>
                  </div>
                  <div className="detail-row">
                    <span>Built-up area</span>
                    <b>{sqft(villa.builtUp)}</b>
                  </div>
                  <div className="detail-row">
                    <span>Facing</span>
                    <b>{villa.facing}</b>
                  </div>
                  <div className="detail-row">
                    <span>Availability</span>
                    <b>{villa.status.charAt(0).toUpperCase() + villa.status.slice(1)}</b>
                  </div>
                </div>
              </section>
              <aside className="payment-card">
                <div className="price-intro">
                  <strong>{moneyCr(villa.price)}</strong>
                </div>
                <div className="price-breakdown">
                  <div className="detail-row">
                    <span>Taxes &amp; charges</span>
                    <b>To be confirmed</b>
                  </div>
                  <div className="detail-row">
                    <span>Booking advance</span>
                    <b>To be confirmed</b>
                  </div>
                  <div className="detail-row">
                    <span>Remaining balance</span>
                    <b>To be confirmed</b>
                  </div>
                </div>
                <div className="pay-total">
                  <span>Final payable amount</span>
                  <b>To be confirmed</b>
                </div>
                <details className="terms-inline">
                  <summary>
                    Cancellation and refund terms <span aria-hidden="true">＋</span>
                  </summary>
                  <p>Policy details will be provided by Spectra Gardens before payment.</p>
                </details>
                <button
                  className="booking-link"
                  type="button"
                  onClick={() =>
                    villa.status === "available" ? showScreen("details") : showTaken()
                  }
                >
                  Proceed to booking <span aria-hidden="true">↗</span>
                </button>
                <a className="booking-secondary" href="tel:+917510544444">
                  Talk to sales
                </a>
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      {screen === "details" && villa ? (
        <section id="details" className="booking-screen">
          <div className="wrap booking-wrap">
            {flowHeader(STEP.details)}
            <div className="booking-heading">
              <div className="title-with-back">
                {backButton("Back to summary", "summary")}
                <h2>Customer details</h2>
              </div>
            </div>
            <div className="booking-grid">
              <form className="customer-form" id="customerForm" noValidate onSubmit={submitDetails}>
                <label className="field">
                  <span>Full name</span>
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Name as on ID"
                    value={name}
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-label="Full name"
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Mobile number</span>
                  <div className="phone-field">
                    <span>+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={mobile}
                      aria-invalid={Boolean(fieldErrors.mobile)}
                      aria-label="Mobile number"
                      onChange={(event) =>
                        setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                    />
                  </div>
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-label="Email"
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label className="terms-check">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                  />
                  <span>
                    I accept the{" "}
                    <button
                      type="button"
                      className="inline-text-button"
                      onClick={() => showScreen("summary")}
                    >
                      booking terms and conditions
                    </button>
                    .
                  </span>
                </label>
                <p className="form-error" role="alert" hidden={!formError}>
                  {formError}
                </p>
                <button className="booking-primary" type="submit">
                  Review payment <span aria-hidden="true">↗</span>
                </button>
                <p className="form-note">Hold duration: To be confirmed.</p>
              </form>
              <aside className="booking-aside">
                <div className="aside-label">YOUR SELECTION</div>
                <h3>Villa {villa.id}</h3>
                <p>
                  {TYPE[villa.type].label} · {villa.floors}
                </p>
                <div className="aside-row">
                  <span>Property price</span>
                  <b>{moneyCr(villa.price)}</b>
                </div>
                <div className="aside-row">
                  <span>Pay now</span>
                  <b>To be confirmed</b>
                </div>
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      {screen === "review" && villa ? (
        <section id="review" className="booking-screen">
          <div className="wrap booking-wrap">
            {flowHeader(STEP.review)}
            <div className="booking-heading">
              <div className="title-with-back">
                {backButton("Back to details", "details")}
                <h2>Review and pay</h2>
              </div>
            </div>
            <div className="review-layout">
              <div className="review-main">
                <div className="review-section">
                  <div className="aside-label">VILLA</div>
                  <div className="review-row">
                    <span>
                      Villa {villa.id} · {TYPE[villa.type].label}
                    </span>
                    <button
                      type="button"
                      className="plain-edit"
                      onClick={() => showScreen("explore")}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div className="review-section">
                  <div className="aside-label">BUYER</div>
                  <div className="review-row">
                    <span>{name}</span>
                  </div>
                  <div className="review-row">
                    <span>+91 {mobile}</span>
                  </div>
                  <div className="review-row">
                    <span>{email}</span>
                  </div>
                  <button
                    type="button"
                    className="plain-edit review-edit"
                    onClick={() => showScreen("details")}
                  >
                    Edit details
                  </button>
                </div>
              </div>
              <aside className="review-payment">
                <div className="aside-label">PAYMENT SUMMARY</div>
                <div className="aside-row">
                  <span>Property price</span>
                  <b>{moneyCr(villa.price)}</b>
                </div>
                <div className="aside-row">
                  <span>Taxes and charges</span>
                  <b>To be confirmed</b>
                </div>
                <div className="aside-row emphasis">
                  <span>Pay now to book</span>
                  <b>To be confirmed</b>
                </div>
                <div className="aside-row">
                  <span>Remaining balance</span>
                  <b>To be confirmed</b>
                </div>
                <p className="payment-note">Availability is checked again before payment.</p>
                <button
                  className="booking-primary"
                  type="button"
                  onClick={() => showScreen("processing")}
                >
                  Continue to payment <span aria-hidden="true">↗</span>
                </button>
                <p className="prototype-note">Preview only. No payment will be collected.</p>
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      {screen === "processing" ? (
        <section id="processing" className="booking-screen">
          <div className="wrap booking-wrap">
            {flowHeader(STEP.processing)}
            <div className="state-screen">
              <div className="processing-mark" aria-hidden="true">
                <span />
              </div>
              <div className="aside-label">PAYMENT</div>
              <h2>Payment gateway preview</h2>
              <p>
                This prototype is not connected to a payment provider. No payment will be collected.
              </p>
              <details className="demo-outcomes">
                <summary>Preview a payment outcome</summary>
                <div className="outcome-actions">
                  <button
                    type="button"
                    data-outcome="success"
                    onClick={() => applyOutcome("success")}
                  >
                    Successful payment
                  </button>
                  <button
                    type="button"
                    data-outcome="pending"
                    onClick={() => applyOutcome("pending")}
                  >
                    Payment pending
                  </button>
                  <button
                    type="button"
                    data-outcome="failed"
                    onClick={() => applyOutcome("failed")}
                  >
                    Payment failed
                  </button>
                  <button type="button" data-outcome="taken" onClick={() => applyOutcome("taken")}>
                    Villa no longer available
                  </button>
                </div>
              </details>
              <button
                type="button"
                className="text-back back-icon"
                aria-label="Back to payment review"
                title="Back to payment review"
                onClick={() => showScreen("review")}
              >
                ←
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {screen === "paymentPending" ? (
        <section id="paymentPending" className="booking-screen">
          <div className="wrap booking-wrap">
            {flowHeader(STEP.paymentPending)}
            <div className="state-screen">
              <div className="state-symbol pending" aria-hidden="true">
                ◷
              </div>
              <div className="aside-label">PAYMENT PENDING</div>
              <h2>Payment is pending</h2>
              <p>The payment provider has not confirmed this transaction yet. Do not pay again.</p>
              <p className="state-reference">Villa {selected}</p>
              <button
                type="button"
                className="booking-primary state-action"
                onClick={() =>
                  setFeedback(
                    "This preview is not connected to the payment provider, so a live status cannot be checked.",
                  )
                }
              >
                Check status
              </button>
              <p className="state-feedback" role="status" hidden={!feedback}>
                {feedback}
              </p>
              <button
                type="button"
                className="text-back back-icon"
                aria-label="Back to payment preview"
                title="Back to payment preview"
                onClick={() => showScreen("processing")}
              >
                ←
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {screen === "paymentFailed" ? (
        <section id="paymentFailed" className="booking-screen">
          <div className="wrap booking-wrap">
            {flowHeader(STEP.paymentFailed)}
            <div className="state-screen">
              <div className="state-symbol failed" aria-hidden="true">
                ×
              </div>
              <div className="aside-label">PAYMENT FAILED</div>
              <h2>Payment didn’t go through</h2>
              <p>
                No booking has been created. You can return to payment review or choose another
                villa.
              </p>
              <p className="state-reference">Villa {selected}</p>
              <button
                type="button"
                className="booking-primary state-action"
                onClick={() => showScreen("review")}
              >
                Try payment again
              </button>
              <button
                type="button"
                className="text-back back-icon"
                aria-label="Back to master plan"
                title="Back to master plan"
                onClick={() => showScreen("explore")}
              >
                ←
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {screen === "villaTaken" ? (
        <section id="villaTaken" className="booking-screen">
          <div className="wrap booking-wrap">
            {flowHeader(STEP.villaTaken)}
            <div className="state-screen taken-screen">
              <div className="state-symbol pending" aria-hidden="true">
                !
              </div>
              <div className="aside-label">AVAILABILITY CHANGED</div>
              <h2>{takenTitle}</h2>
              <p>Choose another available villa to continue.</p>
              <div className="similar-villas">
                {suggestions.length ? (
                  suggestions.map((match) => (
                    <button key={match.id} type="button" onClick={() => openVilla(match.id)}>
                      {match.id}
                    </button>
                  ))
                ) : (
                  <p className="form-note">No similar villas are currently available.</p>
                )}
              </div>
              <button
                type="button"
                className="text-back back-icon"
                aria-label="Back to master plan"
                title="Back to master plan"
                onClick={() => showScreen("explore")}
              >
                ←
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {screen === "confirmation" ? (
        <section id="confirmation" className="booking-screen">
          <div className="wrap booking-wrap">
            {flowHeader(STEP.confirmation)}
            <div className="state-screen confirmation-screen">
              <div className="state-symbol success" aria-hidden="true">
                ✓
              </div>
              <div className="aside-label">DEMO CONFIRMATION</div>
              <h2>Booking flow complete</h2>
              <p>This is a design preview. No real payment or booking has been created.</p>
              <div className="confirmation-data">
                <div className="aside-row">
                  <span>Villa</span>
                  <b>{confirmation.villa}</b>
                </div>
                <div className="aside-row">
                  <span>Buyer</span>
                  <b>{confirmation.buyer}</b>
                </div>
                <div className="aside-row">
                  <span>Reference</span>
                  <b>{confirmation.reference}</b>
                </div>
                <div className="aside-row">
                  <span>Payment</span>
                  <b>Not collected</b>
                </div>
              </div>
              <button
                type="button"
                className="booking-primary state-action"
                onClick={downloadReceipt}
              >
                Download summary <span aria-hidden="true">↓</span>
              </button>
              <button type="button" className="text-back" onClick={() => showScreen("explore")}>
                Done
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
