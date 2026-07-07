import type { DashboardCampaignSummary, DashboardMain } from "@loopad/shared";
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
import { formatActionLabel, formatStatusLabel } from "../model/dashboard-labels.js";
import { formatInteger, formatPercent } from "../model/dashboard-format.js";
import { useDashboardQueryState } from "../model/dashboard-query.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { EmptyState } from "./EmptyState.js";

export function MainDashboardPanel({ data, query }: { data: DashboardMain; query: DashboardQuery }) {
  const summary = createMainSummary(data.campaigns);
  const [, setDashboardQueryState] = useDashboardQueryState();

  function selectCampaign(campaignId: string) {
    void setDashboardQueryState({
      selectedCampaignId: campaignId,
      selectedPromotionId: "",
      selectedSegmentId: ""
    });
  }

  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          메인 대시보드
        </CardTitle>
        <CardDescription>프로젝트의 운영 현황과 캠페인 목록을 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 px-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MainSummaryCard
            label="전체 캠페인"
            note={`활성 ${formatInteger(summary.activeCampaigns)}개`}
            value={formatInteger(summary.totalCampaigns)}
          />
          <MainSummaryCard
            label="초안 캠페인"
            note="아직 시작 전"
            value={formatInteger(summary.draftCampaigns)}
          />
          <MainSummaryCard
            label="종료/중지 캠페인"
            note="완료 또는 중지"
            value={formatInteger(summary.closedCampaigns)}
          />
          <MainSummaryCard
            label="전체 프로모션"
            note={`캠페인당 평균 ${formatDecimal(summary.averagePromotionsPerCampaign)}개`}
            value={formatInteger(summary.totalPromotions)}
          />
          <MainSummaryCard
            label="확정 세그먼트"
            note={`프로모션당 평균 ${formatDecimal(summary.averageSegmentsPerPromotion)}개`}
            value={formatInteger(summary.totalSegments)}
          />
          <MainSummaryCard
            label="광고 실험"
            note="생성된 실험 수"
            value={formatInteger(summary.totalAdExperiments)}
          />
          <MainSummaryCard
            label="평균 목표 달성률"
            note={`${formatInteger(summary.measuredCampaigns)}개 캠페인 기준`}
            value={summary.averageGoalRate === null ? "-" : formatPercent(summary.averageGoalRate)}
          />
          <MainSummaryCard
            label="목표 달성 캠페인"
            note="최근 목표 달성률 100% 이상"
            value={formatInteger(summary.goalMetCampaigns)}
          />
          <MainSummaryCard
            label="조치 필요 캠페인"
            note="다음 액션이 남은 항목"
            value={formatInteger(summary.actionRequiredCampaigns)}
          />
          <MainSummaryCard
            label="최신 업데이트"
            note="가장 최근 변경"
            value={formatCompactDate(summary.latestUpdatedAt)}
          />
        </div>

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
                <TableHead>다음 액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.campaigns.map((campaign) => (
                <CampaignListRow
                  campaign={campaign}
                  isSelected={campaign.campaign_id === query.selectedCampaignId}
                  key={campaign.campaign_id}
                  onSelect={selectCampaign}
                />
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="등록된 캠페인이 없습니다." />
        )}
      </CardContent>
    </Card>
  );
}

function MainSummaryCard({
  label,
  note,
  value
}: {
  label: string;
  note: string;
  value: string;
}) {
  return (
    <div className="grid min-h-[118px] gap-2 rounded-lg border border-black/10 bg-[#f5f5f7] p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">{value}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  );
}

function CampaignListRow({
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
      className="cursor-pointer aria-selected:bg-[#0066cc]/5"
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
          <span className="font-medium text-foreground">{campaign.campaign_name}</span>
          {campaign.objective ? (
            <span className="line-clamp-2 text-sm text-muted-foreground">{campaign.objective}</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{formatStatusLabel(campaign.status)}</Badge>
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
      <TableCell>
        <Badge variant="outline">{formatActionLabel(campaign.next_action)}</Badge>
      </TableCell>
    </TableRow>
  );
}

function createMainSummary(campaigns: DashboardCampaignSummary[]) {
  const goalRates = campaigns
    .map((campaign) => campaign.latest_goal_achievement_rate)
    .filter((rate): rate is number => rate !== null);
  const totalPromotions = campaigns.reduce((sum, campaign) => sum + campaign.promotion_count, 0);
  const totalSegments = campaigns.reduce((sum, campaign) => sum + campaign.segment_count, 0);
  const totalAdExperiments = campaigns.reduce(
    (sum, campaign) => sum + campaign.ad_experiment_count,
    0
  );

  return {
    actionRequiredCampaigns: campaigns.filter(
      (campaign) => !["monitor", "none"].includes(campaign.next_action)
    ).length,
    activeCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
    averageGoalRate: goalRates.length
      ? goalRates.reduce((sum, rate) => sum + rate, 0) / goalRates.length
      : null,
    averagePromotionsPerCampaign: campaigns.length ? totalPromotions / campaigns.length : 0,
    averageSegmentsPerPromotion: totalPromotions ? totalSegments / totalPromotions : 0,
    closedCampaigns: campaigns.filter((campaign) =>
      ["completed", "stopped"].includes(campaign.status)
    ).length,
    draftCampaigns: campaigns.filter((campaign) => campaign.status === "draft").length,
    goalMetCampaigns: goalRates.filter((rate) => rate >= 1).length,
    latestUpdatedAt: campaigns.reduce<string | null>((latest, campaign) => {
      if (!latest || campaign.updated_at > latest) {
        return campaign.updated_at;
      }
      return latest;
    }, null),
    measuredCampaigns: goalRates.length,
    totalAdExperiments,
    totalCampaigns: campaigns.length,
    totalPromotions,
    totalSegments
  };
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 1 ? 1 : 0
  }).format(value);
}

function formatCompactDate(value: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(date);
}

function formatPeriod(campaign: DashboardCampaignSummary) {
  if (!campaign.start_date && !campaign.end_date) {
    return "-";
  }
  return `${campaign.start_date ?? "미정"} ~ ${campaign.end_date ?? "미정"}`;
}
