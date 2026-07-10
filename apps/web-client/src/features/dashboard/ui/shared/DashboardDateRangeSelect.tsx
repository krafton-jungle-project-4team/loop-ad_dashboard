import { NativeSelect, NativeSelectOption } from "@loopad/ui/shadcn/native-select";
import { dashboardDateRangeOptions, useDashboardQueryState } from "../../model/dashboard-query.js";
import type { DashboardDateRange } from "../../model/dashboard-types.js";

export function DashboardDateRangeSelect({ value }: { value: DashboardDateRange }) {
  const [, setDashboardQueryState] = useDashboardQueryState();

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="shrink-0">조회 기간</span>
      <NativeSelect
        aria-label="대시보드 조회 기간"
        className="w-36 bg-background"
        onChange={(event) => {
          void setDashboardQueryState({ dateRange: event.target.value as DashboardDateRange });
        }}
        size="sm"
        value={value}
      >
        {dashboardDateRangeOptions.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}
