import Link from "next/link";

import { Container } from "@/components/ui/container";

export function SiteHeader() {
  return (
    <header className="sg-header">
      <Container>
        <div className="sg-header__inner">
          <Link className="sg-brand" href="/" aria-label="Spectra Gardens home">
            <span className="sg-brand__mark" aria-hidden="true" />
            <span className="sg-brand__copy">
              <strong>SPECTRA</strong>
              <span>GARDENS</span>
            </span>
          </Link>

          <div className="sg-nav">
            <span className="sg-header__location">Moolaparambu · Kerala</span>
            <nav aria-label="Primary">
              <Link href="/plots">Explore plots</Link>
            </nav>
          </div>
        </div>
      </Container>
    </header>
  );
}
