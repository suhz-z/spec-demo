import { Container } from "@/components/ui/container";

const DEMO_PHONE = "+91 90000 00000";
const DEMO_PHONE_HREF = "tel:+919000000000";

function FooterContent({ className }: { className: string }) {
  return (
    <div className={className}>
      <div className="sg-footer__contact">
        <span className="sg-footer__label">Contact us</span>
        <span aria-hidden="true">—</span>
        <a href={DEMO_PHONE_HREF}>{DEMO_PHONE}</a>
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="sg-footer">
      <Container>
        <FooterContent className="sg-footer__inner" />
      </Container>
    </footer>
  );
}

export function FlowFooter() {
  return (
    <footer className="flow-footer">
      <FooterContent className="flow-footer__inner" />
    </footer>
  );
}
