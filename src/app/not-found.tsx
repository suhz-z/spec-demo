import Link from "next/link";

import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <main className="sg-container sg-section" id="main-content">
      <p className="sg-kicker">Page not found</p>
      <h1 className="sg-section__title">We couldn&apos;t find that page.</h1>
      <p className="sg-hero__lede" style={{ marginTop: "16px" }}>
        The link may be out of date. Return to the project home or explore the design foundation.
      </p>
      <div className="sg-actions">
        <ButtonLink href="/">Back to home</ButtonLink>
        <ButtonLink href="/design-system" variant="secondary">
          Design foundation
        </ButtonLink>
      </div>
      <p className="sg-note" style={{ marginTop: "24px" }}>
        Looking for a booking? <Link href="/">Start from the master layout.</Link>
      </p>
    </main>
  );
}
