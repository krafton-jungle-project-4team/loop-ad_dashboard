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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MainSummaryCard label="전체 캠페인" value={formatInteger(summary.totalCampaigns)} />
          <MainSummaryCard label="실행 중 캠페인" value={formatInteger(summary.runningCampaigns)} />
          <MainSummaryCard label="전체 프로모션" value={formatInteger(summary.totalPromotions)} />
          <MainSummaryCard label="확정 세그먼트" value={formatInteger(summary.totalSegments)} />
          <MainSummaryCard
            label="평균 목표 달성률"
            value={summary.averageGoalRate === null ? "-" : formatPercent(summary.averageGoalRate)}
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

function MainSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-black/10 bg-[#f5f5f7] p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">{value}</span>
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

  return {
    averageGoalRate: goalRates.length
      ? goalRates.reduce((sum, rate) => sum + rate, 0) / goalRates.length
      : null,
    runningCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
    totalCampaigns: campaigns.length,
    totalPromotions: campaigns.reduce((sum, campaign) => sum + campaign.promotion_count, 0),
    totalSegments: campaigns.reduce((sum, campaign) => sum + campaign.segment_count, 0)
  };
}

function formatPeriod(campaign: DashboardCampaignSummary) {
  if (!campaign.start_date && !campaign.end_date) {
    return "-";
  }
  return `${campaign.start_date ?? "미정"} ~ ${campaign.end_date ?? "미정"}`;
}
