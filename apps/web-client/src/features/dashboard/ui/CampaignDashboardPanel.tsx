import type {
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardMain,
  DashboardPromotionDetail as DashboardPromotionDetailResource,
  DashboardRealtimeMetrics,
  DashboardSegmentDetail as DashboardSegmentDetailResource
} from "@loopad/shared";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "@loopad/ui/charts";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@loopad/ui/shadcn/chart";
import { Progress } from "@loopad/ui/shadcn/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { Tabs, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import {
  fetchDashboardCampaignDetail,
  fetchDashboardPromotionDetail,
  fetchDashboardSegmentDetail
} from "../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../model/dashboard-format.js";
import { useDashboardQueryState } from "../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardPromotionDetailQueryKey,
  dashboardSegmentDetailQueryKey
} from "../model/dashboard-query-keys.js";
import type { DashboardQuery, DashboardTab } from "../model/dashboard-types.js";
import { EmptyState } from "./EmptyState.js";

export function CampaignDashboardPanel({
  data,
  query,
  tab
}: {
  data: DashboardMain;
  query: DashboardQuery;
  tab: DashboardTab;
}) {
  const [, setDashboardQueryState] = useDashboardQueryState();
  const selectedPromotionId = query.selectedPromotionId;
  const selectedSegmentId = query.selectedSegmentId;
  const selectedCampaign =
    data.campaigns.find((campaign) => campaign.campaign_id === query.selectedCampaignId) ??
    data.campaigns[0];
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const campaignDetail = useQuery({
    enabled: Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });
  const promotionDetail = useQuery({
    enabled: Boolean(selectedPromotionId),
    queryFn: ({ signal }) => fetchDashboardPromotionDetail(query, selectedPromotionId, signal),
    queryKey: dashboardPromotionDetailQueryKey(query.projectId, selectedPromotionId)
  });
  const segmentDetail = useQuery({
    enabled: Boolean(selectedPromotionId && selectedSegmentId),
    queryFn: ({ signal }) =>
      fetchDashboardSegmentDetail(query, selectedPromotionId, selectedSegmentId, signal),
    queryKey: dashboardSegmentDetailQueryKey(
      query.projectId,
      selectedPromotionId,
      selectedSegmentId
    )
  });
  const selectedPromotion = campaignDetail.data?.promotions.find(
    (promotion) => promotion.promotion_id === selectedPromotionId
  );
  const selectedSegment = (promotionDetail.data?.segments ?? campaignDetail.data?.segments ?? []).find(
    (segment) =>
      segment.segment_id === selectedSegmentId &&
      (!selectedPromotionId || segment.promotion_id === selectedPromotionId)
  );

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

  useEffect(() => {
    if (!selectedSegmentId || !selectedPromotionId || !promotionDetail.data) {
      return;
    }

    const hasSelectedSegment = promotionDetail.data.segments.some(
      (segment) => segment.segment_id === selectedSegmentId
    );
    if (!hasSelectedSegment) {
      void setDashboardQueryState({ selectedSegmentId: "" });
    }
  }, [promotionDetail.data, selectedPromotionId, selectedSegmentId, setDashboardQueryState]);

  return (
    <div className="grid gap-6">
      <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
        <CardHeader className="gap-1.5 px-5">
          <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
            캠페인 목록
          </CardTitle>
          <CardDescription>
            Campaign → Promotion → Segment → Ad Experiment 실행 구조를 기준으로 조회합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          {data.campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>캠페인</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-right">프로모션</TableHead>
                  <TableHead className="text-right">세그먼트</TableHead>
                  <TableHead className="text-right">실험</TableHead>
                  <TableHead className="text-right">최근 목표 달성률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.campaigns.map((campaign) => (
                  <CampaignRow
                    campaign={campaign}
                    isSelected={selectedCampaignId === campaign.campaign_id}
                    key={campaign.campaign_id}
                    onSelect={(campaignId) => {
                      void setDashboardQueryState({
                        selectedCampaignId: campaignId,
                        selectedPromotionId: "",
                        selectedSegmentId: ""
                      });
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState message="등록된 캠페인이 없습니다." />
          )}
        </CardContent>
      </Card>

      <CampaignSelectionContext
        campaign={selectedCampaign}
        onClearPromotion={() => {
          void setDashboardQueryState({ selectedPromotionId: "", selectedSegmentId: "" });
        }}
        onClearSegment={() => {
          void setDashboardQueryState({ selectedSegmentId: "" });
        }}
        promotion={selectedPromotion}
        segment={selectedSegment}
      />

      <CampaignDetailPanel
        campaign={selectedCampaign}
        detail={campaignDetail.data}
        error={campaignDetail.error}
        isError={campaignDetail.isError}
        isLoading={campaignDetail.isLoading}
        onSelectPromotion={(promotionId) => {
          void setDashboardQueryState({ selectedPromotionId: promotionId, selectedSegmentId: "" });
        }}
        onClearPromotion={() => {
          void setDashboardQueryState({ selectedPromotionId: "", selectedSegmentId: "" });
        }}
        onClearSegment={() => {
          void setDashboardQueryState({ selectedSegmentId: "" });
        }}
        onSelectSegment={(promotionId, segmentId) => {
          void setDashboardQueryState({
            selectedPromotionId: promotionId,
            selectedSegmentId: segmentId
          });
        }}
        promotionDetail={promotionDetail.data}
        promotionError={promotionDetail.error}
        promotionIsError={promotionDetail.isError}
        promotionIsLoading={promotionDetail.isLoading}
        segmentDetail={segmentDetail.data}
        segmentError={segmentDetail.error}
        segmentIsError={segmentDetail.isError}
        segmentIsLoading={segmentDetail.isLoading}
        selectedPromotionId={selectedPromotionId}
        selectedSegmentId={selectedSegmentId}
        tab={tab}
      />
    </div>
  );
}

function CampaignSelectionContext({
  campaign,
  onClearPromotion,
  onClearSegment,
  promotion,
  segment
}: {
  campaign: DashboardCampaignSummary | undefined;
  onClearPromotion: () => void;
  onClearSegment: () => void;
  promotion: DashboardCampaignPromotion | undefined;
  segment: DashboardCampaignSegment | undefined;
}) {
  if (!campaign) {
    return null;
  }

  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-4 shadow-none ring-1 ring-black/10">
      <CardContent className="flex flex-wrap items-center gap-2 px-5">
        <Badge variant="secondary">Campaign</Badge>
        <span className="text-sm font-medium">{campaign.campaign_name}</span>
        {promotion ? (
          <>
            <span className="text-sm text-muted-foreground">/</span>
            <Badge variant="secondary">Promotion</Badge>
            <span className="text-sm font-medium">{promotion.marketing_theme}</span>
            <Button onClick={onClearPromotion} size="xs" type="button" variant="ghost">
              선택 해제
            </Button>
          </>
        ) : null}
        {segment ? (
          <>
            <span className="text-sm text-muted-foreground">/</span>
            <Badge variant="secondary">Segment</Badge>
            <span className="text-sm font-medium">{segment.segment_name}</span>
            <Button onClick={onClearSegment} size="xs" type="button" variant="ghost">
              선택 해제
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CampaignRow({
  campaign,
  isSelected,
  onSelect
}: {
  campaign: DashboardCampaignSummary;
  isSelected: boolean;
  onSelect: (campaignId: string) => void;
}) {
  return (
    <TableRow
      aria-selected={isSelected}
      className="cursor-pointer"
      onClick={() => onSelect(campaign.campaign_id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(campaign.campaign_id);
        }
      }}
      tabIndex={0}
    >
      <TableCell>
        <div className="flex min-w-[220px] flex-col gap-1">
          <span className="flex items-center gap-2 font-medium text-foreground">
            {campaign.campaign_name}
            {isSelected ? <Badge variant="outline">선택됨</Badge> : null}
          </span>
          <span className="truncate text-xs text-muted-foreground">{campaign.campaign_id}</span>
          {campaign.objective ? (
            <span className="line-clamp-2 text-sm text-muted-foreground">{campaign.objective}</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{campaign.status}</Badge>
      </TableCell>
      <TableCell>{formatPeriod(campaign)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatInteger(campaign.promotion_count)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatInteger(campaign.segment_count)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatInteger(campaign.ad_experiment_count)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {campaign.latest_goal_achievement_rate === null
          ? "-"
          : formatPercent(campaign.latest_goal_achievement_rate)}
      </TableCell>
    </TableRow>
  );
}

function CampaignDetailPanel({
  campaign,
  detail,
  error,
  isError,
  isLoading,
  onClearPromotion,
  onClearSegment,
  onSelectPromotion,
  onSelectSegment,
  promotionDetail,
  promotionError,
  promotionIsError,
  promotionIsLoading,
  segmentDetail,
  segmentError,
  segmentIsError,
  segmentIsLoading,
  selectedPromotionId,
  selectedSegmentId,
  tab
}: {
  campaign: DashboardCampaignSummary | undefined;
  detail: DashboardCampaignDetail | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  onClearPromotion: () => void;
  onClearSegment: () => void;
  onSelectPromotion: (promotionId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  promotionDetail: DashboardPromotionDetailResource | undefined;
  promotionError: Error | null;
  promotionIsError: boolean;
  promotionIsLoading: boolean;
  segmentDetail: DashboardSegmentDetailResource | undefined;
  segmentError: Error | null;
  segmentIsError: boolean;
  segmentIsLoading: boolean;
  selectedPromotionId: string;
  selectedSegmentId: string;
  tab: DashboardTab;
}) {
  const selectedPromotion = detail?.promotions.find(
    (promotion) => promotion.promotion_id === selectedPromotionId
  );

  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          캠페인 상세
        </CardTitle>
        <CardDescription>
          캠페인 안에서 마케팅 기획, 실시간 추이, 워크플로우, 프로모션 목록을 관리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 px-5">
        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>캠페인 상세를 불러오지 못했습니다</AlertTitle>
            <AlertDescription>{error?.message ?? "API 요청에 실패했습니다."}</AlertDescription>
          </Alert>
        ) : null}
        {!campaign ? <EmptyState message="상세를 확인할 캠페인을 선택해주세요." /> : null}
        {campaign && isLoading ? <EmptyState message="캠페인 상세를 불러오는 중입니다." /> : null}
        {detail ? (
          <CampaignTabContent
            detail={detail}
            onClearPromotion={onClearPromotion}
            onClearSegment={onClearSegment}
            onSelectPromotion={onSelectPromotion}
            onSelectSegment={onSelectSegment}
            promotionDetail={promotionDetail}
            promotionError={promotionError}
            promotionIsError={promotionIsError}
            promotionIsLoading={promotionIsLoading}
            segmentDetail={segmentDetail}
            segmentError={segmentError}
            segmentIsError={segmentIsError}
            segmentIsLoading={segmentIsLoading}
            selectedPromotion={selectedPromotion}
            selectedPromotionId={selectedPromotionId}
            selectedSegmentId={selectedSegmentId}
            tab={tab}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function CampaignTabContent({
  detail,
  onClearPromotion,
  onClearSegment,
  onSelectPromotion,
  onSelectSegment,
  promotionDetail,
  promotionError,
  promotionIsError,
  promotionIsLoading,
  segmentDetail,
  segmentError,
  segmentIsError,
  segmentIsLoading,
  selectedPromotion,
  selectedPromotionId,
  selectedSegmentId,
  tab
}: {
  detail: DashboardCampaignDetail;
  onClearPromotion: () => void;
  onClearSegment: () => void;
  onSelectPromotion: (promotionId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  promotionDetail: DashboardPromotionDetailResource | undefined;
  promotionError: Error | null;
  promotionIsError: boolean;
  promotionIsLoading: boolean;
  segmentDetail: DashboardSegmentDetailResource | undefined;
  segmentError: Error | null;
  segmentIsError: boolean;
  segmentIsLoading: boolean;
  selectedPromotion: DashboardCampaignPromotion | undefined;
  selectedPromotionId: string;
  selectedSegmentId: string;
  tab: DashboardTab;
}) {
  const selectedSegment = (promotionDetail?.segments ?? detail.segments).find(
    (segment) =>
      segment.segment_id === selectedSegmentId &&
      (!selectedPromotionId || segment.promotion_id === selectedPromotionId)
  );

  switch (tab) {
    case "campaign-promotions":
      return (
        <>
          <CampaignOpenTabs
            onClearPromotion={onClearPromotion}
            onClearSegment={onClearSegment}
            selectedPromotion={selectedPromotion}
            selectedSegment={selectedSegment}
          />
          <PromotionTable
            onSelectPromotion={onSelectPromotion}
            promotions={detail.promotions}
            segments={detail.segments}
            selectedPromotionId={selectedPromotionId}
          />
          <PromotionDetail
            detail={promotionDetail}
            error={promotionError}
            isError={promotionIsError}
            isLoading={promotionIsLoading}
            onSelectSegment={onSelectSegment}
            selectedPromotionId={selectedPromotionId}
            selectedSegmentId={selectedSegmentId}
            segmentDetail={segmentDetail}
            segmentError={segmentError}
            segmentIsError={segmentIsError}
            segmentIsLoading={segmentIsLoading}
          />
        </>
      );
    case "campaign-segments":
      return (
        <>
          <CampaignOpenTabs
            onClearPromotion={onClearPromotion}
            onClearSegment={onClearSegment}
            selectedPromotion={selectedPromotion}
            selectedSegment={selectedSegment}
          />
          <SegmentTable
            onSelectSegment={onSelectSegment}
            segments={promotionDetail?.segments ?? detail.segments}
            selectedSegmentId={selectedSegmentId}
          />
          <SegmentDetailPanel
            detail={segmentDetail}
            error={segmentError}
            isError={segmentIsError}
            isLoading={segmentIsLoading}
            selectedSegmentId={selectedSegmentId}
          />
        </>
      );
    case "campaign-experiment-metrics":
      return (
        <>
          <CampaignOpenTabs
            onClearPromotion={onClearPromotion}
            onClearSegment={onClearSegment}
            selectedPromotion={selectedPromotion}
            selectedSegment={selectedSegment}
          />
          <ExperimentMetricTable
            metrics={promotionDetail?.experiment_metrics ?? detail.experiment_metrics}
          />
        </>
      );
    case "campaign-promotion-metrics":
      return <PromotionMetricsPanel detail={detail} selectedPromotion={selectedPromotion} />;
    case "campaign-metrics":
      return <CampaignRealtimeTrend detail={detail} />;
    case "campaigns":
    default:
      return (
        <>
          <CampaignSummary detail={detail} />
          <CampaignOpenTabs
            onClearPromotion={onClearPromotion}
            onClearSegment={onClearSegment}
            selectedPromotion={selectedPromotion}
            selectedSegment={selectedSegment}
          />
          <MarketingPlan detail={detail} />
          <CampaignRealtimeTrend detail={detail} />
          <CampaignWorkflow detail={detail} />
          <PromotionTable
            onSelectPromotion={onSelectPromotion}
            promotions={detail.promotions}
            segments={detail.segments}
            selectedPromotionId={selectedPromotionId}
          />
          <CampaignNextAction detail={detail} />
        </>
      );
  }
}

function CampaignOpenTabs({
  onClearPromotion,
  onClearSegment,
  selectedPromotion,
  selectedSegment
}: {
  onClearPromotion: () => void;
  onClearSegment: () => void;
  selectedPromotion: DashboardCampaignPromotion | undefined;
  selectedSegment: DashboardCampaignSegment | undefined;
}) {
  const value = selectedSegment ? "segment" : selectedPromotion ? "promotion" : "all";

  return (
    <Tabs
      onValueChange={(nextValue) => {
        if (nextValue === "all") {
          onClearPromotion();
        }
        if (nextValue === "promotion") {
          onClearSegment();
        }
      }}
      value={value}
    >
      <TabsList variant="line">
        <TabsTrigger value="all">전체 목록</TabsTrigger>
        {selectedPromotion ? (
          <TabsTrigger value="promotion">{selectedPromotion.marketing_theme}</TabsTrigger>
        ) : null}
        {selectedSegment ? (
          <TabsTrigger value="segment">{selectedSegment.segment_name}</TabsTrigger>
        ) : null}
      </TabsList>
    </Tabs>
  );
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
            <Badge variant="secondary">{campaign.status}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">{campaign.objective ?? "목표 미등록"}</div>
          <div className="text-xs text-muted-foreground">{campaign.campaign_id}</div>
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
        <SummaryItem label="주요 지표" value={campaign.primary_metric ?? "-"} />
        <SummaryItem
          label="실시간 이벤트"
          value={formatInteger(detail.realtime_metrics.total_event_count)}
        />
        <SummaryItem label="업데이트" value={campaign.updated_at} />
      </div>
    </section>
  );
}

function MarketingPlan({ detail }: { detail: DashboardCampaignDetail }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">마케팅 기획</h3>
      <div className="grid gap-3 md:grid-cols-3">
        {detail.promotions.map((promotion) => (
          <Card className="shadow-none" key={promotion.promotion_id}>
            <CardHeader>
              <CardTitle className="text-base">{promotion.marketing_theme}</CardTitle>
              <CardDescription>
                {promotion.channel} · {promotion.goal_metric}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div>목표값: {formatGoalValue(promotion.goal_target_value)}</div>
              <div>목표 기준: {promotion.goal_basis}</div>
              <div>세그먼트: {formatInteger(promotion.target_segment_count)}</div>
            </CardContent>
          </Card>
        ))}
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
      <RealtimeEventTable
        emptyMessage="캠페인 실시간 이벤트가 아직 수집되지 않았습니다."
        metrics={detail.realtime_metrics}
        title="캠페인 이벤트 집계"
      />
    </section>
  );
}

function PromotionMetricsPanel({
  detail,
  selectedPromotion
}: {
  detail: DashboardCampaignDetail;
  selectedPromotion: DashboardCampaignPromotion | undefined;
}) {
  const promotions = selectedPromotion ? [selectedPromotion] : detail.promotions;

  return (
    <DetailTable
      emptyMessage="표시할 프로모션 지표가 없습니다."
      headers={["프로모션", "채널", "목표 지표", "목표값", "현재값", "세그먼트", "상태"]}
      title="프로모션 지표"
    >
      {promotions.map((promotion) => (
        <TableRow key={promotion.promotion_id}>
          <TableCell>{promotion.promotion_id}</TableCell>
          <TableCell>{promotion.channel}</TableCell>
          <TableCell>{promotion.goal_metric}</TableCell>
          <TableCell className="text-right tabular-nums">
            {formatGoalValue(promotion.goal_target_value)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {promotion.latest_actual_value === null
              ? "-"
              : formatGoalValue(promotion.latest_actual_value)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatInteger(promotion.target_segment_count)}
          </TableCell>
          <TableCell>
            <Badge variant="secondary">{promotion.status}</Badge>
          </TableCell>
        </TableRow>
      ))}
    </DetailTable>
  );
}

function CampaignWorkflow({ detail }: { detail: DashboardCampaignDetail }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">워크플로우 View</h3>
      <div className="grid gap-3">
        {detail.promotions.map((promotion) => {
          const segments = detail.segments.filter(
            (segment) => segment.promotion_id === promotion.promotion_id
          );
          return (
            <Card className="shadow-none" key={promotion.promotion_id}>
              <CardHeader className="gap-1">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{promotion.marketing_theme}</CardTitle>
                  <Badge variant="secondary">{promotion.status}</Badge>
                </div>
                <CardDescription>{promotion.promotion_id}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="text-muted-foreground">
                  Campaign → Promotion → {formatInteger(segments.length)} Segment →{" "}
                  {formatInteger(promotion.ad_experiment_count)} Ad Experiment
                </div>
                <Progress value={Math.min((promotion.latest_actual_value ?? 0) * 100, 100)} />
              </CardContent>
            </Card>
          );
        })}
      </div>
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

function PromotionTable({
  onSelectPromotion,
  promotions,
  segments,
  selectedPromotionId
}: {
  onSelectPromotion: (promotionId: string) => void;
  promotions: DashboardCampaignPromotion[];
  segments: DashboardCampaignSegment[];
  selectedPromotionId: string;
}) {
  const activeCount = promotions.filter((promotion) => promotion.status === "active").length;
  const totalExperimentCount = promotions.reduce(
    (sum, promotion) => sum + promotion.ad_experiment_count,
    0
  );

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold text-[#1d1d1f]">프로모션 목록</h3>
          <p className="text-sm text-muted-foreground">
            Promotion → Segment → Ad Experiment 연결 상태를 기준으로 확인합니다.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="전체 프로모션" value={formatInteger(promotions.length)} />
        <SummaryItem label="활성 프로모션" value={formatInteger(activeCount)} />
        <SummaryItem label="연결 세그먼트" value={formatInteger(segments.length)} />
        <SummaryItem label="광고 실험" value={formatInteger(totalExperimentCount)} />
      </div>
      {promotions.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>프로모션</TableHead>
              <TableHead>대상 세그먼트</TableHead>
              <TableHead>목표</TableHead>
              <TableHead className="text-right">실험</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>상세</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.map((promotion) => {
              const promotionSegments = segments.filter(
                (segment) => segment.promotion_id === promotion.promotion_id
              );
              return (
                <TableRow
                  aria-selected={selectedPromotionId === promotion.promotion_id}
                  className="cursor-pointer"
                  key={promotion.promotion_id}
                  onClick={() => onSelectPromotion(promotion.promotion_id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectPromotion(promotion.promotion_id);
                    }
                  }}
                  tabIndex={0}
                >
                  <TableCell>
                    <div className="flex min-w-[220px] flex-col gap-1">
                      <span className="font-medium">{promotion.marketing_theme}</span>
                      <span className="text-xs text-muted-foreground">
                        {promotion.channel} · {promotion.promotion_id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-[240px] flex-wrap gap-1.5">
                      {promotionSegments.slice(0, 3).map((segment) => (
                        <Badge key={segment.segment_id} variant="outline">
                          {segment.segment_name}
                        </Badge>
                      ))}
                      {promotionSegments.length > 3 ? (
                        <Badge variant="secondary">+{promotionSegments.length - 3}</Badge>
                      ) : null}
                      {promotionSegments.length === 0 ? (
                        <span className="text-sm text-muted-foreground">세그먼트 없음</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid min-w-[160px] gap-1">
                      <span className="text-sm">{promotion.goal_metric}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatGoalValue(promotion.goal_target_value)} · {promotion.goal_basis}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(promotion.ad_experiment_count)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{promotion.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectPromotion(promotion.promotion_id);
                      }}
                      size="sm"
                      variant={
                        selectedPromotionId === promotion.promotion_id ? "default" : "outline"
                      }
                    >
                      {selectedPromotionId === promotion.promotion_id ? "열림" : "상세"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState message="등록된 프로모션이 없습니다." />
      )}
    </section>
  );
}

function CampaignNextAction({ detail }: { detail: DashboardCampaignDetail }) {
  const hasInsufficientData = detail.experiment_metrics.some(
    (metric) => metric.status === "insufficient_data"
  );
  return (
    <Alert>
      <AlertTitle>다음 액션</AlertTitle>
      <AlertDescription>
        {hasInsufficientData
          ? "insufficient_data 상태의 실험 지표를 확인하고 세그먼트 또는 기간을 조정하세요."
          : "프로모션 상세에서 세그먼트별 진행 상태와 실험 지표를 확인하세요."}
      </AlertDescription>
    </Alert>
  );
}

function PromotionDetail({
  detail,
  error,
  isError,
  isLoading,
  onSelectSegment,
  selectedPromotionId,
  selectedSegmentId,
  segmentDetail,
  segmentError,
  segmentIsError,
  segmentIsLoading
}: {
  detail: DashboardPromotionDetailResource | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  selectedPromotionId: string;
  selectedSegmentId: string;
  segmentDetail: DashboardSegmentDetailResource | undefined;
  segmentError: Error | null;
  segmentIsError: boolean;
  segmentIsLoading: boolean;
}) {
  if (!selectedPromotionId) {
    return <EmptyState message="상세를 확인할 프로모션을 선택해주세요." />;
  }
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>프로모션 상세를 불러오지 못했습니다</AlertTitle>
        <AlertDescription>{error?.message ?? "API 요청에 실패했습니다."}</AlertDescription>
      </Alert>
    );
  }
  if (isLoading || !detail) {
    return <EmptyState message="프로모션 상세를 불러오는 중입니다." />;
  }

  const promotion = detail.promotion;

  return (
    <section className="grid gap-4">
      <PromotionOverview detail={detail} />
      <RealtimeEventTable
        emptyMessage="프로모션 실시간 이벤트가 아직 수집되지 않았습니다."
        metrics={detail.realtime_metrics}
        title="프로모션 이벤트 집계"
      />
      <PromotionSegmentCards
        onSelectSegment={onSelectSegment}
        segments={detail.segments}
        selectedSegmentId={selectedSegmentId}
      />
      <SegmentTable
        onSelectSegment={onSelectSegment}
        segments={detail.segments}
        selectedSegmentId={selectedSegmentId}
      />
      <SegmentDetailPanel
        detail={segmentDetail}
        error={segmentError}
        isError={segmentIsError}
        isLoading={segmentIsLoading}
        selectedSegmentId={selectedSegmentId}
      />
      <ExperimentMetricTable metrics={detail.experiment_metrics} />
    </section>
  );
}

function PromotionSegmentCards({
  onSelectSegment,
  segments,
  selectedSegmentId
}: {
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  segments: DashboardCampaignSegment[];
  selectedSegmentId: string;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">세그먼트 선택</h3>
      {segments.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {segments.map((segment) => {
            const isSelected = selectedSegmentId === segment.segment_id;
            return (
              <button
                aria-pressed={isSelected}
                className="grid gap-3 rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted/60 aria-pressed:border-primary aria-pressed:bg-muted"
                key={segment.segment_id}
                onClick={() => onSelectSegment(segment.promotion_id, segment.segment_id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <span className="font-medium">{segment.segment_name}</span>
                    <span className="text-xs text-muted-foreground">{segment.segment_id}</span>
                  </div>
                  <Badge variant={isSelected ? "default" : "secondary"}>
                    {isSelected ? "열림" : segment.status}
                  </Badge>
                </div>
                <div className="line-clamp-2 text-sm text-muted-foreground">
                  {segment.natural_language_query ?? segment.source ?? "-"}
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">예상 규모</span>
                    <span className="font-medium tabular-nums">
                      {formatInteger(segment.estimated_size)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">표본 비율</span>
                    <span className="font-medium tabular-nums">
                      {formatPercentValue(segment.sample_ratio)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState message="프로모션에 연결된 세그먼트가 없습니다." />
      )}
    </section>
  );
}

function PromotionOverview({ detail }: { detail: DashboardPromotionDetailResource }) {
  const promotion = detail.promotion;
  const achievementRate = promotion.latest_actual_value ?? 0;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              {promotion.marketing_theme}
            </h3>
            <Badge variant="secondary">{promotion.status}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {promotion.channel} · {promotion.target_audience}
          </div>
          <div className="text-xs text-muted-foreground">{promotion.promotion_id}</div>
        </div>
        {promotion.landing_url ? (
          <Button asChild size="sm" variant="outline">
            <a href={promotion.landing_url} rel="noreferrer" target="_blank">
              랜딩 확인
            </a>
          </Button>
        ) : (
          <Button disabled size="sm" variant="outline">
            랜딩 없음
          </Button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="목표 지표" value={promotion.goal_metric} />
        <SummaryItem label="목표값" value={formatGoalValue(promotion.goal_target_value)} />
        <SummaryItem label="목표 기준" value={promotion.goal_basis} />
        <SummaryItem label="최소 표본" value={formatInteger(promotion.min_sample_size)} />
        <SummaryItem label="세그먼트" value={formatInteger(detail.segments.length)} />
        <SummaryItem label="실험 지표" value={formatInteger(detail.experiment_metrics.length)} />
        <SummaryItem
          label="실시간 이벤트"
          value={formatInteger(detail.realtime_metrics.total_event_count)}
        />
        <SummaryItem label="목표 달성률" value={formatPercent(achievementRate)} />
      </div>
      <Progress value={Math.min(achievementRate * 100, 100)} />
    </section>
  );
}

function SegmentTable({
  onSelectSegment,
  segments,
  selectedSegmentId
}: {
  onSelectSegment?: (promotionId: string, segmentId: string) => void;
  segments: DashboardCampaignSegment[];
  selectedSegmentId?: string;
}) {
  const activeCount = segments.filter((segment) => segment.status === "active").length;
  const totalEstimatedSize = segments.reduce((sum, segment) => sum + segment.estimated_size, 0);
  const averageSampleRatio =
    segments.length > 0
      ? segments.reduce((sum, segment) => sum + segment.sample_ratio, 0) / segments.length
      : 0;

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">세그먼트 목록</h3>
        <p className="text-sm text-muted-foreground">
          프로모션별 타겟 조건, 표본, 예상 규모를 기준으로 세그먼트를 확인합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="전체 세그먼트" value={formatInteger(segments.length)} />
        <SummaryItem label="활성 세그먼트" value={formatInteger(activeCount)} />
        <SummaryItem label="예상 대상" value={formatInteger(totalEstimatedSize)} />
        <SummaryItem label="평균 표본 비율" value={formatPercentValue(averageSampleRatio)} />
      </div>
      {segments.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>세그먼트</TableHead>
              <TableHead>조건</TableHead>
              <TableHead>프로모션</TableHead>
              <TableHead className="text-right">예상 규모</TableHead>
              <TableHead className="text-right">표본 비율</TableHead>
              <TableHead>상태</TableHead>
              {onSelectSegment ? <TableHead>상세</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment) => (
              <TableRow
                aria-selected={selectedSegmentId === segment.segment_id}
                className={onSelectSegment ? "cursor-pointer" : undefined}
                key={`${segment.promotion_id}-${segment.segment_id}`}
                onClick={() => onSelectSegment?.(segment.promotion_id, segment.segment_id)}
                onKeyDown={(event) => {
                  if (!onSelectSegment) {
                    return;
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectSegment(segment.promotion_id, segment.segment_id);
                  }
                }}
                tabIndex={onSelectSegment ? 0 : undefined}
              >
                <TableCell>
                  <div className="flex min-w-[180px] flex-col gap-1">
                    <span className="font-medium">{segment.segment_name}</span>
                    <span className="text-xs text-muted-foreground">{segment.segment_id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="line-clamp-2 min-w-[220px] text-sm">
                    {segment.natural_language_query ?? segment.source ?? "-"}
                  </div>
                </TableCell>
                <TableCell>{segment.promotion_id}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(segment.estimated_size)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercentValue(segment.sample_ratio)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{segment.status}</Badge>
                    {segment.priority ? <Badge variant="outline">{segment.priority}</Badge> : null}
                  </div>
                </TableCell>
                {onSelectSegment ? (
                  <TableCell>
                    <Button
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectSegment(segment.promotion_id, segment.segment_id);
                      }}
                      size="sm"
                      variant={selectedSegmentId === segment.segment_id ? "default" : "outline"}
                    >
                      {selectedSegmentId === segment.segment_id ? "열림" : "상세"}
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState message="등록된 세그먼트가 없습니다." />
      )}
    </section>
  );
}

function SegmentDetailPanel({
  detail,
  error,
  isError,
  isLoading,
  selectedSegmentId
}: {
  detail: DashboardSegmentDetailResource | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  selectedSegmentId: string;
}) {
  if (!selectedSegmentId) {
    return <EmptyState message="상세를 확인할 세그먼트를 선택해주세요." />;
  }
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>세그먼트 상세를 불러오지 못했습니다</AlertTitle>
        <AlertDescription>{error?.message ?? "API 요청에 실패했습니다."}</AlertDescription>
      </Alert>
    );
  }
  if (isLoading || !detail) {
    return <EmptyState message="세그먼트 상세를 불러오는 중입니다." />;
  }

  const adExperimentIds = uniqueValues(
    detail.experiment_metrics.map((metric) => metric.ad_experiment_id)
  );
  const latestMetric = detail.experiment_metrics[0];
  const hasInsufficientData = detail.experiment_metrics.some(
    (metric) => metric.status === "insufficient_data"
  );

  return (
    <section className="grid gap-4">
      <SegmentOverview
        adExperimentCount={adExperimentIds.length}
        detail={detail}
        latestMetric={latestMetric}
      />
      {hasInsufficientData ? (
        <Alert>
          <AlertTitle>표본 부족 상태</AlertTitle>
          <AlertDescription>실험 지표가 표본 부족 상태입니다.</AlertDescription>
        </Alert>
      ) : null}
      <SegmentDefinitionPanel segment={detail.segment} />
      <RealtimeEventTable
        emptyMessage="실시간 이벤트가 아직 수집되지 않았습니다."
        metrics={detail.realtime_metrics}
        title="실시간 추이"
      />
      <SegmentSampleSizePanel metrics={detail.experiment_metrics} />
      <ContentCandidateCards candidates={detail.content_candidates} />
      <ContentCandidateTable candidates={detail.content_candidates} />
      <ExperimentMetricTable metrics={detail.experiment_metrics} />
    </section>
  );
}

function SegmentOverview({
  adExperimentCount,
  detail,
  latestMetric
}: {
  adExperimentCount: number;
  detail: DashboardSegmentDetailResource;
  latestMetric: DashboardCampaignExperimentMetric | undefined;
}) {
  const sampleRatioPercent = Math.min(detail.segment.sample_ratio * 100, 100);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              {detail.segment.segment_name}
            </h3>
            <Badge variant="secondary">{detail.segment.status}</Badge>
            {detail.segment.priority ? (
              <Badge variant="outline">{detail.segment.priority}</Badge>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground">
            {detail.segment.natural_language_query ?? "세그먼트 조건 미등록"}
          </div>
          <div className="text-xs text-muted-foreground">
            {detail.segment.promotion_id} · {detail.segment.segment_id}
          </div>
        </div>
        <SummaryItem
          label="최근 지표"
          value={
            latestMetric
              ? `${latestMetric.metric} ${formatGoalValue(latestMetric.actual_value)}`
              : "-"
          }
        />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="세그먼트 출처" value={detail.segment.source ?? "-"} />
        <SummaryItem label="대상 규모" value={formatInteger(detail.segment.estimated_size)} />
        <SummaryItem label="정의 표본" value={formatInteger(detail.segment.sample_size)} />
        <SummaryItem
          label="전체 적격 유저"
          value={formatInteger(detail.segment.total_eligible_user_count)}
        />
        <SummaryItem label="표본 비율" value={formatPercentValue(detail.segment.sample_ratio)} />
        <SummaryItem
          label="연결 실험"
          value={adExperimentCount > 0 ? formatInteger(adExperimentCount) : "-"}
        />
        <SummaryItem
          label="최근 표본"
          value={latestMetric ? formatInteger(latestMetric.sample_size) : "-"}
        />
        <SummaryItem label="콘텐츠 후보" value={formatInteger(detail.content_candidates.length)} />
        <SummaryItem
          label="실시간 이벤트"
          value={formatInteger(detail.realtime_metrics.total_event_count)}
        />
      </div>
      <Progress value={sampleRatioPercent} />
    </section>
  );
}

function RealtimeEventTable({
  emptyMessage,
  metrics,
  title
}: {
  emptyMessage: string;
  metrics: DashboardRealtimeMetrics;
  title: string;
}) {
  return (
    <>
      {metrics.events.length > 0 ? (
        <section className="grid gap-3">
          <h3 className="text-base font-semibold text-[#1d1d1f]">{title}</h3>
          <ChartContainer
            className="min-h-[260px] w-full"
            config={{
              event_count: {
                color: "var(--chart-1)",
                label: "이벤트 수"
              },
              unique_user_count: {
                color: "var(--chart-2)",
                label: "유니크 유저"
              }
            }}
          >
            <BarChart data={chartEvents(metrics)}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="event_count" fill="var(--color-event_count)" radius={4} />
              <Bar
                dataKey="unique_user_count"
                fill="var(--color-unique_user_count)"
                radius={4}
              />
            </BarChart>
          </ChartContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이벤트</TableHead>
                <TableHead className="text-right">이벤트 수</TableHead>
                <TableHead className="text-right">유니크 유저</TableHead>
                <TableHead className="text-right">비중</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.events.map((event) => (
                <TableRow key={event.event_name}>
                  <TableCell>
                    <div className="grid gap-1">
                      <span className="font-medium">{eventDisplayName(event.event_name)}</span>
                      <span className="text-xs text-muted-foreground">{event.event_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(event.event_count)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(event.unique_user_count)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {metrics.total_event_count > 0
                      ? formatPercentValue(event.event_count / metrics.total_event_count)
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : (
        <EmptyState message={emptyMessage} />
      )}
    </>
  );
}

function chartEvents(metrics: DashboardRealtimeMetrics) {
  return metrics.events.map((event) => ({
    event_count: event.event_count,
    label: eventDisplayName(event.event_name),
    unique_user_count: event.unique_user_count
  }));
}

function SegmentDefinitionPanel({ segment }: { segment: DashboardCampaignSegment }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">세그먼트 조건과 데이터 근거</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <InsightBlock label="자연어 조건" value={segment.natural_language_query ?? "-"} />
        <InsightBlock label="조건 요약" value={formatJsonObject(segment.rule_json)} />
        <InsightBlock label="프로필 요약" value={formatJsonObject(segment.profile_json)} />
        <InsightBlock label="콘텐츠 브리프" value={formatJsonObject(segment.content_brief_json)} />
        <InsightBlock label="데이터 근거" value={formatJsonObject(segment.data_evidence_json)} />
      </div>
    </section>
  );
}

function SegmentSampleSizePanel({
  metrics
}: {
  metrics: DashboardCampaignExperimentMetric[];
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">sample size 검증</h3>
      {metrics.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {metrics.map((metric) => {
            const rate =
              metric.denominator_count > 0
                ? Math.min((metric.numerator_count / metric.denominator_count) * 100, 100)
                : 0;

            return (
              <div
                className="grid gap-3 rounded-md border bg-muted/20 p-3"
                key={`${metric.ad_experiment_id ?? metric.segment_id}-${metric.created_at}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <div className="text-sm font-medium">{metric.metric}</div>
                    <div className="text-xs text-muted-foreground">
                      {metric.ad_experiment_id ?? "-"}
                    </div>
                  </div>
                  <Badge variant={metric.status === "insufficient_data" ? "outline" : "secondary"}>
                    {metric.status}
                  </Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">평가 기준</span>
                    <span className="font-medium">{metric.basis}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">표본</span>
                    <span className="font-medium tabular-nums">
                      {formatInteger(metric.sample_size)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">분자 / 분모</span>
                    <span className="font-medium tabular-nums">
                      {formatInteger(metric.numerator_count)} /{" "}
                      {formatInteger(metric.denominator_count)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">목표 / 실제</span>
                    <span className="font-medium tabular-nums">
                      {formatGoalValue(metric.target_value)} / {formatGoalValue(metric.actual_value)}
                    </span>
                  </div>
                </div>
                <InsightBlock label="평가 피드백" value={metric.feedback ?? "-"} />
                <InsightBlock label="평가 결과 JSON" value={formatJsonObject(metric.result_json)} />
                <Progress value={rate} />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState message="표본 검증에 사용할 실험 지표가 없습니다." />
      )}
    </section>
  );
}

function ContentCandidateCards({
  candidates
}: {
  candidates: DashboardSegmentDetailResource["content_candidates"];
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">생성 이유 리포트</h3>
      {candidates.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {candidates.map((candidate) => (
            <div className="grid gap-3 rounded-md border bg-muted/20 p-3" key={candidate.content_id}>
              <div className="flex min-h-[96px] items-center justify-center rounded-md border border-dashed bg-background px-3 text-center text-sm text-muted-foreground">
                {candidate.image_prompt ?? "이미지 URL 계약 확정 후 실제 생성 이미지를 표시합니다."}
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <div className="text-sm font-medium">
                    {candidate.title ?? candidate.content_option_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {candidate.channel} / {candidate.content_id}
                  </div>
                </div>
                <Badge variant="secondary">{candidate.status}</Badge>
              </div>
              <InsightBlock label="메시지" value={candidate.message ?? candidate.body ?? "-"} />
              <InsightBlock label="생성 이유" value={candidate.reason_summary ?? "-"} />
              <InsightBlock label="데이터 근거" value={formatJsonObject(candidate.data_evidence_json)} />
              <InsightBlock label="메시지 방향" value={candidate.message_strategy ?? "-"} />
              <InsightBlock label="생성 프롬프트" value={candidate.generation_prompt ?? "-"} />
              <InsightBlock label="메타데이터" value={formatJsonObject(candidate.metadata_json)} />
              <div className="grid gap-1 text-sm">
                <div className="text-xs text-muted-foreground">CTA / 랜딩 URL</div>
                <div className="font-medium">{candidate.cta ?? "-"}</div>
                <div className="break-all text-muted-foreground">{candidate.landing_url ?? "-"}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="생성 이유를 표시할 콘텐츠 후보가 없습니다." />
      )}
    </section>
  );
}

function formatJsonObject(value: Record<string, unknown>): string {
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return "-";
  }
  return entries
    .map(([key, entryValue]) => `${key}: ${formatJsonValue(entryValue)}`)
    .join("\n");
}

function formatJsonValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function InsightBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="leading-6">{value}</div>
    </div>
  );
}

function ContentCandidateTable({
  candidates
}: {
  candidates: DashboardSegmentDetailResource["content_candidates"];
}) {
  return (
    <DetailTable
      emptyMessage="생성 콘텐츠 후보가 없습니다."
      headers={["콘텐츠", "채널", "메시지", "생성 이유", "메시지 방향", "상태"]}
      title="생성 콘텐츠 카드"
    >
      {candidates.map((candidate) => (
        <TableRow key={candidate.content_id}>
          <TableCell>
            <div className="flex min-w-[180px] flex-col gap-1">
              <span className="font-medium">{candidate.content_option_id}</span>
              <span className="text-xs text-muted-foreground">{candidate.content_id}</span>
            </div>
          </TableCell>
          <TableCell>{candidate.channel}</TableCell>
          <TableCell>
            <div className="line-clamp-2 min-w-[220px]">
              {candidate.title ?? candidate.message ?? candidate.body ?? "-"}
            </div>
          </TableCell>
          <TableCell>
            <div className="line-clamp-2 min-w-[220px]">{candidate.reason_summary ?? "-"}</div>
          </TableCell>
          <TableCell>
            <div className="line-clamp-2 min-w-[220px]">{candidate.message_strategy ?? "-"}</div>
          </TableCell>
          <TableCell>
            <Badge variant="secondary">{candidate.status}</Badge>
          </TableCell>
        </TableRow>
      ))}
    </DetailTable>
  );
}

function uniqueValues(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function ExperimentMetricTable({ metrics }: { metrics: DashboardCampaignExperimentMetric[] }) {
  const insufficientCount = metrics.filter((metric) => metric.status === "insufficient_data").length;
  const nextLoopCount = metrics.filter((metric) => metric.next_loop_required).length;
  const totalSampleSize = metrics.reduce((sum, metric) => sum + metric.sample_size, 0);
  const averageActualValue =
    metrics.length > 0
      ? metrics.reduce((sum, metric) => sum + metric.actual_value, 0) / metrics.length
      : 0;

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">실험 지표</h3>
        <p className="text-sm text-muted-foreground">
          광고 실험별 목표 대비 실제값, sample size, 재실행 필요 여부를 확인합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="실험 지표" value={formatInteger(metrics.length)} />
        <SummaryItem label="표본 합계" value={formatInteger(totalSampleSize)} />
        <SummaryItem label="표본 부족" value={formatInteger(insufficientCount)} />
        <SummaryItem label="다음 루프 필요" value={formatInteger(nextLoopCount)} />
        <SummaryItem label="평균 실제값" value={formatGoalValue(averageActualValue)} />
      </div>
      {metrics.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>실험</TableHead>
              <TableHead>지표</TableHead>
              <TableHead className="text-right">목표 / 실제</TableHead>
              <TableHead className="text-right">표본</TableHead>
              <TableHead className="text-right">분자 / 분모</TableHead>
              <TableHead>기준</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>피드백</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric) => (
              <TableRow
                key={`${metric.promotion_run_id}-${metric.ad_experiment_id ?? metric.segment_id}-${metric.created_at}`}
              >
                <TableCell>
                  <div className="grid min-w-[180px] gap-1">
                    <span className="font-medium">{metric.ad_experiment_id ?? "-"}</span>
                    <span className="text-xs text-muted-foreground">
                      {metric.promotion_id} · {metric.segment_id ?? "-"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="grid gap-1">
                    <span>{metric.metric}</span>
                    <span className="text-xs text-muted-foreground">
                      {metric.content_option_id ?? metric.content_id ?? "-"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatGoalValue(metric.target_value)} / {formatGoalValue(metric.actual_value)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(metric.sample_size)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(metric.numerator_count)} /{" "}
                  {formatInteger(metric.denominator_count)}
                </TableCell>
                <TableCell>{metric.basis}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={metric.status === "insufficient_data" ? "outline" : "secondary"}>
                      {metric.status}
                    </Badge>
                    {metric.next_loop_required ? <Badge variant="outline">next loop</Badge> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="line-clamp-2 min-w-[220px] text-sm">
                    {metric.feedback ?? "-"}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState message="등록된 실험 지표가 없습니다." />
      )}
    </section>
  );
}

function DetailTable({
  children,
  emptyMessage,
  headers,
  title
}: {
  children: ReactNode;
  emptyMessage: string;
  headers: string[];
  title: string;
}) {
  const rows = Array.isArray(children) ? children : [children];
  const hasRows = rows.some(Boolean);

  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">{title}</h3>
      {hasRows ? (
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      ) : (
        <EmptyState message={emptyMessage} />
      )}
    </section>
  );
}

function formatGoalValue(value: number) {
  return value <= 1 ? formatPercent(value) : formatInteger(value);
}

function formatPercentValue(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function eventDisplayName(eventName: string): string {
  return EVENT_DISPLAY_NAMES[eventName] ?? eventName;
}

const EVENT_DISPLAY_NAMES: Record<string, string> = {
  booking_cancel: "예약 취소",
  booking_complete: "예약 완료",
  booking_start: "예약 시작",
  campaign_landing: "캠페인 랜딩",
  campaign_redirect_click: "캠페인 리다이렉트 클릭",
  hotel_click: "숙소 클릭",
  hotel_detail_view: "숙소 상세 조회",
  hotel_search: "숙소 검색",
  page_view: "페이지 조회",
  promotion_click: "프로모션 클릭",
  promotion_impression: "프로모션 노출"
};

function formatPeriod(campaign: DashboardCampaignSummary) {
  if (!campaign.start_date && !campaign.end_date) {
    return "-";
  }
  return `${campaign.start_date ?? "미정"} ~ ${campaign.end_date ?? "미정"}`;
}
