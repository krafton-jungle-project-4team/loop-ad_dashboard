export const PROJECT_SETUP_PROGRESS_STORAGE_KEY_PREFIX = "loopad.dashboard.setup.v1";

export type ProjectSetupProgress = {
  initializedAt: string;
  guideStartedAt: string | null;
  onboardingSkippedAt: string | null;
  sdkCompletedAt: string | null;
  funnelCompletedAt: string | null;
};

export type ProjectSetupProgressStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ProjectSetupProgressOptions = {
  now?: () => string;
  storage?: ProjectSetupProgressStorage | null;
};

export type CompleteProjectSetupProgressOptions = ProjectSetupProgressOptions & {
  currentProgress?: ProjectSetupProgress | null;
};

export type InitializeProjectSetupProgressOptions = ProjectSetupProgressOptions & {
  initialSetupCompleted?: boolean;
};

export type ProjectOnboardingStage = "welcome" | "sdk" | "funnel" | "campaign" | "complete";

export type ProjectOnboardingPathSegment = "sdk" | "funnels" | "campaigns";

export type ProjectOnboardingStageInput = {
  progress: ProjectSetupProgress | null;
  runningExperimentCount?: number;
};

export type ProjectOnboardingStageResolution = {
  isDashboardUnlocked: boolean;
  isInitialSetupComplete: boolean;
  requiredPathSegment: ProjectOnboardingPathSegment | null;
  stage: ProjectOnboardingStage;
};

export function getProjectSetupProgressStorageKey(projectId: string): string {
  return `${PROJECT_SETUP_PROGRESS_STORAGE_KEY_PREFIX}:${projectId.trim()}`;
}

export function parseProjectSetupProgress(serialized: string | null): ProjectSetupProgress | null {
  if (serialized === null) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value)) {
      return null;
    }

    const initializedAt = parseTimestamp(value.initializedAt);
    const guideStartedAt = Object.hasOwn(value, "guideStartedAt")
      ? parseOptionalTimestamp(value.guideStartedAt)
      : initializedAt;
    const onboardingSkippedAt = Object.hasOwn(value, "onboardingSkippedAt")
      ? parseOptionalTimestamp(value.onboardingSkippedAt)
      : null;
    const sdkCompletedAt = parseOptionalTimestamp(value.sdkCompletedAt);
    const funnelCompletedAt = parseOptionalTimestamp(value.funnelCompletedAt);

    if (
      initializedAt === null ||
      guideStartedAt === undefined ||
      onboardingSkippedAt === undefined ||
      sdkCompletedAt === undefined ||
      funnelCompletedAt === undefined ||
      (sdkCompletedAt !== null && guideStartedAt === null) ||
      (funnelCompletedAt !== null && sdkCompletedAt === null)
    ) {
      return null;
    }

    return {
      funnelCompletedAt,
      guideStartedAt,
      initializedAt,
      onboardingSkippedAt,
      sdkCompletedAt
    };
  } catch {
    return null;
  }
}

export function readProjectSetupProgress(
  projectId: string,
  storage?: ProjectSetupProgressStorage | null
): ProjectSetupProgress | null {
  const resolvedStorage = resolveStorage(storage);
  if (resolvedStorage === null) {
    return null;
  }

  try {
    return parseProjectSetupProgress(
      resolvedStorage.getItem(getProjectSetupProgressStorageKey(projectId))
    );
  } catch {
    return null;
  }
}

export function initializeProjectSetupProgress(
  projectId: string,
  options: InitializeProjectSetupProgressOptions = {}
): ProjectSetupProgress {
  const existing = readProjectSetupProgress(projectId, options.storage);
  if (existing !== null) {
    return existing;
  }

  const initializedAt = getCurrentTimestamp(options.now);
  const initialSetupCompleted = options.initialSetupCompleted === true;
  const progress: ProjectSetupProgress = {
    funnelCompletedAt: initialSetupCompleted ? initializedAt : null,
    guideStartedAt: initialSetupCompleted ? initializedAt : null,
    initializedAt,
    onboardingSkippedAt: null,
    sdkCompletedAt: initialSetupCompleted ? initializedAt : null
  };

  persistProjectSetupProgress(projectId, progress, options.storage);
  return progress;
}

export function skipProjectOnboarding(
  projectId: string,
  options: CompleteProjectSetupProgressOptions = {}
): ProjectSetupProgress {
  const skippedAt = getCurrentTimestamp(options.now);
  const current =
    options.currentProgress ??
    readProjectSetupProgress(projectId, options.storage) ??
    createEmptyProgress(skippedAt);

  if (current.onboardingSkippedAt !== null) {
    return current;
  }

  const next: ProjectSetupProgress = {
    ...current,
    onboardingSkippedAt: skippedAt
  };
  persistProjectSetupProgress(projectId, next, options.storage);
  return next;
}

