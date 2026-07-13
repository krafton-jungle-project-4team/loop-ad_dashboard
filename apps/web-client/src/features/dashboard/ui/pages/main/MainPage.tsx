import type {
  DashboardCampaignSummary,
  DashboardMain,
  DashboardRealtimeMetrics
} from "@loopad/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis
} from "@loopad/ui/charts";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@loopad/ui/shadcn/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { fetchDashboardFunnelList } from "../../../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../../../model/dashboard-format.js";
import {
  formatActionLabel,
  formatChannelLabel,
  formatLandingTypeLabel,
  formatStatusLabel
} from "../../../model/dashboard-labels.js";
import { useDashboardQueryState } from "../../../model/dashboard-query.js";
import { dashboardFunnelListQueryKey } from "../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../model/dashboard-types.js";
import { EmptyState } from "../../shared/EmptyState.js";
import { FunnelPage } from "../funnel/FunnelPage.js";

export function MainPage({ data, query }: { data: DashboardMain; query: DashboardQuery }) {
  const [, setDashboardQueryState] = useDashboardQueryState();
  const userPathsQuery = useQuery({
    enabled: query.statisticsView === "user-paths",
    queryFn: ({ signal }) => fetchDashboardFunnelList(query, signal),
    queryKey: dashboardFunnelListQueryKey(query.projectId)
  });

  const handleViewChange = (value: string) => {
    if (value !== "overview" && value !== "user-paths") {
      return;
    }
    void setDashboardQueryState({ statisticsView: value });
  };

  return (
    <Tabs
      className="grid min-h-0 gap-6"
      onValueChange={handleViewChange}
      value={query.statisticsView}
    >
      <TabsList className="w-fit" variant="line">
        <TabsTrigger value="overview">운영 현황</TabsTrigger>
        <TabsTrigger value="user-paths">사용자 경로</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <MainOverview data={data} query={query} />
      </TabsContent>
      <TabsContent value="user-paths">
        {userPathsQuery.data ? (
          <FunnelPage data={userPathsQuery.data} query={query} />
        ) : userPathsQuery.isError ? (
          <EmptyState message="사용자 경로 목록을 불러오지 못했습니다." />
        ) : (
          <EmptyState message="사용자 경로 목록을 불러오는 중입니다." />
        )}
      </TabsContent>
    </Tabs>
  );
}

