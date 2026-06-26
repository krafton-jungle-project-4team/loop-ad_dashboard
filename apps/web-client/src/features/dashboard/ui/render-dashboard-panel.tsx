import type { DashboardResources, DashboardTab } from "../model/dashboard-types.js";
import { ConversionPanel } from "./ConversionPanel.js";
import { CreativesPanel } from "./CreativesPanel.js";
import { InsightsPanel } from "./InsightsPanel.js";
import { OverviewPanel } from "./OverviewPanel.js";
import { RecommendationsPanel } from "./RecommendationsPanel.js";

export function renderDashboardPanel(tab: DashboardTab, data: DashboardResources) {
  switch (tab) {
    case "overview":
      return <OverviewPanel overview={data.overview} />;
    case "conversion":
      return <ConversionPanel conversion={data.conversion} />;
    case "insights":
      return <InsightsPanel insights={data.insights} />;
    case "recommendations":
      return <RecommendationsPanel recommendations={data.recommendations} />;
    case "creatives":
      return <CreativesPanel creatives={data.creatives} />;
  }
}
