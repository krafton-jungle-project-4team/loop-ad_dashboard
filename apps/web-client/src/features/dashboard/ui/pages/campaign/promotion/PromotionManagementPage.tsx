import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../../model/dashboard-types.js";
import { WorkspacePageHeader, WorkspaceViewTabs } from "../../../shared/WorkspaceViewTabs.js";
import { PromotionWorkspace } from "./PromotionComponent.js";

const promotionViews = [
  { label: "관리", value: "manage" },
  { label: "개요", value: "overview" }
] as const;

export function PromotionManagementPage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  return (
    <div className="grid gap-6">
      <WorkspacePageHeader
        description="선택한 캠페인의 프로모션을 관리하고 채널별 목표와 성과를 확인합니다."
        eyebrow="Promotion workspace"
        title="프로모션"
      />
      <WorkspaceViewTabs
        ariaLabel="프로모션 작업 탭"
        items={promotionViews}
        queryKey="promotionView"
        value={query.promotionView}
      />
      <PromotionWorkspace data={data} query={query} />
    </div>
  );
}
