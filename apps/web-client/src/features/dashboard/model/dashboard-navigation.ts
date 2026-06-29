import { Activity, ChartNoAxesCombined, Image, Sparkles, type LucideIcon } from "lucide-react";
import type { DashboardTab } from "./dashboard-types.js";

export const dashboardTabs: Array<{ value: DashboardTab; label: string; icon: LucideIcon }> = [
  { value: "main", label: "메인 대시보드", icon: Activity },
  { value: "purchaseConversion", label: "구매 전환", icon: ChartNoAxesCombined },
  { value: "aiAnalysis", label: "AI 분석", icon: Sparkles },
  { value: "aiRecommendation", label: "AI 추천", icon: Sparkles },
  { value: "aiGeneration", label: "AI 생성", icon: Image }
];

export const dashboardTitles: Record<DashboardTab, string> = {
  main: "Food Black Friday",
  purchaseConversion: "Purchase Journey",
  aiAnalysis: "AI Insight",
  aiRecommendation: "AI Insight",
  aiGeneration: "AI Insight"
};
