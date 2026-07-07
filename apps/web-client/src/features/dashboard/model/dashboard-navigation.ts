import {
  Activity,
  BookOpenText,
  DatabaseZap,
  FlaskConical,
  FolderKanban,
  ListFilter,
  Megaphone,
  Workflow,
  type LucideIcon
} from "lucide-react";
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
  {
    value: "campaign-flow-map",
    label: "워크플로우 맵",
    icon: Workflow,
    pathSegment: "campaign-flow-map"
  },
  { value: "campaigns", label: "캠페인", icon: FolderKanban, pathSegment: "campaigns" },
  {
    value: "campaign-promotions",
    label: "프로모션",
    icon: Megaphone,
    pathSegment: "campaign-promotions"
  },
  {
    value: "experiments",
    label: "실험",
    icon: FlaskConical,
    pathSegment: "experiments"
  },
  {
    value: "campaign-metrics",
    label: "캠페인 지표",
    icon: Megaphone,
    pathSegment: "campaign-metrics"
  },
  {
    value: "sdk",
    label: "SDK 연동",
    icon: BookOpenText,
    pathSegment: "sdk"
  },
  {
    value: "dataExplorer",
    label: "데이터 탐색기",
    icon: DatabaseZap,
    pathSegment: "data-explorer"
  }
] satisfies DashboardNavItem[];

export const dashboardNavigationTree: DashboardNavTreeItem[] = [
  {
    label: "메인",
    value: "main",
    pathSegment: "main",
    icon: Activity
  },
  {
    label: "퍼널",
    value: "funnels",
    pathSegment: "funnels",
    icon: ListFilter
  },
  {
    label: "캠페인",
    value: "campaigns",
    pathSegment: "campaigns",
    icon: FolderKanban
  },
  {
    label: "프로모션",
    value: "campaign-promotions",
    pathSegment: "campaign-promotions",
    icon: Megaphone
  },
  {
    label: "실험",
    value: "experiments",
    pathSegment: "experiments",
    icon: FlaskConical
  },
  {
    label: "SDK 연동",
    value: "sdk",
    pathSegment: "sdk",
    icon: BookOpenText
  },
  {
    label: "데이터 탐색기",
    value: "dataExplorer",
    pathSegment: "data-explorer",
    icon: DatabaseZap
  },
  {
    label: "워크플로우 맵",
    value: "campaign-flow-map",
    pathSegment: "campaign-flow-map",
    icon: Workflow
  }
];

export function getDashboardTabByPath(path: string): DashboardTab | null {
  return dashboardTabs.find((item) => item.pathSegment === path)?.value ?? null;
}

export function getDashboardTabLabel(tab: DashboardTab): string {
  return dashboardTabs.find((item) => item.value === tab)?.label ?? "대시보드";
}
