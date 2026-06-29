import {
  Activity,
  ChartNoAxesCombined,
  FlaskConical,
  Image,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import type { DashboardTab } from "./dashboard-types.js";

export const dashboardTabs: Array<{ value: DashboardTab; label: string; icon: LucideIcon }> = [
  { value: "dashboard", label: "대시보드", icon: Activity },
  { value: "funnelSegments", label: "퍼널/세그먼트 분석", icon: ChartNoAxesCombined },
  { value: "recommendationResults", label: "추천 생성 결과", icon: Sparkles },
  { value: "contentResults", label: "콘텐츠 생성 결과", icon: Image },
  { value: "experimentPerformance", label: "실험 성과", icon: FlaskConical }
];

export const dashboardTitles: Record<DashboardTab, string> = {
  dashboard: "대시보드",
  funnelSegments: "퍼널/세그먼트 분석",
  recommendationResults: "추천 생성 결과",
  contentResults: "콘텐츠 생성 결과",
  experimentPerformance: "실험 성과"
};

export const dashboardActionLabels: Partial<Record<DashboardTab, string>> = {
  contentResults: "콘텐츠 생성",
  experimentPerformance: "실험 성과 갱신",
  recommendationResults: "추천 생성"
};
