import type { ProjectOnboardingStage } from "./project-setup-progress.js";
import { dashboardTabValues, type DashboardTab } from "./dashboard-types.js";

export const DASHBOARD_MOBILE_ACTION_OFFSET_PX = 136;

export type ProjectOnboardingStepState = "complete" | "current" | "locked";

export type ProjectOnboardingStep = {
  description?: string;
  id: string;
  label: string;
  state: ProjectOnboardingStepState;
};

export type CampaignOnboardingProgress = {
  hasAnalyzedSegment: boolean;
  hasApprovedCreative: boolean;
  hasCampaign: boolean;
  hasPromotion: boolean;
  hasRunningExperiment: boolean;
  stage: ProjectOnboardingStage;
};

const SDK_STAGE_TABS: ReadonlySet<DashboardTab> = new Set(["sdk"]);
const CAMPAIGN_STAGE_TABS: ReadonlySet<DashboardTab> = new Set(["sdk", "campaigns"]);
const COMPLETE_STAGE_TABS: ReadonlySet<DashboardTab> = new Set(dashboardTabValues);

export function allowedDashboardTabs(stage: ProjectOnboardingStage): ReadonlySet<DashboardTab> {
  switch (stage) {
    case "welcome":
    case "sdk":
      return SDK_STAGE_TABS;
    case "campaign":
      return CAMPAIGN_STAGE_TABS;
    case "complete":
      return COMPLETE_STAGE_TABS;
  }
}

export function createSetupOnboardingSteps(
  stage: ProjectOnboardingStage
): ReadonlyArray<ProjectOnboardingStep> {
  return [
    {
      description: "프로젝트에서 사용할 SDK를 연결합니다.",
      id: "sdk",
      label: "SDK 연동",
      state: stage === "welcome" ? "locked" : stage === "sdk" ? "current" : "complete"
    }
  ];
}

export function createCampaignOnboardingSteps(
  progress: CampaignOnboardingProgress
): ReadonlyArray<ProjectOnboardingStep> {
  const steps = [
    {
      description: "첫 캠페인의 목표와 기간을 설정합니다.",
      id: "campaign",
      label: "캠페인 생성"
    },
    {
      description: "캠페인에서 실행할 프로모션을 만듭니다.",
      id: "promotion",
      label: "프로모션 생성"
    },
    {
      description: "프로모션의 대상 세그먼트를 확정합니다.",
      id: "segment",
      label: "세그먼트 생성"
    },
    {
      description: "광고 소재를 생성하고 승인합니다.",
      id: "creative",
      label: "광고 소재 승인"
    },
    {
      description: "대상을 배정하고 첫 실험을 실행합니다.",
      id: "experiment",
      label: "실험 실행"
    }
  ] as const;

  if (progress.stage === "complete") {
    return steps.map((step) => ({ ...step, state: "complete" }));
  }

  if (progress.stage !== "campaign") {
    return steps.map((step) => ({ ...step, state: "locked" }));
  }

  const completed = [
    progress.hasCampaign,
    progress.hasCampaign && progress.hasPromotion,
    progress.hasCampaign && progress.hasPromotion && progress.hasAnalyzedSegment,
    progress.hasCampaign &&
      progress.hasPromotion &&
      progress.hasAnalyzedSegment &&
      progress.hasApprovedCreative,
    progress.hasCampaign &&
      progress.hasPromotion &&
      progress.hasAnalyzedSegment &&
      progress.hasApprovedCreative &&
      progress.hasRunningExperiment
  ];
  const currentIndex = completed.findIndex((isComplete) => !isComplete);

  return steps.map((step, index) => ({
    ...step,
    state: completed[index] === true ? "complete" : index === currentIndex ? "current" : "locked"
  }));
}
