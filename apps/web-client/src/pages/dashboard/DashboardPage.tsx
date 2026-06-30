import { useMemo, type ReactNode } from "react";
import { Link, Navigate, useParams } from "@tanstack/react-router";
import { Filter, Gauge, RefreshCw } from "lucide-react";
import { DevProfiler } from "../../app/DevProfiler.js";
import {
  Badge,
  Card,
  GhostButton,
  Input,
  Label,
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
  dashboardSortOptions,
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

export function DashboardPage() {
  const params = useParams({ strict: false }) as { tabPath?: string };
  const tab = getDashboardTabByPath(params.tabPath ?? "");
  const [queryState, setQueryState] = useDashboardQueryState();
  const query = useMemo(() => normalizeDashboardQuery(queryState), [queryState]);
  const dashboardState = useDashboardResources(tab ?? "main", query);

  if (!tab) {
    return <Navigate params={{ tabPath: "main" }} replace to="/dashboard/$tabPath" />;
  }

  const selectedDateRange =
    dashboardDateRangeOptions.find((item) => item.value === query.dateRange)?.label ?? query.dateRange;
  const selectedSort =
    dashboardSortOptions.find((item) => item.value === query.sort)?.label ?? query.sort;

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
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="sky">{query.projectId || "projectId 필요"}</Badge>
                    <Badge tone="emerald">{selectedDateRange}</Badge>
                    <Tooltip content="데이터 새로고침">
                      <GhostButton
                        aria-label="새로고침"
                        className="h-9 w-9 px-0"
                        onClick={() => void dashboardState.refetch()}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </GhostButton>
                    </Tooltip>
                  </div>
                </div>

                <div className="lg:hidden">
                  <DashboardNavigation activeTab={tab} compact />
                </div>

                <Card className="grid gap-3 p-3 md:grid-cols-[minmax(160px,1fr)_160px_160px_minmax(180px,1fr)]">
                  <ControlField label="Project">
                    <Input
                      aria-label="projectId"
                      onChange={(event) => void setQueryState({ projectId: event.target.value })}
                      value={queryState.projectId}
                    />
                  </ControlField>

                  <ControlField label="Date range">
                    <Select
                      onValueChange={(value) =>
                        void setQueryState({ dateRange: value as typeof query.dateRange })
                      }
                      value={query.dateRange}
                    >
                      <SelectTrigger aria-label="dateRange">
                        <SelectValue>{selectedDateRange}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {dashboardDateRangeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ControlField>

                  <ControlField label="Sort">
                    <Select
                      onValueChange={(value) =>
                        void setQueryState({ sort: value as typeof query.sort })
                      }
                      value={query.sort}
                    >
                      <SelectTrigger aria-label="sort">
                        <SelectValue>{selectedSort}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {dashboardSortOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ControlField>

                  <ControlField label="Filter">
                    <div className="relative">
                      <Filter className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        aria-label="filter"
                        className="pl-9"
                        onChange={(event) => void setQueryState({ filter: event.target.value })}
                        placeholder="고객군, 채널, 지역"
                        value={queryState.filter}
                      />
                    </div>
                  </ControlField>
                </Card>
              </div>
            </header>

            <main className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-6 xl:px-8">
              {!query.projectId ? <EmptyProjectCard /> : null}
              {query.projectId && dashboardState.isPending ? <LoadingState tab={tab} /> : null}
              {query.projectId && dashboardState.isError ? (
                <ErrorCard error={dashboardState.error} onRetry={() => void dashboardState.refetch()} />
              ) : null}
              {query.projectId && dashboardState.isSuccess
                ? renderDashboardPanel(dashboardState.data, {
                    onSelectCustomer: (customerId) =>
                      void setQueryState({ selectedCustomerId: customerId })
                  })
                : null}
            </main>
          </div>
        </div>
      </DevProfiler>
    </DevProfiler>
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

function ControlField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EmptyProjectCard() {
  return (
    <Card className="p-6">
      <p className="text-sm font-semibold text-slate-900">조회 컨텍스트가 필요합니다</p>
      <p className="mt-1 text-sm text-slate-500">projectId를 입력하면 대시보드 조회를 시작합니다.</p>
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
