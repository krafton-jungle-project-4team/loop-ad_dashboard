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
        description="프로모션별 타깃을 생성·관리하고 광고 실험을 세그먼트 단위로 운영합니다."
        eyebrow="Segment workspace"
        title="세그먼트"
      />
      <PromotionWorkspace data={data} mode="segment" query={query} />
    </div>
  );
}
