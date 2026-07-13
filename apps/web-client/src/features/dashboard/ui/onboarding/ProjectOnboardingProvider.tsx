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
import {
  fetchDashboardCampaignDetail,
  fetchDashboardFunnelList,
  fetchDashboardPageResource,
  fetchDashboardProjectExperiments
} from "../../api/dashboard-api.js";
import {
  defaultDashboardSearchQuery,
  normalizeDashboardQuery,
  useDashboardQueryState
} from "../../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardFunnelListQueryKey,
  dashboardPageQueryKey,
  dashboardProjectExperimentsQueryKey
} from "../../model/dashboard-query-keys.js";
import {
  completeProjectSdkSetup,
  initializeProjectSetupProgress,
  readProjectSetupProgress,
  resolveProjectOnboardingStage,
  skipProjectOnboarding,
  startProjectSetupGuide,
  type ProjectOnboardingPathSegment,
  type ProjectOnboardingStage,
  type ProjectSetupProgress
} from "../../model/project-setup-progress.js";
import {
  allowedDashboardTabs,
  countStartedExperiments,
  createCampaignOnboardingSteps,
  createSetupOnboardingSteps,
  preserveCampaignOnboardingMilestones,
  type CampaignOnboardingProgress,
  type ProjectOnboardingStep
} from "../../model/project-onboarding.js";
import type { DashboardQuery, DashboardTab } from "../../model/dashboard-types.js";

type ProjectProgressSnapshot = {
  progress: ProjectSetupProgress;
  projectId: string;
};

type CampaignProgressSnapshot = {
  progress: CampaignOnboardingProgress;
  projectId: string;
};

