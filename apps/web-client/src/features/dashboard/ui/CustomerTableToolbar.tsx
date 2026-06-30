import { Search } from "lucide-react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/dashboard-ui/primitives";
import { dashboardSortOptions } from "../model/dashboard-query.js";
import type { DashboardSort } from "../model/dashboard-types.js";

export type CustomerTableControlProps = {
  filter: string;
  sort: DashboardSort;
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: DashboardSort) => void;
};

export function CustomerTableToolbar({
  filter,
  sort,
  onFilterChange,
  onSortChange
}: CustomerTableControlProps) {
  const selectedSort = dashboardSortOptions.find((item) => item.value === sort)?.label ?? sort;

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <div className="relative sm:w-64">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          aria-label="사용자군 검색"
          className="pl-9"
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="사용자군, 채널, 지역 검색"
          value={filter}
        />
      </div>
      <Select onValueChange={(value) => onSortChange(value as DashboardSort)} value={sort}>
        <SelectTrigger aria-label="사용자군 정렬" className="sm:w-44">
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
    </div>
  );
}
