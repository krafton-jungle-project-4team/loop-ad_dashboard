import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../../model/dashboard-types.js";
import { PromotionWorkspace } from "./PromotionComponent.js";

export function SegmentManagementPage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  return <PromotionWorkspace data={data} mode="segment" query={query} />;
}
