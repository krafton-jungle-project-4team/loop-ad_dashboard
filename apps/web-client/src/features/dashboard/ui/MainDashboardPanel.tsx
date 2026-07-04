import type {
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardMain
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
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
import { useState } from "react";
import { fetchDashboardCampaignDetail } from "../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../model/dashboard-format.js";
import { dashboardCampaignDetailQueryKey } from "../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { EmptyState } from "./EmptyState.js";

export function MainDashboardPanel({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const selectedCampaign = data.campaigns.find(
    (campaign) => campaign.campaign_id === selectedCampaignId
  );
  const campaignDetail = useQuery({
    enabled: Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
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
                    onSelect={setSelectedCampaignId}
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
  isLoading
}: {
  campaign: DashboardCampaignSummary | undefined;
  detail: DashboardCampaignDetail | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
}) {
  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          캠페인 상세
        </CardTitle>
        <CardDescription>
          프로모션, 세그먼트, 광고 실험 지표를 캠페인 단위로 조회합니다.
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
          <>
            <CampaignSummary detail={detail} />
            <PromotionTable promotions={detail.promotions} />
            <SegmentTable segments={detail.segments} />
            <ExperimentMetricTable metrics={detail.experiment_metrics} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function PromotionTable({ promotions }: { promotions: DashboardCampaignPromotion[] }) {
  return (
    <DetailTable
      emptyMessage="등록된 프로모션이 없습니다."
      headers={["프로모션", "채널", "목표 지표", "목표값", "세그먼트", "광고 실험", "상태"]}
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
        </TableRow>
      ))}
    </DetailTable>
  );
}

function SegmentTable({ segments }: { segments: DashboardCampaignSegment[] }) {
  return (
    <DetailTable
      emptyMessage="등록된 세그먼트가 없습니다."
      headers={["프로모션", "세그먼트", "예상 규모", "우선순위", "상태"]}
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
