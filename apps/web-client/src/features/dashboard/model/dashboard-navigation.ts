import type { CampaignWorkspaceView, DashboardTab } from "./dashboard-types.js";
import type { DashboardSearchQuery } from "./dashboard-query.js";

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
  { value: "main", label: "통계", pathSegment: "statistics" },
  { value: "funnels", label: "사용자 경로", pathSegment: "funnels" },
  {
    value: "campaign-flow-map",
    label: "워크플로우 맵",
    pathSegment: "campaign-flow-map"
  },
  { value: "campaigns", label: "캠페인 관리", pathSegment: "campaigns" },
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
    label: "",
    items: [
      { label: "캠페인", value: "campaigns", pathSegment: "campaigns", type: "link" },
      { label: "실험", value: "experiments", pathSegment: "experiments", type: "link" },
      { label: "통계", value: "main", pathSegment: "statistics", type: "link" }
    ]
  },
  {
    label: "",
    items: [
      {
        label: "워크플로우",
        value: "campaign-flow-map",
        pathSegment: "campaign-flow-map",
        type: "link"
      },
      {
        label: "데이터 탐색기",
        value: "dataExplorer",
        pathSegment: "data-explorer",
        type: "link"
      },
      { label: "SDK 연동", value: "sdk", pathSegment: "sdk", type: "link" }
    ]
  }
];

export function getDashboardNavigationSearch(
  tab: DashboardTab,
  current: Partial<DashboardSearchQuery>
): Partial<DashboardSearchQuery> {
  if (tab !== "campaigns") {
    return current;
  }

  return {
    ...current,
    campaignView: "manage",
    createCampaign: false,
    createPromotion: false,
    promotionView: "manage",
    segmentView: "manage",
    selectedAdExperimentId: "",
    selectedCampaignId: "",
    selectedPromotionId: "",
    selectedSegmentId: ""
  };
}

const legacyDashboardPaths: Record<string, string> = {
  "campaign-detail": "campaigns",
  "campaign-metrics": "campaigns",
  "campaign-promotions": "campaigns",
  funnels: "statistics",
  main: "statistics",
  "promotion-metrics": "campaigns",
  promotions: "campaigns",
  segments: "campaigns"
};

export function getCanonicalDashboardPath(path: string): string {
  return legacyDashboardPaths[path] ?? path;
}

export function getLegacyDashboardViewPatch(path: string): {
  campaignView?: CampaignWorkspaceView;
  statisticsView?: "overview" | "user-paths";
} {
  if (path === "campaign-detail") {
    return { campaignView: "manage" };
  }
  if (path === "campaign-metrics") {
    return { campaignView: "performance" };
  }
  if (path === "funnels") {
    return { statisticsView: "user-paths" };
  }
  return {};
}

export function getDashboardTabByPath(path: string): DashboardTab | null {
  const canonicalPath = getCanonicalDashboardPath(path);
  return dashboardTabs.find((item) => item.pathSegment === canonicalPath)?.value ?? null;
}

export function getDashboardTabLabel(tab: DashboardTab): string {
  return dashboardTabs.find((item) => item.value === tab)?.label ?? "대시보드";
}
