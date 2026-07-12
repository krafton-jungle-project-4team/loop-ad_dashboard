import assert from "node:assert/strict";
import test from "node:test";
import {
  clearProjectSetupProgress,
  completeProjectFunnelSetup,
  completeProjectSdkSetup,
  getProjectSetupProgressStorageKey,
  initializeProjectSetupProgress,
  parseProjectSetupProgress,
  readProjectSetupProgress,
  resolveProjectOnboardingStage,
  startProjectSetupGuide,
  type ProjectSetupProgressStorage
} from "../src/features/dashboard/model/project-setup-progress.js";

const INITIALIZED_AT = "2026-07-12T00:00:00.000Z";
const GUIDE_STARTED_AT = "2026-07-12T00:00:30.000Z";
const SDK_COMPLETED_AT = "2026-07-12T00:01:00.000Z";
const FUNNEL_COMPLETED_AT = "2026-07-12T00:02:00.000Z";

class MemoryStorage implements ProjectSetupProgressStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test("project setup progress uses the versioned project key", () => {
  assert.equal(
    getProjectSetupProgressStorageKey(" demo-project "),
    "loopad.dashboard.setup.v1:demo-project"
  );
});

test("project setup progress parser accepts valid state and rejects corrupt state", () => {
  assert.deepEqual(
    parseProjectSetupProgress(
      JSON.stringify({
        funnelCompletedAt: null,
        initializedAt: INITIALIZED_AT,
        sdkCompletedAt: SDK_COMPLETED_AT
      })
    ),
    {
      funnelCompletedAt: null,
      guideStartedAt: INITIALIZED_AT,
      initializedAt: INITIALIZED_AT,
      sdkCompletedAt: SDK_COMPLETED_AT
    }
  );

  const invalidValues = [
    null,
    "not-json",
    JSON.stringify([]),
    JSON.stringify({ initializedAt: INITIALIZED_AT }),
    JSON.stringify({
      funnelCompletedAt: null,
      guideStartedAt: null,
      initializedAt: INITIALIZED_AT,
      sdkCompletedAt: SDK_COMPLETED_AT
    }),
    JSON.stringify({
      funnelCompletedAt: FUNNEL_COMPLETED_AT,
      initializedAt: INITIALIZED_AT,
      sdkCompletedAt: null
    }),
    JSON.stringify({
      funnelCompletedAt: null,
      initializedAt: "not-a-date",
      sdkCompletedAt: null
    })
  ];

  for (const value of invalidValues) {
    assert.equal(parseProjectSetupProgress(value), null);
  }
});

test("initialization creates new setup state without replacing valid progress", () => {
  const storage = new MemoryStorage();
  const initial = initializeProjectSetupProgress("project-1", {
    now: () => INITIALIZED_AT,
    storage
  });

  assert.deepEqual(initial, {
    funnelCompletedAt: null,
    guideStartedAt: null,
    initializedAt: INITIALIZED_AT,
    sdkCompletedAt: null
  });

  const repeated = initializeProjectSetupProgress("project-1", {
    initialSetupCompleted: true,
    now: () => SDK_COMPLETED_AT,
    storage
  });
  assert.deepEqual(repeated, initial);
  assert.deepEqual(readProjectSetupProgress("project-1", storage), initial);
});

test("legacy initialization can mark SDK and funnel setup as already complete", () => {
  const storage = new MemoryStorage();
  const progress = initializeProjectSetupProgress("legacy-project", {
    initialSetupCompleted: true,
    now: () => INITIALIZED_AT,
    storage
  });

  assert.deepEqual(progress, {
    funnelCompletedAt: INITIALIZED_AT,
    guideStartedAt: INITIALIZED_AT,
    initializedAt: INITIALIZED_AT,
    sdkCompletedAt: INITIALIZED_AT
  });
});

test("starting the guide is persisted, idempotent, and leaves setup incomplete", () => {
  const storage = new MemoryStorage();
  initializeProjectSetupProgress("project-1", {
    now: () => INITIALIZED_AT,
    storage
  });

  const started = startProjectSetupGuide("project-1", {
    now: () => GUIDE_STARTED_AT,
    storage
  });
  const repeated = startProjectSetupGuide("project-1", {
    now: () => SDK_COMPLETED_AT,
    storage
  });

  assert.equal(started.guideStartedAt, GUIDE_STARTED_AT);
  assert.equal(started.sdkCompletedAt, null);
  assert.deepEqual(repeated, started);
  assert.deepEqual(readProjectSetupProgress("project-1", storage), started);
});

test("SDK completion is persisted and idempotent", () => {
  const storage = new MemoryStorage();
  initializeProjectSetupProgress("project-1", {
    now: () => INITIALIZED_AT,
    storage
  });

  const completed = completeProjectSdkSetup("project-1", {
    now: () => SDK_COMPLETED_AT,
    storage
  });
  const repeated = completeProjectSdkSetup("project-1", {
    now: () => FUNNEL_COMPLETED_AT,
    storage
  });

  assert.equal(completed.sdkCompletedAt, SDK_COMPLETED_AT);
  assert.equal(completed.guideStartedAt, SDK_COMPLETED_AT);
  assert.deepEqual(repeated, completed);
  assert.deepEqual(readProjectSetupProgress("project-1", storage), completed);
});

