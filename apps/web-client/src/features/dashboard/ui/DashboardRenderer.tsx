import type { DashboardPageResource, DashboardQuery } from "../model/dashboard-types.js";
import { lazy } from "react";

const CampaignManagementPage = lazy(() =>
  import("./pages/campaign/CampaignManagementPage.js").then((module) => ({
    default: module.CampaignManagementPage
  }))
);
const CampaignPerformancePage = lazy(() =>
  import("./pages/campaign/CampaignPerformancePage.js").then((module) => ({
    default: module.CampaignPerformancePage
  }))
);
const PromotionManagementPage = lazy(() =>
  import("./pages/campaign/promotion/PromotionManagementPage.js").then((module) => ({
    default: module.PromotionManagementPage
  }))
);
const SegmentManagementPage = lazy(() =>
  import("./pages/campaign/promotion/SegmentManagementPage.js").then((module) => ({
    default: module.SegmentManagementPage
  }))
);
const ExperimentManagementPage = lazy(() =>
  import("./pages/campaign/promotion/experiment/ExperimentManagementPage.js").then((module) => ({
    default: module.ExperimentManagementPage
  }))
);
const FunnelPage = lazy(() =>
  import("./pages/funnel/FunnelPage.js").then((module) => ({ default: module.FunnelPage }))
);
const MainPage = lazy(() =>
  import("./pages/main/MainPage.js").then((module) => ({ default: module.MainPage }))
);

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
    case "campaign-promotions":
    case "promotions":
      return <PromotionManagementPage data={resource.data} query={query} />;
    case "promotion-metrics":
      return (
        <PromotionManagementPage
          data={resource.data}
          query={{ ...query, promotionView: "performance" }}
        />
      );
    case "segments":
      return <SegmentManagementPage data={resource.data} query={query} />;
    case "experiments":
      return <ExperimentManagementPage data={resource.data} query={query} />;
    case "campaigns":
      return <CampaignManagementPage data={resource.data} query={query} />;
    case "campaign-metrics":
      return <CampaignPerformancePage data={resource.data} query={query} />;
  }
}
