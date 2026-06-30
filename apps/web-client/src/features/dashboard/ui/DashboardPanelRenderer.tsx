import type { DashboardPageResource, DashboardQuery } from "../model/dashboard-types.js";
import { AiGenerationPanel } from "./AiGenerationPanel.js";
import { AiInsightPanel } from "./AiInsightPanel.js";
import { MainDashboardPanel } from "./MainDashboardPanel.js";
import { PurchaseConversionPanel } from "./PurchaseConversionPanel.js";

export function DashboardPanelRenderer({
  onSelectedCustomerIdChange,
  query,
  resource
}: {
  onSelectedCustomerIdChange: (selectedCustomerId: string) => void;
  query: DashboardQuery;
  resource: DashboardPageResource;
}) {
  switch (resource.tab) {
    case "main":
      return <MainDashboardPanel data={resource.data} />;
    case "purchaseConversion":
      return <PurchaseConversionPanel data={resource.data} />;
    case "aiAnalysis":
      return (
        <AiInsightPanel
          data={resource.data}
          mode="analysis"
          onSelectedCustomerIdChange={onSelectedCustomerIdChange}
          selectedCustomerId={query.selectedCustomerId}
        />
      );
    case "aiRecommendation":
      return (
        <AiInsightPanel
          data={resource.data}
          mode="recommendation"
          onSelectedCustomerIdChange={onSelectedCustomerIdChange}
          selectedCustomerId={query.selectedCustomerId}
        />
      );
    case "aiGeneration":
      return (
        <AiGenerationPanel
          data={resource.data}
          onSelectedCustomerIdChange={onSelectedCustomerIdChange}
          selectedCustomerId={query.selectedCustomerId}
        />
      );
  }
}