function MainOverview({ data, query }: { data: DashboardMain; query: DashboardQuery }) {
  const summary = createMainSummary(data.campaigns);

  return (
    <div className="grid gap-6">
      <Card className="w-full min-w-0 overflow-hidden bg-white py-0 shadow-none">
        <CardHeader className="border-b bg-gradient-to-br from-primary/[0.08] via-white to-white px-5 py-6 md:px-6">
          <div className="grid gap-1.5">
            <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
              운영 현황
            </CardTitle>
            <CardDescription className="text-sm">
              사용자 행동을 확인하고 캠페인 작업으로 자연스럽게 이어가세요.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 px-5 py-5 md:px-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MainSummaryCard
              accent
              label="활성 캠페인"
              note={`전체 ${formatInteger(summary.totalCampaigns)}개 중 운영 중`}
              value={formatInteger(summary.activeCampaigns)}
            />
            <MainSummaryCard
              label="전체 프로모션"
              note="캠페인 하위 프로모션"
              value={formatInteger(summary.totalPromotions)}
            />
            <MainSummaryCard
              label="확정 세그먼트"
              note="실행 가능한 대상 그룹"
              value={formatInteger(summary.totalSegments)}
            />
            <MainSummaryCard
              label="조치 필요 캠페인"
              note={`실험 ${formatInteger(summary.totalAdExperiments)}개 운영 기준`}
              value={formatInteger(summary.actionRequiredCampaigns)}
            />
          </div>

          <MainRealtimeAnalytics metrics={data.realtime_metrics} />

          <section className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="grid gap-1">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  캠페인 작업 목록
                </h2>
                <p className="text-sm text-muted-foreground">
                  이름을 선택하면 해당 캠페인의 개요로 이동합니다.
                </p>
              </div>
              <Badge variant="outline">
                <Sparkles data-icon="inline-start" />
                다음 액션 {formatInteger(summary.actionRequiredCampaigns)}개
              </Badge>
            </div>
            {data.campaigns.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[920px] text-sm">
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
                        key={campaign.campaign_id}
                        projectId={query.projectId}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState message="등록된 캠페인이 없습니다. 캠페인 관리에서 첫 캠페인을 만들어보세요." />
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function MainSummaryCard({
  accent = false,
  label,
  note,
  value
}: {
  accent?: boolean;
  label: string;
  note: string;
  value: string;
}) {
  return (
    <Card
      className={
        accent
          ? "min-h-[112px] border-primary/25 bg-primary/[0.06] py-4"
          : "min-h-[112px] bg-muted/50 py-4"
      }
    >
      <CardContent className="grid gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold tracking-tight text-foreground">{value}</span>
        <span className="text-xs leading-5 text-muted-foreground">{note}</span>
      </CardContent>
    </Card>
  );
}

function MainRealtimeAnalytics({ metrics }: { metrics: DashboardRealtimeMetrics }) {
  const trendData = analyticsTrendData(metrics);
  const kpis = mainAnalyticsKpis(metrics);

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold tracking-tight text-foreground">실시간 지표</h3>
        </div>
        <Badge variant="outline">전체 캠페인 합산</Badge>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="overflow-hidden rounded-lg border bg-background">
          <div className="grid border-b md:grid-cols-4">
            {kpis.map((kpi, index) => (
              <div
                className={
                  index === 0
                    ? "grid min-h-28 content-between bg-accent p-4"
                    : "grid min-h-28 content-between border-t p-4 md:border-l md:border-t-0"
                }
                key={kpi.label}
              >
                <div className="grid gap-1">
                  <div className="text-sm font-medium text-muted-foreground">{kpi.label}</div>
                  <div className="text-2xl font-semibold tabular-nums text-foreground">
                    {kpi.value}
                  </div>
                </div>
                <div className="text-xs leading-5 text-muted-foreground">{kpi.helper}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-foreground">시간대별 이벤트 추이</div>
            </div>
            {trendData.length > 0 ? (
              <ChartContainer
                className="h-[260px] min-h-0 w-full aspect-auto"
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
  const topCluster = metrics.hotel_cluster_breakdown[0];

  return (
    <Card className="min-h-[260px] self-start">
      <CardContent className="grid h-full content-between gap-6">
        <div className="grid gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <div className="text-sm font-medium text-muted-foreground">최근 5분 이벤트</div>
              <div className="text-4xl font-semibold tabular-nums text-foreground">
                {formatInteger(metrics.recent_5m_event_count)}
              </div>
            </div>
            <Badge className="border-[#188038] text-[#188038]" variant="outline">
              정상 수집
            </Badge>
          </div>
          <div className="grid gap-1">
            <div className="text-sm text-muted-foreground">최근 1시간 이벤트</div>
            <div className="text-xl font-semibold tabular-nums">
              {formatInteger(metrics.recent_1h_event_count)}
            </div>
          </div>
          <div className="h-16">
            {recentBars.length > 0 ? (
              <ChartContainer
                className="h-full w-full"
                config={{ event_count: { color: "var(--primary)", label: "이벤트" } }}
              >
                <BarChart accessibilityLayer data={recentBars}>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="event_count"
                    fill="var(--color-event_count)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
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
      </CardContent>
    </Card>
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
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
        <span className="text-xs text-muted-foreground">수집 기준</span>
      </CardHeader>
      <CardContent>
        {visibleItems.length > 0 ? (
          <ChartContainer
            className="w-full"
            config={{ value: { color: "var(--primary)", label: title } }}
            style={{ height: `${Math.max(visibleItems.length * 34, 80)}px` }}
          >
            <BarChart
              accessibilityLayer
              data={visibleItems}
              layout="vertical"
              margin={{ right: 34 }}
            >
              <XAxis dataKey="value" hide type="number" />
              <YAxis
                axisLine={false}
                dataKey="label"
                tickLine={false}
                tickMargin={8}
                type="category"
                width={88}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={3}>
                <LabelList
                  className="fill-foreground text-xs tabular-nums"
                  dataKey="value"
                  formatter={(value) => formatInteger(Number(value ?? 0))}
                  position="right"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="text-sm text-muted-foreground">{emptyMessage}</div>
        )}
      </CardContent>
    </Card>
  );
}

function CampaignListRow({
  campaign,
  projectId
}: {
  campaign: DashboardCampaignSummary;
  projectId: string;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-[200px] flex-col gap-1">
          <Link
            className="w-fit font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            params={{ projectId, tabPath: "campaigns" }}
            search={(current) => ({
              ...current,
              campaignView: "overview",
              selectedCampaignId: campaign.campaign_id,
              selectedPromotionId: "",
              selectedSegmentId: ""
            })}
            to="/dashboard/$projectId/$tabPath"
          >
            {campaign.campaign_name}
          </Link>
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
  return metrics.events.find((event) => event.event_name === eventName)?.event_count ?? 0;
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
      <span className="shrink-0 tabular-nums text-foreground/85">{value}</span>
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

function formatPeriod(campaign: DashboardCampaignSummary) {
  if (!campaign.start_date && !campaign.end_date) {
    return "-";
  }
  return `${campaign.start_date ?? "미정"} ~ ${campaign.end_date ?? "미정"}`;
}
