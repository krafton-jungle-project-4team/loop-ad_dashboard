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
        description="세그먼트를 관리하고 세그먼트별 광고 실험을 시작해요."
        eyebrow="Segment workspace"
        title="세그먼트"
      />
      <PromotionWorkspace data={data} mode="segment" query={query} />
    </div>
  );
}
