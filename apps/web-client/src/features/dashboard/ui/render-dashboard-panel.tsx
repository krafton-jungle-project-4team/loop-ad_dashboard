import type { DashboardViewModel } from "../vm/dashboard-view-model.js";
import { AiGenerationPanel } from "./AiGenerationPanel.js";
import { AiInsightPanel } from "./AiInsightPanel.js";
import { MainDashboardPanel } from "./MainDashboardPanel.js";
import { PurchaseConversionPanel } from "./PurchaseConversionPanel.js";
import type { DashboardSort } from "../model/dashboard-types.js";

export function renderDashboardPanel(
  viewModel: DashboardViewModel,
  handlers: {
    filter: string;
    onSelectCustomer: (customerId: string) => void;
    onTableFilterChange: (filter: string) => void;
    onTableSortChange: (sort: DashboardSort) => void;
    sort: DashboardSort;
  }
) {
  const tableControls = {
    filter: handlers.filter,
    onFilterChange: handlers.onTableFilterChange,
    onSortChange: handlers.onTableSortChange,
    sort: handlers.sort
  };

  switch (viewModel.tab) {
    case "main":
      return <MainDashboardPanel viewModel={viewModel} />;
    case "purchaseConversion":
      return <PurchaseConversionPanel controls={tableControls} viewModel={viewModel} />;
    case "aiAnalysis":
      return (
        <AiInsightPanel
          controls={tableControls}
          onSelectCustomer={handlers.onSelectCustomer}
          viewModel={viewModel}
        />
      );
    case "aiRecommendation":
      return (
        <AiInsightPanel
          controls={tableControls}
          onSelectCustomer={handlers.onSelectCustomer}
          viewModel={viewModel}
        />
      );
    case "aiGeneration":
      return <AiGenerationPanel viewModel={viewModel} />;
  }
}
