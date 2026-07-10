import {
  type DashboardAdExperiment,
  type DashboardCampaignDetail,
  type DashboardCampaignExperimentMetric,
  type DashboardCampaignSummary,
  type DashboardFunnelList,
  type DashboardMain
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Progress } from "@loopad/ui/shadcn/progress";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, FolderOpen, Pencil, Target } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createDashboardCampaign,
  deleteDashboardCampaign,
  fetchDashboardCampaignDetail,
  fetchDashboardFunnelList,
  updateDashboardCampaign
} from "../../../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../../../model/dashboard-format.js";
import { useDashboardQueryState } from "../../../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardFunnelListQueryKey
} from "../../../model/dashboard-query-keys.js";
import { formatMetricLabel, formatStatusLabel } from "../../../model/dashboard-labels.js";
import type { DashboardQuery, DashboardTab } from "../../../model/dashboard-types.js";
import { CampaignPromotionTable } from "./promotion/components/CampaignPromotionTable.js";
import { CampaignFormDialog } from "./components/CampaignFormDialog.js";
import { EmptyState } from "../../shared/EmptyState.js";
import { ScopedFunnelAnalysisPanel } from "../../shared/ScopedFunnelAnalysisPanel.js";
import {
  EntityWorkspaceEmptyState,
  EntityWorkspaceMetricCard,
  EntityWorkspaceShell,
  EntityWorkspaceTabs
} from "../../shared/EntityWorkspace.js";

type CampaignFormDialogState = { mode: "create" } | { campaignId: string; mode: "edit" } | null;

