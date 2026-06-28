import type { DashboardResources, DashboardTab } from "../model/dashboard-types.js";
import { EventsSummaryPanel } from "./EventsSummaryPanel.js";
import { ExperimentPanel } from "./ExperimentPanel.js";
import { FunnelPanel } from "./FunnelPanel.js";
import { RecommendationsPanel } from "./RecommendationsPanel.js";

export function renderDashboardPanel(tab: DashboardTab, data: DashboardResources) {
  switch (tab) {
    case "events":
      return <EventsSummaryPanel summary={data.eventsSummary} />;
    case "funnel":
      return <FunnelPanel funnel={data.funnel} />;
    case "recommendations":
      return <RecommendationsPanel recommendations={data.recommendations} />;
    case "experiment":
      return (
        <ExperimentPanel experiment={data.experiment} performance={data.experimentPerformance} />
      );
  }
}
