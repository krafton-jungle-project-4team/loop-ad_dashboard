import type { DashboardViewModel } from "../vm/dashboard-view-model.js";
import { AiGenerationPanel } from "./AiGenerationPanel.js";
import { AiInsightPanel } from "./AiInsightPanel.js";
import { MainDashboardPanel } from "./MainDashboardPanel.js";
import { PurchaseConversionPanel } from "./PurchaseConversionPanel.js";

export function renderDashboardPanel(
  viewModel: DashboardViewModel,
  handlers: { onSelectCustomer: (customerId: string) => void }
) {
  switch (viewModel.tab) {
    case "main":
      return <MainDashboardPanel viewModel={viewModel} />;
    case "purchaseConversion":
      return <PurchaseConversionPanel viewModel={viewModel} />;
    case "aiAnalysis":
      return <AiInsightPanel onSelectCustomer={handlers.onSelectCustomer} viewModel={viewModel} />;
    case "aiRecommendation":
      return <AiInsightPanel onSelectCustomer={handlers.onSelectCustomer} viewModel={viewModel} />;
    case "aiGeneration":
      return <AiGenerationPanel viewModel={viewModel} />;
  }
}
