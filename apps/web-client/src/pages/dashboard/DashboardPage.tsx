import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "@tanstack/react-router";
import { CalendarDays, Gauge, Plus, RefreshCw } from "lucide-react";
import { DevProfiler } from "../../app/DevProfiler.js";
import {
  Badge,
  Card,
  GhostButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip
} from "../../components/ui/primitives.js";
import { cn } from "../../lib/utils.js";
import {
  dashboardDateRangeOptions,
  defaultDashboardQuery,
  normalizeDashboardQuery,
  useDashboardQueryState
} from "../../features/dashboard/model/dashboard-query.js";
import {
  dashboardTabs,
  dashboardTitles,
  getDashboardTabByPath
} from "../../features/dashboard/model/dashboard-navigation.js";
import type { DashboardTab } from "../../features/dashboard/model/dashboard-types.js";
import { useDashboardResources } from "../../features/dashboard/model/use-dashboard-resources.js";
import { LoadingState } from "../../features/dashboard/ui/LoadingState.js";
import { renderDashboardPanel } from "../../features/dashboard/ui/render-dashboard-panel.js";

const comparisonSegments = [
  { id: "all", label: "전체 고객군" },
  { id: "low-conversion", label: "저전환 고객군" },
  { id: "high-conversion", label: "고전환 고객군" },
  { id: "ai-targets", label: "AI 추천 대상" },
  { id: "generated", label: "콘텐츠 생성 완료" },
  { id: "cart-abandon", label: "장바구니 이탈군" },
  { id: "checkout-abandon", label: "결제 시작 이탈군" }
] as const;

const breakdownOptions = ["채널", "기기", "지역", "카테고리", "연령", "성별"] as const;

const globalFilterChips = [
  "캠페인: Food Black Friday",
  "테스트/내부 제외",
  "재고 가능 상품"
] as const;

export function DashboardPage() {
  const params = useParams({ strict: false }) as { tabPath?: string };
  const tab = getDashboardTabByPath(params.tabPath ?? "");
  const [queryState, setQueryState] = useDashboardQueryState();
  const query = useMemo(() => normalizeDashboardQuery(queryState), [queryState]);
  const dashboardState = useDashboardResources(tab ?? "main", query);
  const [activeComparisonIds, setActiveComparisonIds] = useState<string[]>([
    "all",
    "low-conversion",
    "ai-targets"
  ]);
  const [breakdownBy, setBreakdownBy] = useState<(typeof breakdownOptions)[number]>("채널");

  if (!tab) {
    return <Navigate params={{ tabPath: "main" }} replace to="/dashboard/$tabPath" />;
  }

  const selectedDateRange =
    dashboardDateRangeOptions.find((item) => item.value === query.dateRange)?.label ?? query.dateRange;

  return (
    <DevProfiler id="DashboardRoute">
      <DevProfiler id="AppShell">
        <div className="min-h-screen bg-slate-50 text-slate-950">
          <aside className="fixed inset-y-0 left-0 z-20 hidden w-[17rem] border-r border-slate-200 bg-white px-4 py-5 lg:block">
            <BrandBlock />
            <DashboardNavigation activeTab={tab} />
          </aside>

          <div className="lg:pl-[17rem]">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
              <div className="flex min-h-16 flex-col gap-3 px-4 py-3 md:px-6 xl:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">loop-ad dashboard</p>
                    <h1 className="text-xl font-semibold text-slate-950 md:text-2xl">
                      {dashboardTitles[tab]}
                    </h1>
                  </div>
                  <ScopeControls
                    dateRange={query.dateRange}
                    isRefreshing={dashboardState.isFetching}
                    projectId={query.projectId}
                    selectedDateRange={selectedDateRange}
                    onDateRangeChange={(dateRange) => void setQueryState({ dateRange })}
                    onRefresh={() => void dashboardState.refetch()}
                  />
                </div>

                <div className="lg:hidden">
                  <DashboardNavigation activeTab={tab} compact />
                </div>

                <ComparisonControls
                  activeIds={activeComparisonIds}
                  onAddComparison={() => {
                    const nextInactive = comparisonSegments.find(
                      (segment) => !activeComparisonIds.includes(segment.id)
                    );
                    if (nextInactive) {
                      setActiveComparisonIds((current) => [...current, nextInactive.id]);
                    }
                  }}
                  onToggle={(segmentId) =>
                    setActiveComparisonIds((current) =>
                      current.includes(segmentId)
                        ? current.length === 1
                          ? current
                          : current.filter((id) => id !== segmentId)
                        : [...current, segmentId]
                    )
                  }
                />

                <AnalysisControls breakdownBy={breakdownBy} onBreakdownChange={setBreakdownBy} />
              </div>
            </header>

            <main className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-6 xl:px-8">
              {!query.projectId ? (
                <EmptyProjectCard
                  onUseDefaultProject={() =>
                    void setQueryState({ projectId: defaultDashboardQuery.projectId })
                  }
                />
              ) : null}
              {query.projectId && dashboardState.isPending ? <LoadingState tab={tab} /> : null}
              {query.projectId && dashboardState.isError ? (
                <ErrorCard error={dashboardState.error} onRetry={() => void dashboardState.refetch()} />
              ) : null}
              {query.projectId && dashboardState.isSuccess
                ? renderDashboardPanel(dashboardState.data, {
                    filter: queryState.filter,
                    onSelectCustomer: (customerId) =>
                      void setQueryState({ selectedCustomerId: customerId }),
                    onTableFilterChange: (filter) => void setQueryState({ filter }),
                    onTableSortChange: (sort) => void setQueryState({ sort }),
                    sort: query.sort
                  })
                : null}
            </main>
          </div>
        </div>
      </DevProfiler>
    </DevProfiler>
  );
}

