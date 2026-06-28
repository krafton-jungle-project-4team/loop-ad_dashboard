import {
  Activity,
  ChartNoAxesCombined,
  FlaskConical,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import type { DashboardTab } from "./dashboard-types.js";

export const dashboardTabs: Array<{ value: DashboardTab; label: string; icon: LucideIcon }> = [
  { value: "events", label: "수집 현황", icon: Activity },
  { value: "funnel", label: "퍼널/세그먼트 분석", icon: ChartNoAxesCombined },
  { value: "recommendations", label: "추천/콘텐츠 생성 결과", icon: Sparkles },
  { value: "experiment", label: "실험 성과", icon: FlaskConical }
];

export const dashboardTitles: Record<DashboardTab, string> = {
  events: "수집 현황",
  funnel: "퍼널/세그먼트 분석",
  recommendations: "추천/콘텐츠 생성 결과",
  experiment: "실험 성과"
};
