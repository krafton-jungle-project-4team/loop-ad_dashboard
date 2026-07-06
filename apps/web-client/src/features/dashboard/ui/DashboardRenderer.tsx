import type { DashboardPageResource, DashboardQuery } from "../model/dashboard-types.js";
import { CampaignDashboardPanel } from "./CampaignDashboard.js";
import { CampaignFlowMapPanel } from "./CampaignFlowMapPanel.js";
import { ExperimentDashboardPanel } from "./ExperimentDashboard.js";
import { FunnelDashboardPanel } from "./FunnelDashboard.js";
import { MainDashboardPanel } from "./MainDashboard.js";
import { PromotionPanel } from "./Promotion.js";

export function DashboardPanelRenderer({
  query,
  resource
}: {
  query: DashboardQuery;
  resource: DashboardPageResource;
}) {
  switch (resource.tab) {
    case "main":
      return <MainDashboardPanel data={resource.data} />;
    case "funnels":
      return <FunnelDashboardPanel data={resource.data} query={query} />;
    case "campaign-flow-map":
      return <CampaignFlowMapPanel data={resource.data} query={query} />;
    case "campaign-promotions":
      return <PromotionPanel data={resource.data} query={query} />;
    case "experiments":
      return <ExperimentDashboardPanel data={resource.data} query={query} />;
    case "campaigns":
    case "campaign-metrics":
      return <CampaignDashboardPanel data={resource.data} query={query} tab={resource.tab} />;
  }
}
