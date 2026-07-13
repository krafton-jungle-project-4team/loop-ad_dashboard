import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Button } from "@loopad/ui/shadcn/button";
import { cn } from "@loopad/ui/shadcn/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DASHBOARD_MOBILE_ACTION_OFFSET_PX } from "../../model/project-onboarding.js";
import type { DashboardTab } from "../../model/dashboard-types.js";
import { OnboardingStepper } from "./OnboardingStepper.js";
import { useProjectOnboarding } from "./ProjectOnboardingProvider.js";
import { ProjectWelcomeScreen } from "./ProjectWelcomeScreen.js";

type OnboardingAction = {
  description: string;
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
    return children;
  }

  if (error) {
    return (
      <Alert className="mx-auto max-w-2xl p-5" variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>시작 가이드 정보를 불러오지 못했습니다</AlertTitle>
        <AlertDescription className="grid gap-4">
          <p>
            캠페인 진행 상태를 확인할 수 없어 현재 단계를 임의로 표시하지 않았습니다. 서버 연결을
            확인한 뒤 다시 시도해주세요.
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
            <RefreshCw aria-hidden="true" className={cn(isRetrying && "animate-spin")} />
            {isRetrying ? "다시 불러오는 중" : "다시 불러오기"}
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
        <div
          aria-live="polite"
          className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold text-foreground">첫 실험이 실행 중입니다</p>
            <p className="mt-1 text-sm text-muted-foreground">
              시작 가이드가 완료되어 모든 메뉴를 사용할 수 있습니다.
            </p>
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
        </div>
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
    <div
      className={cn(
        "grid min-h-0 w-full gap-6 md:grid-cols-[18rem_minmax(0,1fr)] md:items-start",
        action && "pb-20 md:pb-0"
      )}
      style={
        action
          ? ({
              "--dashboard-mobile-action-offset": `calc(${DASHBOARD_MOBILE_ACTION_OFFSET_PX}px + env(safe-area-inset-bottom))`
            } as CSSProperties)
          : undefined
      }
    >
      {stage === "campaign" ? <h1 className="sr-only">캠페인 시작 가이드</h1> : null}
      <OnboardingStepper
        campaignSteps={campaignSteps}
        desktopFooter={
          action ? (
            <div className="grid gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{action.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.description}</p>
              </div>
              {action.type === "return" && requiredPathSegment ? (
                <Button asChild className="w-full">
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
                <Button className="w-full" onClick={handleCompleteSdk} type="button">
                  {action.label}
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </Button>
              )}
            </div>
          ) : undefined
        }
        projectId={projectId}
        setupSteps={setupSteps}
      />

      <section className={cn("min-w-0", activeTab === "funnels" && "min-h-full")}>
        {children}
      </section>

      {action ? (
        <div className="fixed inset-x-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-30 md:hidden">
          {action.type === "return" && requiredPathSegment ? (
            <Button
              asChild
              className="h-12 w-full rounded-xl shadow-[0_12px_30px_rgba(15,23,42,0.2)]"
            >
              <Link
                params={{ projectId, tabPath: requiredPathSegment }}
                search={(current) => current}
                to="/dashboard/$projectId/$tabPath"
              >
                {action.label}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : (
            <Button
              className="h-12 w-full rounded-xl shadow-[0_12px_30px_rgba(15,23,42,0.2)]"
              onClick={handleCompleteSdk}
              type="button"
            >
              {action.label}
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function getOnboardingAction(
  activeTab: DashboardTab,
  stage: "welcome" | "sdk" | "campaign" | "complete"
): OnboardingAction | null {
  if (activeTab === "sdk" && stage === "sdk") {
    return {
      description: "연동 내용을 확인했다면 첫 캠페인을 만들 준비를 시작합니다.",
      label: "캠페인으로 계속",
      type: "complete-sdk"
    };
  }

  const isPastSetupScreen =
    (activeTab === "sdk" && stage === "campaign") ||
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
