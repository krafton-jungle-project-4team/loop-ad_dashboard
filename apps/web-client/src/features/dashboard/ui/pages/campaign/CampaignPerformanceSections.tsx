import type {
  DashboardAdExperiment,
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardMain
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Progress } from "@loopad/ui/shadcn/progress";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardCampaignDetail,
  fetchDashboardFunnelList
} from "../../../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../../../model/dashboard-format.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardFunnelListQueryKey
} from "../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../model/dashboard-types.js";
import { EmptyState } from "../../shared/EmptyState.js";
import { ScopedFunnelAnalysisPanel } from "../../shared/ScopedFunnelAnalysisPanel.js";

export function CampaignPerformanceSections({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  const selectedCampaign = data.campaigns.find(
    (campaign) => campaign.campaign_id === query.selectedCampaignId
  );
  const campaignId = selectedCampaign?.campaign_id ?? "";
  const campaignDetail = useQuery({
    enabled: Boolean(campaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, campaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, campaignId)
  });
  const funnelList = useQuery({
    enabled: Boolean(campaignId),
    queryFn: ({ signal }) => fetchDashboardFunnelList(query, signal),
    queryKey: dashboardFunnelListQueryKey(query.projectId)
  });

  return (
    <Card className="w-full min-w-0 bg-white py-5 shadow-none">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          캠페인 통계
        </CardTitle>
        <CardDescription>
          실시간 추이, 사용자 경로, 실험 평가 결과를 기준으로 캠페인 통계를 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 px-5">
        {campaignDetail.isError ? (
          <Alert variant="destructive">
            <AlertTitle>캠페인 데이터를 불러오지 못했습니다</AlertTitle>
            <AlertDescription>
              {campaignDetail.error?.message ?? "API 요청에 실패했습니다."}
            </AlertDescription>
          </Alert>
        ) : null}
        {!selectedCampaign ? <EmptyState message="통계를 확인할 캠페인을 선택해주세요." /> : null}
        {selectedCampaign && campaignDetail.isLoading ? (
          <EmptyState message="캠페인 데이터를 불러오는 중입니다." />
        ) : null}
        {campaignDetail.data ? (
          <>
            <CampaignRealtimeTrend detail={campaignDetail.data} />
            <ScopedFunnelAnalysisPanel
              error={funnelList.error}
              funnels={funnelList.data?.funnels ?? []}
              isError={funnelList.isError}
              isLoading={funnelList.isLoading}
              query={query}
              scope={{ campaign_id: campaignId, scope_type: "campaign" }}
              title="캠페인 사용자 경로 분석"
            />
            <EvaluationOutcomePanel
              adExperiments={campaignDetail.data.ad_experiments}
              metrics={campaignDetail.data.experiment_metrics}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CampaignRealtimeTrend({ detail }: { detail: DashboardCampaignDetail }) {
  const achievementRate = detail.campaign.latest_goal_achievement_rate ?? 0;

  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">실시간 추이</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryItem label="목표 달성률" value={formatPercent(achievementRate)} />
        <SummaryItem label="프로모션 집계" value={formatInteger(detail.promotions.length)} />
        <SummaryItem
          label="실시간 이벤트"
          value={formatInteger(detail.realtime_metrics.total_event_count)}
        />
      </div>
      <Progress value={Math.min(achievementRate * 100, 100)} />
    </section>
  );
}

function EvaluationOutcomePanel({
  adExperiments,
  metrics
}: {
  adExperiments: DashboardAdExperiment[];
  metrics: DashboardCampaignExperimentMetric[];
}) {
  const experimentsById = new Map(
    adExperiments.map((experiment) => [experiment.ad_experiment_id, experiment])
  );
  const evaluationMetrics = metrics.filter((metric) => {
    if (!metric.ad_experiment_id) {
      return false;
    }
    if (metric.segment_id !== "seg_existing_all") {
      return true;
    }
    const assignmentCount = experimentsById.get(metric.ad_experiment_id)?.assignment_count ?? 0;
    return (
      assignmentCount > 0 ||
      metric.sample_size > 0 ||
      metric.denominator_count > 0 ||
      metric.numerator_count > 0
    );
  });
  const goalMetCount = evaluationMetrics.filter((metric) => metric.status === "goal_met").length;
  const goalNotMetMetrics = evaluationMetrics.filter((metric) => metric.status === "goal_not_met");
  const insufficientMetrics = evaluationMetrics.filter(
    (metric) => metric.status === "insufficient_data"
  );
  const nextLoopMetrics = evaluationMetrics.filter((metric) => metric.next_loop_required);
  const failedSegmentIds = uniqueValues(goalNotMetMetrics.map((metric) => metric.segment_id));
  const failedExperimentIds = uniqueValues(
    goalNotMetMetrics.map((metric) => metric.ad_experiment_id)
  );

  if (evaluationMetrics.length === 0) {
    return <EmptyState message="종료 후 결과를 표시할 실험 평가가 없습니다." />;
  }

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">종료 후 결과 / 재실험 흐름</h3>
        <p className="text-sm text-muted-foreground">
          프로모션 평가 기준으로 목표 미달 세그먼트만 다음 루프 후보로 분리합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="평가 완료" value={formatInteger(evaluationMetrics.length)} />
        <SummaryItem label="목표 달성" value={formatInteger(goalMetCount)} />
        <SummaryItem label="목표 미달" value={formatInteger(goalNotMetMetrics.length)} />
        <SummaryItem label="표본 부족" value={formatInteger(insufficientMetrics.length)} />
        <SummaryItem label="다음 루프 후보" value={formatInteger(nextLoopMetrics.length)} />
        <SummaryItem label="실패 세그먼트" value={formatInteger(failedSegmentIds.length)} />
        <SummaryItem label="실패 실험" value={formatInteger(failedExperimentIds.length)} />
      </div>
      {nextLoopMetrics.length === 0 ? (
        <Alert>
          <AlertTitle>재실험 후보 없음</AlertTitle>
          <AlertDescription>
            목표 미달 상태의 평가가 없거나 다음 루프 필요 여부가 false입니다.
          </AlertDescription>
        </Alert>
      ) : null}
      {insufficientMetrics.length > 0 ? (
        <Alert>
          <AlertTitle>표본 부족은 자동 재실험 대상에서 분리합니다</AlertTitle>
          <AlertDescription>
            표본 부족은 판단 보류 상태이므로 사용자가 다시 실험하기를 선택할 때만 다음 루프 대상으로
            다룹니다.
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function uniqueValues(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
