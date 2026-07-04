import type { DataExplorerQueryRunResponse } from "@loopad/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "@loopad/ui/charts";
import { EmptyState } from "../../dashboard/ui/EmptyState.js";

export function VisualizationPanel({ result }: { result: DataExplorerQueryRunResponse | null }) {
  const spec = result?.suggested_visualizations[0];
  const yColumn = spec?.y[0]?.column;

  if (!result || !spec || !yColumn) {
    return <EmptyState message="추천 chart가 없습니다." />;
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
      <div className="min-h-[220px] min-w-0 rounded-lg border border-black/10 p-3">
        <ResponsiveContainer height="100%" width="100%">
          {spec.chart_type === "line" ? (
            <LineChart data={result.rows} margin={{ bottom: 8, left: 0, right: 16, top: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={spec.x.column} tickLine={false} />
              <YAxis tickLine={false} width={48} />
              <Tooltip />
              <Line
                dataKey={yColumn}
                isAnimationActive={false}
                stroke="#0066cc"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          ) : spec.chart_type === "bar" ? (
            <BarChart data={result.rows} margin={{ bottom: 8, left: 0, right: 16, top: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={spec.x.column} tickLine={false} />
              <YAxis tickLine={false} width={48} />
              <Tooltip />
              <Bar
                dataKey={yColumn}
                fill="#0066cc"
                isAnimationActive={false}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <ScatterChart margin={{ bottom: 8, left: 0, right: 16, top: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={spec.x.column} name={spec.x.column} tickLine={false} />
              <YAxis dataKey={yColumn} name={yColumn} tickLine={false} width={48} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={result.rows} fill="#0066cc" isAnimationActive={false} />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground">
        {spec.chart_type} · x: {spec.x.column} · y: {yColumn}
        {spec.series ? ` · series: ${spec.series.column}` : ""}
      </div>
    </div>
  );
}
