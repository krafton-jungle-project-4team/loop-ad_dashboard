import type { DashboardMain } from "@loopad/shared";
import { Card, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardCampaignDetail,
  fetchDashboardSegmentDetail
} from "../../../../../api/dashboard-api.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardSegmentDetailQueryKey
} from "../../../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../../../model/dashboard-types.js";
import { EmptyState } from "../../../../shared/EmptyState.js";
import { ExperimentContent } from "./components/ExperimentContent.js";
import { selectExperimentSegment, toErrorMessage } from "./experimentUtils.js";

export function ExperimentComponent({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  const selectedCampaign = data.campaigns.find(
    (campaign) => campaign.campaign_id === query.selectedCampaignId
  );
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const detailQuery = useQuery({
    enabled: Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });
  const selectedSegment = selectExperimentSegment(detailQuery.data, query);
  const selectedSegmentId = selectedSegment?.segment_id ?? "";
  const selectedPromotionId = selectedSegment?.promotion_id ?? "";
  const segmentDetailQuery = useQuery({
    enabled: Boolean(selectedPromotionId && selectedSegmentId),
    queryFn: ({ signal }) =>
      fetchDashboardSegmentDetail(query, selectedPromotionId, selectedSegmentId, signal),
    queryKey: dashboardSegmentDetailQueryKey(
      query.projectId,
      selectedPromotionId,
      selectedSegmentId
    )
  });

  if (!selectedCampaign) {
    return <EmptyState message="실험을 확인할 캠페인이 없습니다." />;
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">실험</h1>
        <p className="text-sm text-muted-foreground">
          {selectedCampaign.campaign_name} 아래의 프로모션, 세그먼트, 실험 상태를 확인합니다.
        </p>
      </div>

      {detailQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>실험 데이터를 불러오지 못했습니다</CardTitle>
            <CardDescription>{toErrorMessage(detailQuery.error)}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ExperimentContent
          detail={detailQuery.data}
          isLoading={detailQuery.isFetching}
          query={query}
          selectedSegmentDetail={segmentDetailQuery.data}
          selectedSegmentDetailIsError={segmentDetailQuery.isError}
          selectedSegmentDetailIsLoading={segmentDetailQuery.isLoading}
          selectedSegmentId={selectedSegmentId}
        />
      )}
    </div>
  );
}
