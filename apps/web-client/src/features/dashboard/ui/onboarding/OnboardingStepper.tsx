import { Badge } from "@loopad/ui/shadcn/badge";
import { Button, buttonVariants } from "@loopad/ui/shadcn/button";
import { Progress } from "@loopad/ui/shadcn/progress";
import { cn } from "@loopad/ui/shadcn/utils";
import { Check, LockKeyhole } from "lucide-react";
import type {
  ProjectOnboardingStep,
  ProjectOnboardingStepState
} from "../../model/project-onboarding.js";

export type OnboardingStepState = ProjectOnboardingStepState;
export type OnboardingStep = ProjectOnboardingStep;

export type OnboardingStepperProps = {
  ariaLabel?: string;
  campaignSteps: ReadonlyArray<OnboardingStep>;
  className?: string;
  onStepSelect?: (step: OnboardingStep) => void;
  setupSteps: ReadonlyArray<OnboardingStep>;
};

const STEP_STATE_LABEL: Record<OnboardingStepState, string> = {
  complete: "완료",
  current: "진행 중",
  locked: "잠김"
};

export function OnboardingStepper({
  ariaLabel = "프로젝트 시작 가이드",
  campaignSteps,
  className,
  onStepSelect,
  setupSteps
}: OnboardingStepperProps) {
  const groups = [
    { id: "setup", label: "초기 설정", startIndex: 0, steps: setupSteps },
    {
      id: "campaign",
      label: "캠페인 운영",
      startIndex: setupSteps.length,
      steps: campaignSteps
    }
  ] as const;
  const steps = [...setupSteps, ...campaignSteps];
  const completedCount = steps.filter((step) => step.state === "complete").length;
  const progressValue = steps.length === 0 ? 0 : (completedCount / steps.length) * 100;

  return (
    <div className={cn("w-full md:w-72", className)}>
      <MobileOnboardingSummary
        ariaLabel={ariaLabel}
        campaignStepCount={campaignSteps.length}
        completedCount={completedCount}
        onStepSelect={onStepSelect}
        progressValue={progressValue}
        setupStepCount={setupSteps.length}
        steps={steps}
      />

      <nav
        aria-label={ariaLabel}
        className="hidden rounded-2xl border bg-card p-4 shadow-sm md:sticky md:top-20 md:block md:self-start"
      >
        <header className="flex flex-col gap-2 px-2 pb-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">시작 가이드</h2>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {completedCount}/{steps.length} 완료
            </span>
          </div>
          <Progress
            aria-label={`${completedCount}/${steps.length}단계 완료`}
            aria-valuemax={steps.length}
            aria-valuemin={0}
            aria-valuenow={completedCount}
            value={progressValue}
          />
        </header>

        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section className="flex flex-col gap-2" key={group.id}>
              <h3 className="px-2 text-xs font-semibold tracking-wide text-muted-foreground">
                {group.label}
              </h3>
              <ol aria-label={`${group.label} 단계`} className="flex flex-col gap-1">
                {group.steps.map((step, index) => (
                  <DesktopStepItem
                    globalIndex={group.startIndex + index}
                    isLast={index === group.steps.length - 1}
                    key={step.id}
                    onStepSelect={onStepSelect}
                    step={step}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      </nav>
    </div>
  );
}

function DesktopStepItem({
  globalIndex,
  isLast,
  onStepSelect,
  step
}: {
  globalIndex: number;
  isLast: boolean;
  onStepSelect?: (step: OnboardingStep) => void;
  step: OnboardingStep;
}) {
  const canSelect = step.state !== "locked" && onStepSelect !== undefined;
  const content = (
    <>
      <StepMarker number={globalIndex + 1} state={step.state} />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className="text-sm font-medium leading-5 text-foreground">{step.label}</span>
        {step.description ? (
          <span className="text-xs leading-5 text-muted-foreground">{step.description}</span>
        ) : null}
        <span className="sr-only">상태: {STEP_STATE_LABEL[step.state]}</span>
      </span>
    </>
  );
  const rowClassName = cn(
    "relative z-10 h-auto min-h-14 w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-left whitespace-normal",
    step.state === "locked" && "text-muted-foreground opacity-60"
  );
  const rowVariant = step.state === "current" ? "secondary" : "ghost";

  return (
    <li className="relative">
      {!isLast ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-3 left-[1.625rem] top-10 w-px bg-border",
            step.state === "complete" && "bg-primary"
          )}
        />
      ) : null}

      {canSelect ? (
        <Button
          aria-current={step.state === "current" ? "step" : undefined}
          aria-label={`${globalIndex + 1}단계 ${step.label}, ${STEP_STATE_LABEL[step.state]}`}
          className={rowClassName}
          onClick={() => onStepSelect(step)}
          type="button"
          variant={rowVariant}
        >
          {content}
        </Button>
      ) : (
        <div
          aria-current={step.state === "current" ? "step" : undefined}
          className={cn(buttonVariants({ variant: rowVariant }), rowClassName)}
          data-state={step.state}
        >
          {content}
        </div>
      )}
    </li>
  );
}

