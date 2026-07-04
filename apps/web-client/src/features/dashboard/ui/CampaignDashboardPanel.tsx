import type {
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardMain,
  DashboardPromotionDetail as DashboardPromotionDetailResource,
  DashboardSegmentDetail as DashboardSegmentDetailResource
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Progress } from "@loopad/ui/shadcn/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
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

      <CampaignDetailPanel
        campaign={selectedCampaign}
        detail={campaignDetail.data}
        error={campaignDetail.error}
        isError={campaignDetail.isError}
        isLoading={campaignDetail.isLoading}
        onSelectPromotion={(promotionId) => {
          void setDashboardQueryState({ selectedPromotionId: promotionId, selectedSegmentId: "" });
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
  switch (tab) {
    case "campaign-promotions":
      return (
        <>
          <PromotionTable
            onSelectPromotion={onSelectPromotion}
            promotions={detail.promotions}
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
        <ExperimentMetricTable
          metrics={promotionDetail?.experiment_metrics ?? detail.experiment_metrics}
        />
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
          <MarketingPlan detail={detail} />
          <CampaignRealtimeTrend detail={detail} />
          <CampaignWorkflow detail={detail} />
          <PromotionTable
            onSelectPromotion={onSelectPromotion}
            promotions={detail.promotions}
            selectedPromotionId={selectedPromotionId}
          />
          <CampaignNextAction detail={detail} />
        </>
      );
  }
}

function CampaignSummary({ detail }: { detail: DashboardCampaignDetail }) {
  const campaign = detail.campaign;
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <SummaryItem label="상태" value={campaign.status} />
      <SummaryItem label="기간" value={formatPeriod(campaign)} />
      <SummaryItem label="프로모션" value={formatInteger(campaign.promotion_count)} />
      <SummaryItem label="세그먼트" value={formatInteger(campaign.segment_count)} />
      <SummaryItem label="광고 실험" value={formatInteger(campaign.ad_experiment_count)} />
      <SummaryItem label="주요 지표" value={campaign.primary_metric ?? "-"} />
      <SummaryItem
        label="최근 목표 달성률"
        value={
          campaign.latest_goal_achievement_rate === null
            ? "-"
            : formatPercent(campaign.latest_goal_achievement_rate)
        }
      />
      <SummaryItem label="업데이트" value={campaign.updated_at} />
    </div>
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
        <SummaryItem label="실험 지표" value={formatInteger(detail.experiment_metrics.length)} />
      </div>
      <Progress value={Math.min(achievementRate * 100, 100)} />
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
            <div className="rounded-md border p-3" key={promotion.promotion_id}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{promotion.marketing_theme}</span>
                <Badge variant="secondary">{promotion.status}</Badge>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Campaign → Promotion → {formatInteger(segments.length)} Segment →{" "}
                {formatInteger(promotion.ad_experiment_count)} Ad Experiment
              </div>
            </div>
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
  selectedPromotionId
}: {
  onSelectPromotion: (promotionId: string) => void;
  promotions: DashboardCampaignPromotion[];
  selectedPromotionId: string;
}) {
  return (
    <DetailTable
      emptyMessage="등록된 프로모션이 없습니다."
      headers={["프로모션", "채널", "목표 지표", "목표값", "세그먼트", "광고 실험", "상태", "상세"]}
      title="프로모션 목록"
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
            {formatInteger(promotion.target_segment_count)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatInteger(promotion.ad_experiment_count)}
          </TableCell>
          <TableCell>
            <Badge variant="secondary">{promotion.status}</Badge>
          </TableCell>
          <TableCell>
            <Button
              onClick={() => onSelectPromotion(promotion.promotion_id)}
              size="sm"
              variant={selectedPromotionId === promotion.promotion_id ? "default" : "outline"}
            >
              {selectedPromotionId === promotion.promotion_id ? "열림" : "상세"}
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </DetailTable>
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
      <h3 className="text-base font-semibold text-[#1d1d1f]">프로모션 상세</h3>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="프로모션" value={promotion.promotion_id} />
        <SummaryItem label="채널" value={promotion.channel} />
        <SummaryItem label="마케팅 테마" value={promotion.marketing_theme} />
        <SummaryItem label="목표 달성률" value={formatPercent(promotion.latest_actual_value ?? 0)} />
      </div>
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

function SegmentTable({
  onSelectSegment,
  segments,
  selectedSegmentId
}: {
  onSelectSegment?: (promotionId: string, segmentId: string) => void;
  segments: DashboardCampaignSegment[];
  selectedSegmentId?: string;
}) {
  return (
    <DetailTable
      emptyMessage="등록된 세그먼트가 없습니다."
      headers={[
        "프로모션",
        "세그먼트",
        "예상 규모",
        "우선순위",
        "상태",
        ...(onSelectSegment ? ["상세"] : [])
      ]}
      title="세그먼트 목록"
    >
      {segments.map((segment) => (
        <TableRow key={`${segment.promotion_id}-${segment.segment_id}`}>
          <TableCell>{segment.promotion_id}</TableCell>
          <TableCell>
            <div className="flex min-w-[180px] flex-col gap-1">
              <span className="font-medium">{segment.segment_name}</span>
              <span className="text-xs text-muted-foreground">{segment.segment_id}</span>
            </div>
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatInteger(segment.estimated_size)}
          </TableCell>
          <TableCell>{segment.priority ?? "-"}</TableCell>
          <TableCell>
            <Badge variant="secondary">{segment.status}</Badge>
          </TableCell>
          {onSelectSegment ? (
            <TableCell>
              <Button
                onClick={() => onSelectSegment(segment.promotion_id, segment.segment_id)}
                size="sm"
                variant={selectedSegmentId === segment.segment_id ? "default" : "outline"}
              >
                {selectedSegmentId === segment.segment_id ? "열림" : "상세"}
              </Button>
            </TableCell>
          ) : null}
        </TableRow>
      ))}
    </DetailTable>
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

  return (
    <section className="grid gap-4">
      <h3 className="text-base font-semibold text-[#1d1d1f]">세그먼트 상세</h3>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="세그먼트" value={detail.segment.segment_name} />
        <SummaryItem label="대상 규모" value={formatInteger(detail.segment.estimated_size)} />
        <SummaryItem label="상태" value={detail.segment.status} />
        <SummaryItem label="콘텐츠 후보" value={formatInteger(detail.content_candidates.length)} />
      </div>
      <ContentCandidateTable candidates={detail.content_candidates} />
      <ExperimentMetricTable metrics={detail.experiment_metrics} />
    </section>
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
      headers={["콘텐츠", "채널", "메시지", "이미지 프롬프트", "상태"]}
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
            <div className="line-clamp-2 min-w-[220px]">{candidate.image_prompt ?? "-"}</div>
          </TableCell>
          <TableCell>
            <Badge variant="secondary">{candidate.status}</Badge>
          </TableCell>
        </TableRow>
      ))}
    </DetailTable>
  );
}

