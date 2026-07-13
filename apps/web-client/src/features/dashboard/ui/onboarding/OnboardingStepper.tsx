import { Badge } from "@loopad/ui/shadcn/badge";
import { Card, CardContent } from "@loopad/ui/shadcn/card";
import { ScrollArea, ScrollBar } from "@loopad/ui/shadcn/scroll-area";
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger
} from "@loopad/ui/shadcn/stepper";
import { cn } from "@loopad/ui/shadcn/utils";
import { useNavigate } from "@tanstack/react-router";
import { Check, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";
import type {
  ProjectOnboardingStep,
  ProjectOnboardingStepState
} from "../../model/project-onboarding.js";

export type OnboardingStepState = ProjectOnboardingStepState;
export type OnboardingStep = ProjectOnboardingStep;

export type OnboardingStepperProps = {
  action?: ReactNode;
  ariaLabel?: string;
  campaignSteps: ReadonlyArray<OnboardingStep>;
  className?: string;
  projectId: string;
  setupSteps: ReadonlyArray<OnboardingStep>;
};

const STEP_STATE_LABEL: Record<OnboardingStepState, string> = {
  complete: "완료",
  current: "진행 중",
  locked: "잠김"
};

export function OnboardingStepper({
  action,
  ariaLabel = "프로젝트 시작 가이드",
  campaignSteps,
  className,
  projectId,
  setupSteps
}: OnboardingStepperProps) {
  const navigate = useNavigate();
  const steps = [...setupSteps, ...campaignSteps];
  const activeStep = getActiveStepNumber(steps);
  const isSetupComplete = setupSteps.every((step) => step.state === "complete");

  const navigateToStep = (stepNumber: number) => {
    const step = steps[stepNumber - 1];
    const tabPath = step ? getStepPathSegment(step.id) : null;
    if (!step || step.state === "locked" || !tabPath) {
      return;
    }

    void navigate({
      params: { projectId, tabPath },
      search: (current) => ({ ...current, ...getStepSearchPatch(step.id) }),
      to: "/dashboard/$projectId/$tabPath"
    });
  };

  return (
    <Card aria-label={ariaLabel} className={cn("w-full gap-0 py-0", className)}>
      <CardContent className="px-0 py-0">
        {steps.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            표시할 단계가 없습니다.
          </p>
        ) : (
          <ScrollArea className="w-full pb-3">
            <div aria-label="온보딩 구간" className="grid min-w-[64rem] grid-cols-6 px-8 pt-6">
              <div className="flex justify-center">
                <Badge variant={isSetupComplete ? "secondary" : "default"}>초기 설정</Badge>
              </div>
              <div className="flex justify-center">
                <Badge variant={isSetupComplete ? "default" : "outline"}>캠페인 운영</Badge>
              </div>
            </div>
            <Stepper
              className="min-w-[64rem] px-8 pt-4 pb-6"
              indicators={{ completed: <Check aria-hidden="true" /> }}
              onValueChange={navigateToStep}
              value={activeStep}
            >
              <StepperNav aria-label={ariaLabel}>
                {steps.map((step, index) => {
                  const stepNumber = index + 1;

                  return (
                    <StepperItem
                      className="relative flex-1 items-start"
                      completed={step.state === "complete"}
                      disabled={step.state === "locked" || getStepPathSegment(step.id) === null}
                      key={step.id}
                      step={stepNumber}
                    >
                      <StepperTrigger
                        aria-current={step.state === "current" ? "step" : undefined}
                        aria-label={`${stepNumber}단계 ${step.label}, ${STEP_STATE_LABEL[step.state]}`}
                        className="flex w-full flex-col gap-2.5 rounded-md px-2 text-center whitespace-normal"
                      >
                        <StepperIndicator>
                          {step.state === "locked" ? (
                            <LockKeyhole aria-hidden="true" />
                          ) : (
                            stepNumber
                          )}
                        </StepperIndicator>
                        <StepperTitle>{step.label}</StepperTitle>
                        {step.description ? (
                          <StepperDescription className="max-w-40 text-xs leading-5">
                            {step.description}
                          </StepperDescription>
                        ) : null}
                        <span className="sr-only">상태: {STEP_STATE_LABEL[step.state]}</span>
                      </StepperTrigger>
                      {index < steps.length - 1 ? (
                        <StepperSeparator className="absolute inset-x-0 top-2.5 left-[calc(50%+0.875rem)] m-0 w-[calc(100%-2rem+0.225rem)] flex-none group-data-[state=completed]/step:bg-primary" />
                      ) : null}
                    </StepperItem>
                  );
                })}
              </StepperNav>
            </Stepper>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {action ? <div className="flex justify-end px-8 pb-6">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

function getActiveStepNumber(steps: ReadonlyArray<OnboardingStep>) {
  const currentIndex = steps.findIndex((step) => step.state === "current");
  if (currentIndex >= 0) {
    return currentIndex + 1;
  }

  const firstLockedIndex = steps.findIndex((step) => step.state === "locked");
  if (firstLockedIndex >= 0) {
    return firstLockedIndex + 1;
  }

  return Math.max(1, steps.length);
}

function getStepPathSegment(stepId: string): "campaigns" | "sdk" | null {
  if (stepId === "sdk") {
    return "sdk";
  }
  if (["campaign", "promotion", "segment", "creative", "experiment"].includes(stepId)) {
    return "campaigns";
  }
  return null;
}

function getStepSearchPatch(stepId: string) {
  switch (stepId) {
    case "campaign":
      return {
        campaignView: "manage" as const,
        segmentView: "manage" as const,
        selectedAdExperimentId: "",
        selectedCampaignId: "",
        selectedPromotionId: "",
        selectedSegmentId: ""
      };
    case "promotion":
      return {
        campaignView: "manage" as const,
        segmentView: "manage" as const,
        selectedAdExperimentId: "",
        selectedPromotionId: "",
        selectedSegmentId: ""
      };
    case "segment":
      return {
        campaignView: "manage" as const,
        segmentView: "recommendations" as const,
        selectedAdExperimentId: "",
        selectedSegmentId: ""
      };
    case "creative":
    case "experiment":
      return {
        campaignView: "manage" as const,
        segmentView: "experiments" as const
      };
    default:
      return {};
  }
}
