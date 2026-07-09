import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../../model/dashboard-types.js";
import { PromotionWorkspace } from "./PromotionComponent.js";

export function PromotionManagementPage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  return <PromotionWorkspace data={data} query={query} />;
}
