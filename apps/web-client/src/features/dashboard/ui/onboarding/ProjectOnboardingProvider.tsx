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
  fetchDashboardPageResource,
  fetchDashboardProjectExperiments
} from "../../api/dashboard-api.js";
import {
  clearCampaignOnboardingScope,
  readCampaignOnboardingScope,
  writeCampaignOnboardingScope,
  type CampaignOnboardingScope
} from "../../model/campaign-onboarding-scope.js";
import {
  defaultDashboardSearchQuery,
  normalizeDashboardQuery,
  useDashboardQueryState
} from "../../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardPageQueryKey,
  dashboardProjectExperimentsQueryKey
} from "../../model/dashboard-query-keys.js";
import {
  clearProjectTutorialPending,
  completeProjectSdkSetup,
  readProjectTutorialPending,
  readProjectSetupProgress,
  resolveProjectOnboardingStage,
  startProjectSetupGuide,
  type ProjectOnboardingPathSegment,
  type ProjectOnboardingStage,
  type ProjectSetupProgress
} from "../../model/project-setup-progress.js";
import {
  allowedDashboardTabs,
  countRunningExperiments,
  createCampaignOnboardingSteps,
  createSetupOnboardingSteps,
  type CampaignOnboardingProgress,
  type ProjectOnboardingStep
} from "../../model/project-onboarding.js";
import type { DashboardQuery, DashboardTab } from "../../model/dashboard-types.js";

type ProjectProgressSnapshot = {
  progress: ProjectSetupProgress;
  projectId: string;
};

type CampaignScopeSnapshot = {
  projectId: string;
  scope: CampaignOnboardingScope;
};

