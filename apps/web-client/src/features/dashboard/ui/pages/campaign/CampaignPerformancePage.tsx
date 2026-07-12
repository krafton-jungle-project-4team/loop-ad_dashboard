import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../model/dashboard-types.js";
import { CampaignPerformanceSections } from "./CampaignPerformanceSections.js";

export function CampaignPerformancePage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  return <CampaignPerformanceSections data={data} query={query} />;
}
