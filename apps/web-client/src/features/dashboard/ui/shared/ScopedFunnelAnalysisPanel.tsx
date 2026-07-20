import type {
  DashboardFunnelList,
  DashboardFunnelMetrics,
  DashboardFunnelMetricsScope
} from "@loopad/shared";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "@loopad/ui/charts";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Button } from "@loopad/ui/shadcn/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@loopad/ui/shadcn/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@loopad/ui/shadcn/collapsible";
import { NativeSelect, NativeSelectOption } from "@loopad/ui/shadcn/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { useQueries } from "@tanstack/react-query";
import { ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { fetchDashboardFunnelMetrics } from "../../api/dashboard-api.js";
import { formatInteger } from "../../model/dashboard-format.js";
import { dashboardFunnelMetricsQueryKey } from "../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../model/dashboard-types.js";
import { EmptyState } from "./EmptyState.js";

type DashboardFunnelSummary = DashboardFunnelList["funnels"][number];

type FunnelMetricComparisonItem = {
  color: string;
  funnel: DashboardFunnelSummary;
  metrics: DashboardFunnelMetrics;
  seriesKey: string;
};

type FunnelComparisonChartRow = {
  step_label: string;
} & Record<string, number | string | null>;

const FUNNEL_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)"
] as const;

export function ScopedFunnelAnalysisPanel({
  error,
  funnels,
  isError = false,
  isLoading = false,
  query,
  scope,
  title
}: {
  error?: Error | null;
  funnels: DashboardFunnelSummary[];
  isError?: boolean;
  isLoading?: boolean;
  query: DashboardQuery;
  scope: DashboardFunnelMetricsScope;
  title: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFunnelIds, setSelectedFunnelIds] = useState<string[]>(() =>
    funnels.slice(0, 1).map((funnel) => funnel.funnel_id)
  );
  const selectedFunnels = selectedFunnelIds.flatMap((funnelId) => {
    const funnel = funnels.find((item) => item.funnel_id === funnelId);
    return funnel ? [funnel] : [];
  });
  const canAddFunnel = selectedFunnelIds.length < funnels.length;

  useEffect(() => {
    setSelectedFunnelIds((current) => {
      const availableIds = new Set(funnels.map((funnel) => funnel.funnel_id));
      const currentValidIds = current.filter(
        (funnelId, index) => availableIds.has(funnelId) && current.indexOf(funnelId) === index
      );

      return currentValidIds.length > 0
        ? currentValidIds
        : funnels.slice(0, 1).map((funnel) => funnel.funnel_id);
    });
  }, [funnels]);

  function addFunnelSlot() {
    const nextFunnel = funnels.find((funnel) => !selectedFunnelIds.includes(funnel.funnel_id));
    if (!nextFunnel) {
      return;
    }

    setSelectedFunnelIds((current) => [...current, nextFunnel.funnel_id]);
  }

  function removeFunnelSlot(index: number) {
    setSelectedFunnelIds((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  function updateFunnelSlot(index: number, funnelId: string) {
    setSelectedFunnelIds((current) => {
      if (
        current.some((currentId, currentIndex) => currentId === funnelId && currentIndex !== index)
      ) {
        return current;
      }

      return current.map((currentId, currentIndex) =>
        currentIndex === index ? funnelId : currentId
      );
    });
  }

  return (
    <Collapsible
      className="overflow-hidden rounded-md border bg-card"
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <CollapsibleTrigger asChild>
        <Button
          className="h-auto w-full justify-between rounded-none px-4 py-3 text-left"
          type="button"
          variant="ghost"
        >
          <div className="min-w-0">
            <span className="text-base font-semibold text-foreground">{title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-muted-foreground">{isOpen ? "닫기" : "열기"}</span>
            <ChevronDown
              aria-hidden="true"
              className={isOpen ? "rotate-180 transition-transform" : "transition-transform"}
              data-icon="inline-end"
            />
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="grid gap-4 border-t p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="grid gap-1">
            <div className="text-sm font-medium text-foreground">비교 사용자 경로</div>
          </div>
          {funnels.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {selectedFunnelIds.map((funnelId, index) => (
                <div className="flex items-center gap-1" key={`${index}-${funnelId}`}>
                  <NativeSelect
                    aria-label={`비교 사용자 경로 ${index + 1}`}
                    className="w-[220px]"
                    onChange={(event) => updateFunnelSlot(index, event.target.value)}
                    size="sm"
                    value={funnelId}
                  >
                    {funnels.map((funnel) => (
                      <NativeSelectOption
                        disabled={
                          selectedFunnelIds.includes(funnel.funnel_id) &&
                          funnel.funnel_id !== funnelId
                        }
                        key={funnel.funnel_id}
                        value={funnel.funnel_id}
                      >
                        {funnel.funnel_name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {selectedFunnelIds.length > 1 ? (
                    <Button
                      aria-label="비교 사용자 경로 제거"
                      onClick={() => removeFunnelSlot(index)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <X className="size-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                disabled={!canAddFunnel}
                onClick={addFunnelSlot}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus data-icon="inline-start" />
                추가
              </Button>
            </div>
          ) : null}
        </div>

        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>사용자 경로를 불러오지 못했어요</AlertTitle>
            <AlertDescription>{error?.message ?? "잠시 후 다시 시도해 주세요."}</AlertDescription>
          </Alert>
        ) : null}
        {isLoading ? <EmptyState message="사용자 경로를 불러오고 있어요." /> : null}
        {!isLoading && funnels.length === 0 ? (
          <EmptyState message="아직 만든 사용자 경로가 없어요." />
        ) : null}

        {selectedFunnels.length > 0 ? (
          <ScopedFunnelComparisonPanel funnels={selectedFunnels} query={query} scope={scope} />
        ) : !isLoading && funnels.length > 0 ? (
          <EmptyState message="확인할 사용자 경로를 선택해 주세요." />
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ScopedFunnelComparisonPanel({
  funnels,
  query,
  scope
}: {
  funnels: DashboardFunnelSummary[];
  query: DashboardQuery;
  scope: DashboardFunnelMetricsScope;
}) {
  const metricQueries = useQueries({
    queries: funnels.map((funnel) => ({
      queryFn: ({ signal }) => fetchDashboardFunnelMetrics(query, funnel.funnel_id, signal, scope),
      queryKey: dashboardFunnelMetricsQueryKey(
        query.projectId,
        funnel.funnel_id,
        query.dateRange,
        scope
      )
    }))
  });
  const metricItems = funnels.flatMap((funnel, index) => {
    const result = metricQueries[index];
    if (!result?.data) {
      return [];
    }

    return [
      {
        color: funnelChartColor(index),
        funnel,
        metrics: result.data,
        seriesKey: comparisonSeriesKey(index)
      }
    ];
  });
  const firstError = metricQueries.find((result) => result.isError)?.error;
  const isInitialLoading =
    metricQueries.some((result) => result.isLoading) && metricItems.length === 0;

  return (
    <div className="grid gap-4 rounded-md border bg-muted/10 p-4">
      {firstError ? (
        <Alert variant="destructive">
          <AlertTitle>사용자 경로 수치를 불러오지 못했어요</AlertTitle>
          <AlertDescription>{mutationErrorMessage(firstError)}</AlertDescription>
        </Alert>
      ) : null}
      {isInitialLoading ? <EmptyState message="사용자 경로 수치를 불러오고 있어요." /> : null}
      {metricItems.length > 0 ? (
        <div className="grid gap-4">
          <ScopedFunnelComparisonChart items={metricItems} />
          <ScopedFunnelComparisonTable items={metricItems} />
        </div>
      ) : null}
    </div>
  );
}

function ScopedFunnelComparisonChart({ items }: { items: FunnelMetricComparisonItem[] }) {
  const gradientPrefix = useId().replace(/:/g, "");
  const chartData = buildComparisonChartData(items);
  const chartConfig = Object.fromEntries(
    items.map((item) => [
      item.seriesKey,
      {
        color: item.color,
        label: item.funnel.funnel_name
      }
    ])
  ) satisfies ChartConfig;

  return (
    <ChartContainer className="h-[300px] w-full" config={chartConfig}>
      <AreaChart data={chartData} margin={{ bottom: 16, left: 10, right: 28, top: 30 }}>
        <defs>
          {items.map((item) => (
            <linearGradient
              id={`${gradientPrefix}-${item.seriesKey}`}
              key={item.seriesKey}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="5%" stopColor={`var(--color-${item.seriesKey})`} stopOpacity={0.22} />
              <stop offset="95%" stopColor={`var(--color-${item.seriesKey})`} stopOpacity={0.03} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="step_label" tickLine={false} tickMargin={14} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={12} width={56} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {items.map((item) => (
          <Area
            connectNulls
            dataKey={item.seriesKey}
            fill={`url(#${gradientPrefix}-${item.seriesKey})`}
            key={item.seriesKey}
            stroke={`var(--color-${item.seriesKey})`}
            strokeWidth={2}
            type="monotone"
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

function ScopedFunnelComparisonTable({ items }: { items: FunnelMetricComparisonItem[] }) {
  const measurementLabel =
    items[0]?.metrics.measurement_basis === "session" ? "고유 세션" : "고유 사용자";

  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>사용자 경로</TableHead>
            <TableHead className="text-right">1단계 {measurementLabel}</TableHead>
            <TableHead className="text-right">마지막 단계 {measurementLabel}</TableHead>
            <TableHead className="text-right">전환율</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const firstStep = item.metrics.steps[0]?.event_count ?? 0;
            const lastStep = item.metrics.steps.at(-1)?.event_count ?? 0;
            const conversionRate = firstStep > 0 ? lastStep / firstStep : 0;

            return (
              <TableRow key={item.funnel.funnel_id}>
                <TableCell>
                  <div className="flex min-w-[180px] items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.funnel.funnel_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(firstStep)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatInteger(lastStep)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {conversionRate.toLocaleString("ko-KR", {
                    maximumFractionDigits: 1,
                    style: "percent"
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function buildComparisonChartData(items: FunnelMetricComparisonItem[]): FunnelComparisonChartRow[] {
  const maxStepCount = Math.max(0, ...items.map((item) => item.metrics.steps.length));

  return Array.from({ length: maxStepCount }, (_, index) => {
    const row: FunnelComparisonChartRow = {
      step_label: `${index + 1}단계`
    };
    for (const item of items) {
      row[item.seriesKey] = item.metrics.steps[index]?.event_count ?? null;
    }

    return row;
  });
}

function comparisonSeriesKey(index: number) {
  return `funnel_${index + 1}`;
}

function funnelChartColor(index: number): string {
  return FUNNEL_CHART_COLORS[index % FUNNEL_CHART_COLORS.length] ?? FUNNEL_CHART_COLORS[0];
}

function mutationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "문제가 생겼어요. 다시 시도해 주세요.";
}
