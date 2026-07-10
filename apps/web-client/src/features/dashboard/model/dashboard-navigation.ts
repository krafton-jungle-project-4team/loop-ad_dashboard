import {
  Activity,
  BookOpenText,
  DatabaseZap,
  FlaskConical,
  Folder,
  FolderKanban,
  LayoutDashboard,
  ListFilter,
  Megaphone,
  Users,
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

export type DashboardNavTreeFolderItem = {
  children: DashboardNavTreeItem[];
  icon?: LucideIcon;
  label: string;
  type: "folder";
};

export type DashboardNavTreeLinkItem = DashboardNavItem & {
  type: "link";
};

export type DashboardNavTreeItem = DashboardNavTreeFolderItem | DashboardNavTreeLinkItem;

export const dashboardTabs = [
  { value: "main", label: "메인 대시보드", icon: Activity, pathSegment: "main" },
  { value: "funnels", label: "사용자 여정", icon: ListFilter, pathSegment: "funnels" },
  {
    value: "campaign-flow-map",
    label: "워크플로우 맵",
    icon: Workflow,
    pathSegment: "campaign-flow-map"
  },
  { value: "campaigns", label: "캠페인 관리", icon: FolderKanban, pathSegment: "campaigns" },
  {
    value: "campaign-detail",
    label: "캠페인 개요",
    icon: LayoutDashboard,
    pathSegment: "campaign-detail"
  },
  {
    value: "campaign-metrics",
    label: "캠페인 통계",
    icon: Activity,
    pathSegment: "campaign-metrics"
  },
  {
    value: "campaign-promotions",
    label: "프로모션 관리",
    icon: Megaphone,
    pathSegment: "campaign-promotions"
  },
  {
    value: "promotion-metrics",
    label: "프로모션 통계",
    icon: Activity,
    pathSegment: "promotion-metrics"
  },
  {
    value: "segments",
    label: "세그먼트 관리",
    icon: Users,
    pathSegment: "segments"
  },
  {
    value: "experiments",
    label: "실험 관리",
    icon: FlaskConical,
    pathSegment: "experiments"
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
    icon: Activity,
    type: "link"
  },
  {
    label: "사용자 여정",
    value: "funnels",
    pathSegment: "funnels",
    icon: ListFilter,
    type: "link"
  },
  {
    label: "캠페인",
    icon: Folder,
    type: "folder",
    children: [
      {
        label: "캠페인 관리",
        value: "campaigns",
        pathSegment: "campaigns",
        icon: FolderKanban,
        type: "link"
      },
      {
        label: "캠페인 통계",
        value: "campaign-metrics",
        pathSegment: "campaign-metrics",
        icon: Activity,
        type: "link"
      },
      {
        label: "캠페인 개요",
        value: "campaign-detail",
        pathSegment: "campaign-detail",
        icon: LayoutDashboard,
        type: "link"
      },
      {
        label: "프로모션",
        icon: Folder,
        type: "folder",
        children: [
          {
            label: "프로모션 관리",
            value: "campaign-promotions",
            pathSegment: "campaign-promotions",
            icon: Megaphone,
            type: "link"
          },
          {
            label: "프로모션 통계",
            value: "promotion-metrics",
            pathSegment: "promotion-metrics",
            icon: Activity,
            type: "link"
          },
          {
            label: "세그먼트",
            icon: Folder,
            type: "folder",
            children: [
              {
                label: "세그먼트 관리",
                value: "segments",
                pathSegment: "segments",
                icon: Users,
                type: "link"
              },
              {
                label: "실험 관리",
                value: "experiments",
                pathSegment: "experiments",
                icon: FlaskConical,
                type: "link"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    label: "SDK 연동",
    value: "sdk",
    pathSegment: "sdk",
    icon: BookOpenText,
    type: "link"
  },
  {
    label: "데이터 탐색기",
    value: "dataExplorer",
    pathSegment: "data-explorer",
    icon: DatabaseZap,
    type: "link"
  },
  {
    label: "워크플로우 맵",
    value: "campaign-flow-map",
    pathSegment: "campaign-flow-map",
    icon: Workflow,
    type: "link"
  }
];

export function getDashboardTabByPath(path: string): DashboardTab | null {
  return dashboardTabs.find((item) => item.pathSegment === path)?.value ?? null;
}

export function getDashboardTabLabel(tab: DashboardTab): string {
  return dashboardTabs.find((item) => item.value === tab)?.label ?? "대시보드";
}
