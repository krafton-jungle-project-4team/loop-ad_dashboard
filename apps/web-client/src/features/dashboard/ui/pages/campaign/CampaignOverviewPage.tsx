import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../model/dashboard-types.js";
import { CampaignPageSections } from "./CampaignComponent.js";

export function CampaignOverviewPage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  return <CampaignPageSections data={data} query={query} tab="campaign-detail" />;
}
