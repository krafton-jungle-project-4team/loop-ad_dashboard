import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery, DashboardTab } from "../../../model/dashboard-types.js";
import { CampaignPageSections } from "./CampaignDetailSections.js";

export function CampaignDetailPage({
  data,
  query,
  tab = "campaign-detail"
}: {
  data: DashboardMain;
  query: DashboardQuery;
  tab?: Extract<DashboardTab, "campaign-detail" | "campaign-metrics">;
}) {
  return <CampaignPageSections data={data} query={query} tab={tab} />;
}
