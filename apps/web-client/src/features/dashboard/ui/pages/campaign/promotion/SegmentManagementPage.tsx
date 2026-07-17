import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../../model/dashboard-types.js";
import { WorkspacePageHeader } from "../../../shared/WorkspaceViewTabs.js";
import { PromotionWorkspace } from "./PromotionComponent.js";

export function SegmentManagementPage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  return (
    <div className="grid gap-6">
      <WorkspacePageHeader
        description="고객군을 관리하고 고객군별 광고 실험을 시작해요."
        eyebrow="Segment workspace"
        title="고객군"
      />
      <PromotionWorkspace data={data} mode="segment" query={query} />
    </div>
  );
}
