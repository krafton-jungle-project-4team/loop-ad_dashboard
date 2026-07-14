import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Button } from "@loopad/ui/shadcn/button";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import { cn } from "@loopad/ui/shadcn/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DashboardTab } from "../../model/dashboard-types.js";
import { OnboardingStepper } from "./OnboardingStepper.js";
import { useProjectOnboarding } from "./ProjectOnboardingProvider.js";
import { ProjectWelcomeScreen } from "./ProjectWelcomeScreen.js";

type OnboardingAction = {
  label: string;
  type: "complete-sdk" | "return";
};

export function OnboardingWorkspaceLayout({
  activeTab,
  children
}: {
  activeTab: DashboardTab;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const hasObservedResolvedStage = useRef(false);
  const previousDashboardUnlocked = useRef(false);
  const [showExperimentCta, setShowExperimentCta] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const {
    campaignSteps,
    completeSdk,
    error,
    isDashboardUnlocked,
    isLoading,
    projectId,
    requiredPathSegment,
    retry,
    runningExperimentCount,
    setupSteps,
    skipGuide,
    startGuide,
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

    if (!previousDashboardUnlocked.current && isDashboardUnlocked && runningExperimentCount > 0) {
      setShowExperimentCta(true);
    }
    if (!isDashboardUnlocked) {
      setShowExperimentCta(false);
    }
    previousDashboardUnlocked.current = isDashboardUnlocked;
  }, [isDashboardUnlocked, isLoading, runningExperimentCount]);

  if (isLoading) {
    return (
      <div className="grid min-h-[calc(100svh-9rem)] place-items-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
          <Spinner aria-hidden="true" />
          <span>시작 가이드 상태를 불러오는 중…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="mx-auto max-w-2xl p-5" variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>시작 가이드를 불러오지 못했어요</AlertTitle>
        <AlertDescription className="grid gap-4">
          <p>
            네트워크 연결이 원활하지 않아 현재 단계를 확인할 수 없어요. 연결을 확인한 뒤 시작
            가이드를 다시 불러와 주세요.
          </p>
          <Button
            className="w-fit"
            disabled={isRetrying}
            onClick={() => {
              setIsRetrying(true);
              void retry().finally(() => setIsRetrying(false));
            }}
            type="button"
            variant="outline"
          >
            {isRetrying ? <Spinner aria-hidden="true" /> : null}
            {isRetrying ? "시작 가이드 불러오는 중…" : "시작 가이드 다시 불러오기"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (stage === "welcome") {
    return (
      <ProjectWelcomeScreen
        onSkip={() => {
          skipGuide();
          void navigateTo("campaigns");
        }}
        onStart={startGuide}
      />
    );
  }

  if (isDashboardUnlocked) {
    if (!showExperimentCta || activeTab !== "campaigns") {
      return children;
    }

    return (
      <div className="grid min-w-0 gap-6">
        <Alert
          aria-live="polite"
          className="flex flex-col gap-4 border-primary/20 bg-primary/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="grid gap-1">
            <AlertTitle>첫 실험을 시작했어요</AlertTitle>
            <AlertDescription>이제 모든 메뉴를 사용할 수 있어요.</AlertDescription>
          </div>
          <Button asChild className="shrink-0">
            <Link
              onClick={() => setShowExperimentCta(false)}
              params={{ projectId, tabPath: "experiments" }}
              search={(current) => current}
              to="/dashboard/$projectId/$tabPath"
            >
              실험 보기
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </Alert>
        {children}
      </div>
    );
  }

  const action = getOnboardingAction(activeTab, stage);

  const handleCompleteSdk = () => {
    if (!action || !requiredPathSegment) {
      return;
    }

    completeSdk();
    void navigateTo("campaigns");
  };

  return (
    <div className="grid min-h-0 w-full gap-6">
      {stage === "campaign" ? <h1 className="sr-only">캠페인 시작 가이드</h1> : null}
      <OnboardingStepper
        action={
          action ? (
            action.type === "return" && requiredPathSegment ? (
              <Button asChild size="sm">
                <Link
                  params={{ projectId, tabPath: requiredPathSegment }}
                  search={(current) => current}
                  to="/dashboard/$projectId/$tabPath"
                >
                  {action.label}
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </Link>
              </Button>
            ) : (
              <Button onClick={handleCompleteSdk} size="sm" type="button">
                {action.label}
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </Button>
            )
          ) : undefined
        }
        campaignSteps={campaignSteps}
        projectId={projectId}
        setupSteps={setupSteps}
      />

      <section className={cn("min-w-0", activeTab === "funnels" && "min-h-full")}>
        {children}
      </section>
    </div>
  );
}

function getOnboardingAction(
  activeTab: DashboardTab,
  stage: "welcome" | "sdk" | "campaign" | "complete"
): OnboardingAction | null {
  if (activeTab === "sdk" && stage === "sdk") {
    return {
      label: "캠페인 만들기",
      type: "complete-sdk"
    };
  }

  const isPastSetupScreen =
    (activeTab === "sdk" && stage === "campaign") ||
    (activeTab === "funnels" && stage === "campaign");

  if (isPastSetupScreen) {
    return {
      label: "가이드 계속하기",
      type: "return"
    };
  }

  return null;
}
