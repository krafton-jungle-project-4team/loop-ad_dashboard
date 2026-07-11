import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../../model/dashboard-types.js";
import { WorkspacePageHeader, WorkspaceViewTabs } from "../../../shared/WorkspaceViewTabs.js";
import { PromotionWorkspace } from "./PromotionComponent.js";

const segmentViews = [
  { label: "관리", value: "manage" },
  { label: "세그먼트 생성", value: "recommendations" },
  { label: "실험 생성", value: "experiments" }
] as const;

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
      <WorkspaceViewTabs
        ariaLabel="세그먼트 작업 탭"
        items={segmentViews}
        queryKey="segmentView"
        value={query.segmentView}
      />
      <PromotionWorkspace data={data} mode="segment" query={query} />
    </div>
  );
}
