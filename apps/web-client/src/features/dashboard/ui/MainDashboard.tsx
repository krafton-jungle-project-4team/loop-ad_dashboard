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
import {
  formatActionLabel,
  formatAudienceLabel,
  formatStatusLabel
} from "../model/dashboard-labels.js";
import { formatInteger, formatPercent } from "../model/dashboard-format.js";
import { EmptyState } from "./EmptyState.js";

export function MainDashboardPanel({ data }: { data: DashboardMain }) {
  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          메인 대시보드
        </CardTitle>
        <CardDescription>프로젝트의 캠페인 목록을 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        {data.campaigns.length > 0 ? (
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
                <TableHead className="text-right">최근 목표 달성률</TableHead>
                <TableHead>다음 액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.campaigns.map((campaign) => (
                <CampaignListRow campaign={campaign} key={campaign.campaign_id} />
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

function CampaignListRow({ campaign }: { campaign: DashboardCampaignSummary }) {
  return (
    <TableRow>
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
      <TableCell>{formatAudienceLabel(campaign.target_audience)}</TableCell>
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

function formatPeriod(campaign: DashboardCampaignSummary) {
  if (!campaign.start_date && !campaign.end_date) {
    return "-";
  }
  return `${campaign.start_date ?? "미정"} ~ ${campaign.end_date ?? "미정"}`;
}
