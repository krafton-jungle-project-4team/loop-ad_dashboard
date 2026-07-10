import type { DashboardTab } from "./dashboard-types.js";

export type DashboardNavItem = {
  label: string;
  pathSegment: string;
  value: DashboardTab;
};

export type DashboardNavTreeFolderItem = {
  children: DashboardNavTreeItem[];
  label: string;
  type: "folder";
};

export type DashboardNavTreeLinkItem = DashboardNavItem & {
  type: "link";
};

export type DashboardNavTreeItem = DashboardNavTreeFolderItem | DashboardNavTreeLinkItem;

export const dashboardTabs = [
  { value: "main", label: "메인 대시보드", pathSegment: "main" },
  { value: "funnels", label: "사용자 여정", pathSegment: "funnels" },
  {
    value: "campaign-flow-map",
    label: "워크플로우 맵",
    pathSegment: "campaign-flow-map"
  },
  { value: "campaigns", label: "캠페인 관리", pathSegment: "campaigns" },
  {
    value: "campaign-detail",
    label: "캠페인 개요",
    pathSegment: "campaign-detail"
  },
  {
    value: "campaign-metrics",
    label: "캠페인 통계",
    pathSegment: "campaign-metrics"
  },
  {
    value: "campaign-promotions",
    label: "프로모션 관리",
    pathSegment: "campaign-promotions"
  },
  {
    value: "promotion-metrics",
    label: "프로모션 통계",
    pathSegment: "promotion-metrics"
  },
  {
    value: "segments",
    label: "세그먼트 관리",
    pathSegment: "segments"
  },
  {
    value: "experiments",
    label: "실험 관리",
    pathSegment: "experiments"
  },
  {
    value: "sdk",
    label: "SDK 연동",
    pathSegment: "sdk"
  },
  {
    value: "dataExplorer",
    label: "데이터 탐색기",
    pathSegment: "data-explorer"
  }
] satisfies DashboardNavItem[];

export const dashboardNavigationTree: DashboardNavTreeItem[] = [
  {
    label: "메인",
    value: "main",
    pathSegment: "main",
    type: "link"
  },
  {
    label: "사용자 여정",
    value: "funnels",
    pathSegment: "funnels",
    type: "link"
  },
  {
    label: "캠페인",
    type: "folder",
    children: [
      {
        label: "캠페인 관리",
        value: "campaigns",
        pathSegment: "campaigns",
        type: "link"
      },
      {
        label: "캠페인 통계",
        value: "campaign-metrics",
        pathSegment: "campaign-metrics",
        type: "link"
      },
      {
        label: "캠페인 개요",
        value: "campaign-detail",
        pathSegment: "campaign-detail",
        type: "link"
      },
      {
        label: "프로모션",
        type: "folder",
        children: [
          {
            label: "프로모션 관리",
            value: "campaign-promotions",
            pathSegment: "campaign-promotions",
            type: "link"
          },
          {
            label: "프로모션 통계",
            value: "promotion-metrics",
            pathSegment: "promotion-metrics",
            type: "link"
          },
          {
            label: "세그먼트",
            type: "folder",
            children: [
              {
                label: "세그먼트 관리",
                value: "segments",
                pathSegment: "segments",
                type: "link"
              },
              {
                label: "실험 관리",
                value: "experiments",
                pathSegment: "experiments",
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
    type: "link"
  },
  {
    label: "데이터 탐색기",
    value: "dataExplorer",
    pathSegment: "data-explorer",
    type: "link"
  },
  {
    label: "워크플로우 맵",
    value: "campaign-flow-map",
    pathSegment: "campaign-flow-map",
    type: "link"
  }
];

export function getDashboardTabByPath(path: string): DashboardTab | null {
  return dashboardTabs.find((item) => item.pathSegment === path)?.value ?? null;
}

export function getDashboardTabLabel(tab: DashboardTab): string {
  return dashboardTabs.find((item) => item.value === tab)?.label ?? "대시보드";
}
