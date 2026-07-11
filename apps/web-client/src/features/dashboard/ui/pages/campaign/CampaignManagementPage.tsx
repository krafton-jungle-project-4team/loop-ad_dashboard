import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../model/dashboard-types.js";
import { CampaignWorkspacePage } from "./workspace/CampaignWorkspacePage.js";

export function CampaignManagementPage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  return <CampaignWorkspacePage data={data} query={query} />;
}
