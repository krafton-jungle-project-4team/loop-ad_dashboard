import {
  Bot,
  ChartNoAxesCombined,
  LayoutDashboard,
  Megaphone,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import type { DashboardTab } from "./dashboard-types.js";

export const dashboardTabs: Array<{ value: DashboardTab; label: string; icon: LucideIcon }> = [
  { value: "overview", label: "메인 대시보드", icon: LayoutDashboard },
  { value: "conversion", label: "구매전환", icon: ChartNoAxesCombined },
  { value: "insights", label: "AI 분석", icon: Bot },
  { value: "recommendations", label: "AI 추천", icon: Sparkles },
  { value: "creatives", label: "컨텐츠 생성", icon: Megaphone }
];

export const dashboardTitles: Record<DashboardTab, string> = {
  overview: "메인 대시보드",
  conversion: "구매전환",
  insights: "AI 분석",
  recommendations: "AI 추천",
  creatives: "컨텐츠 생성"
};
