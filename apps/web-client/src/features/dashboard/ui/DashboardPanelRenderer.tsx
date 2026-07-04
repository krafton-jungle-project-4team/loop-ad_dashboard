import type { DashboardPageResource, DashboardQuery } from "../model/dashboard-types.js";
import { CampaignDashboardPanel } from "./CampaignDashboardPanel.js";
import { FunnelDashboardPanel } from "./FunnelDashboardPanel.js";
import { MainDashboardPanel } from "./MainDashboardPanel.js";

export function DashboardPanelRenderer({
  query,
  resource
}: {
  query: DashboardQuery;
  resource: DashboardPageResource;
}) {
  switch (resource.tab) {
    case "main":
    case "main-campaign-list":
      return <MainDashboardPanel data={resource.data} />;
    case "funnels":
    case "funnel-builder":
      return <FunnelDashboardPanel data={resource.data} query={query} />;
    case "campaigns":
    case "campaign-promotions":
    case "campaign-segments":
    case "campaign-experiment-metrics":
    case "campaign-promotion-metrics":
    case "campaign-metrics":
      return <CampaignDashboardPanel data={resource.data} query={query} tab={resource.tab} />;
  }
}
