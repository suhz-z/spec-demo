import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="sg-footer">
      <Container>
        <div className="sg-footer__inner">
          <div className="sg-footer__meta">
            <strong>Spectra Gardens</strong>
            <span>Moolaparambu, Kerala</span>
            <span>Confirm availability and terms before making a purchase decision.</span>
          </div>
          <div>
            <a href="#main-content">Back to top</a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
