import type {
  DashboardApproveContentCandidateResult,
  DashboardCampaignDetail,
  DashboardMain,
  DashboardPromotionSegmentSuggestionList,
  DashboardUnapproveContentCandidateResult
} from "@loopad/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  archiveDashboardPromotionScopedSegmentDefinition,
  approveDashboardContentCandidate,
  buildDashboardPromotionRunAssignments,
  confirmDashboardPromotionSegmentSuggestions,
  createDashboardPromotion,
  createDashboardPromotionRun,
  decideDashboardPromotionSegmentSuggestion,
  deleteDashboardPromotion,
  deleteDashboardPromotionSegment,
  dispatchDashboardPromotionRun,
  fetchDashboardCampaignDetail,
  fetchDashboardPromotionDetail,
  fetchDashboardPromotionScopedSegmentDefinitions,
  fetchDashboardPromotionSegmentSuggestions,
  fetchDashboardSegmentDetail,
  rejectDashboardContentCandidate,
  recommendDashboardPromotionSegments,
  reviseDashboardContentCandidateHtml,
  startDashboardAdExperiment,
  startDashboardPromotionGeneration,
  unapproveDashboardContentCandidate,
  updateDashboardContentCandidateCopy,
  updateDashboardPromotion
} from "../../../../api/dashboard-api.js";
import { useDashboardQueryState } from "../../../../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardPromotionAnalysisProgressQueryKey,
  dashboardPromotionDetailQueryKey,
  dashboardPromotionScopedSegmentDefinitionsQueryKey,
  dashboardPromotionSegmentSuggestionsQueryKey,
  dashboardSegmentDetailQueryKey
} from "../../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../../model/dashboard-types.js";
import {
  defaultPromotionAnalysisProgress,
  hasPendingOnsiteBannerImage,
  mutationErrorMessage,
  onsiteBannerImagePollIntervalMs,
  promotionAnalysisProgressCacheTimeMs,
  promotionCreateFormToRequest,
  uniquePromotionsById,
  type PromotionAnalysisProgress,
  type PromotionCreateFormState,
  type PromotionWorkspaceMode,
  type PromotionWorkspaceTab
} from "./promotionUtils.js";
import { launchPromotionExperiment } from "./promotionExperimentFlow.js";
import { promotionSegmentConfirmationRequest } from "./promotionSegmentConfirmationFlow.js";

const promotionWorkspaceTabsByMode: Record<PromotionWorkspaceMode, PromotionWorkspaceTab[]> = {
  promotion: ["overview"],
  segment: ["segments", "segment-detail"]
};

const defaultPromotionWorkspaceTabByMode: Record<PromotionWorkspaceMode, PromotionWorkspaceTab> = {
  promotion: "overview",
  segment: "segments"
};

