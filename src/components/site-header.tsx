import Link from "next/link";

import { SiteBrand } from "@/components/site-brand";
import { SiteMenu } from "@/components/site-menu";
import { Container } from "@/components/ui/container";

export function SiteHeader() {
  return (
    <header className="sg-header">
      <Container>
        <div className="sg-header__inner">
          <SiteBrand className="sg-brand" />

          <div className="sg-nav">
            <span className="sg-header__location">Moolaparambu · Kerala</span>
            <nav aria-label="Primary">
              <Link href="/plots">Explore plots</Link>
            </nav>
          </div>
          <SiteMenu />
        </div>
      </Container>
    </header>
  );
}
