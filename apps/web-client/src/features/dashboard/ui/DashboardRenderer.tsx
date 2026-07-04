import type { DashboardPageResource, DashboardQuery } from "../model/dashboard-types.js";
import { CampaignDashboardPanel } from "./CampaignDashboard.js";
import { FunnelDashboardPanel } from "./FunnelDashboard.js";
import { MainDashboardPanel } from "./MainDashboard.js";

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
