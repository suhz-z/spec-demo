import { Container } from "@/components/ui/container";

export default function PublicLoading() {
  return (
    <Container>
      <section className="sg-loading-state" aria-busy="true" aria-labelledby="sg-loading-title">
        <div className="sg-loading-state__header">
          <div>
            <p className="sg-eyebrow">Kottakkal · Kerala</p>
            <h1 id="sg-loading-title">Loading the villa layout</h1>
          </div>
          <span className="sg-loading-state__spinner" aria-hidden="true" />
        </div>
        <div className="sg-loading-state__map" aria-hidden="true">
          <div className="sg-loading-state__plots">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        </div>
        <p className="sg-visually-hidden" role="status">
          Loading published villa inventory.
        </p>
      </section>
    </Container>
  );
}
