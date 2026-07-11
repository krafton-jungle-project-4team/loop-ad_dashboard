import { Button } from "@loopad/ui/shadcn/button";
import { cn } from "@loopad/ui/shadcn/utils";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDashboardQueryState } from "../../model/dashboard-query.js";
import type { DashboardTab } from "../../model/dashboard-types.js";
import { OnboardingStepper, type OnboardingStep } from "./OnboardingStepper.js";
import { useProjectOnboarding } from "./ProjectOnboardingProvider.js";

type OnboardingAction = {
  description: string;
  label: string;
  type: "complete-funnel" | "complete-sdk" | "return";
};

export function OnboardingWorkspaceLayout({
  activeTab,
  children
}: {
  activeTab: DashboardTab;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const hasObservedResolvedStage = useRef(false);
  const previousDashboardUnlocked = useRef(false);
  const [showExperimentCta, setShowExperimentCta] = useState(false);
  const {
    campaignSteps,
    completeFunnel,
    completeSdk,
    isDashboardUnlocked,
    isLoading,
    projectId,
    requiredPathSegment,
    setupSteps,
    stage
  } = useProjectOnboarding();

  const navigateTo = (tabPath: string) =>
    navigate({
      params: { projectId, tabPath },
      search: (current) => current,
      to: "/dashboard/$projectId/$tabPath"
    });

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!hasObservedResolvedStage.current) {
      hasObservedResolvedStage.current = true;
      previousDashboardUnlocked.current = isDashboardUnlocked;
      return;
    }

    if (!previousDashboardUnlocked.current && isDashboardUnlocked) {
      setShowExperimentCta(true);
    }
    if (!isDashboardUnlocked) {
      setShowExperimentCta(false);
    }
    previousDashboardUnlocked.current = isDashboardUnlocked;
  }, [isDashboardUnlocked, isLoading]);

  if (isLoading) {
    return children;
  }

  if (isDashboardUnlocked) {
    if (!showExperimentCta || activeTab !== "campaigns") {
      return children;
    }

    return (
      <div className="grid min-w-0 gap-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">첫 실험이 실행 중입니다</p>
            <p className="mt-1 text-sm text-muted-foreground">
              시작 가이드가 완료되어 모든 메뉴를 사용할 수 있습니다.
            </p>
          </div>
          <Button
            className="shrink-0"
            onClick={() => {
              setShowExperimentCta(false);
              void navigateTo("experiments");
            }}
            type="button"
          >
            실험 보기
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
        {children}
      </div>
    );
  }

  const action = getOnboardingAction(activeTab, stage);

  const handleAction = () => {
    if (!action || !requiredPathSegment) {
      return;
    }

    if (action.type === "complete-sdk") {
      completeSdk();
      void navigateTo("funnels");
      return;
    }

    if (action.type === "complete-funnel") {
      completeFunnel();
      void navigateTo("campaigns");
      return;
    }

    void navigateTo(requiredPathSegment);
  };

  const handleStepSelect = async (step: OnboardingStep) => {
    const pathSegment = getStepPathSegment(step.id);
    if (!pathSegment) {
      return;
    }

    switch (step.id) {
      case "campaign":
        await setDashboardQueryState({
          campaignView: "manage",
          segmentView: "manage",
          selectedCampaignId: "",
          selectedPromotionId: "",
          selectedSegmentId: ""
        });
        break;
      case "promotion":
        await setDashboardQueryState({
          segmentView: "manage",
          selectedPromotionId: "",
          selectedSegmentId: ""
        });
        break;
      case "segment":
        await setDashboardQueryState({
          segmentView: "recommendations",
          selectedSegmentId: ""
        });
        break;
      case "creative":
      case "experiment":
        await setDashboardQueryState({ segmentView: "experiments" });
        break;
    }

    await navigateTo(pathSegment);
  };

  return (
    <div className="grid min-h-0 w-full gap-6 md:grid-cols-[18rem_minmax(0,1fr)] md:items-start">
      <OnboardingStepper
        campaignSteps={campaignSteps}
        onStepSelect={(step) => void handleStepSelect(step)}
        setupSteps={setupSteps}
      />

      <section className={cn("min-w-0", activeTab === "funnels" && "min-h-full")}>
        {action ? (
          <div className="mb-6 hidden items-center justify-between gap-4 rounded-2xl border bg-card px-5 py-4 shadow-sm md:flex">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{action.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
            </div>
            <Button className="shrink-0" onClick={handleAction} type="button">
              {action.label}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        ) : null}

        {children}
      </section>

      {action ? (
        <div className="fixed inset-x-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-30 md:hidden">
          <Button
            className="h-12 w-full rounded-xl shadow-[0_12px_30px_rgba(15,23,42,0.2)]"
            onClick={handleAction}
            type="button"
          >
            {action.label}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function getOnboardingAction(
  activeTab: DashboardTab,
  stage: "sdk" | "funnel" | "campaign" | "complete"
): OnboardingAction | null {
  if (activeTab === "sdk" && stage === "sdk") {
    return {
      description: "연동 내용을 확인했다면 기존 사용자 여정 화면으로 이동합니다.",
      label: "퍼널로 계속",
      type: "complete-sdk"
    };
  }

  if (activeTab === "funnels" && stage === "funnel") {
    return {
      description: "퍼널을 확인했다면 첫 캠페인을 만들 준비를 시작합니다.",
      label: "캠페인으로 계속",
      type: "complete-funnel"
    };
  }

  const isPastSetupScreen =
    (activeTab === "sdk" && (stage === "funnel" || stage === "campaign")) ||
    (activeTab === "funnels" && stage === "campaign");

  if (isPastSetupScreen) {
    return {
      description: "완료한 설정은 언제든 다시 볼 수 있습니다.",
      label: "현재 단계로 돌아가기",
      type: "return"
    };
  }

  return null;
}

function getStepPathSegment(stepId: string): "campaigns" | "funnels" | "sdk" | null {
  if (stepId === "sdk") {
    return "sdk";
  }
  if (stepId === "funnel") {
    return "funnels";
  }
  if (["campaign", "promotion", "segment", "creative", "experiment"].includes(stepId)) {
    return "campaigns";
  }
  return null;
}
