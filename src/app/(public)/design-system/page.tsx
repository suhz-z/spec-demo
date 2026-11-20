import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Container } from "@/components/ui/container";
import { StatusPill } from "@/components/ui/status-pill";
import { TextField } from "@/components/ui/text-field";

export const metadata: Metadata = {
  title: "Design system foundation",
  robots: {
    index: false,
    follow: false,
  },
};

const COLOURS = [
  { name: "Canvas", token: "--sg-canvas", value: "#f6f7f2", note: "Page background" },
  { name: "Surface", token: "--sg-surface", value: "#ffffff", note: "Cards and panels" },
  { name: "Ink", token: "--sg-ink", value: "#1c2922", note: "Primary text" },
  { name: "Ink muted", token: "--sg-ink-muted", value: "#5f6b62", note: "5.18:1 on canvas" },
  { name: "Brand", token: "--sg-brand", value: "#1f5945", note: "Primary action" },
  { name: "Line", token: "--sg-line", value: "#dfe5dc", note: "Borders and dividers" },
  { name: "Available", token: "--sg-available-bg", value: "#e4f0e4", note: "Status fill" },
  { name: "Reserved", token: "--sg-reserved-bg", value: "#f5ecd9", note: "Status fill" },
  { name: "Booked", token: "--sg-booked-bg", value: "#e9ece9", note: "Status fill" },
  { name: "Danger", token: "--sg-danger", value: "#a33f36", note: "Form errors" },
] as const;

const SPACING = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80] as const;

export default function DesignSystemPage() {
  return (
    <Container>
      <section className="sg-section" aria-labelledby="design-title">
        <p className="sg-kicker">Internal reference</p>
        <h1
          className="sg-hero__title"
          id="design-title"
          style={{ fontSize: "clamp(42px, 5vw, 64px)" }}
        >
          Design <em>foundation.</em>
        </h1>
        <p className="sg-hero__lede">
          Tokens and accessible primitives derived from the V3.4 wireframe and the UX specification.
          This page is a development reference, not public product content.
        </p>
      </section>

      <section className="sg-design-section" aria-labelledby="colour-title">
        <h2 id="colour-title">Colour</h2>
        <p>
          Source contrast failures were corrected for WCAG AA. Status colour is always paired with a
          visible text label.
        </p>
        <div className="sg-swatch-grid">
          {COLOURS.map((colour) => (
            <article className="sg-swatch" key={colour.token}>
              <div className="sg-swatch__color" style={{ background: colour.value }} />
              <div className="sg-swatch__meta">
                <strong>{colour.name}</strong>
                <span>{colour.token}</span>
                <span>{colour.value}</span>
                <span>{colour.note}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sg-design-section" aria-labelledby="type-title">
        <h2 id="type-title">Typography</h2>
        <p>
          Inter/system sans for interface text, a serif italic accent for the landing headline, and
          tabular numerals for prices and areas.
        </p>
        <div className="sg-type-row">
          <span>Display · 500</span>
          <p
            style={{ fontSize: "clamp(34px, 5vw, 56px)", letterSpacing: "-0.06em", lineHeight: 1 }}
          >
            Find a place to feel{" "}
            <em style={{ fontFamily: "var(--sg-font-serif)", color: "var(--sg-brand)" }}>
              at home.
            </em>
          </p>
        </div>
        <div className="sg-type-row">
          <span>Heading · 500</span>
          <h2 style={{ fontSize: "32px", letterSpacing: "-0.05em" }}>Villa A-07 · 4 BHK</h2>
        </div>
        <div className="sg-type-row">
          <span>Body · 400</span>
          <p style={{ color: "var(--sg-ink-muted)", fontSize: "15px", lineHeight: 1.7 }}>
            Every room has a name, size, and specification. Availability is checked again before
            payment.
          </p>
        </div>
        <div className="sg-type-row">
          <span>Micro-label · 600</span>
          <p className="sg-eyebrow">Selected villa · indicative price</p>
        </div>
      </section>

      <section className="sg-design-section" aria-labelledby="spacing-title">
        <h2 id="spacing-title">Spacing</h2>
        <p>
          A 4px base scale. Optical alignment exceptions are allowed for borders and radii only.
        </p>
        <div className="sg-spacing-row">
          {SPACING.map((size) => (
            <div className="sg-spacing" key={size}>
              <i style={{ width: `${size}px`, height: `${size}px` }} />
              <span>{size}px</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sg-design-section" aria-labelledby="buttons-title">
        <h2 id="buttons-title">Buttons</h2>
        <p>
          All actions have keyboard focus, disabled, and loading states. Touch targets are 48px
          minimum.
        </p>
        <div className="sg-demo-row">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost action</Button>
          <Button isLoading>Saving</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="sg-design-section" aria-labelledby="status-title">
        <h2 id="status-title">Status labels</h2>
        <p>Colour is supplementary. Each status always includes its word.</p>
        <div className="sg-demo-row">
          <StatusPill status="available" />
          <StatusPill status="reserved" />
          <StatusPill status="booked" />
        </div>
      </section>

      <section className="sg-design-section" aria-labelledby="forms-title">
        <h2 id="forms-title">Form controls</h2>
        <p>
          Labels, hints, and errors are programmatically associated. Errors use a live region and do
          not rely on colour alone.
        </p>
        <div className="sg-demo-grid">
          <TextField
            label="Full name"
            name="demo-name"
            placeholder="Name as on ID"
            autoComplete="name"
            hint="Use the name shown on your ID."
          />
          <TextField
            label="Mobile number"
            name="demo-mobile"
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile number"
            autoComplete="tel-national"
            error="Enter a valid 10-digit mobile number."
          />
          <TextField
            label="Email"
            name="demo-email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled
            defaultValue="preview@example.com"
          />
          <Checkbox
            label="I accept the booking terms and conditions."
            name="demo-terms"
            hint="Demo control only. The final terms require client approval."
          />
        </div>
      </section>

      <section className="sg-design-section" aria-labelledby="a11y-title">
        <h2 id="a11y-title">Accessibility rules</h2>
        <ul className="sg-note" style={{ paddingLeft: "20px" }}>
          <li>WCAG 2.2 AA contrast: 4.5:1 for normal text, 3:1 for large text and boundaries.</li>
          <li>Visible 2px focus ring with offset; never removed without replacement.</li>
          <li>Keyboard operation for maps, rooms, filters, sheets, and forms.</li>
          <li>Semantic status text and live regions; no colour-only meaning.</li>
          <li>44px minimum touch targets and reduced-motion support.</li>
          <li>Errors linked with aria-describedby and announced with role=alert.</li>
        </ul>
      </section>
    </Container>
  );
}
