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
  fetchDashboardSegmentDetail
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
  dashboardSegmentDetailQueryKey
} from "../../model/dashboard-query-keys.js";
import {
  completeProjectFunnelSetup,
  completeProjectSdkSetup,
  initializeProjectSetupProgress,
  readProjectSetupProgress,
  resolveProjectOnboardingStage,
  startProjectSetupGuide,
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
  const selectedCampaign = mainData?.campaigns.find(
    (campaign) => campaign.campaign_id === query.selectedCampaignId
  );
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const campaignDetailQuery = useQuery({
    enabled: stageResolution.stage === "campaign" && Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(projectId, selectedCampaignId)
  });
  const selectedPromotion = campaignDetailQuery.data?.promotions.find(
    (promotion) => promotion.promotion_id === query.selectedPromotionId
  );
  const selectedPromotionId = selectedPromotion?.promotion_id ?? "";
  const selectedSegment = campaignDetailQuery.data?.segments.find(
    (segment) =>
      segment.promotion_id === selectedPromotionId && segment.segment_id === query.selectedSegmentId
  );
  const selectedSegmentId = selectedSegment?.segment_id ?? "";
  const segmentDetailQuery = useQuery({
    enabled:
      stageResolution.stage === "campaign" &&
      Boolean(selectedPromotionId) &&
      Boolean(selectedSegmentId),
    queryFn: ({ signal }) =>
      fetchDashboardSegmentDetail(query, selectedPromotionId, selectedSegmentId, signal),
    queryKey: dashboardSegmentDetailQueryKey(projectId, selectedPromotionId, selectedSegmentId)
  });
  const hasAnalyzedSegment =
    Boolean(selectedSegment?.analysis_id.trim()) && selectedSegment?.status !== "stopped";
  const hasApprovedCreative =
    segmentDetailQuery.data?.content_candidates.some((candidate) =>
      ["active", "approved"].includes(candidate.status)
    ) ?? false;
  const allowedTabs = allowedDashboardTabs(stageResolution.stage);
  const setupSteps = useMemo(
    () => createSetupOnboardingSteps(stageResolution.stage),
    [stageResolution.stage]
  );
  const campaignSteps = useMemo(
    () =>
      createCampaignOnboardingSteps({
        hasAnalyzedSegment,
        hasApprovedCreative,
        hasCampaign: Boolean(selectedCampaign),
        hasPromotion: Boolean(selectedPromotion),
        hasRunningExperiment: runningExperimentCount > 0,
        stage: stageResolution.stage
      }),
    [
      hasAnalyzedSegment,
      hasApprovedCreative,
      runningExperimentCount,
      selectedCampaign,
      selectedPromotion,
      stageResolution.stage
    ]
  );
  const completeSdk = useCallback(() => {
    const nextProgress = completeProjectSdkSetup(projectId, { currentProgress: progress });
    setProgressSnapshot({ progress: nextProgress, projectId });
  }, [progress, projectId]);
  const startGuide = useCallback(() => {
    const nextProgress = startProjectSetupGuide(projectId, { currentProgress: progress });
    setProgressSnapshot({ progress: nextProgress, projectId });
  }, [progress, projectId]);
  const completeFunnel = useCallback(() => {
    const nextProgress = completeProjectFunnelSetup(projectId, { currentProgress: progress });
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
      completeFunnel,
      completeSdk,
      error:
        mainQuery.error ??
        funnelListQuery.error ??
        campaignDetailQuery.error ??
        segmentDetailQuery.error,
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
      startGuide,
      stage: stageResolution.stage
    }),
    [
      allowedTabs,
      campaignSteps,
      campaignDetailQuery.error,
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
      segmentDetailQuery.error,
      setupSteps,
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

export function useProjectOnboarding(): ProjectOnboardingContextValue {
  const context = useContext(ProjectOnboardingContext);
  if (context === null) {
    throw new Error("useProjectOnboarding must be used within ProjectOnboardingProvider.");
  }
  return context;
}
