import type { DashboardPageResource, DashboardQuery } from "../model/dashboard-types.js";
import { CampaignManagementPage } from "./pages/campaign/CampaignManagementPage.js";
import { CampaignOverviewPage } from "./pages/campaign/CampaignOverviewPage.js";
import { CampaignPerformancePage } from "./pages/campaign/CampaignPerformancePage.js";
import { PromotionManagementPage } from "./pages/campaign/promotion/PromotionManagementPage.js";
import { PromotionMetricsPage } from "./pages/campaign/promotion/PromotionMetricsPage.js";
import { SegmentManagementPage } from "./pages/campaign/promotion/SegmentManagementPage.js";
import { ExperimentManagementPage } from "./pages/campaign/promotion/experiment/ExperimentManagementPage.js";
import { FunnelPage } from "./pages/funnel/FunnelPage.js";
import { MainPage } from "./pages/main/MainPage.js";
import { WorkflowMapPage } from "./pages/workflow-map/WorkflowMapPage.js";

export function DashboardPanelRenderer({
  query,
  resource
}: {
  query: DashboardQuery;
  resource: DashboardPageResource;
}) {
  switch (resource.tab) {
    case "main":
      return <MainPage data={resource.data} query={query} />;
    case "funnels":
      return <FunnelPage data={resource.data} query={query} />;
    case "campaign-flow-map":
      return <WorkflowMapPage data={resource.data} query={query} />;
    case "campaign-promotions":
      return <PromotionManagementPage data={resource.data} query={query} />;
    case "promotion-metrics":
      return <PromotionMetricsPage data={resource.data} query={query} />;
    case "segments":
      return <SegmentManagementPage data={resource.data} query={query} />;
    case "experiments":
      return <ExperimentManagementPage data={resource.data} query={query} />;
    case "campaigns":
      return <CampaignManagementPage data={resource.data} query={query} />;
    case "campaign-detail":
      return <CampaignOverviewPage data={resource.data} query={query} />;
    case "campaign-metrics":
      return <CampaignPerformancePage data={resource.data} query={query} />;
  }
}