export function usePromotionWorkspaceController({
  data,
  mode,
  query
}: {
  data: DashboardMain;
  mode: PromotionWorkspaceMode;
  query: DashboardQuery;
}) {
  const queryClient = useQueryClient();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const requestedSegmentTab: PromotionWorkspaceTab =
    query.segmentView === "manage" || query.segmentView === "recommendations"
      ? "segments"
      : "segment-detail";
  const visibleTabs =
    mode === "segment" ? [requestedSegmentTab] : promotionWorkspaceTabsByMode[mode];
  const [workspaceTab, setWorkspaceTab] = useState<PromotionWorkspaceTab>(
    mode === "segment" ? requestedSegmentTab : defaultPromotionWorkspaceTabByMode[mode]
  );
  const selectedCampaign = data.campaigns.find(
    (campaign) => campaign.campaign_id === query.selectedCampaignId
  );
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const selectedPromotionId = query.selectedPromotionId;
  const campaignDetail = useQuery({
    enabled: Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });
  const openPromotions = uniquePromotionsById(campaignDetail.data?.promotions ?? []);
  const selectedOpenPromotion = openPromotions.find(
    (promotion) => promotion.promotion_id === selectedPromotionId
  );
  const selectedPromotionSegments =
    campaignDetail.data?.segments.filter(
      (segment) => segment.promotion_id === selectedOpenPromotion?.promotion_id
    ) ?? [];
  const selectedPromotionSegmentId = selectedPromotionSegments.some(
    (segment) => segment.segment_id === query.selectedSegmentId
  )
    ? query.selectedSegmentId
    : "";

  const createPromotionMutation = useMutation({
    mutationFn: (form: PromotionCreateFormState) =>
      createDashboardPromotion(query, selectedCampaignId, promotionCreateFormToRequest(form)),
    onSuccess: (promotion) => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      void setDashboardQueryState({
        promotionView: "manage",
        segmentView: "manage",
        selectedAdExperimentId: "",
        selectedCampaignId,
        selectedPromotionId: promotion.promotion_id,
        selectedSegmentId: ""
      });
      setIsAddDialogOpen(false);
    }
  });
  const deletePromotionMutation = useMutation({
    mutationFn: (promotionId: string) => deleteDashboardPromotion(query, promotionId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      if (selectedPromotionId === result.promotion_id) {
        await setDashboardQueryState({
          promotionView: "manage",
          selectedAdExperimentId: "",
          selectedCampaignId,
          selectedPromotionId: "",
          selectedSegmentId: ""
        });
      }
    }
  });
  const updatePromotionMutation = useMutation({
    mutationFn: ({
      promotionId,
      requestBody
    }: {
      promotionId: string;
      requestBody: Parameters<typeof updateDashboardPromotion>[2];
    }) => updateDashboardPromotion(query, promotionId, requestBody),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      setEditingPromotionId(null);
    }
  });

  useEffect(() => {
    if (
      !query.createPromotion ||
      mode !== "promotion" ||
      query.promotionView !== "manage" ||
      !selectedCampaign
    ) {
      return;
    }

    createPromotionMutation.reset();
    setIsAddDialogOpen(true);
    void setDashboardQueryState(
      { createPromotion: false },
      {
        history: "replace"
      }
    );
  }, [
    createPromotionMutation,
    mode,
    query.createPromotion,
    query.promotionView,
    selectedCampaign,
    setDashboardQueryState
  ]);

  useEffect(() => {
    if (query.selectedCampaignId && !selectedCampaign) {
      void setDashboardQueryState(
        {
          selectedAdExperimentId: "",
          selectedCampaignId: "",
          selectedPromotionId: "",
          selectedSegmentId: ""
        },
        { history: "replace" }
      );
    }
  }, [query.selectedCampaignId, selectedCampaign, setDashboardQueryState]);

  useEffect(() => {
    const nextWorkspaceTab =
      mode === "segment" ? requestedSegmentTab : defaultPromotionWorkspaceTabByMode[mode];
    if (!visibleTabs.includes(workspaceTab) || workspaceTab !== nextWorkspaceTab) {
      setWorkspaceTab(nextWorkspaceTab);
    }
  }, [mode, requestedSegmentTab, visibleTabs, workspaceTab]);

  useEffect(() => {
    if (!campaignDetail.data || !selectedPromotionId) {
      return;
    }

    const hasSelectedPromotion = campaignDetail.data.promotions.some(
      (promotion) => promotion.promotion_id === selectedPromotionId
    );
    if (!hasSelectedPromotion) {
      void setDashboardQueryState(
        { selectedAdExperimentId: "", selectedPromotionId: "", selectedSegmentId: "" },
        { history: "replace" }
      );
    }
  }, [campaignDetail.data, selectedPromotionId, setDashboardQueryState]);

  const promotionDetail = useQuery({
    enabled: Boolean(selectedOpenPromotion?.promotion_id),
    queryFn: ({ signal }) =>
      fetchDashboardPromotionDetail(query, selectedOpenPromotion?.promotion_id ?? "", signal),
    queryKey: dashboardPromotionDetailQueryKey(
      query.projectId,
      selectedOpenPromotion?.promotion_id ?? ""
    ),
    refetchInterval: (detailQuery) =>
      shouldPollAsyncStatus(detailQuery.state.data?.analyses[0]?.status) ? 2500 : false
  });
  const selectedOpenPromotionId = selectedOpenPromotion?.promotion_id ?? "";
  const analysisProgressKey = dashboardPromotionAnalysisProgressQueryKey(
    query.projectId,
    selectedOpenPromotionId
  );
  const analysisProgress = useQuery({
    enabled: Boolean(selectedOpenPromotionId),
    gcTime: promotionAnalysisProgressCacheTimeMs,
    initialData: defaultPromotionAnalysisProgress,
    queryFn: () => defaultPromotionAnalysisProgress,
    queryKey: analysisProgressKey,
    staleTime: Infinity
  });
  const activeAnalysisId = analysisProgress.data.analysisId;

  useEffect(() => {
    if (query.selectedSegmentId && !selectedPromotionSegmentId) {
      void setDashboardQueryState(
        { selectedAdExperimentId: "", selectedSegmentId: "" },
        { history: "replace" }
      );
    }
  }, [query.selectedSegmentId, selectedPromotionSegmentId, setDashboardQueryState]);

  const segmentDetail = useQuery({
    enabled: Boolean(selectedOpenPromotion?.promotion_id && selectedPromotionSegmentId),
    queryFn: ({ signal }) =>
      fetchDashboardSegmentDetail(
        query,
        selectedOpenPromotion?.promotion_id ?? "",
        selectedPromotionSegmentId,
        signal
      ),
    queryKey: dashboardSegmentDetailQueryKey(
      query.projectId,
      selectedOpenPromotion?.promotion_id ?? "",
      selectedPromotionSegmentId
    ),
    refetchInterval: (segmentDetailQuery) =>
      shouldPollAsyncStatus(segmentDetailQuery.state.data?.generation?.status) ||
      (selectedOpenPromotion?.channel === "onsite_banner" &&
        hasPendingOnsiteBannerImage(segmentDetailQuery.state.data))
        ? onsiteBannerImagePollIntervalMs
        : false,
    refetchIntervalInBackground: false
  });
  const generationIsPending = shouldPollAsyncStatus(segmentDetail.data?.generation?.status);
  const segmentSuggestions = useQuery({
    enabled: Boolean(selectedOpenPromotionId && promotionDetail.isSuccess),
    queryFn: ({ signal }) =>
      fetchDashboardPromotionSegmentSuggestions(
        query,
        selectedOpenPromotion?.promotion_id ?? "",
        signal,
        activeAnalysisId
      ),
    queryKey: dashboardPromotionSegmentSuggestionsQueryKey(
      query.projectId,
      selectedOpenPromotion?.promotion_id ?? "",
      activeAnalysisId
    ),
    refetchInterval: (suggestionQuery) =>
      (suggestionQuery.state.data?.suggestions.length ?? 0) === 0 &&
      shouldPollAsyncStatus(promotionDetail.data?.analyses[0]?.status)
        ? 2500
        : false
  });
  const scopedSegmentDefinitions = useQuery({
    enabled: Boolean(selectedOpenPromotion?.promotion_id),
    queryFn: ({ signal }) =>
      fetchDashboardPromotionScopedSegmentDefinitions(
        query,
        selectedOpenPromotion?.promotion_id ?? "",
        signal
      ),
    queryKey: dashboardPromotionScopedSegmentDefinitionsQueryKey(
      query.projectId,
      selectedOpenPromotion?.promotion_id ?? ""
    )
  });
  const recommendSegmentsMutation = useMutation({
    mutationFn: (promotionId: string) =>
      recommendDashboardPromotionSegments(query, promotionId, { operator_instruction: null })
  });

  const recommendPromotionSegments = () => {
    if (!selectedOpenPromotionId) {
      return;
    }

    const promotionId = selectedOpenPromotionId;
    const progressKey = dashboardPromotionAnalysisProgressQueryKey(query.projectId, promotionId);
    const startedAt = Date.now();
    queryClient.setQueryData<PromotionAnalysisProgress>(progressKey, {
      analysisId: null,
      errorMessage: null,
      startedAt,
      status: "pending"
    });

    void recommendSegmentsMutation
      .mutateAsync(promotionId)
      .then(async (analysis) => {
        queryClient.setQueryData<PromotionAnalysisProgress>(progressKey, {
          analysisId: analysis.analysis_id,
          errorMessage: null,
          startedAt,
          status: "success"
        });
        await queryClient.invalidateQueries({
          queryKey: dashboardPromotionDetailQueryKey(query.projectId, promotionId)
        });
        await queryClient.invalidateQueries({
          queryKey: dashboardPromotionSegmentSuggestionsQueryKey(
            query.projectId,
            promotionId,
            analysis.analysis_id
          )
        });
      })
      .catch((error: unknown) => {
        queryClient.setQueryData<PromotionAnalysisProgress>(progressKey, {
          analysisId: null,
          errorMessage: mutationErrorMessage(error),
          startedAt,
          status: "error"
        });
      });
  };
  const startGenerationMutation = useMutation({
    mutationFn: ({
      analysisId,
      promotionId,
      segmentId
    }: {
      analysisId: string;
      promotionId: string;
      segmentId: string;
    }) =>
      startDashboardPromotionGeneration(query, promotionId, {
        analysis_id: analysisId,
        segment_id: segmentId,
        content_option_count: 3,
        operator_instruction: null
      }),
    onSuccess: async (_generation, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardPromotionDetailQueryKey(query.projectId, variables.promotionId)
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardSegmentDetailQueryKey(
          query.projectId,
          variables.promotionId,
          variables.segmentId
        )
      });
    }
  });
  const approveContentCandidateMutation = useMutation<
    DashboardApproveContentCandidateResult | DashboardUnapproveContentCandidateResult,
    Error,
    {
      contentId: string;
      promotionId: string;
      selected: boolean;
      segmentId: string;
    }
  >({
    mutationFn: ({ contentId, promotionId, selected, segmentId }) =>
      selected
        ? approveDashboardContentCandidate(query, promotionId, segmentId, contentId, {})
        : unapproveDashboardContentCandidate(query, promotionId, segmentId, contentId, {}),
    onSuccess: async (candidate) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardSegmentDetailQueryKey(
          query.projectId,
          candidate.promotion_id,
          candidate.segment_id
        )
      });
    }
  });
  const updateContentCandidateCopyMutation = useMutation({
    mutationFn: ({
      contentId,
      promotionId,
      requestBody,
      segmentId
    }: {
      contentId: string;
      promotionId: string;
      requestBody: Parameters<typeof updateDashboardContentCandidateCopy>[4];
      segmentId: string;
    }) =>
      updateDashboardContentCandidateCopy(query, promotionId, segmentId, contentId, requestBody),
    onSuccess: async (candidate) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardSegmentDetailQueryKey(
          query.projectId,
          candidate.promotion_id,
          candidate.segment_id
        )
      });
    }
  });
  const reviseContentCandidateHtmlMutation = useMutation({
    mutationFn: ({
      contentId,
      feedback,
      promotionId,
      segmentId
    }: {
      contentId: string;
      feedback: string;
      promotionId: string;
      segmentId: string;
    }) =>
      reviseDashboardContentCandidateHtml(query, promotionId, segmentId, contentId, {
        feedback
      }),
    onSuccess: async (candidate) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardSegmentDetailQueryKey(
          query.projectId,
          candidate.promotion_id,
          candidate.segment_id
        )
      });
    }
  });
  const launchPromotionExperimentMutation = useMutation({
    mutationFn: ({
      analysisId,
      generationId,
      loopCount,
      nextLoopPreparationId,
      promotionId,
      segmentId
    }: {
      analysisId?: string;
      generationId?: string;
      loopCount?: number;
      nextLoopPreparationId?: string;
      promotionId: string;
      segmentId: string;
    }) =>
      launchPromotionExperiment(
        { segmentIds: [segmentId] },
        {
          buildAssignments: (promotionRunId) =>
            buildDashboardPromotionRunAssignments(query, promotionRunId),
          createRun: async () => {
            if (!analysisId || !generationId) {
              throw new Error("먼저 사용할 광고 소재를 선택해 주세요.");
            }
            const run = await createDashboardPromotionRun(query, promotionId, {
              analysis_id: analysisId,
              generation_id: generationId,
              segment_ids: [segmentId],
              loop_count: loopCount ?? 1,
              next_loop_preparation_id: nextLoopPreparationId
            });
            return {
              experiments: run.ad_experiments.map((experiment) => ({
                adExperimentId: experiment.ad_experiment_id,
                channel: experiment.channel,
                isFallback: experiment.is_fallback,
                segmentId: experiment.segment_id,
                status: experiment.status
              })),
              promotionRunId: run.promotion_run_id,
              segmentIds: run.segment_ids
            };
          },
          dispatch: dispatchDashboardPromotionRun,
          startExperiment: (adExperimentId) =>
            startDashboardAdExperiment(query, promotionId, adExperimentId)
        }
      ),
    onSettled: async () => invalidateSelectedSegment()
  });
  const rejectContentCandidateMutation = useMutation({
    mutationFn: ({
      contentId,
      promotionId,
      segmentId
    }: {
      contentId: string;
      promotionId: string;
      segmentId: string;
    }) => rejectDashboardContentCandidate(query, promotionId, segmentId, contentId, {}),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: dashboardSegmentDetailQueryKey(
          query.projectId,
          result.promotion_id,
          result.segment_id
        )
      });
    }
  });
  async function invalidateSelectedSegment() {
    await queryClient.invalidateQueries({
      exact: true,
      queryKey: dashboardSegmentDetailQueryKey(
        query.projectId,
        selectedOpenPromotion?.promotion_id ?? "",
        selectedPromotionSegmentId
      ),
      refetchType: "all"
    });
    await queryClient.invalidateQueries({
      queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
    });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const decideSuggestionMutation = useMutation({
    mutationFn: ({
      status,
      suggestionId
    }: {
      status: "suggested" | "accepted" | "dismissed";
      suggestionId: string;
    }) =>
      decideDashboardPromotionSegmentSuggestion(
        query,
        selectedOpenPromotion?.promotion_id ?? "",
        suggestionId,
        { status }
      ),
    onMutate: async ({ status, suggestionId }) => {
      const queryKey = dashboardPromotionSegmentSuggestionsQueryKey(
        query.projectId,
        selectedOpenPromotion?.promotion_id ?? "",
        activeAnalysisId
      );
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DashboardPromotionSegmentSuggestionList>(queryKey);
      queryClient.setQueryData<DashboardPromotionSegmentSuggestionList>(queryKey, (current) =>
        current
          ? {
              ...current,
              suggestions: current.suggestions.map((suggestion) =>
                suggestion.suggestion_id === suggestionId
                  ? { ...suggestion, suggestion_status: status }
                  : suggestion
              )
            }
          : current
      );
      return { previous, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardPromotionSegmentSuggestionsQueryKey(
          query.projectId,
          selectedOpenPromotion?.promotion_id ?? "",
          activeAnalysisId
        )
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardPromotionScopedSegmentDefinitionsQueryKey(
          query.projectId,
          selectedOpenPromotion?.promotion_id ?? ""
        )
      });
    }
  });
  const confirmSuggestionsMutation = useMutation({
    mutationFn: (manualSegmentIds: string[]) =>
      confirmDashboardPromotionSegmentSuggestions(
        query,
        selectedOpenPromotion?.promotion_id ?? "",
        promotionSegmentConfirmationRequest(
          segmentSuggestions.data?.suggestions ?? [],
          activeAnalysisId,
          manualSegmentIds
        )
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardPromotionSegmentSuggestionsQueryKey(
          query.projectId,
          selectedOpenPromotion?.promotion_id ?? "",
          activeAnalysisId
        )
      });
      await setDashboardQueryState({
        segmentView: "manage",
        selectedAdExperimentId: "",
        selectedSegmentId: ""
      });
    }
  });
  const deleteConfirmedSegmentMutation = useMutation({
    mutationFn: ({ promotionId, segmentId }: { promotionId: string; segmentId: string }) =>
      deleteDashboardPromotionSegment(query, promotionId, segmentId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      queryClient.setQueryData<DashboardCampaignDetail>(
        dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId),
        (current) =>
          current
            ? {
                ...current,
                segments: current.segments.filter(
                  (segment) =>
                    segment.promotion_id !== result.promotion_id ||
                    segment.segment_id !== result.segment_id
                )
              }
            : current
      );
      await queryClient.invalidateQueries({
        queryKey: dashboardSegmentDetailQueryKey(
          query.projectId,
          result.promotion_id,
          result.segment_id
        )
      });
      if (query.selectedSegmentId === result.segment_id) {
        await setDashboardQueryState({
          segmentView: "manage",
          selectedAdExperimentId: "",
          selectedSegmentId: ""
        });
      }
    }
  });
  const archiveScopedSegmentMutation = useMutation({
    mutationFn: ({ promotionId, segmentId }: { promotionId: string; segmentId: string }) =>
      archiveDashboardPromotionScopedSegmentDefinition(query, promotionId, segmentId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: dashboardPromotionScopedSegmentDefinitionsQueryKey(
          query.projectId,
          result.promotion_id
        )
      });
    }
  });

  const selectPromotion = (promotionId: string, segmentId = "") => {
    void setDashboardQueryState({
      promotionView: "performance",
      selectedAdExperimentId: "",
      selectedCampaignId,
      selectedPromotionId: promotionId,
      selectedSegmentId: segmentId
    });
  };
  const selectSegment = (promotionId: string, segmentId: string) => {
    setWorkspaceTab("segment-detail");
    void setDashboardQueryState({
      segmentView: "experiments",
      selectedAdExperimentId: "",
      selectedCampaignId,
      selectedPromotionId: promotionId,
      selectedSegmentId: segmentId
    });
  };
  return {
    activeAnalysisId,
    analysisProgress,
    approveContentCandidateMutation,
    archiveScopedSegmentMutation,
    campaignDetail,
    confirmSuggestionsMutation,
    createPromotionMutation,
    decideSuggestionMutation,
    deleteConfirmedSegmentMutation,
    deletePromotionMutation,
    editingPromotionId,
    isAddDialogOpen,
    launchPromotionExperimentMutation,
    openPromotions,
    promotionAnalysisIsPending:
      recommendSegmentsMutation.isPending || analysisProgress.data.status === "pending",
    promotionGenerationIsPending: startGenerationMutation.isPending || generationIsPending,
    rejectContentCandidateMutation,
    scopedSegmentDefinitions,
    segmentDetail,
    segmentSuggestions,
    selectPromotion,
    selectSegment,
    selectedCampaign,
    selectedOpenPromotion,
    selectedPromotionSegmentId,
    selectedPromotionSegments,
    setIsAddDialogOpen,
    setEditingPromotionId,
    setWorkspaceTab,
    startGenerationMutation,
    recommendPromotionSegments,
    reviseContentCandidateHtmlMutation,
    updatePromotionMutation,
    updateContentCandidateCopyMutation,
    visibleTabs,
    workspaceTab
  };
}

function shouldPollAsyncStatus(status: string | undefined) {
  return (
    status === "queued" ||
    status === "requested" ||
    status === "pending" ||
    status === "processing" ||
    status === "running"
  );
}