function ScopeControls({
  dateRange,
  isRefreshing,
  projectId,
  selectedDateRange,
  onDateRangeChange,
  onRefresh
}: {
  dateRange: (typeof dashboardDateRangeOptions)[number]["value"];
  isRefreshing: boolean;
  projectId: string;
  selectedDateRange: string;
  onDateRangeChange: (dateRange: (typeof dashboardDateRangeOptions)[number]["value"]) => void;
  onRefresh: () => void;
}) {
  const campaignName = getCampaignName(projectId);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex h-10 min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-4 text-slate-950">{campaignName}</p>
          <p className="truncate text-xs leading-4 text-slate-500">
            {projectId || "projectId 필요"}
          </p>
        </div>
      </div>

      <Select onValueChange={(value) => onDateRangeChange(value as typeof dateRange)} value={dateRange}>
        <SelectTrigger aria-label="dateRange" className="h-10 w-[9.75rem] bg-white">
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
            <SelectValue>{selectedDateRange}</SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent>
          {dashboardDateRangeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Tooltip content="데이터 새로고침">
        <GhostButton
          aria-label="새로고침"
          className="h-10 w-10 px-0"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing ? "animate-spin" : undefined)} />
        </GhostButton>
      </Tooltip>
    </div>
  );
}

function ComparisonControls({
  activeIds,
  onAddComparison,
  onToggle
}: {
  activeIds: string[];
  onAddComparison: () => void;
  onToggle: (segmentId: string) => void;
}) {
  const hasInactiveComparison = comparisonSegments.some((segment) => !activeIds.includes(segment.id));

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      {comparisonSegments.map((segment) => {
        const isActive = activeIds.includes(segment.id);

        return (
          <button
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-sm font-semibold transition",
              isActive
                ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            )}
            key={segment.id}
            onClick={() => onToggle(segment.id)}
            type="button"
          >
            {segment.label}
          </button>
        );
      })}

      <GhostButton className="h-8 rounded-full px-3" disabled={!hasInactiveComparison} onClick={onAddComparison}>
        <Plus className="h-4 w-4" />
        비교 추가
      </GhostButton>
    </div>
  );
}

function AnalysisControls({
  breakdownBy,
  onBreakdownChange
}: {
  breakdownBy: (typeof breakdownOptions)[number];
  onBreakdownChange: (value: (typeof breakdownOptions)[number]) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-slate-500">Breakdown by</span>
        {breakdownOptions.map((option) => (
          <button
            aria-pressed={breakdownBy === option}
            className={cn(
              "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold transition",
              breakdownBy === option
                ? "border-sky-200 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
            key={option}
            onClick={() => onBreakdownChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {globalFilterChips.map((chip, index) => (
          <Badge key={chip} tone={index === 0 ? "sky" : "slate"}>
            {chip}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function BrandBlock() {
  return (
    <div className="mb-7 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
        <Gauge className="h-5 w-5" />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-950">loop-ad</p>
        <p className="text-xs text-slate-500">operational dashboard</p>
      </div>
    </div>
  );
}

function DashboardNavigation({
  activeTab,
  compact = false
}: {
  activeTab: DashboardTab;
  compact?: boolean;
}) {
  return (
    <DevProfiler id="DashboardNavigation">
      <nav
        className={cn(
          compact
            ? "flex gap-2 overflow-x-auto pb-1"
            : "flex flex-col gap-1"
        )}
      >
        {dashboardTabs.map((item) => {
          const Icon = item.icon;
          const active = item.value === activeTab;

          return (
            <Link
              className={cn(
                "inline-flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition",
                active
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                compact ? "shrink-0" : "w-full"
              )}
              key={item.value}
              params={{ tabPath: item.pathSegment }}
              to="/dashboard/$tabPath"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{compact ? item.shortLabel : item.label}</span>
            </Link>
          );
        })}
      </nav>
    </DevProfiler>
  );
}

function EmptyProjectCard({ onUseDefaultProject }: { onUseDefaultProject: () => void }) {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">조회 컨텍스트가 필요합니다</p>
          <p className="mt-1 text-sm text-slate-500">캠페인 스코프를 선택하면 대시보드 조회를 시작합니다.</p>
        </div>
        <GhostButton onClick={onUseDefaultProject}>Food Black Friday로 보기</GhostButton>
      </div>
    </Card>
  );
}

function ErrorCard({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Card className="border-rose-200 bg-rose-50 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-rose-950">대시보드 API 요청 실패</p>
          <p className="mt-1 text-sm text-rose-700">{error.message}</p>
        </div>
        <GhostButton className="border-rose-200 bg-white text-rose-700 hover:bg-rose-100" onClick={onRetry}>
          다시 시도
        </GhostButton>
      </div>
    </Card>
  );
}

function getCampaignName(projectId: string) {
  if (!projectId || projectId === defaultDashboardQuery.projectId || projectId === "food-black-friday") {
    return "Food Black Friday";
  }

  return projectId;
}