test("funnel completion requires SDK completion and is then idempotent", () => {
  const storage = new MemoryStorage();
  initializeProjectSetupProgress("project-1", {
    now: () => INITIALIZED_AT,
    storage
  });

  const blocked = completeProjectFunnelSetup("project-1", {
    now: () => SDK_COMPLETED_AT,
    storage
  });
  assert.equal(blocked.funnelCompletedAt, null);

  completeProjectSdkSetup("project-1", {
    now: () => SDK_COMPLETED_AT,
    storage
  });
  const completed = completeProjectFunnelSetup("project-1", {
    now: () => FUNNEL_COMPLETED_AT,
    storage
  });
  const repeated = completeProjectFunnelSetup("project-1", {
    now: () => "2026-07-12T00:03:00.000Z",
    storage
  });

  assert.equal(completed.funnelCompletedAt, FUNNEL_COMPLETED_AT);
  assert.deepEqual(repeated, completed);
});

test("clearing progress is project scoped", () => {
  const storage = new MemoryStorage();
  initializeProjectSetupProgress("project-1", { now: () => INITIALIZED_AT, storage });
  initializeProjectSetupProgress("project-2", { now: () => INITIALIZED_AT, storage });

  clearProjectSetupProgress("project-1", storage);

  assert.equal(readProjectSetupProgress("project-1", storage), null);
  assert.notEqual(readProjectSetupProgress("project-2", storage), null);
});

test("storage failures do not escape setup progress helpers", () => {
  const unavailableStorage: ProjectSetupProgressStorage = {
    getItem: () => {
      throw new Error("unavailable");
    },
    removeItem: () => {
      throw new Error("unavailable");
    },
    setItem: () => {
      throw new Error("unavailable");
    }
  };

  assert.doesNotThrow(() => readProjectSetupProgress("project-1", unavailableStorage));
  assert.doesNotThrow(() =>
    initializeProjectSetupProgress("project-1", {
      now: () => INITIALIZED_AT,
      storage: unavailableStorage
    })
  );
  assert.doesNotThrow(() =>
    startProjectSetupGuide("project-1", {
      now: () => GUIDE_STARTED_AT,
      storage: unavailableStorage
    })
  );
  assert.doesNotThrow(() =>
    completeProjectSdkSetup("project-1", {
      now: () => SDK_COMPLETED_AT,
      storage: unavailableStorage
    })
  );
  const initialized = initializeProjectSetupProgress("project-1", {
    now: () => INITIALIZED_AT,
    storage: unavailableStorage
  });
  const sdkCompleted = completeProjectSdkSetup("project-1", {
    currentProgress: initialized,
    now: () => SDK_COMPLETED_AT,
    storage: unavailableStorage
  });
  const funnelCompleted = completeProjectFunnelSetup("project-1", {
    currentProgress: sdkCompleted,
    now: () => FUNNEL_COMPLETED_AT,
    storage: unavailableStorage
  });

  assert.equal(funnelCompleted.sdkCompletedAt, SDK_COMPLETED_AT);
  assert.equal(funnelCompleted.funnelCompletedAt, FUNNEL_COMPLETED_AT);
  assert.doesNotThrow(() => clearProjectSetupProgress("project-1", unavailableStorage));
});

test("top-level onboarding resolver covers welcome, SDK, funnel, campaign, and complete stages", () => {
  assert.deepEqual(resolveProjectOnboardingStage({ progress: null }), {
    isDashboardUnlocked: false,
    isInitialSetupComplete: false,
    requiredPathSegment: "sdk",
    stage: "welcome"
  });

  assert.deepEqual(
    resolveProjectOnboardingStage({
      progress: {
        funnelCompletedAt: null,
        guideStartedAt: GUIDE_STARTED_AT,
        initializedAt: INITIALIZED_AT,
        sdkCompletedAt: null
      }
    }),
    {
      isDashboardUnlocked: false,
      isInitialSetupComplete: false,
      requiredPathSegment: "sdk",
      stage: "sdk"
    }
  );

  assert.deepEqual(
    resolveProjectOnboardingStage({
      progress: {
        funnelCompletedAt: null,
        guideStartedAt: GUIDE_STARTED_AT,
        initializedAt: INITIALIZED_AT,
        sdkCompletedAt: SDK_COMPLETED_AT
      }
    }),
    {
      isDashboardUnlocked: false,
      isInitialSetupComplete: false,
      requiredPathSegment: "funnels",
      stage: "funnel"
    }
  );

  assert.deepEqual(
    resolveProjectOnboardingStage({
      progress: {
        funnelCompletedAt: FUNNEL_COMPLETED_AT,
        guideStartedAt: GUIDE_STARTED_AT,
        initializedAt: INITIALIZED_AT,
        sdkCompletedAt: SDK_COMPLETED_AT
      },
      runningExperimentCount: 0
    }),
    {
      isDashboardUnlocked: false,
      isInitialSetupComplete: true,
      requiredPathSegment: "campaigns",
      stage: "campaign"
    }
  );

  assert.deepEqual(
    resolveProjectOnboardingStage({
      progress: null,
      runningExperimentCount: 1
    }),
    {
      isDashboardUnlocked: true,
      isInitialSetupComplete: true,
      requiredPathSegment: null,
      stage: "complete"
    }
  );
});
