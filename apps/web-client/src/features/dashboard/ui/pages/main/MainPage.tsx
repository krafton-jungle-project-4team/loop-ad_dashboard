import type {
  DashboardCampaignSummary,
  DashboardMain,
  DashboardRealtimeMetrics
} from "@loopad/shared";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "@loopad/ui/charts";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@loopad/ui/shadcn/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { formatInteger, formatPercent } from "../../../model/dashboard-format.js";
import {
  formatActionLabel,
  formatChannelLabel,
  formatLandingTypeLabel,
  formatStatusLabel
} from "../../../model/dashboard-labels.js";
import type { DashboardQuery } from "../../../model/dashboard-types.js";
import { EmptyState } from "../../shared/EmptyState.js";

export function MainPage({ data }: { data: DashboardMain; query: DashboardQuery }) {
  const summary = createMainSummary(data.campaigns);

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

        <MainRealtimeAnalytics metrics={data.realtime_metrics} />

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

function MainRealtimeAnalytics({ metrics }: { metrics: DashboardRealtimeMetrics }) {
  const trendData = analyticsTrendData(metrics);
  const kpis = mainAnalyticsKpis(metrics);

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-lg font-semibold tracking-tight text-[#1d1d1f]">
            실시간 지표
          </h3>
        </div>
        <Badge variant="outline">전체 캠페인 합산</Badge>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="overflow-hidden rounded-xl border bg-background">
          <div className="grid border-b md:grid-cols-4">
            {kpis.map((kpi, index) => (
              <div
                className={
                  index === 0
                    ? "grid min-h-32 content-between bg-[#eaf2ff] p-5"
                    : "grid min-h-32 content-between border-t p-5 md:border-l md:border-t-0"
                }
                key={kpi.label}
              >
                <div className="grid gap-1">
                  <div className="text-sm font-medium text-muted-foreground">{kpi.label}</div>
                  <div className="text-3xl font-semibold tabular-nums text-[#202124]">
                    {kpi.value}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{kpi.helper}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-[#202124]">시간대별 이벤트 추이</div>
            </div>
            {trendData.length > 0 ? (
              <ChartContainer
                className="min-h-[280px] w-full"
                config={{
                  event_count: {
                    color: "#1a73e8",
                    label: "이벤트 수"
                  },
                  unique_user_count: {
                    color: "#16a7b7",
                    label: "유니크 유저"
                  }
                }}
              >
                <LineChart data={trendData} margin={{ bottom: 0, left: 0, right: 18, top: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={44} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    dataKey="event_count"
                    dot={false}
                    stroke="var(--color-event_count)"
                    strokeWidth={3}
                    type="monotone"
                  />
                  <Line
                    dataKey="unique_user_count"
                    dot={false}
                    stroke="var(--color-unique_user_count)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyState message="시간대별 수집 이벤트가 아직 없습니다." />
            )}
          </div>
        </div>

        <MainRealtimeActivityCard metrics={metrics} trendData={trendData} />
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <MainAnalyticsRankCard
          emptyMessage="채널 집계가 없습니다."
          items={metrics.channel_breakdown.map((item) => ({
            key: item.key,
            label: formatChannelLabel(item.key),
            value: item.event_count
          }))}
          title="채널별 세션"
        />
        <MainAnalyticsRankCard
          emptyMessage="숙소군 집계가 없습니다."
          items={metrics.hotel_cluster_breakdown.map((item) => ({
            key: item.key,
            label: formatHotelClusterLabel(item.key),
            value: item.event_count
          }))}
          title="숙소군별 반응"
        />
        <MainAnalyticsRankCard
          emptyMessage="랜딩 유형 집계가 없습니다."
          items={metrics.landing_type_breakdown.map((item) => ({
            key: item.key,
            label: formatLandingTypeLabel(item.key),
            value: item.event_count
          }))}
          title="랜딩 유형"
        />
        <MainAnalyticsRankCard
          emptyMessage="이벤트 집계가 없습니다."
          items={metrics.events.map((event) => ({
            key: event.event_name,
            label: eventDisplayName(event.event_name),
            value: event.event_count
          }))}
          title="주요 이벤트"
        />
      </div>
    </section>
  );
}

function MainRealtimeActivityCard({
  metrics,
  trendData
}: {
  metrics: DashboardRealtimeMetrics;
  trendData: AnalyticsTrendDatum[];
}) {
  const recentBars = trendData.slice(-24);
  const maxEventCount = Math.max(...recentBars.map((item) => item.event_count), 1);
  const topCluster = metrics.hotel_cluster_breakdown[0];

  return (
    <div className="grid min-h-[420px] content-between rounded-xl border bg-background p-5">
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <div className="text-sm font-medium text-muted-foreground">최근 5분 이벤트</div>
            <div className="text-5xl font-semibold tabular-nums text-[#202124]">
              {formatInteger(metrics.recent_5m_event_count)}
            </div>
          </div>
          <Badge className="border-[#188038] text-[#188038]" variant="outline">
            정상 수집
          </Badge>
        </div>
        <div className="grid gap-1">
          <div className="text-sm text-muted-foreground">최근 1시간 이벤트</div>
          <div className="text-2xl font-semibold tabular-nums">
            {formatInteger(metrics.recent_1h_event_count)}
          </div>
        </div>
        <div className="flex h-24 items-end gap-1.5">
          {recentBars.length > 0 ? (
            recentBars.map((item) => (
              <div
                className="min-h-1 flex-1 rounded-t-sm bg-[#1a73e8]"
                key={item.time_bucket}
                style={{ height: `${Math.max((item.event_count / maxEventCount) * 100, 6)}%` }}
                title={`${item.label}: ${formatInteger(item.event_count)}`}
              />
            ))
          ) : (
            <div className="grid h-full flex-1 place-items-center text-sm text-muted-foreground">
              최근 수집 구간 없음
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-3">
        <MainMetricLine label="피크 시간" value={metrics.peak_time ?? "-"} />
        <MainMetricLine
          label="상위 숙소군"
          value={
            topCluster
              ? `${formatHotelClusterLabel(topCluster.key)} ${formatInteger(topCluster.event_count)}`
              : "-"
          }
        />
        <MainMetricLine
          label="배너 클릭률"
          value={formatPercentValue(metrics.banner_response.promotion_click_rate)}
        />
      </div>
    </div>
  );
}

function MainAnalyticsRankCard({
  emptyMessage,
  items,
  title
}: {
  emptyMessage: string;
  items: AnalyticsRankItem[];
  title: string;
}) {
  const visibleItems = [...items].sort((a, b) => b.value - a.value).slice(0, 7);
  const maxValue = Math.max(...visibleItems.map((item) => item.value), 1);

  return (
    <div className="grid gap-4 rounded-xl border bg-background p-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-base font-semibold text-[#202124]">{title}</h4>
        <span className="text-xs text-muted-foreground">수집 기준</span>
      </div>
      {visibleItems.length > 0 ? (
        <div className="grid gap-3">
          {visibleItems.map((item) => (
            <div className="grid gap-1.5" key={item.key}>
              <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-[#3c4043]">{item.label}</div>
                </div>
                <div className="shrink-0 tabular-nums text-[#3c4043]">
                  {formatInteger(item.value)}
                </div>
              </div>
              <div className="h-0.5 bg-muted">
                <div
                  className="h-full bg-[#1a73e8]"
                  style={{ width: `${Math.max((item.value / maxValue) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{emptyMessage}</div>
      )}
    </div>
  );
}

function CampaignListRow({
  campaign
}: {
  campaign: DashboardCampaignSummary;
}) {
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

type AnalyticsTrendDatum = {
  event_count: number;
  label: string;
  time_bucket: string;
  unique_user_count: number;
};

type AnalyticsRankItem = {
  key: string;
  label: string;
  value: number;
};

type MainAnalyticsKpi = {
  helper: string;
  label: string;
  value: string;
};

function mainAnalyticsKpis(metrics: DashboardRealtimeMetrics): MainAnalyticsKpi[] {
  const activeUserCount = Math.max(
    0,
    ...metrics.time_buckets.map((bucket) => bucket.unique_user_count)
  );
  const promotionClickCount = realtimeEventCount(metrics, "promotion_click");
  const bookingStartCount = realtimeEventCount(metrics, "booking_start");
  const bookingCompleteCount = realtimeEventCount(metrics, "booking_complete");
  const bookingConversionRate =
    bookingStartCount > 0 ? formatPercentValue(bookingCompleteCount / bookingStartCount) : "-";

  return [
    {
      helper: `최근 1시간 ${formatInteger(metrics.recent_1h_event_count)}`,
      label: "총 이벤트",
      value: formatInteger(metrics.total_event_count)
    },
    {
      helper: `피크 ${metrics.peak_time ?? "-"}`,
      label: "활성 사용자",
      value: formatInteger(activeUserCount)
    },
    {
      helper: `배너 클릭률 ${formatPercentValue(metrics.banner_response.promotion_click_rate)}`,
      label: "프로모션 클릭",
      value: formatInteger(promotionClickCount)
    },
    {
      helper: `예약 시작 대비 ${bookingConversionRate}`,
      label: "예약 완료",
      value: formatInteger(bookingCompleteCount)
    }
  ];
}

function analyticsTrendData(metrics: DashboardRealtimeMetrics): AnalyticsTrendDatum[] {
  return metrics.time_buckets.slice(-14).map((bucket) => ({
    event_count: bucket.event_count,
    label: formatTimeBucketLabel(bucket.time_bucket),
    time_bucket: bucket.time_bucket,
    unique_user_count: bucket.unique_user_count
  }));
}

function realtimeEventCount(metrics: DashboardRealtimeMetrics, eventName: string) {
  return (
    metrics.events.find((event) => event.event_name === eventName)?.event_count ?? 0
  );
}

function formatPercentValue(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatTimeBucketLabel(value: string) {
  const normalized = value.replace("T", " ");
  const [datePart, timePart] = normalized.split(" ");

  if (!datePart || !timePart) {
    return value;
  }

  return `${datePart.slice(5)} ${timePart.slice(0, 2)}시`;
}

function MainMetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-t pt-3 text-sm">
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <span className="shrink-0 tabular-nums text-[#3c4043]">{value}</span>
    </div>
  );
}

function eventDisplayName(eventName: string): string {
  return EVENT_DISPLAY_NAMES[eventName] ?? eventName;
}

function formatHotelClusterLabel(value: string) {
  return value ? `숙소군 ${value}` : "미분류 숙소군";
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
