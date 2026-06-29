import type { DashboardPageResource } from "../model/dashboard-types.js";
import { ContentResultsPanel } from "./ContentResultsPanel.js";
import { EventsSummaryPanel } from "./EventsSummaryPanel.js";
import { ExperimentPanel } from "./ExperimentPanel.js";
import { FunnelPanel } from "./FunnelPanel.js";
import { RecommendationsPanel } from "./RecommendationsPanel.js";

export function renderDashboardPanel(resource: DashboardPageResource) {
  switch (resource.tab) {
    case "dashboard":
      return <EventsSummaryPanel summary={resource.data} />;
    case "funnelSegments":
      return <FunnelPanel funnel={resource.data} />;
    case "recommendationResults":
      return <RecommendationsPanel recommendations={resource.data} />;
    case "contentResults":
      return <ContentResultsPanel recommendations={resource.data} />;
    case "experimentPerformance":
      return (
        <ExperimentPanel
          experiment={resource.data.experiment}
          performance={resource.data.performance}
        />
      );
  }
}
