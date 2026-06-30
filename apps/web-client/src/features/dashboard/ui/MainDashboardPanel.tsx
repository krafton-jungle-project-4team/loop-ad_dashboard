import type { DashboardKpiCard, DashboardMain } from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@loopad/ui/shadcn/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@loopad/ui/shadcn/chart";
import { Progress } from "@loopad/ui/shadcn/progress";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis
} from "@loopad/ui/charts";
import { formatInteger, formatMoney, formatPercent } from "../model/dashboard-format.js";
import { DashboardMetric } from "./DashboardMetric.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function MainDashboardPanel({ data }: { data: DashboardMain }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((kpi) => (
          <DashboardMetric
            key={kpi.key}
            description={kpi.description ?? undefined}
            label={kpi.label}
            value={formatKpiValue(kpi)}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SeriesCard
          badge="LIVE"
          chartType="area"
          points={data.behavior_event_series}
          summary="시간대별 행동 이벤트"
          title="피크타임 행동 이벤트와 실시간 구매"
        />
        <SeriesCard
          chartType="bar"
          points={data.purchase_series}
          summary="시간대별 구매 건수"
          title="실시간 구매 건수"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">세그먼트 현황</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.segment_status.map((group) => (
          <Section
            action={<Badge variant="outline">{group.items.length}개</Badge>}
            contentClassName="grid gap-4"
            key={group.key}
            title={group.title}
          >
            <>
              {group.items.length > 0 ? (
                group.items.map((item) => (
                  <div className="grid gap-2" key={item.label}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{item.label}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatPercent(item.share)}</span>
                        <span className="tabular-nums text-foreground">{formatInteger(item.value)}</span>
                      </div>
                    </div>
                    <Progress value={item.share * 100} />
                  </div>
                ))
              ) : (
                <EmptyState message="표시할 세그먼트가 없습니다." />
              )}
            </>
          </Section>
        ))}
      </div>
    </div>
  );
}

function SeriesCard({
  title,
  points,
  badge,
  chartType,
  summary
}: {
  title: string;
  points: DashboardMain["behavior_event_series"];
  badge?: string;
  chartType: "area" | "bar";
  summary: string;
}) {
  const config = {
    value: {
      color: "var(--chart-1)",
      label: summary
    }
  };

  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{summary}</CardDescription>
        {badge ? (
          <CardAction>
            <Badge variant="secondary">{badge}</Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="w-full min-w-0">
        {points.length > 0 ? (
          <ChartContainer className="aspect-auto h-[260px] w-full" config={config}>
            {chartType === "area" ? (
              <AreaChart accessibilityLayer data={points} margin={{ bottom: 0, left: 0, right: 12, top: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="label" tickLine={false} />
                <YAxis
                  axisLine={false}
                  tickFormatter={(value) => compactNumber(Number(value))}
                  tickLine={false}
                  width={44}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />
                <defs>
                  <linearGradient id="event-series-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="value"
                  fill="url(#event-series-fill)"
                  fillOpacity={1}
                  isAnimationActive={false}
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            ) : (
              <BarChart accessibilityLayer data={points} margin={{ bottom: 0, left: 0, right: 12, top: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="label" tickLine={false} />
                <YAxis
                  axisLine={false}
                  tickFormatter={(value) => compactNumber(Number(value))}
                  tickLine={false}
                  width={44}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel indicator="dot" />} cursor={false} />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  isAnimationActive={false}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ChartContainer>
        ) : (
          <EmptyState message="차트 데이터가 없습니다." />
        )}
      </CardContent>
    </Card>
  );
}

function formatKpiValue(kpi: DashboardKpiCard): string {
  switch (kpi.value_type) {
    case "count":
      return formatInteger(kpi.value);
    case "money":
      return formatMoney(kpi.value);
    case "rate":
      return formatPercent(kpi.value);
    case "text":
      return String(kpi.value);
  }
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: value >= 10000 ? 1 : 0,
    notation: value >= 10000 ? "compact" : "standard"
  }).format(value);
}
