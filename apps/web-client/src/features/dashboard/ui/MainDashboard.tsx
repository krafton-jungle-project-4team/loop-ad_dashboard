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
import { formatInteger, formatPercent } from "../model/dashboard-format.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { EmptyState } from "./EmptyState.js";

export function MainDashboardPanel({
  data,
  query: _query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  const summary = summarizeMain(data.campaigns);
  const recentCampaigns = [...data.campaigns]
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
    .slice(0, 5);

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OverviewTile label="캠페인" value={formatInteger(summary.campaignCount)} />
        <OverviewTile label="프로모션" value={formatInteger(summary.promotionCount)} />
        <OverviewTile label="확정 세그먼트" value={formatInteger(summary.segmentCount)} />
        <OverviewTile label="광고 실험" value={formatInteger(summary.experimentCount)} />
        <OverviewTile label="진행 캠페인" value={formatInteger(summary.activeCampaignCount)} />
        <OverviewTile label="다음 루프" value={formatInteger(summary.nextLoopCount)} />
        <OverviewTile label="프로모션 필요" value={formatInteger(summary.createPromotionCount)} />
        <OverviewTile label="평균 목표 달성률" value={formatOptionalRate(summary.averageGoalRate)} />
      </section>

      <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
        <CardHeader className="gap-1.5 px-5">
          <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
            최근 캠페인
          </CardTitle>
          <CardDescription>업데이트가 최근인 캠페인부터 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          {recentCampaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>캠페인</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>대상</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-right">루프</TableHead>
                  <TableHead className="text-right">프로모션</TableHead>
                  <TableHead className="text-right">세그먼트</TableHead>
                  <TableHead className="text-right">실험</TableHead>
                  <TableHead className="text-right">목표 달성률</TableHead>
                  <TableHead>다음 액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCampaigns.map((campaign) => (
                  <CampaignListRow campaign={campaign} key={campaign.campaign_id} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState message="등록된 캠페인이 없습니다." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-[#1d1d1f]">{value}</div>
    </div>
  );
}

function CampaignListRow({ campaign }: { campaign: DashboardCampaignSummary }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-[220px] flex-col gap-1">
          <span className="font-medium text-foreground">{campaign.campaign_name}</span>
          <span className="truncate text-xs text-muted-foreground">{campaign.campaign_id}</span>
          {campaign.objective ? (
            <span className="line-clamp-2 text-sm text-muted-foreground">{campaign.objective}</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant(campaign.status)}>{campaign.status}</Badge>
      </TableCell>
      <TableCell>{campaign.target_audience}</TableCell>
      <TableCell>{formatPeriod(campaign)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatInteger(campaign.current_loop_count)} / {formatInteger(campaign.max_loop_count)}
      </TableCell>
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
        {formatOptionalRate(campaign.latest_goal_achievement_rate)}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{actionLabel(campaign.next_action)}</Badge>
      </TableCell>
    </TableRow>
  );
}

function summarizeMain(campaigns: DashboardCampaignSummary[]) {
  const goalRates = campaigns
    .map((campaign) => campaign.latest_goal_achievement_rate)
    .filter((value): value is number => typeof value === "number");

  return {
    activeCampaignCount: campaigns.filter((campaign) => campaign.status === "active").length,
    averageGoalRate:
      goalRates.length > 0
        ? goalRates.reduce((sum, value) => sum + value, 0) / goalRates.length
        : null,
    campaignCount: campaigns.length,
    createPromotionCount: campaigns.filter(
      (campaign) => campaign.next_action === "create_promotion"
    ).length,
    experimentCount: campaigns.reduce((sum, campaign) => sum + campaign.ad_experiment_count, 0),
    nextLoopCount: campaigns.filter((campaign) => campaign.next_action === "next_loop").length,
    promotionCount: campaigns.reduce((sum, campaign) => sum + campaign.promotion_count, 0),
    segmentCount: campaigns.reduce((sum, campaign) => sum + campaign.segment_count, 0)
  };
}

const actionMeta: Record<string, { label: string }> = {
  approve_content: {
    label: "콘텐츠 승인 필요"
  },
  attach_segment: {
    label: "세그먼트 확정 필요"
  },
  campaign_start: {
    label: "캠페인 시작 필요"
  },
  create_promotion: {
    label: "프로모션 생성 필요"
  },
  next_loop: {
    label: "다음 루프 필요"
  }
};

function actionLabel(action: string) {
  return actionMeta[action]?.label ?? action;
}

function statusBadgeVariant(status: string) {
  if (status === "active" || status === "completed") {
    return "secondary";
  }
  if (status === "stopped" || status === "paused") {
    return "destructive";
  }
  return "outline";
}

function formatPeriod(campaign: DashboardCampaignSummary) {
  if (!campaign.start_date && !campaign.end_date) {
    return "-";
  }
  return `${campaign.start_date ?? "미정"} ~ ${campaign.end_date ?? "미정"}`;
}

function formatOptionalRate(value: number | null) {
  return typeof value === "number" ? formatPercent(value) : "-";
}
