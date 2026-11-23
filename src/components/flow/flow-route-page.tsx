import { ConfirmationPage } from "./confirmation-page";
import { DetailsPage } from "./details-page";
import type { FlowStepKey, Plot } from "./flow-data";
import { FloorPlanPage } from "./floor-plan-page";
import { PaymentFailedPage, PaymentPendingPage, PlotTakenPage } from "./payment-outcomes";
import { PaymentPage } from "./payment-page";
import { ReviewPage } from "./review-page";
import { SummaryPage } from "./summary-page";

export function FlowRoutePage({ plot, step }: { plot: Plot; step: FlowStepKey }) {
  switch (step) {
    case "floor-plan":
      return <FloorPlanPage plot={plot} />;
    case "summary":
      return <SummaryPage plot={plot} />;
    case "details":
      return <DetailsPage plot={plot} />;
    case "review":
      return <ReviewPage plot={plot} />;
    case "payment":
      return <PaymentPage plot={plot} />;
    case "payment/pending":
      return <PaymentPendingPage plot={plot} />;
    case "payment/failed":
      return <PaymentFailedPage plot={plot} />;
    case "payment/taken":
      return <PlotTakenPage plot={plot} />;
    case "confirmation":
      return <ConfirmationPage plot={plot} />;
    default:
      return null;
  }
}
