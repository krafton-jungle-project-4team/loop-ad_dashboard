import {
  Activity,
  ChartNoAxesCombined,
  Image,
  Lightbulb,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import type { DashboardTab } from "./dashboard-types.js";

export type DashboardNavItem = {
  icon: LucideIcon;
  label: string;
  path: `/dashboard/${string}`;
  pathSegment: string;
  shortLabel: string;
  title: string;
  value: DashboardTab;
};

export const dashboardTabs = [
  {
    icon: Activity,
    label: "메인 대시보드",
    path: "/dashboard/main",
    pathSegment: "main",
    shortLabel: "메인",
    title: "Food Black Friday",
    value: "main"
  },
  {
    icon: ChartNoAxesCombined,
    label: "구매 전환",
    path: "/dashboard/purchase-conversion",
    pathSegment: "purchase-conversion",
    shortLabel: "전환",
    title: "Purchase Journey",
    value: "purchaseConversion"
  },
  {
    icon: Sparkles,
    label: "AI 분석",
    path: "/dashboard/ai-analysis",
    pathSegment: "ai-analysis",
    shortLabel: "분석",
    title: "AI Insight",
    value: "aiAnalysis"
  },
  {
    icon: Lightbulb,
    label: "AI 추천",
    path: "/dashboard/ai-recommendation",
    pathSegment: "ai-recommendation",
    shortLabel: "추천",
    title: "AI Action",
    value: "aiRecommendation"
  },
  {
    icon: Image,
    label: "AI 생성",
    path: "/dashboard/ai-generation",
    pathSegment: "ai-generation",
    shortLabel: "생성",
    title: "AI Creative",
    value: "aiGeneration"
  }
] satisfies DashboardNavItem[];

export const dashboardTitles = Object.fromEntries(
  dashboardTabs.map((item) => [item.value, item.title])
) as Record<DashboardTab, string>;

export function getDashboardTabByPath(path: string): DashboardTab | null {
  return dashboardTabs.find((item) => item.pathSegment === path)?.value ?? null;
}

export function getDashboardPath(tab: DashboardTab): DashboardNavItem["path"] {
  return dashboardTabs.find((item) => item.value === tab)?.path ?? "/dashboard/main";
}
