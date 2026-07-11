import type { DashboardMain } from "@loopad/shared";
import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { fetchDashboardFunnelList, fetchDashboardPageResource } from "../../api/dashboard-api.js";
import { normalizeDashboardQuery, useDashboardQueryState } from "../../model/dashboard-query.js";
import {
  dashboardFunnelListQueryKey,
  dashboardPageQueryKey
} from "../../model/dashboard-query-keys.js";
import {
  completeProjectFunnelSetup,
  completeProjectSdkSetup,
  initializeProjectSetupProgress,
  readProjectSetupProgress,
  resolveProjectOnboardingStage,
  type ProjectOnboardingPathSegment,
  type ProjectOnboardingStage,
  type ProjectSetupProgress
} from "../../model/project-setup-progress.js";
import {
  allowedDashboardTabs,
  createCampaignOnboardingSteps,
  createSetupOnboardingSteps,
  type ProjectOnboardingStep
} from "../../model/project-onboarding.js";
import type { DashboardQuery, DashboardTab } from "../../model/dashboard-types.js";

type ProjectProgressSnapshot = {
  progress: ProjectSetupProgress;
  projectId: string;
};

export type ProjectOnboardingContextValue = {
  allowedTabs: ReadonlySet<DashboardTab>;
  campaignSteps: ReadonlyArray<ProjectOnboardingStep>;
  completeFunnel: () => void;
  completeSdk: () => void;
  error: Error | null;
  isDashboardUnlocked: boolean;
  isInitialSetupComplete: boolean;
  isLoading: boolean;
  isTabAllowed: (tab: DashboardTab) => boolean;
  mainData: DashboardMain | undefined;
  progress: ProjectSetupProgress | null;
  projectId: string;
  query: DashboardQuery;
  requiredPath: string | null;
  requiredPathSegment: ProjectOnboardingPathSegment | null;
  runningExperimentCount: number;
  setupSteps: ReadonlyArray<ProjectOnboardingStep>;
  stage: ProjectOnboardingStage;
};

const ProjectOnboardingContext = createContext<ProjectOnboardingContextValue | null>(null);

export function ProjectOnboardingProvider({
  children,
  projectId
}: PropsWithChildren<{ projectId: string }>) {
  const [queryState] = useDashboardQueryState();
  const query = useMemo(
    () => normalizeDashboardQuery(queryState, projectId),
    [projectId, queryState]
  );
  const storedProgress = useMemo(() => readProjectSetupProgress(projectId), [projectId]);
  const [progressSnapshot, setProgressSnapshot] = useState<ProjectProgressSnapshot | null>(() =>
    storedProgress === null ? null : { progress: storedProgress, projectId }
  );
  const progress =
    progressSnapshot?.projectId === projectId ? progressSnapshot.progress : storedProgress;

  const mainQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardPageResource("main", query, signal),
    queryKey: dashboardPageQueryKey("main", query),
    select: (resource): DashboardMain => resource.data as DashboardMain
  });
  const funnelListQuery = useQuery({
    enabled: progress === null,
    queryFn: ({ signal }) => fetchDashboardFunnelList(query, signal),
    queryKey: dashboardFunnelListQueryKey(query.projectId)
  });
  const mainData = mainQuery.data;

  useEffect(() => {
    if (mainData === undefined || progress !== null || funnelListQuery.isPending) {
      return;
    }

    const initializedProgress = initializeProjectSetupProgress(projectId, {
      initialSetupCompleted:
        mainData.campaigns.length > 0 || (funnelListQuery.data?.funnels.length ?? 0) > 0
    });
    setProgressSnapshot({ progress: initializedProgress, projectId });
  }, [funnelListQuery.data, funnelListQuery.isPending, mainData, progress, projectId]);

  const runningExperimentCount = useMemo(
    () =>
      mainData?.campaigns.reduce(
        (total, campaign) => total + campaign.running_ad_experiment_count,
        0
      ) ?? 0,
    [mainData]
  );
  const stageResolution = resolveProjectOnboardingStage({
    progress,
    runningExperimentCount
  });
  const allowedTabs = allowedDashboardTabs(stageResolution.stage);
  const setupSteps = useMemo(
    () => createSetupOnboardingSteps(stageResolution.stage),
    [stageResolution.stage]
  );
  const campaignSteps = useMemo(
    () => createCampaignOnboardingSteps(stageResolution.stage),
    [stageResolution.stage]
  );
  const completeSdk = useCallback(() => {
    const nextProgress = completeProjectSdkSetup(projectId);
    setProgressSnapshot({ progress: nextProgress, projectId });
  }, [projectId]);
  const completeFunnel = useCallback(() => {
    const nextProgress = completeProjectFunnelSetup(projectId);
    setProgressSnapshot({ progress: nextProgress, projectId });
  }, [projectId]);
  const isTabAllowed = useCallback((tab: DashboardTab) => allowedTabs.has(tab), [allowedTabs]);
  const requiredPath = stageResolution.requiredPathSegment
    ? `/dashboard/${encodeURIComponent(projectId)}/${stageResolution.requiredPathSegment}`
    : null;
  const value = useMemo<ProjectOnboardingContextValue>(
    () => ({
      allowedTabs,
      campaignSteps,
      completeFunnel,
      completeSdk,
      error: mainQuery.error ?? funnelListQuery.error,
      isDashboardUnlocked: stageResolution.isDashboardUnlocked,
      isInitialSetupComplete: stageResolution.isInitialSetupComplete,
      isLoading:
        mainQuery.isPending ||
        (progress === null && funnelListQuery.isPending) ||
        (mainQuery.isSuccess && progress === null),
      isTabAllowed,
      mainData,
      progress,
      projectId,
      query,
      requiredPath,
      requiredPathSegment: stageResolution.requiredPathSegment,
      runningExperimentCount,
      setupSteps,
      stage: stageResolution.stage
    }),
    [
      allowedTabs,
      campaignSteps,
      completeFunnel,
      completeSdk,
      funnelListQuery.error,
      funnelListQuery.isPending,
      isTabAllowed,
      mainData,
      mainQuery.error,
      mainQuery.isPending,
      mainQuery.isSuccess,
      progress,
      projectId,
      query,
      requiredPath,
      runningExperimentCount,
      setupSteps,
      stageResolution.isDashboardUnlocked,
      stageResolution.isInitialSetupComplete,
      stageResolution.requiredPathSegment,
      stageResolution.stage
    ]
  );

  return (
    <ProjectOnboardingContext.Provider value={value}>{children}</ProjectOnboardingContext.Provider>
  );
}

export function useProjectOnboarding(): ProjectOnboardingContextValue {
  const context = useContext(ProjectOnboardingContext);
  if (context === null) {
    throw new Error("useProjectOnboarding must be used within ProjectOnboardingProvider.");
  }
  return context;
}