export function CampaignPageSections({
  data,
  query,
  tab
}: {
  data: DashboardMain;
  query: DashboardQuery;
  tab: DashboardTab;
}) {
  const queryClient = useQueryClient();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const selectedPromotionId = query.selectedPromotionId;
  const showsCampaignDetail = tab !== "campaigns";
  const [campaignFormDialog, setCampaignFormDialog] = useState<CampaignFormDialogState>(null);
  const selectedCampaign =
    data.campaigns.find((campaign) => campaign.campaign_id === query.selectedCampaignId) ??
    data.campaigns[0];
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const editingCampaign =
    campaignFormDialog?.mode === "edit"
      ? data.campaigns.find((campaign) => campaign.campaign_id === campaignFormDialog.campaignId)
      : undefined;
  const campaignDetail = useQuery({
    enabled: showsCampaignDetail && Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });
  const funnelList = useQuery({
    enabled: showsCampaignDetail,
    queryFn: ({ signal }) => fetchDashboardFunnelList(query, signal),
    queryKey: dashboardFunnelListQueryKey(query.projectId)
  });
  const createCampaignMutation = useMutation({
    mutationFn: (requestBody: Parameters<typeof createDashboardCampaign>[1]) =>
      createDashboardCampaign(query, requestBody),
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({
        selectedCampaignId: campaign.campaign_id,
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
      setCampaignFormDialog(null);
    }
  });
  const updateCampaignMutation = useMutation({
    mutationFn: ({
      campaignId,
      requestBody
    }: {
      campaignId: string;
      requestBody: Parameters<typeof updateDashboardCampaign>[2];
    }) => updateDashboardCampaign(query, campaignId, requestBody),
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({
        selectedCampaignId: campaign.campaign_id,
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
      setCampaignFormDialog(null);
    }
  });
  const deleteCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => deleteDashboardCampaign(query, campaignId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (query.selectedCampaignId === result.campaign_id) {
        await setDashboardQueryState({
          selectedCampaignId: "",
          selectedPromotionId: "",
          selectedSegmentId: ""
        });
      }
      setCampaignFormDialog(null);
    }
  });

  useEffect(() => {
    if (selectedCampaign && query.selectedCampaignId !== selectedCampaign.campaign_id) {
      void setDashboardQueryState({
        selectedCampaignId: selectedCampaign.campaign_id,
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
    }
  }, [query.selectedCampaignId, selectedCampaign, setDashboardQueryState]);

  useEffect(() => {
    if (!campaignDetail.data || !selectedPromotionId) {
      return;
    }

    const hasSelectedPromotion = campaignDetail.data.promotions.some(
      (promotion) => promotion.promotion_id === selectedPromotionId
    );
    if (!hasSelectedPromotion) {
      void setDashboardQueryState({ selectedPromotionId: "", selectedSegmentId: "" });
    }
  }, [campaignDetail.data, selectedPromotionId, setDashboardQueryState]);

  const selectCampaign = (campaignId: string) => {
    void setDashboardQueryState({
      selectedCampaignId: campaignId,
      selectedPromotionId: "",
      selectedSegmentId: ""
    });
  };

  const openCampaignCreateDialog = () => {
    createCampaignMutation.reset();
    setCampaignFormDialog({ mode: "create" });
  };

  const openCampaignEditDialog = (campaignId: string) => {
    updateCampaignMutation.reset();
    deleteCampaignMutation.reset();
    selectCampaign(campaignId);
    setCampaignFormDialog({ campaignId, mode: "edit" });
  };

  return (
    <div className="grid gap-6">
      {tab === "campaigns" ? (
        <>
          <EntityWorkspaceShell
            chrome={
              <EntityWorkspaceTabs
                addLabel="캠페인 탭 추가"
                items={campaignWorkspaceTabs(data.campaigns)}
                onAdd={openCampaignCreateDialog}
                onClose={(item) => deleteCampaignMutation.mutate(item.campaign.campaign_id)}
                onSelect={(item) => selectCampaign(item.campaign.campaign_id)}
                selectedItemId={selectedCampaignId}
              />
            }
          >
            {data.campaigns.length > 0 && selectedCampaign ? (
              <CampaignManagementWorkspace
                campaign={selectedCampaign}
                onEdit={openCampaignEditDialog}
              />
            ) : (
              <EntityWorkspaceEmptyState
                actionLabel="캠페인 생성"
                description="새 캠페인을 생성하면 캠페인 탭으로 열립니다. 캠페인 단위로 프로모션, 세그먼트, 실험 현황을 관리할 수 있습니다."
                guideCards={[
                  {
                    icon: <FolderOpen className="size-5" />,
                    title: "캠페인 단위 관리",
                    value: "프로모션과 세그먼트를 캠페인 기준으로 묶어 관리합니다."
                  },
                  {
                    icon: <Target className="size-5" />,
                    title: "목표 지표 추적",
                    value: "주요 지표와 목표 달성률을 캠페인별로 확인합니다."
                  },
                  {
                    icon: <BarChart3 className="size-5" />,
                    title: "실험 현황 확인",
                    value: "하위 프로모션과 광고 실험 수를 같은 화면에서 확인합니다."
                  }
                ]}
                onAction={openCampaignCreateDialog}
                title="현재 캠페인이 없습니다."
              />
            )}
          </EntityWorkspaceShell>
          <CampaignFormDialog
            campaign={editingCampaign}
            createError={createCampaignMutation.error}
            createIsError={createCampaignMutation.isError}
            createIsPending={createCampaignMutation.isPending}
            mode={campaignFormDialog?.mode ?? "create"}
            onCreate={(requestBody) => createCampaignMutation.mutate(requestBody)}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setCampaignFormDialog(null);
              }
            }}
            onDelete={(campaignId) => deleteCampaignMutation.mutate(campaignId)}
            onUpdate={(campaignId, requestBody) =>
              updateCampaignMutation.mutate({ campaignId, requestBody })
            }
            open={Boolean(campaignFormDialog)}
            deleteError={deleteCampaignMutation.error}
            deleteIsError={deleteCampaignMutation.isError}
            deleteIsPending={deleteCampaignMutation.isPending}
            updateError={updateCampaignMutation.error}
            updateIsError={updateCampaignMutation.isError}
            updateIsPending={updateCampaignMutation.isPending}
          />
        </>
      ) : null}

      {showsCampaignDetail ? (
        <CampaignDetailPanel
          campaign={selectedCampaign}
          detail={campaignDetail.data}
          error={campaignDetail.error}
          isError={campaignDetail.isError}
          isLoading={campaignDetail.isLoading}
          funnelList={funnelList.data}
          funnelListError={funnelList.error}
          funnelListIsError={funnelList.isError}
          funnelListIsLoading={funnelList.isLoading}
          onSelectPromotion={(promotionId) => {
            void setDashboardQueryState({
              selectedPromotionId: promotionId,
              selectedSegmentId: ""
            });
          }}
          query={query}
          selectedPromotionId={selectedPromotionId}
          tab={tab}
        />
      ) : null}
    </div>
  );
}

