import type { ProjectOnboardingStage } from "./project-setup-progress.js";
import { dashboardTabValues, type DashboardTab } from "./dashboard-types.js";

export const DASHBOARD_MOBILE_ACTION_OFFSET_PX = 136;

export type ProjectOnboardingStepState = "complete" | "current" | "locked";

export type ProjectOnboardingStep = {
  completionCondition: string;
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

export function countRunningExperiments(experiments: ReadonlyArray<{ status: string }>): number {
  return experiments.filter((experiment) => experiment.status === "running").length;
}

export function createSetupOnboardingSteps(
  stage: ProjectOnboardingStage
): ReadonlyArray<ProjectOnboardingStep> {
  return [
    {
      completionCondition: "SDK 연동을 확인하고 캠페인 만들기를 누르면 완료돼요.",
      description: "프로젝트에 SDK를 한 번 연결해요.",
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
      completionCondition: "캠페인을 1개 만들면 완료돼요.",
      description: "첫 캠페인의 목표와 기간을 정해요.",
      id: "campaign",
      label: "캠페인 생성"
    },
    {
      completionCondition: "프로모션을 1개 만들면 완료돼요.",
      description: "캠페인에서 운영할 프로모션을 만들어요.",
      id: "promotion",
      label: "프로모션 생성"
    },
    {
      completionCondition: "사용할 세그먼트 후보를 확정하면 완료돼요.",
      description: "프로모션을 보여 줄 대상을 정해요.",
      id: "segment",
      label: "세그먼트 생성"
    },
    {
      completionCondition: "광고 소재를 만들고 사용할 소재를 선택하면 완료돼요.",
      description: "광고 소재를 만들고 선택해요.",
      id: "creative",
      label: "광고 소재 승인"
    },
    {
      completionCondition: "선택한 광고 소재로 첫 실험을 시작하면 완료돼요.",
      description: "대상을 배정하고 첫 실험을 시작해요.",
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
