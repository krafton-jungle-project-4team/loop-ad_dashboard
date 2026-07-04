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
  {
    value: "main-campaign-list",
    label: "캠페인 목록",
    icon: Activity,
    pathSegment: "main-campaign-list"
  },
  { value: "funnels", label: "퍼널", icon: ListFilter, pathSegment: "funnels" },
  { value: "campaigns", label: "캠페인", icon: Megaphone, pathSegment: "campaigns" },
  {
    value: "campaign-promotions",
    label: "프로모션",
    icon: Megaphone,
    pathSegment: "campaign-promotions"
  },
  {
    value: "campaign-segments",
    label: "세그먼트",
    icon: Megaphone,
    pathSegment: "campaign-segments"
  },
  {
    value: "campaign-experiment-metrics",
    label: "실험 지표",
    icon: Megaphone,
    pathSegment: "campaign-experiment-metrics"
  },
  {
    value: "campaign-promotion-metrics",
    label: "프로모션 지표",
    icon: Megaphone,
    pathSegment: "campaign-promotion-metrics"
  },
  {
    value: "campaign-metrics",
    label: "캠페인 지표",
    icon: Megaphone,
    pathSegment: "campaign-metrics"
  },
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
    children: [
      { label: "캠페인 목록", value: "main-campaign-list", pathSegment: "main-campaign-list" }
    ]
  },
  {
    label: "퍼널",
    value: "funnels",
    pathSegment: "funnels",
    icon: ListFilter
  },
  {
    label: "프로모션",
    value: "campaign-promotions",
    pathSegment: "campaign-promotions",
    icon: Megaphone
  },
  {
    label: "세그먼트",
    value: "campaign-segments",
    pathSegment: "campaign-segments",
    icon: Megaphone
  },
  {
    label: "실험 지표",
    value: "campaign-experiment-metrics",
    pathSegment: "campaign-experiment-metrics",
    icon: Megaphone
  },
  {
    label: "프로모션 지표",
    value: "campaign-promotion-metrics",
    pathSegment: "campaign-promotion-metrics",
    icon: Megaphone
  },
  {
    label: "캠페인 지표",
    value: "campaign-metrics",
    pathSegment: "campaign-metrics",
    icon: Megaphone
  },
  {
    label: "Data Explorer",
    value: "dataExplorer",
    pathSegment: "data-explorer",
    icon: DatabaseZap
  }
] satisfies DashboardNavTreeItem[];

export function getDashboardTabByPath(path: string): DashboardTab | null {
  return dashboardTabs.find((item) => item.pathSegment === path)?.value ?? null;
}

export function getDashboardTabLabel(tab: DashboardTab): string {
  return dashboardTabs.find((item) => item.value === tab)?.label ?? "대시보드";
}