function campaignWorkspaceTabs(campaigns: DashboardCampaignSummary[]) {
  return campaigns.map((campaign) => ({
    campaign,
    id: campaign.campaign_id,
    label: campaign.campaign_name
  }));
}

function CampaignManagementWorkspace({
  campaign,
  onEdit
}: {
  campaign: DashboardCampaignSummary;
  onEdit: (campaignId: string) => void;
}) {
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="text-sm font-medium text-[#3927d9]">캠페인 보기</div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#102033]">
            {campaign.campaign_name}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {campaign.objective ?? "목표 미등록"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant={statusBadgeVariant(campaign.status)}>
            {formatStatusLabel(campaign.status)}
          </Badge>
          <Button onClick={() => onEdit(campaign.campaign_id)} type="button" variant="outline">
            <Pencil data-icon="inline-start" />
            수정
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <EntityWorkspaceMetricCard label="기간" value={formatPeriod(campaign)} />
        <EntityWorkspaceMetricCard
          label="주요 지표"
          value={formatMetricLabel(campaign.primary_metric)}
        />
        <EntityWorkspaceMetricCard
          label="프로모션"
          value={formatInteger(campaign.promotion_count)}
        />
        <EntityWorkspaceMetricCard label="세그먼트" value={formatInteger(campaign.segment_count)} />
        <EntityWorkspaceMetricCard
          label="실험"
          value={formatInteger(campaign.ad_experiment_count)}
        />
      </div>
      <CampaignJourneyEfficiencyCard campaign={campaign} />
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">캠페인 운영 요약</CardTitle>
          <CardDescription>
            선택한 캠페인의 목표 달성률과 최근 변경 정보를 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <SummaryItem
            label="최근 목표 달성률"
            value={
              campaign.latest_goal_achievement_rate === null
                ? "-"
                : formatPercent(campaign.latest_goal_achievement_rate)
            }
          />
          <SummaryItem label="업데이트" value={campaign.updated_at} />
          <SummaryItem label="상태" value={formatStatusLabel(campaign.status)} />
        </CardContent>
      </Card>
    </section>
  );
}

