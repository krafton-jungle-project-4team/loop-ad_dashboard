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
    <Card className="w-full min-w-0 bg-card py-5 shadow-none">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-foreground">
          캠페인 통계
        </CardTitle>
        <CardDescription>
          실시간 추이, 사용자 경로, 실험 평가 결과를 함께 볼 수 있어요.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 px-5">
        {campaignDetail.isError ? (
          <Alert variant="destructive">
            <AlertTitle>캠페인 성과를 불러오지 못했어요</AlertTitle>
            <AlertDescription>
              {campaignDetail.error?.message ?? "잠시 후 다시 시도해 주세요."}
            </AlertDescription>
          </Alert>
        ) : null}
        {!selectedCampaign ? <EmptyState message="성과를 확인할 캠페인을 선택해 주세요." /> : null}
        {selectedCampaign && campaignDetail.isLoading ? (
          <EmptyState message="캠페인 성과를 불러오고 있어요." />
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
      <h3 className="text-base font-semibold text-foreground">실시간 추이</h3>
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
    return <EmptyState message="아직 완료된 실험 평가가 없어요." />;
  }

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-foreground">완료된 실험과 재실험</h3>
        <p className="text-sm text-muted-foreground">
          목표에 미치지 못한 고객군만 다음 반복 실험 후보로 보여 줘요.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="평가 완료" value={formatInteger(evaluationMetrics.length)} />
        <SummaryItem label="목표 달성" value={formatInteger(goalMetCount)} />
        <SummaryItem label="목표 미달" value={formatInteger(goalNotMetMetrics.length)} />
        <SummaryItem label="대상 부족" value={formatInteger(insufficientMetrics.length)} />
        <SummaryItem label="반복 실험 후보" value={formatInteger(nextLoopMetrics.length)} />
        <SummaryItem label="실패 고객군" value={formatInteger(failedSegmentIds.length)} />
        <SummaryItem label="실패 실험" value={formatInteger(failedExperimentIds.length)} />
      </div>
      {nextLoopMetrics.length === 0 ? (
        <Alert>
          <AlertTitle>다시 실험할 대상이 없어요</AlertTitle>
          <AlertDescription>
            목표에 미치지 못한 평가가 없어 다시 실험할 대상이 없어요.
          </AlertDescription>
        </Alert>
      ) : null}
      {insufficientMetrics.length > 0 ? (
        <Alert>
          <AlertTitle>대상이 부족한 실험은 따로 확인해 주세요</AlertTitle>
          <AlertDescription>
            대상이 부족한 실험은 바로 이어가지 않아요. 다시 실험하기를 선택했을 때만 후보로
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
