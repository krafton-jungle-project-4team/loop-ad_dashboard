import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "@loopad/ui/charts";
import { DevProfiler } from "../../../app/DevProfiler.js";
import { Badge, Card, EmptyState, Progress } from "@/components/dashboard-ui/primitives";
import { cn } from "@/components/dashboard-ui/utils";
import type {
  ChartPointViewModel,
  KpiCardViewModel,
  MainOverviewViewModel,
  SegmentGroupViewModel
} from "../vm/dashboard-view-model.js";

export function MainDashboardPanel({ viewModel }: { viewModel: MainOverviewViewModel }) {
  return (
    <DevProfiler id="MainOverviewPanel">
      <div className="space-y-5">
        {viewModel.isEmpty ? (
          <EmptyState message="조회 조건에 맞는 메인 대시보드 데이터가 없습니다." title="데이터 없음" />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {viewModel.kpis.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <SeriesPanel
            badge="LIVE"
            data={viewModel.behaviorSeries}
            id="behavior-events"
            subtitle="피크타임 이벤트와 전환 이벤트"
            title="행동 이벤트 흐름"
          />
          <SeriesPanel
            data={viewModel.purchaseSeries}
            id="purchase-events"
            subtitle="동시간대 구매 완료 이벤트"
            title="실시간 구매 건수"
          />
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">세그먼트 현황</h2>
              <p className="text-sm text-slate-500">채널, 연령, 지역, 카테고리별 볼륨을 비교합니다.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {viewModel.segmentGroups.map((group) => (
              <SegmentCard group={group} key={group.id} />
            ))}
          </div>
        </div>
      </div>
    </DevProfiler>
  );
}

function KpiCard({ kpi }: { kpi: KpiCardViewModel }) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
    slate: "bg-slate-50 text-slate-700",
    violet: "bg-violet-50 text-violet-700"
  }[kpi.tone];

  return (
    <Card className="min-h-[8.5rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{kpi.label}</p>
        <span className={cn("h-2.5 w-2.5 rounded-full", toneClass)} />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">{kpi.value}</p>
      {kpi.description ? <p className="mt-2 text-sm text-slate-500">{kpi.description}</p> : null}
    </Card>
  );
}

function SeriesPanel({
  badge,
  data,
  id,
  subtitle,
  title
}: {
  badge?: string;
  data: ChartPointViewModel[];
  id: string;
  subtitle: string;
  title: string;
}) {
  return (
    <Card className="h-80 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {badge ? <Badge tone="emerald">{badge}</Badge> : null}
      </div>
      {data.length > 0 ? (
        <div className="h-56">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={data} margin={{ bottom: 0, left: 0, right: 12, top: 8 }}>
              <defs>
                <linearGradient id={`gradient-${id}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(value) => compactNumber(Number(value))}
                tickLine={false}
                width={42}
              />
              <RechartsTooltip
                contentStyle={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)"
                }}
                formatter={(value) => compactNumber(Number(value))}
                labelStyle={{ color: "#0f172a", fontWeight: 700 }}
              />
              <Area
                dataKey="value"
                fill={`url(#gradient-${id})`}
                stroke="#0284c7"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState message="차트 데이터가 없습니다." />
      )}
    </Card>
  );
}

function SegmentCard({ group }: { group: SegmentGroupViewModel }) {
  return (
    <Card className="min-h-[14.5rem] p-5">
      <h3 className="text-base font-semibold text-slate-950">{group.title}</h3>
      <div className="mt-4 space-y-4">
        {group.items.length > 0 ? (
          group.items.map((item) => (
            <div key={item.id}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-slate-700">{item.label}</p>
                <p className="text-sm font-semibold text-slate-500">{item.displayValue}</p>
              </div>
              <Progress value={item.share * 100} />
            </div>
          ))
        ) : (
          <EmptyState message="표시할 세그먼트가 없습니다." />
        )}
      </div>
    </Card>
  );
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: value >= 10000 ? 1 : 0,
    notation: value >= 10000 ? "compact" : "standard"
  }).format(value);
}