export type ProjectOnboardingContextValue = {
  allowedTabs: ReadonlySet<DashboardTab>;
  campaignSteps: ReadonlyArray<ProjectOnboardingStep>;
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
  startedExperimentCount: number;
  setupSteps: ReadonlyArray<ProjectOnboardingStep>;
  skipGuide: () => void;
  startGuide: () => void;
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
  const onboardingQuery = useMemo(
    () => normalizeDashboardQuery(defaultDashboardSearchQuery, projectId),
    [projectId]
  );
  const storedProgress = useMemo(() => readProjectSetupProgress(projectId), [projectId]);
  const [progressSnapshot, setProgressSnapshot] = useState<ProjectProgressSnapshot | null>(() =>
    storedProgress === null ? null : { progress: storedProgress, projectId }
  );
  const [campaignProgressSnapshot, setCampaignProgressSnapshot] =
    useState<CampaignProgressSnapshot | null>(null);
  const progress =
    progressSnapshot?.projectId === projectId ? progressSnapshot.progress : storedProgress;

  const mainQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardPageResource("main", onboardingQuery, signal),
    queryKey: dashboardPageQueryKey("main", onboardingQuery),
    select: (resource): DashboardMain => resource.data as DashboardMain
  });
  const funnelListQuery = useQuery({
    enabled: progress === null,
    queryFn: ({ signal }) => fetchDashboardFunnelList(onboardingQuery, signal),
    queryKey: dashboardFunnelListQueryKey(query.projectId)
  });
  const experimentsQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardProjectExperiments(projectId, signal),
    queryKey: dashboardProjectExperimentsQueryKey(projectId)
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

  const startedExperimentCount = useMemo(
    () => countStartedExperiments(experimentsQuery.data?.experiments ?? []),
    [experimentsQuery.data]
  );
  const stageResolution = resolveProjectOnboardingStage({
    progress,
    startedExperimentCount
  });
  const selectedCampaign = mainData?.campaigns.find(
    (campaign) => campaign.campaign_id === query.selectedCampaignId
  );
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const campaignDetailQuery = useQuery({
    enabled: stageResolution.stage === "campaign" && Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(projectId, selectedCampaignId)
  });
  const detectedCampaignProgress = useMemo<CampaignOnboardingProgress>(() => {
    const campaignSummaries = mainData?.campaigns ?? [];

    return {
      hasAnalyzedSegment: campaignSummaries.some((campaign) => campaign.segment_count > 0),
      hasApprovedCreative:
        campaignDetailQuery.data?.content_candidates.some((candidate) =>
          ["active", "approved"].includes(candidate.status)
        ) ?? false,
      hasCampaign: campaignSummaries.length > 0,
      hasPromotion: campaignSummaries.some((campaign) => campaign.promotion_count > 0),
      hasStartedExperiment: startedExperimentCount > 0,
      stage: stageResolution.stage
    };
  }, [
    campaignDetailQuery.data,
    mainData?.campaigns,
    stageResolution.stage,
    startedExperimentCount
  ]);
  const previousCampaignProgress =
    campaignProgressSnapshot?.projectId === projectId ? campaignProgressSnapshot.progress : null;
  const campaignProgress = useMemo(
    () => preserveCampaignOnboardingMilestones(detectedCampaignProgress, previousCampaignProgress),
    [detectedCampaignProgress, previousCampaignProgress]
  );

  useEffect(() => {
    setCampaignProgressSnapshot((current) => {
      if (
        current?.projectId === projectId &&
        campaignProgressEqual(current.progress, campaignProgress)
      ) {
        return current;
      }

      return { progress: campaignProgress, projectId };
    });
  }, [campaignProgress, projectId]);

  const allowedTabs = allowedDashboardTabs(stageResolution.stage);
  const setupSteps = useMemo(
    () => createSetupOnboardingSteps(stageResolution.stage),
    [stageResolution.stage]
  );
  const campaignSteps = useMemo(
    () => createCampaignOnboardingSteps(campaignProgress),
    [campaignProgress]
  );
  const completeSdk = useCallback(() => {
    const nextProgress = completeProjectSdkSetup(projectId, { currentProgress: progress });
    setProgressSnapshot({ progress: nextProgress, projectId });
  }, [progress, projectId]);
  const startGuide = useCallback(() => {
    const nextProgress = startProjectSetupGuide(projectId, { currentProgress: progress });
    setProgressSnapshot({ progress: nextProgress, projectId });
  }, [progress, projectId]);
  const skipGuide = useCallback(() => {
    const nextProgress = skipProjectOnboarding(projectId, { currentProgress: progress });
    setProgressSnapshot({ progress: nextProgress, projectId });
  }, [progress, projectId]);
  const isTabAllowed = useCallback((tab: DashboardTab) => allowedTabs.has(tab), [allowedTabs]);
  const requiredPath = stageResolution.requiredPathSegment
    ? `/dashboard/${encodeURIComponent(projectId)}/${stageResolution.requiredPathSegment}`
    : null;
  const value = useMemo<ProjectOnboardingContextValue>(
    () => ({
      allowedTabs,
      campaignSteps,
      completeSdk,
      error:
        mainQuery.error ??
        experimentsQuery.error ??
        funnelListQuery.error ??
        campaignDetailQuery.error,
      isDashboardUnlocked: stageResolution.isDashboardUnlocked,
      isInitialSetupComplete: stageResolution.isInitialSetupComplete,
      isLoading:
        mainQuery.isPending ||
        experimentsQuery.isPending ||
        (progress === null && funnelListQuery.isPending) ||
        (mainQuery.isSuccess && progress === null),
      isTabAllowed,
      mainData,
      progress,
      projectId,
      query,
      requiredPath,
      requiredPathSegment: stageResolution.requiredPathSegment,
      startedExperimentCount,
      setupSteps,
      skipGuide,
      startGuide,
      stage: stageResolution.stage
    }),
    [
      allowedTabs,
      campaignSteps,
      campaignDetailQuery.error,
      completeSdk,
      experimentsQuery.error,
      experimentsQuery.isPending,
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
      startedExperimentCount,
      setupSteps,
      skipGuide,
      startGuide,
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

function campaignProgressEqual(
  left: CampaignOnboardingProgress,
  right: CampaignOnboardingProgress
): boolean {
  return (
    left.hasAnalyzedSegment === right.hasAnalyzedSegment &&
    left.hasApprovedCreative === right.hasApprovedCreative &&
    left.hasCampaign === right.hasCampaign &&
    left.hasPromotion === right.hasPromotion &&
    left.hasStartedExperiment === right.hasStartedExperiment &&
    left.stage === right.stage
  );
}

export function useProjectOnboarding(): ProjectOnboardingContextValue {
  const context = useContext(ProjectOnboardingContext);
  if (context === null) {
    throw new Error("useProjectOnboarding must be used within ProjectOnboardingProvider.");
  }
  return context;
}
