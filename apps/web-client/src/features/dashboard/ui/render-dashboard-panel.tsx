import type { DashboardPageResource } from "../model/dashboard-types.js";
import { AiGenerationPanel } from "./AiGenerationPanel.js";
import { AiInsightPanel } from "./AiInsightPanel.js";
import { MainDashboardPanel } from "./MainDashboardPanel.js";
import { PurchaseConversionPanel } from "./PurchaseConversionPanel.js";

export function renderDashboardPanel(resource: DashboardPageResource) {
  switch (resource.tab) {
    case "main":
      return <MainDashboardPanel data={resource.data} />;
    case "purchaseConversion":
      return <PurchaseConversionPanel data={resource.data} />;
    case "aiAnalysis":
      return <AiInsightPanel data={resource.data} mode="analysis" />;
    case "aiRecommendation":
      return <AiInsightPanel data={resource.data} mode="recommendation" />;
    case "aiGeneration":
      return <AiGenerationPanel data={resource.data} />;
  }
}
