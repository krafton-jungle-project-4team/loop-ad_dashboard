import type { DashboardTab } from "./dashboard-types.js";

export type DashboardNavItem = {
  label: string;
  pathSegment: string;
  value: DashboardTab;
};

export type DashboardNavTreeFolderItem = {
  children: DashboardNavTreeItem[];
  label: string;
  pathSegment?: string;
  type: "folder";
  value?: DashboardTab;
};

export type DashboardNavTreeLinkItem = DashboardNavItem & {
  type: "link";
};

export type DashboardNavTreeItem = DashboardNavTreeFolderItem | DashboardNavTreeLinkItem;

export type DashboardNavigationGroup = {
  items: DashboardNavTreeLinkItem[];
  label: string;
};

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
  { value: "promotions", label: "프로모션", pathSegment: "promotions" },
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

export const dashboardNavigationGroups: DashboardNavigationGroup[] = [
  {
    label: "개요",
    items: [
      { label: "메인", value: "main", pathSegment: "main", type: "link" },
      { label: "사용자 여정", value: "funnels", pathSegment: "funnels", type: "link" }
    ]
  },
  {
    label: "캠페인 운영",
    items: [
      { label: "캠페인", value: "campaigns", pathSegment: "campaigns", type: "link" },
      { label: "프로모션", value: "promotions", pathSegment: "promotions", type: "link" },
      { label: "세그먼트", value: "segments", pathSegment: "segments", type: "link" },
      { label: "실험 관리", value: "experiments", pathSegment: "experiments", type: "link" }
    ]
  },
  {
    label: "도구",
    items: [
      {
        label: "데이터 탐색기",
        value: "dataExplorer",
        pathSegment: "data-explorer",
        type: "link"
      },
      {
        label: "워크플로우",
        value: "campaign-flow-map",
        pathSegment: "campaign-flow-map",
        type: "link"
      },
      { label: "SDK 연동", value: "sdk", pathSegment: "sdk", type: "link" }
    ]
  }
];

export function getDashboardTabByPath(path: string): DashboardTab | null {
  return dashboardTabs.find((item) => item.pathSegment === path)?.value ?? null;
}

export function getDashboardTabLabel(tab: DashboardTab): string {
  return dashboardTabs.find((item) => item.value === tab)?.label ?? "대시보드";
}