export function startProjectSetupGuide(
  projectId: string,
  options: CompleteProjectSetupProgressOptions = {}
): ProjectSetupProgress {
  const startedAt = getCurrentTimestamp(options.now);
  const current =
    options.currentProgress ??
    readProjectSetupProgress(projectId, options.storage) ??
    createEmptyProgress(startedAt);

  if (current.guideStartedAt !== null) {
    return current;
  }

  const next: ProjectSetupProgress = {
    ...current,
    guideStartedAt: startedAt
  };
  persistProjectSetupProgress(projectId, next, options.storage);
  return next;
}

export function completeProjectSdkSetup(
  projectId: string,
  options: CompleteProjectSetupProgressOptions = {}
): ProjectSetupProgress {
  const completedAt = getCurrentTimestamp(options.now);
  const current =
    options.currentProgress ??
    readProjectSetupProgress(projectId, options.storage) ??
    createEmptyProgress(completedAt);

  if (current.sdkCompletedAt !== null) {
    return current;
  }

  const next: ProjectSetupProgress = {
    ...current,
    guideStartedAt: current.guideStartedAt ?? completedAt,
    sdkCompletedAt: completedAt
  };
  persistProjectSetupProgress(projectId, next, options.storage);
  return next;
}

export function completeProjectFunnelSetup(
  projectId: string,
  options: CompleteProjectSetupProgressOptions = {}
): ProjectSetupProgress {
  const completedAt = getCurrentTimestamp(options.now);
  const current =
    options.currentProgress ??
    readProjectSetupProgress(projectId, options.storage) ??
    createEmptyProgress(completedAt);

  if (current.sdkCompletedAt === null || current.funnelCompletedAt !== null) {
    persistProjectSetupProgress(projectId, current, options.storage);
    return current;
  }

  const next: ProjectSetupProgress = {
    ...current,
    funnelCompletedAt: completedAt
  };
  persistProjectSetupProgress(projectId, next, options.storage);
  return next;
}

export function clearProjectSetupProgress(
  projectId: string,
  storage?: ProjectSetupProgressStorage | null
): void {
  const resolvedStorage = resolveStorage(storage);
  if (resolvedStorage === null) {
    return;
  }

  try {
    resolvedStorage.removeItem(getProjectSetupProgressStorageKey(projectId));
  } catch {
    // Browser storage can be unavailable in privacy modes. Clearing remains best-effort.
  }
}

export function resolveProjectOnboardingStage({
  progress,
  runningExperimentCount = 0
}: ProjectOnboardingStageInput): ProjectOnboardingStageResolution {
  if (runningExperimentCount > 0 || progress?.onboardingSkippedAt != null) {
    return {
      isDashboardUnlocked: true,
      isInitialSetupComplete: true,
      requiredPathSegment: null,
      stage: "complete"
    };
  }

  if (progress?.sdkCompletedAt == null) {
    if (progress?.guideStartedAt == null) {
      return {
        isDashboardUnlocked: false,
        isInitialSetupComplete: false,
        requiredPathSegment: "sdk",
        stage: "welcome"
      };
    }

    return {
      isDashboardUnlocked: false,
      isInitialSetupComplete: false,
      requiredPathSegment: "sdk",
      stage: "sdk"
    };
  }

  if (progress.funnelCompletedAt === null) {
    return {
      isDashboardUnlocked: false,
      isInitialSetupComplete: false,
      requiredPathSegment: "funnels",
      stage: "funnel"
    };
  }

  return {
    isDashboardUnlocked: false,
    isInitialSetupComplete: true,
    requiredPathSegment: "campaigns",
    stage: "campaign"
  };
}

function createEmptyProgress(initializedAt: string): ProjectSetupProgress {
  return {
    funnelCompletedAt: null,
    guideStartedAt: null,
    initializedAt,
    onboardingSkippedAt: null,
    sdkCompletedAt: null
  };
}

function getCurrentTimestamp(now: (() => string) | undefined): string {
  const timestamp = now?.() ?? new Date().toISOString();
  return parseTimestamp(timestamp) ?? new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOptionalTimestamp(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  return parseTimestamp(value) ?? undefined;
}

function parseTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : value;
}

function persistProjectSetupProgress(
  projectId: string,
  progress: ProjectSetupProgress,
  storage: ProjectSetupProgressStorage | null | undefined
): void {
  const resolvedStorage = resolveStorage(storage);
  if (resolvedStorage === null) {
    return;
  }

  try {
    resolvedStorage.setItem(getProjectSetupProgressStorageKey(projectId), JSON.stringify(progress));
  } catch {
    // Browser storage can be unavailable or full. Callers still receive the in-memory value.
  }
}

function resolveStorage(
  storage: ProjectSetupProgressStorage | null | undefined
): ProjectSetupProgressStorage | null {
  if (storage !== undefined) {
    return storage;
  }

  try {
    return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