function CampaignJourneyEfficiencyCard({ campaign }: { campaign: DashboardCampaignSummary }) {
  const achievementProgress = Math.min((campaign.latest_goal_achievement_rate ?? 0) * 100, 100);
  const periodProgress = campaignPeriodProgress(campaign);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>캠페인 사용자 여정 효율</CardTitle>
        <CardDescription>현재 캠페인 목표와 기간 진행 상태를 기준으로 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <CampaignProgressRow label="목표 달성" value={achievementProgress} />
        <CampaignProgressRow label="기간 진행" value={periodProgress} />
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryItem label="목표 지표" value={formatMetricLabel(campaign.primary_metric)} />
          <SummaryItem label="프로모션" value={formatInteger(campaign.promotion_count)} />
          <SummaryItem label="다음 상태" value={formatStatusLabel(campaign.status)} />
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[#1d1d1f]">{label}</span>
        <span className="tabular-nums">{formatPercent(value / 100)}</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function CampaignDetailPanel({
  campaign,
  detail,
  error,
  funnelList,
  funnelListError,
  funnelListIsError,
  funnelListIsLoading,
  isError,
  isLoading,
  onSelectPromotion,
  query,
  selectedPromotionId,
  tab
}: {
  campaign: DashboardCampaignSummary | undefined;
  detail: DashboardCampaignDetail | undefined;
  error: Error | null;
  funnelList: DashboardFunnelList | undefined;
  funnelListError: Error | null;
  funnelListIsError: boolean;
  funnelListIsLoading: boolean;
  isError: boolean;
  isLoading: boolean;
  onSelectPromotion: (promotionId: string) => void;
  query: DashboardQuery;
  selectedPromotionId: string;
  tab: DashboardTab;
}) {
  const title = campaignDetailPanelTitle(tab);
  const description = campaignDetailPanelDescription(tab);

  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 px-5">
        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>캠페인 데이터를 불러오지 못했습니다</AlertTitle>
            <AlertDescription>{error?.message ?? "API 요청에 실패했습니다."}</AlertDescription>
          </Alert>
        ) : null}
        {!campaign ? <EmptyState message="상세를 확인할 캠페인을 선택해주세요." /> : null}
        {campaign && isLoading ? <EmptyState message="캠페인 데이터를 불러오는 중입니다." /> : null}
        {detail ? (
          <CampaignTabContent
            detail={detail}
            funnelList={funnelList}
            funnelListError={funnelListError}
            funnelListIsError={funnelListIsError}
            funnelListIsLoading={funnelListIsLoading}
            onSelectPromotion={onSelectPromotion}
            query={query}
            selectedPromotionId={selectedPromotionId}
            tab={tab}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function CampaignTabContent({
  detail,
  funnelList,
  funnelListError,
  funnelListIsError,
  funnelListIsLoading,
  onSelectPromotion,
  query,
  selectedPromotionId,
  tab
}: {
  detail: DashboardCampaignDetail;
  funnelList: DashboardFunnelList | undefined;
  funnelListError: Error | null;
  funnelListIsError: boolean;
  funnelListIsLoading: boolean;
  onSelectPromotion: (promotionId: string) => void;
  query: DashboardQuery;
  selectedPromotionId: string;
  tab: DashboardTab;
}) {
  switch (tab) {
    case "campaign-metrics":
      return (
        <>
          <CampaignRealtimeTrend detail={detail} />
          <ScopedFunnelAnalysisPanel
            error={funnelListError}
            funnels={funnelList?.funnels ?? []}
            isError={funnelListIsError}
            isLoading={funnelListIsLoading}
            query={query}
            scope={{ campaign_id: detail.campaign.campaign_id, scope_type: "campaign" }}
            title="캠페인 사용자 여정 분석"
          />
          <EvaluationOutcomePanel
            adExperiments={detail.ad_experiments}
            metrics={detail.experiment_metrics}
          />
        </>
      );
    case "campaigns":
    default:
      return (
        <>
          <CampaignSummary detail={detail} />
          <CampaignPromotionTable
            onSelectPromotion={onSelectPromotion}
            promotions={detail.promotions}
            segments={detail.segments}
            selectedPromotionId={selectedPromotionId}
          />
        </>
      );
  }
}

function campaignDetailPanelTitle(tab: DashboardTab) {
  if (tab === "campaign-metrics") {
    return "캠페인 통계";
  }
  return "캠페인 개요";
}

function campaignDetailPanelDescription(tab: DashboardTab) {
  if (tab === "campaign-metrics") {
    return "실시간 추이, 사용자 여정, 실험 평가 결과를 기준으로 캠페인 통계를 확인합니다.";
  }
  return "선택한 캠페인의 기본 정보와 하위 프로모션 구성을 확인합니다.";
}

function CampaignSummary({ detail }: { detail: DashboardCampaignDetail }) {
  const campaign = detail.campaign;
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              {campaign.campaign_name}
            </h3>
            <Badge variant={statusBadgeVariant(campaign.status)}>
              {formatStatusLabel(campaign.status)}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">{campaign.objective ?? "목표 미등록"}</div>
        </div>
        <SummaryItem
          label="최근 목표 달성률"
          value={
            campaign.latest_goal_achievement_rate === null
              ? "-"
              : formatPercent(campaign.latest_goal_achievement_rate)
          }
        />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="기간" value={formatPeriod(campaign)} />
        <SummaryItem label="프로모션" value={formatInteger(campaign.promotion_count)} />
        <SummaryItem label="세그먼트" value={formatInteger(campaign.segment_count)} />
        <SummaryItem label="광고 실험" value={formatInteger(campaign.ad_experiment_count)} />
        <SummaryItem label="주요 지표" value={formatMetricLabel(campaign.primary_metric)} />
        <SummaryItem
          label="실시간 이벤트"
          value={formatInteger(detail.realtime_metrics.total_event_count)}
        />
        <SummaryItem label="업데이트" value={campaign.updated_at} />
      </div>
    </section>
  );
}

function CampaignRealtimeTrend({ detail }: { detail: DashboardCampaignDetail }) {
  const campaign = detail.campaign;
  const achievementRate = campaign.latest_goal_achievement_rate ?? 0;

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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function InsightBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

function uniqueValues(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function statusBadgeVariant(status: string) {
  return status === "insufficient_data" ||
    status === "failed" ||
    status === "goal_not_met" ||
    status === "cancelled"
    ? "destructive"
    : "secondary";
}

function displayableEvaluationMetrics(
  metrics: DashboardCampaignExperimentMetric[],
  adExperiments: DashboardAdExperiment[] = []
) {
  const fallbackSegmentId = "seg_existing_all";
  const experimentsById = new Map(
    adExperiments.map((experiment) => [experiment.ad_experiment_id, experiment])
  );

  return metrics.filter((metric) => {
    if (!metric.ad_experiment_id) {
      return false;
    }

    if (metric.segment_id !== fallbackSegmentId) {
      return true;
    }

    const assignmentCount = experimentsById.get(metric.ad_experiment_id)?.assignment_count ?? 0;
    return assignmentCount > 0 || hasEvaluationSignal(metric);
  });
}

function hasEvaluationSignal(metric: DashboardCampaignExperimentMetric) {
  return metric.sample_size > 0 || metric.denominator_count > 0 || metric.numerator_count > 0;
}

function EvaluationOutcomePanel({
  adExperiments = [],
  metrics
}: {
  adExperiments?: DashboardAdExperiment[];
  metrics: DashboardCampaignExperimentMetric[];
}) {
  const evaluationMetrics = displayableEvaluationMetrics(metrics, adExperiments);
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
      {nextLoopMetrics.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBlock label="실패 세그먼트" value={formatInteger(failedSegmentIds.length)} />
          <InsightBlock
            label="실패 실험"
            value={failedExperimentIds.length > 0 ? formatInteger(failedExperimentIds.length) : "-"}
          />
        </div>
      ) : (
        <Alert>
          <AlertTitle>재실험 후보 없음</AlertTitle>
          <AlertDescription>
            목표 미달 상태의 평가가 없거나 다음 루프 필요 여부가 false입니다.
          </AlertDescription>
        </Alert>
      )}
      {insufficientMetrics.length > 0 ? (
        <Alert>
          <AlertTitle>표본 부족은 자동 재실험 대상에서 분리합니다</AlertTitle>
          <AlertDescription>
            표본 부족은 목표 미달이 아니라 판단 보류 상태이므로, 사용자가 명시적으로 다시 실험하기를
            선택할 때만 다음 루프 대상으로 다루는 흐름입니다.
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

function formatPeriod(campaign: DashboardCampaignSummary) {
  if (!campaign.start_date && !campaign.end_date) {
    return "-";
  }
  return `${campaign.start_date ?? "미정"} ~ ${campaign.end_date ?? "미정"}`;
}

function campaignPeriodProgress(campaign: DashboardCampaignSummary) {
  if (!campaign.start_date || !campaign.end_date) {
    return 0;
  }

  const startTime = new Date(`${campaign.start_date}T00:00:00`).getTime();
  const endTime = new Date(`${campaign.end_date}T23:59:59`).getTime();
  const now = Date.now();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return 0;
  }

  return Math.min(Math.max(((now - startTime) / (endTime - startTime)) * 100, 0), 100);
}
