import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../model/dashboard-types.js";
import { WorkspacePageHeader, WorkspaceViewTabs } from "../../shared/WorkspaceViewTabs.js";
import { ExperimentComponent } from "./promotion/experiment/ExperimentComponent.js";
import { CampaignPageSections } from "./CampaignComponent.js";

const campaignViews = [
  { label: "관리", value: "manage" },
  { label: "개요", value: "overview" },
  { label: "성과", value: "performance" },
  { label: "실험 현황", value: "experiments" }
] as const;

export function CampaignManagementPage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  return (
    <div className="grid gap-6">
      <WorkspacePageHeader
        description="캠페인을 생성·관리하고 목표, 성과, 하위 실험을 한 작업 공간에서 확인합니다."
        eyebrow="Campaign workspace"
        title="캠페인"
      />
      <WorkspaceViewTabs
        ariaLabel="캠페인 작업 탭"
        items={campaignViews}
        queryKey="campaignView"
        value={query.campaignView}
      />
      {query.campaignView === "manage" ? (
        <CampaignPageSections data={data} query={query} tab="campaigns" />
      ) : null}
      {query.campaignView === "overview" ? (
        <CampaignPageSections data={data} query={query} tab="campaign-detail" />
      ) : null}
      {query.campaignView === "performance" ? (
        <CampaignPageSections data={data} query={query} tab="campaign-metrics" />
      ) : null}
      {query.campaignView === "experiments" ? (
        <ExperimentComponent data={data} query={query} />
      ) : null}
    </div>
  );
}
