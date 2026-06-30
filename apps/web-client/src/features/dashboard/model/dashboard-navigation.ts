import { Activity, ChartNoAxesCombined, Image, Sparkles, type LucideIcon } from "lucide-react";
import type { DashboardTab } from "./dashboard-types.js";

export type DashboardNavItem = {
  icon: LucideIcon;
  label: string;
  pathSegment: string;
  value: DashboardTab;
};

export const dashboardTabs = [
  { value: "main", label: "메인 대시보드", icon: Activity, pathSegment: "main" },
  {
    value: "purchaseConversion",
    label: "구매 전환",
    icon: ChartNoAxesCombined,
    pathSegment: "purchase-conversion"
  },
  { value: "aiAnalysis", label: "AI 분석", icon: Sparkles, pathSegment: "ai-analysis" },
  { value: "aiRecommendation", label: "AI 추천", icon: Sparkles, pathSegment: "ai-recommendation" },
  { value: "aiGeneration", label: "AI 생성", icon: Image, pathSegment: "ai-generation" }
] satisfies DashboardNavItem[];

export const dashboardTitles: Record<DashboardTab, string> = {
  main: "Food Black Friday",
  purchaseConversion: "Purchase Journey",
  aiAnalysis: "AI Insight",
  aiRecommendation: "AI Insight",
  aiGeneration: "AI Insight"
};

export function getDashboardTabByPath(path: string): DashboardTab | null {
  return dashboardTabs.find((item) => item.pathSegment === path)?.value ?? null;
}