type TutorialPendingSnapshot = {
  pending: boolean;
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
  retry: () => Promise<void>;
  runningExperimentCount: number;
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
  const storedTutorialPending = useMemo(() => readProjectTutorialPending(projectId), [projectId]);
  const storedCampaignScope = useMemo(() => readCampaignOnboardingScope(projectId), [projectId]);
  const [progressSnapshot, setProgressSnapshot] = useState<ProjectProgressSnapshot | null>(() =>
    storedProgress === null ? null : { progress: storedProgress, projectId }
  );
  const [campaignScopeSnapshot, setCampaignScopeSnapshot] = useState<CampaignScopeSnapshot | null>(
    () => (storedCampaignScope === null ? null : { projectId, scope: storedCampaignScope })
  );
  const [tutorialPendingSnapshot, setTutorialPendingSnapshot] =
    useState<TutorialPendingSnapshot | null>(() => ({
      pending: storedTutorialPending,
      projectId
    }));
  const progress =
    progressSnapshot?.projectId === projectId ? progressSnapshot.progress : storedProgress;
  const campaignScope =
    campaignScopeSnapshot?.projectId === projectId
      ? campaignScopeSnapshot.scope
      : storedCampaignScope;
  const tutorialPending =
    tutorialPendingSnapshot?.projectId === projectId
      ? tutorialPendingSnapshot.pending
      : storedTutorialPending;

  const mainQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardPageResource("main", onboardingQuery, signal),
    queryKey: dashboardPageQueryKey("main", onboardingQuery),
    select: (resource): DashboardMain => resource.data as DashboardMain
  });
  const experimentsQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardProjectExperiments(projectId, signal),
    queryKey: dashboardProjectExperimentsQueryKey(projectId)
  });
  const mainData = mainQuery.data;

  const campaigns = useMemo(() => mainData?.campaigns ?? [], [mainData?.campaigns]);
  const campaignIds = useMemo(
    () => new Set(campaigns.map((campaign) => campaign.campaign_id)),
    [campaigns]
  );
  const runningExperiments = useMemo(
    () =>
      (experimentsQuery.data?.experiments ?? []).filter(
        (experiment) => experiment.status === "running" && campaignIds.has(experiment.campaign_id)
      ),
    [campaignIds, experimentsQuery.data]
  );
  const runningExperimentCount = countRunningExperiments(runningExperiments);
  const storedRunningExperiment = runningExperiments.find(
    (experiment) =>
      experiment.campaign_id === campaignScope?.campaignId &&
      experiment.promotion_id === campaignScope.promotionId &&
      experiment.segment_id === campaignScope.segmentId
  );
  const runningScopeExperiment = storedRunningExperiment ?? runningExperiments[0];
  const selectedCampaignId = campaignIds.has(query.selectedCampaignId)
    ? query.selectedCampaignId
    : "";
  const storedCampaignId =
    campaignScope && campaignIds.has(campaignScope.campaignId) ? campaignScope.campaignId : "";
  const scopedCampaignId =
    runningScopeExperiment?.campaign_id ||
    selectedCampaignId ||
    storedCampaignId ||
    campaigns[0]?.campaign_id ||
    "";
  const initialStageResolution = resolveProjectOnboardingStage({
    progress,
    runningExperimentCount: runningScopeExperiment ? 1 : 0,
    tutorialPending
  });
  const shouldLoadCampaignDetail =
    initialStageResolution.stage === "campaign" && Boolean(scopedCampaignId);
  const campaignDetailQuery = useQuery({
    enabled: shouldLoadCampaignDetail,
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, scopedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(projectId, scopedCampaignId)
  });
  const campaignDetail = campaignDetailQuery.data;
  const scopedPromotionId = useMemo(() => {
    if (runningScopeExperiment?.campaign_id === scopedCampaignId) {
      return runningScopeExperiment.promotion_id;
    }

    const promotions = campaignDetail?.promotions ?? [];
    const validPromotionIds = new Set(promotions.map((promotion) => promotion.promotion_id));
    if (validPromotionIds.has(query.selectedPromotionId)) {
      return query.selectedPromotionId;
    }
    if (
      campaignScope?.campaignId === scopedCampaignId &&
      validPromotionIds.has(campaignScope.promotionId)
    ) {
      return campaignScope.promotionId;
    }
    return promotions[0]?.promotion_id ?? "";
  }, [
    campaignDetail?.promotions,
    campaignScope,
    query.selectedPromotionId,
    runningScopeExperiment,
    scopedCampaignId
  ]);
  const scopedSegmentId = useMemo(() => {
    if (
      runningScopeExperiment?.campaign_id === scopedCampaignId &&
      runningScopeExperiment.promotion_id === scopedPromotionId
    ) {
      return runningScopeExperiment.segment_id;
    }

    const segments = (campaignDetail?.segments ?? []).filter(
      (segment) => segment.promotion_id === scopedPromotionId && segment.status === "approved"
    );
    const validSegmentIds = new Set(segments.map((segment) => segment.segment_id));
    if (validSegmentIds.has(query.selectedSegmentId)) {
      return query.selectedSegmentId;
    }
    if (
      campaignScope?.campaignId === scopedCampaignId &&
      campaignScope.promotionId === scopedPromotionId &&
      validSegmentIds.has(campaignScope.segmentId)
    ) {
      return campaignScope.segmentId;
    }
    return segments[0]?.segment_id ?? "";
  }, [
    campaignDetail?.segments,
    campaignScope,
    query.selectedSegmentId,
    runningScopeExperiment,
    scopedCampaignId,
    scopedPromotionId
  ]);
  const scopedRunningExperimentCount = runningExperiments.some(
    (experiment) =>
      experiment.campaign_id === scopedCampaignId &&
      experiment.promotion_id === scopedPromotionId &&
      experiment.segment_id === scopedSegmentId
  )
    ? 1
    : 0;
  const completedExperimentMilestone = scopedRunningExperimentCount > 0;
  const stageResolution = resolveProjectOnboardingStage({
    progress,
    runningExperimentCount: completedExperimentMilestone ? 1 : 0,
    tutorialPending
  });

  useEffect(() => {
    if (!tutorialPending || !completedExperimentMilestone) {
      return;
    }

    clearProjectTutorialPending(projectId);
    setTutorialPendingSnapshot({ pending: false, projectId });
  }, [completedExperimentMilestone, projectId, tutorialPending]);

  useEffect(() => {
    if (mainData === undefined) {
      return;
    }

    if (!scopedCampaignId) {
      clearCampaignOnboardingScope(projectId);
      setCampaignScopeSnapshot(null);
      return;
    }

    const nextScope: CampaignOnboardingScope = {
      campaignId: scopedCampaignId,
      promotionId: scopedPromotionId,
      segmentId: scopedSegmentId
    };
    if (campaignScopeEqual(campaignScope, nextScope)) {
      return;
    }

    writeCampaignOnboardingScope(projectId, nextScope);
    setCampaignScopeSnapshot({ projectId, scope: nextScope });
  }, [
    campaignScope,
    mainData,
    projectId,
    scopedCampaignId,
    scopedPromotionId,
    scopedRunningExperimentCount,
    scopedSegmentId
  ]);

  const campaignProgress = useMemo<CampaignOnboardingProgress>(
    () => ({
      hasAnalyzedSegment: Boolean(scopedSegmentId),
      hasApprovedCreative:
        campaignDetail?.content_candidates.some(
          (candidate) =>
            candidate.promotion_id === scopedPromotionId &&
            candidate.segment_id === scopedSegmentId &&
            ["active", "approved"].includes(candidate.status)
        ) ?? false,
      hasCampaign: Boolean(scopedCampaignId),
      hasPromotion: Boolean(scopedPromotionId),
      hasRunningExperiment: completedExperimentMilestone,
      stage: stageResolution.stage
    }),
    [
      campaignDetail?.content_candidates,
      completedExperimentMilestone,
      scopedCampaignId,
      scopedPromotionId,
      scopedRunningExperimentCount,
      scopedSegmentId,
      stageResolution.stage
    ]
  );
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
    clearProjectTutorialPending(projectId);
    setTutorialPendingSnapshot({ pending: false, projectId });
  }, [projectId]);
  const retry = useCallback(async () => {
    const requests: Array<Promise<unknown>> = [mainQuery.refetch(), experimentsQuery.refetch()];
    if (scopedCampaignId) {
      requests.push(campaignDetailQuery.refetch());
    }
    await Promise.all(requests);
  }, [campaignDetailQuery, experimentsQuery, mainQuery, scopedCampaignId]);
  const isTabAllowed = useCallback((tab: DashboardTab) => allowedTabs.has(tab), [allowedTabs]);
  const requiredPath = stageResolution.requiredPathSegment
    ? `/dashboard/${encodeURIComponent(projectId)}/${stageResolution.requiredPathSegment}`
    : null;
  const value = useMemo<ProjectOnboardingContextValue>(
    () => ({
      allowedTabs,
      campaignSteps,
      completeSdk,
      error: stageResolution.isDashboardUnlocked
        ? null
        : (mainQuery.error ?? experimentsQuery.error ?? campaignDetailQuery.error),
      isDashboardUnlocked: stageResolution.isDashboardUnlocked,
      isInitialSetupComplete: stageResolution.isInitialSetupComplete,
      isLoading:
        mainQuery.isPending ||
        experimentsQuery.isPending ||
        (shouldLoadCampaignDetail && campaignDetailQuery.isPending),
      isTabAllowed,
      mainData,
      progress,
      projectId,
      query,
      requiredPath,
      requiredPathSegment: stageResolution.requiredPathSegment,
      retry,
      runningExperimentCount,
      setupSteps,
      skipGuide,
      startGuide,
      stage: stageResolution.stage
    }),
    [
      allowedTabs,
      campaignDetailQuery.error,
      campaignDetailQuery.isPending,
      campaignSteps,
      completeSdk,
      experimentsQuery.error,
      experimentsQuery.isPending,
      isTabAllowed,
      mainData,
      mainQuery.error,
      mainQuery.isPending,
      progress,
      projectId,
      query,
      requiredPath,
      retry,
      runningExperimentCount,
      setupSteps,
      shouldLoadCampaignDetail,
      skipGuide,
      stageResolution.isDashboardUnlocked,
      stageResolution.isInitialSetupComplete,
      stageResolution.requiredPathSegment,
      stageResolution.stage,
      startGuide
    ]
  );

  return (
    <ProjectOnboardingContext.Provider value={value}>{children}</ProjectOnboardingContext.Provider>
  );
}

function campaignScopeEqual(
  left: CampaignOnboardingScope | null,
  right: CampaignOnboardingScope
): boolean {
  return (
    left?.campaignId === right.campaignId &&
    left.promotionId === right.promotionId &&
    left.segmentId === right.segmentId
  );
}

export function useProjectOnboarding(): ProjectOnboardingContextValue {
  const context = useContext(ProjectOnboardingContext);
  if (context === null) {
    throw new Error("useProjectOnboarding must be used within ProjectOnboardingProvider.");
  }
  return context;
}
