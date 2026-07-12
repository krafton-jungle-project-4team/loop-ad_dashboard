import type { DashboardCampaignDetail, DashboardMain } from "@loopad/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  analyzeDashboardPromotionSegments,
  archiveDashboardPromotionScopedSegmentDefinition,
  approveDashboardContentCandidate,
  buildDashboardPromotionRunAssignments,
  confirmDashboardPromotionSegmentSuggestions,
  createDashboardPromotion,
  createDashboardPromotionRun,
  createDashboardPromotionScopedSegmentDefinition,
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
  startDashboardAdExperiment,
  startDashboardPromotionGeneration,
  updateDashboardPromotion,
  updateDashboardPromotionSegment
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
  promotionSegmentCreateFormToRequest,
  uniquePromotionsById,
  type PromotionAnalysisProgress,
  type PromotionCreateFormState,
  type PromotionSegmentCreateFormState,
  type PromotionWorkspaceMode,
  type PromotionWorkspaceTab
} from "./promotionUtils.js";
import { launchPromotionExperiment } from "./promotionExperimentFlow.js";
import { confirmAndAnalyzePromotionSegments } from "./promotionSegmentConfirmationFlow.js";

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
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
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
        promotionView: "overview",
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
      shouldPollAsyncStatus(detailQuery.state.data?.analyses[0]?.status) ||
      shouldPollAsyncStatus(detailQuery.state.data?.generation?.status)
        ? 2500
        : false
  });
  const latestAnalysisId = promotionDetail.data?.analyses[0]?.analysis_id ?? null;
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
  const activeAnalysisId = analysisProgress.data.analysisId ?? latestAnalysisId;

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
      shouldPollAsyncStatus(promotionDetail.data?.generation?.status) ||
      (selectedOpenPromotion?.channel === "onsite_banner" &&
        hasPendingOnsiteBannerImage(segmentDetailQuery.state.data))
        ? onsiteBannerImagePollIntervalMs
        : false,
    refetchIntervalInBackground: false
  });
  const segmentSuggestions = useQuery({
    enabled: Boolean(selectedOpenPromotion?.promotion_id),
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
      activeAnalysisId &&
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
  const createScopedSegmentMutation = useMutation({
    mutationFn: (form: PromotionSegmentCreateFormState) =>
      createDashboardPromotionScopedSegmentDefinition(
        query,
        selectedOpenPromotion?.promotion_id ?? "",
        promotionSegmentCreateFormToRequest(form)
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardPromotionScopedSegmentDefinitionsQueryKey(
          query.projectId,
          selectedOpenPromotion?.promotion_id ?? ""
        )
      });
    }
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
    mutationFn: ({ analysisId, promotionId }: { analysisId: string; promotionId: string }) =>
      startDashboardPromotionGeneration(query, promotionId, {
        analysis_id: analysisId,
        content_option_count: 3,
        operator_instruction: null
      }),
    onSuccess: async (_generation, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardSegmentDetailQueryKey(
          query.projectId,
          variables.promotionId,
          selectedPromotionSegmentId
        )
      });
    }
  });
  const approveContentCandidateMutation = useMutation({
    mutationFn: ({
      contentId,
      promotionId,
      segmentId
    }: {
      contentId: string;
      promotionId: string;
      segmentId: string;
    }) => approveDashboardContentCandidate(query, promotionId, segmentId, contentId, {}),
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
      promotionId
    }: {
      analysisId?: string;
      generationId?: string;
      promotionId: string;
    }) =>
      launchPromotionExperiment(
        {
          existingExperiments:
            campaignDetail.data?.ad_experiments.filter(
              (experiment) => experiment.promotion_id === promotionId
            ) ?? []
        },
        {
          buildAssignments: (promotionRunId) =>
            buildDashboardPromotionRunAssignments(query, promotionRunId),
          createRun: async () => {
            if (!analysisId || !generationId) {
              throw new Error("승인된 광고 콘텐츠가 필요합니다.");
            }
            const run = await createDashboardPromotionRun(query, promotionId, {
              analysis_id: analysisId,
              generation_id: generationId,
              loop_count: 1
            });
            return {
              experiments: run.ad_experiments.map((experiment) => ({
                adExperimentId: experiment.ad_experiment_id,
                channel: experiment.channel,
                status: experiment.status
              })),
              promotionRunId: run.promotion_run_id
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
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    await queryClient.invalidateQueries({
      queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
    });
    await queryClient.invalidateQueries({
      queryKey: dashboardSegmentDetailQueryKey(
        query.projectId,
        selectedOpenPromotion?.promotion_id ?? "",
        selectedPromotionSegmentId
      )
    });
  }

  const decideSuggestionMutation = useMutation({
    mutationFn: ({
      status,
      suggestionId
    }: {
      status: "accepted" | "dismissed";
      suggestionId: string;
    }) =>
      decideDashboardPromotionSegmentSuggestion(
        query,
        selectedOpenPromotion?.promotion_id ?? "",
        suggestionId,
        { status }
      ),
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
    mutationFn: () => {
      const promotionId = selectedOpenPromotion?.promotion_id ?? "";
      const segmentIds = [
        ...(segmentSuggestions.data?.suggestions
          .filter(
            (suggestion) =>
              suggestion.suggestion_status === "accepted" ||
              suggestion.suggestion_status === "confirmed"
          )
          .map((suggestion) => suggestion.segment_id) ?? []),
        ...(scopedSegmentDefinitions.data?.segments.map((segment) => segment.segment_id) ?? [])
      ];

      return confirmAndAnalyzePromotionSegments(segmentIds, {
        analyze: (confirmedSegmentIds) =>
          analyzeDashboardPromotionSegments(query, promotionId, {
            operator_instruction: null,
            segment_ids: confirmedSegmentIds
          }),
        confirm: () => confirmDashboardPromotionSegmentSuggestions(query, promotionId, {})
      });
    },
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
      const firstConfirmedSuggestion = segmentSuggestions.data?.suggestions.find(
        (suggestion) =>
          suggestion.suggestion_status === "accepted" ||
          suggestion.suggestion_status === "confirmed"
      );
      if (firstConfirmedSuggestion) {
        await setDashboardQueryState({
          segmentView: "experiments",
          selectedAdExperimentId: "",
          selectedSegmentId: firstConfirmedSuggestion.segment_id
        });
      }
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
  const updateConfirmedSegmentMutation = useMutation({
    mutationFn: ({
      promotionId,
      requestBody,
      segmentId
    }: {
      promotionId: string;
      requestBody: Parameters<typeof updateDashboardPromotionSegment>[3];
      segmentId: string;
    }) => updateDashboardPromotionSegment(query, promotionId, segmentId, requestBody),
    onSuccess: async (segment) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardSegmentDetailQueryKey(
          query.projectId,
          segment.promotion_id,
          segment.segment_id
        )
      });
      setEditingSegmentId(null);
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
      promotionView: "overview",
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
  const openSegmentCreation = () => {
    setWorkspaceTab("segments");
    void setDashboardQueryState({
      segmentView: "recommendations",
      selectedAdExperimentId: "",
      selectedSegmentId: ""
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
    createScopedSegmentMutation,
    decideSuggestionMutation,
    deleteConfirmedSegmentMutation,
    deletePromotionMutation,
    editingPromotionId,
    editingSegmentId,
    isAddDialogOpen,
    launchPromotionExperimentMutation,
    openSegmentCreation,
    openPromotions,
    promotionAnalysisIsPending:
      recommendSegmentsMutation.isPending || analysisProgress.data.status === "pending",
    promotionGenerationIsPending:
      startGenerationMutation.isPending ||
      shouldPollAsyncStatus(promotionDetail.data?.generation?.status),
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
    setEditingSegmentId,
    setWorkspaceTab,
    startGenerationMutation,
    recommendPromotionSegments,
    updatePromotionMutation,
    updateConfirmedSegmentMutation,
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
