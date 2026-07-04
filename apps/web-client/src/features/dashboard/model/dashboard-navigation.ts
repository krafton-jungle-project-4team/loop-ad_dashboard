import { Activity, DatabaseZap, ListFilter, Megaphone, type LucideIcon } from "lucide-react";
import type { DashboardTab } from "./dashboard-types.js";

export type DashboardNavItem = {
  icon: LucideIcon;
  label: string;
  pathSegment: string;
  value: DashboardTab;
};

export type DashboardNavTreeItem = {
  children?: DashboardNavTreeItem[];
  icon?: LucideIcon;
  label: string;
  pathSegment?: string;
  value?: DashboardTab;
};

export const dashboardTabs = [
  { value: "main", label: "메인 대시보드", icon: Activity, pathSegment: "main" },
  { value: "funnels", label: "퍼널", icon: ListFilter, pathSegment: "funnels" },
  { value: "campaigns", label: "캠페인", icon: Megaphone, pathSegment: "campaigns" },
  {
    value: "dataExplorer",
    label: "Data Explorer",
    icon: DatabaseZap,
    pathSegment: "data-explorer"
  }
] satisfies DashboardNavItem[];

export const dashboardNavigationTree = [
  {
    label: "메인",
    value: "main",
    pathSegment: "main",
    icon: Activity,
    children: [{ label: "캠페인 목록", value: "main", pathSegment: "main" }]
  },
  {
    label: "퍼널",
    value: "funnels",
    pathSegment: "funnels",
    icon: ListFilter,
    children: [
      { label: "퍼널 목록", value: "funnels", pathSegment: "funnels" },
      { label: "event_name 기반 퍼널 생성", value: "funnels", pathSegment: "funnels" }
    ]
  },
  {
    label: "캠페인",
    value: "campaigns",
    pathSegment: "campaigns",
    icon: Megaphone,
    children: [
      {
        label: "프로모션",
        value: "campaigns",
        pathSegment: "campaigns",
        children: [
          {
            label: "세그먼트",
            value: "campaigns",
            pathSegment: "campaigns",
            children: [
              { label: "실험 지표", value: "campaigns", pathSegment: "campaigns" }
            ]
          },
          { label: "지표", value: "campaigns", pathSegment: "campaigns" }
        ]
      },
      { label: "지표", value: "campaigns", pathSegment: "campaigns" }
    ]
  }
] satisfies DashboardNavTreeItem[];

export function getDashboardTabByPath(path: string): DashboardTab | null {
  return dashboardTabs.find((item) => item.pathSegment === path)?.value ?? null;
}

export function getDashboardTabLabel(tab: DashboardTab): string {
  return dashboardTabs.find((item) => item.value === tab)?.label ?? "대시보드";
}