function MobileOnboardingSummary({
  ariaLabel,
  campaignStepCount,
  completedCount,
  onStepSelect,
  progressValue,
  setupStepCount,
  steps
}: {
  ariaLabel: string;
  campaignStepCount: number;
  completedCount: number;
  onStepSelect?: (step: OnboardingStep) => void;
  progressValue: number;
  setupStepCount: number;
  steps: ReadonlyArray<OnboardingStep>;
}) {
  if (steps.length === 0) {
    return (
      <section className="rounded-2xl border bg-card p-4 shadow-sm md:hidden">
        <h2 className="text-sm font-semibold text-foreground">시작 가이드</h2>
        <p className="mt-1 text-sm text-muted-foreground">표시할 단계가 없습니다.</p>
      </section>
    );
  }

  const currentIndex = steps.findIndex((step) => step.state === "current");
  const firstLockedIndex = steps.findIndex((step) => step.state === "locked");
  const summaryIndex =
    currentIndex >= 0 ? currentIndex : firstLockedIndex >= 0 ? firstLockedIndex : steps.length - 1;
  const summaryStep = steps[summaryIndex];

  if (!summaryStep) {
    return null;
  }

  const summaryGroupLabel = summaryIndex < setupStepCount ? "초기 설정" : "캠페인 운영";

  return (
    <nav
      aria-label={`${ariaLabel} 요약`}
      className="rounded-2xl border bg-card p-4 shadow-sm md:hidden"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary">{summaryGroupLabel}</Badge>
        <span className="text-xs tabular-nums text-muted-foreground">
          {completedCount}/{steps.length} 완료
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <p className="text-xs font-medium text-primary">
          {summaryIndex + 1}단계 · {STEP_STATE_LABEL[summaryStep.state]}
        </p>
        <h2 className="text-base font-semibold text-foreground">{summaryStep.label}</h2>
        {summaryStep.description ? (
          <p className="text-sm leading-6 text-muted-foreground">{summaryStep.description}</p>
        ) : null}
      </div>

      <Progress
        aria-label={`${completedCount}/${steps.length}단계 완료`}
        aria-valuemax={steps.length}
        aria-valuemin={0}
        aria-valuenow={completedCount}
        className="mt-4 h-1.5"
        value={progressValue}
      />

      <div className="mt-4 overflow-x-auto pb-1">
        <ol className="flex min-w-max items-center gap-1.5">
          {steps.map((step, index) => (
            <li key={step.id}>
              <MobileStepControl index={index} onStepSelect={onStepSelect} step={step} />
              {index === setupStepCount - 1 && campaignStepCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="mx-1 inline-block h-4 w-px align-middle bg-border"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

function MobileStepControl({
  index,
  onStepSelect,
  step
}: {
  index: number;
  onStepSelect?: (step: OnboardingStep) => void;
  step: OnboardingStep;
}) {
  const canSelect = step.state !== "locked" && onStepSelect !== undefined;
  const label = `${index + 1}단계 ${step.label}, ${STEP_STATE_LABEL[step.state]}`;
  const variant =
    step.state === "current" ? "default" : step.state === "complete" ? "secondary" : "outline";
  const content = <MobileMarkerContent number={index + 1} state={step.state} />;

  if (canSelect) {
    return (
      <Button
        aria-current={step.state === "current" ? "step" : undefined}
        aria-label={label}
        onClick={() => onStepSelect(step)}
        size="icon-sm"
        type="button"
        variant={variant}
      >
        {content}
      </Button>
    );
  }

  return (
    <span
      aria-current={step.state === "current" ? "step" : undefined}
      className={cn(
        buttonVariants({ size: "icon-sm", variant }),
        step.state === "locked" && "opacity-50"
      )}
      data-state={step.state}
    >
      {content}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function StepMarker({ number, state }: { number: number; state: OnboardingStepState }) {
  return (
    <Badge
      aria-hidden="true"
      className="size-7 rounded-full p-0 tabular-nums"
      variant={state === "locked" ? "outline" : "default"}
    >
      <MarkerContent number={number} state={state} />
    </Badge>
  );
}

function MobileMarkerContent({ number, state }: { number: number; state: OnboardingStepState }) {
  if (state === "complete") {
    return <Check aria-hidden="true" />;
  }

  if (state === "locked") {
    return <LockKeyhole aria-hidden="true" />;
  }

  return <span aria-hidden="true">{number}</span>;
}

function MarkerContent({ number, state }: { number: number; state: OnboardingStepState }) {
  if (state === "complete") {
    return <Check aria-hidden="true" />;
  }

  if (state === "locked") {
    return <LockKeyhole aria-hidden="true" />;
  }

  return number;
}
