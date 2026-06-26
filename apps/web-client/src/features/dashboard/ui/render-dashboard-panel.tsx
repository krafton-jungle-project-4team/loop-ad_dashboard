import {
  CreativeReportSchema,
  InsightReportSchema,
  RecommendationReportSchema
} from "@loopad/shared";
import type {
  DashboardAiJobState,
  DashboardResources,
  DashboardTab
} from "../model/dashboard-types.js";
import { AiJobPanel } from "./AiJobPanel.js";
import { ConversionPanel } from "./ConversionPanel.js";
import { CreativesPanel } from "./CreativesPanel.js";
import { InsightsPanel } from "./InsightsPanel.js";
import { OverviewPanel } from "./OverviewPanel.js";
import { RecommendationsPanel } from "./RecommendationsPanel.js";

export function renderDashboardPanel(
  tab: DashboardTab,
  data: DashboardResources,
  aiJobState: DashboardAiJobState
) {
  switch (tab) {
    case "overview":
      return <OverviewPanel overview={data.overview} />;
    case "conversion":
      return <ConversionPanel conversion={data.conversion} />;
    case "insights":
      return (
        <AiJobPanel state={aiJobState} schema={InsightReportSchema}>
          {(insights) => <InsightsPanel insights={insights} />}
        </AiJobPanel>
      );
    case "recommendations":
      return (
        <AiJobPanel state={aiJobState} schema={RecommendationReportSchema}>
          {(recommendations) => <RecommendationsPanel recommendations={recommendations} />}
        </AiJobPanel>
      );
    case "creatives":
      return (
        <AiJobPanel state={aiJobState} schema={CreativeReportSchema}>
          {(creatives) => <CreativesPanel creatives={creatives} />}
        </AiJobPanel>
      );
  }
}