function ExperimentMetricTable({ metrics }: { metrics: DashboardCampaignExperimentMetric[] }) {
  return (
    <DetailTable
      emptyMessage="등록된 실험 지표가 없습니다."
      headers={[
        "프로모션",
        "광고 실험",
        "세그먼트",
        "지표",
        "목표",
        "실제",
        "표본",
        "상태"
      ]}
      title="실험 지표"
    >
      {metrics.map((metric) => (
        <TableRow key={`${metric.promotion_id}-${metric.ad_experiment_id}-${metric.created_at}`}>
          <TableCell>{metric.promotion_id}</TableCell>
          <TableCell>{metric.ad_experiment_id ?? "-"}</TableCell>
          <TableCell>{metric.segment_id ?? "-"}</TableCell>
          <TableCell>{metric.metric}</TableCell>
          <TableCell className="text-right tabular-nums">
            {formatGoalValue(metric.target_value)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatGoalValue(metric.actual_value)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatInteger(metric.sample_size)}
          </TableCell>
          <TableCell>
            <Badge variant={metric.status === "insufficient_data" ? "outline" : "secondary"}>
              {metric.status}
            </Badge>
          </TableCell>
        </TableRow>
      ))}
    </DetailTable>
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

function formatPeriod(campaign: DashboardCampaignSummary) {
  if (!campaign.start_date && !campaign.end_date) {
    return "-";
  }
  return `${campaign.start_date ?? "미정"} ~ ${campaign.end_date ?? "미정"}`;
}
