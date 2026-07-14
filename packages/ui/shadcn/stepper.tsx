import * as React from "react";

import { cn } from "@loopad/ui/shadcn/utils";

type StepperOrientation = "horizontal" | "vertical";
type StepState = "active" | "completed" | "inactive" | "loading";
type StepIndicators = {
  active?: React.ReactNode;
  completed?: React.ReactNode;
  inactive?: React.ReactNode;
  loading?: React.ReactNode;
};

type StepperContextValue = {
  activeStep: number;
  baseId: string;
  focusFirst: () => void;
  focusLast: () => void;
  focusNext: (currentIndex: number) => void;
  focusPrevious: (currentIndex: number) => void;
  indicators: StepIndicators;
  orientation: StepperOrientation;
  registerTrigger: (node: HTMLButtonElement) => void;
  setActiveStep: (step: number) => void;
  triggerNodes: HTMLButtonElement[];
  unregisterTrigger: (node: HTMLButtonElement) => void;
};

type StepItemContextValue = {
  isDisabled: boolean;
  isLoading: boolean;
  state: StepState;
  step: number;
};

const StepperContext = React.createContext<StepperContextValue | undefined>(undefined);
const StepItemContext = React.createContext<StepItemContextValue | undefined>(undefined);

function useStepper() {
  const context = React.useContext(StepperContext);
  if (!context) {
    throw new Error("useStepper must be used within a Stepper");
  }
  return context;
}

function useStepItem() {
  const context = React.useContext(StepItemContext);
  if (!context) {
    throw new Error("useStepItem must be used within a StepperItem");
  }
  return context;
}

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: number;
  indicators?: StepIndicators;
  onValueChange?: (value: number) => void;
  orientation?: StepperOrientation;
  value?: number;
}

function Stepper({
  defaultValue = 1,
  value,
  onValueChange,
  orientation = "horizontal",
  className,
  children,
  indicators = {},
  ...props
}: StepperProps) {
  const [internalStep, setInternalStep] = React.useState(defaultValue);
  const [triggerNodes, setTriggerNodes] = React.useState<HTMLButtonElement[]>([]);
  const reactId = React.useId();
  const baseId = React.useMemo(() => `stepper-${reactId.replaceAll(":", "")}`, [reactId]);
  const activeStep = value ?? internalStep;

  const registerTrigger = React.useCallback((node: HTMLButtonElement) => {
    setTriggerNodes((current) => (current.includes(node) ? current : [...current, node]));
  }, []);

  const unregisterTrigger = React.useCallback((node: HTMLButtonElement) => {
    setTriggerNodes((current) => current.filter((candidate) => candidate !== node));
  }, []);

  const setActiveStep = React.useCallback(
    (step: number) => {
      if (value === undefined) {
        setInternalStep(step);
      }
      onValueChange?.(step);
    },
    [onValueChange, value]
  );

  const focusTrigger = React.useCallback(
    (index: number) => {
      triggerNodes[index]?.focus();
    },
    [triggerNodes]
  );
  const focusNext = React.useCallback(
    (currentIndex: number) => {
      if (triggerNodes.length > 0) {
        focusTrigger((currentIndex + 1) % triggerNodes.length);
      }
    },
    [focusTrigger, triggerNodes.length]
  );
  const focusPrevious = React.useCallback(
    (currentIndex: number) => {
      if (triggerNodes.length > 0) {
        focusTrigger((currentIndex - 1 + triggerNodes.length) % triggerNodes.length);
      }
    },
    [focusTrigger, triggerNodes.length]
  );
  const focusFirst = React.useCallback(() => focusTrigger(0), [focusTrigger]);
  const focusLast = React.useCallback(
    () => focusTrigger(triggerNodes.length - 1),
    [focusTrigger, triggerNodes.length]
  );

  const contextValue = React.useMemo<StepperContextValue>(
    () => ({
      activeStep,
      baseId,
      focusFirst,
      focusLast,
      focusNext,
      focusPrevious,
      indicators,
      orientation,
      registerTrigger,
      setActiveStep,
      triggerNodes,
      unregisterTrigger
    }),
    [
      activeStep,
      baseId,
      focusFirst,
      focusLast,
      focusNext,
      focusPrevious,
      indicators,
      orientation,
      registerTrigger,
      setActiveStep,
      triggerNodes,
      unregisterTrigger
    ]
  );

  return (
    <StepperContext.Provider value={contextValue}>
      <div
        aria-orientation={orientation}
        className={cn("w-full", className)}
        data-orientation={orientation}
        data-slot="stepper"
        role="tablist"
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  );
}

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  completed?: boolean;
  disabled?: boolean;
  loading?: boolean;
  step: number;
}

function StepperItem({
  step,
  completed = false,
  disabled = false,
  loading = false,
  className,
  children,
  ...props
}: StepperItemProps) {
  const { activeStep } = useStepper();
  const state: StepState =
    completed || step < activeStep ? "completed" : activeStep === step ? "active" : "inactive";
  const isLoading = loading && step === activeStep;

  return (
    <StepItemContext.Provider value={{ step, state, isDisabled: disabled, isLoading }}>
      <div
        className={cn(
          "group/step flex items-center justify-center not-last:flex-1 group-data-[orientation=horizontal]/stepper-nav:flex-row group-data-[orientation=vertical]/stepper-nav:flex-col",
          className
        )}
        data-loading={isLoading || undefined}
        data-slot="stepper-item"
        data-state={state}
        {...props}
      >
        {children}
      </div>
    </StepItemContext.Provider>
  );
}

type StepperTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

function StepperTrigger({
  className,
  children,
  onClick,
  onKeyDown,
  tabIndex,
  ...props
}: StepperTriggerProps) {
  const { state, isLoading, step, isDisabled } = useStepItem();
  const {
    activeStep,
    baseId,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    registerTrigger,
    setActiveStep,
    triggerNodes,
    unregisterTrigger
  } = useStepper();
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const isSelected = activeStep === step;
  const id = `${baseId}-tab-${step}`;
  const panelId = `${baseId}-panel-${step}`;

  const setButtonRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      if (buttonRef.current && buttonRef.current !== node) {
        unregisterTrigger(buttonRef.current);
      }
      buttonRef.current = node;
      if (node) {
        registerTrigger(node);
      }
    },
    [registerTrigger, unregisterTrigger]
  );

  const triggerIndex = triggerNodes.findIndex((node) => node === buttonRef.current);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        if (triggerIndex !== -1) focusNext(triggerIndex);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        if (triggerIndex !== -1) focusPrevious(triggerIndex);
        break;
      case "Home":
        event.preventDefault();
        focusFirst();
        break;
      case "End":
        event.preventDefault();
        focusLast();
        break;
    }
  };

  return (
    <button
      aria-controls={panelId}
      aria-selected={isSelected}
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 inline-flex cursor-pointer items-center gap-2.5 rounded-full outline-none focus-visible:z-10 focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-60",
        className
      )}
      data-loading={isLoading || undefined}
      data-slot="stepper-trigger"
      data-state={state}
      disabled={isDisabled}
      id={id}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          setActiveStep(step);
        }
      }}
      onKeyDown={handleKeyDown}
      ref={setButtonRef}
      role="tab"
      tabIndex={typeof tabIndex === "number" ? tabIndex : isSelected ? 0 : -1}
      {...props}
    >
      {children}
    </button>
  );
}

function StepperIndicator({ children, className, ...props }: React.ComponentProps<"div">) {
  const { state, isLoading } = useStepItem();
  const { indicators } = useStepper();
  const indicator =
    (isLoading && indicators.loading) ||
    (state === "completed" && indicators.completed) ||
    (state === "active" && indicators.active) ||
    (state === "inactive" && indicators.inactive) ||
    children;

  return (
    <div
      className={cn(
        "border-background bg-accent text-accent-foreground data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs [&_svg]:size-3.5",
        className
      )}
      data-slot="stepper-indicator"
      data-state={state}
      {...props}
    >
      {indicator}
    </div>
  );
}

function StepperSeparator({ className, ...props }: React.ComponentProps<"div">) {
  const { state } = useStepItem();

  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-muted m-0.5 rounded-sm group-data-[orientation=horizontal]/stepper-nav:h-0.5 group-data-[orientation=horizontal]/stepper-nav:flex-1 group-data-[orientation=vertical]/stepper-nav:h-12 group-data-[orientation=vertical]/stepper-nav:w-0.5",
        className
      )}
      data-slot="stepper-separator"
      data-state={state}
      {...props}
    />
  );
}

function StepperTitle({ children, className, ...props }: React.ComponentProps<"h3">) {
  const { state } = useStepItem();

  return (
    <h3
      className={cn("text-sm leading-none font-medium", className)}
      data-slot="stepper-title"
      data-state={state}
      {...props}
    >
      {children}
    </h3>
  );
}

function StepperDescription({ children, className, ...props }: React.ComponentProps<"div">) {
  const { state } = useStepItem();

  return (
    <div
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="stepper-description"
      data-state={state}
      {...props}
    >
      {children}
    </div>
  );
}

function StepperNav({ children, className, ...props }: React.ComponentProps<"nav">) {
  const { activeStep, orientation } = useStepper();

  return (
    <nav
      className={cn(
        "group/stepper-nav inline-flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col",
        className
      )}
      data-orientation={orientation}
      data-slot="stepper-nav"
      data-state={activeStep}
      {...props}
    >
      {children}
    </nav>
  );
}

function StepperPanel({ children, className, ...props }: React.ComponentProps<"div">) {
  const { activeStep } = useStepper();

  return (
    <div
      className={cn("w-full", className)}
      data-slot="stepper-panel"
      data-state={activeStep}
      {...props}
    >
      {children}
    </div>
  );
}

interface StepperContentProps extends React.ComponentProps<"div"> {
  forceMount?: boolean;
  value: number;
}

function StepperContent({ value, forceMount, children, className, ...props }: StepperContentProps) {
  const { activeStep, baseId } = useStepper();
  const isActive = value === activeStep;

  if (!forceMount && !isActive) {
    return null;
  }

  return (
    <div
      aria-labelledby={`${baseId}-tab-${value}`}
      className={cn("w-full", className, !isActive && forceMount && "hidden")}
      data-slot="stepper-content"
      data-state={activeStep}
      hidden={!isActive && forceMount}
      id={`${baseId}-panel-${value}`}
      role="tabpanel"
      {...props}
    >
      {children}
    </div>
  );
}

export {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
  useStepItem,
  useStepper,
  type StepperContentProps,
  type StepperItemProps,
  type StepperProps,
  type StepperTriggerProps
};
