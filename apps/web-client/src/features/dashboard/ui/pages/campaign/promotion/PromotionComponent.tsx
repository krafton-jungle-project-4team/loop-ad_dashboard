import type {
  DashboardCampaignPromotion,
  DashboardCampaignDetail,
  DashboardCampaignSegment,
  DashboardCreatePromotionSegmentDefinitionRequest,
  DashboardCreatePromotionRequest,
  DashboardEvaluatePromotionRunResult,
  DashboardMain,
  DashboardPromotionScopedSegmentDefinition,
  DashboardSegmentDetail,
  DashboardPromotionSegmentSuggestion,
  DashboardStartPromotionGenerationResult
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@loopad/ui/shadcn/dialog";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@loopad/ui/shadcn/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  confirmDashboardPromotionSegmentSuggestions,
  archiveDashboardPromotionScopedSegmentDefinition,
  approveDashboardContentCandidate,
  buildDashboardPromotionRunAssignments,
  createDashboardNextLoop,
  createDashboardPromotion,
  createDashboardPromotionRun,
  createDashboardPromotionScopedSegmentDefinition,
  deleteDashboardPromotionSegment,
  deleteDashboardPromotion,
  decideDashboardPromotionSegmentSuggestion,
  dispatchDashboardPromotionRun,
  evaluateDashboardPromotionRun,
  fetchDashboardCampaignDetail,
  fetchDashboardPromotionDetail,
  fetchDashboardSegmentDetail,
  fetchDashboardPromotionScopedSegmentDefinitions,
  fetchDashboardPromotionSegmentSuggestions,
  rejectDashboardContentCandidate,
  startDashboardAdExperiment,
  startDashboardPromotionAnalysis,
  startDashboardPromotionGeneration
} from "../../../../api/dashboard-api.js";
import { formatInteger } from "../../../../model/dashboard-format.js";
import {
  formatActionLabel,
  formatBasisLabel,
  formatChannelLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../../../../model/dashboard-labels.js";
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
import { EmptyState } from "../../../shared/EmptyState.js";

import { PromotionAddDialog } from "./components/PromotionDialogs.js";
import { PromotionChromeTabs, PromotionEmptyState, PromotionTabWorkspace } from "./components/PromotionWorkspaceContent.js";
import {
  defaultPromotionAnalysisProgress,
  hasPendingOnsiteBannerImage,
  latestSegmentPerSegmentId,
  mutationErrorMessage,
  onsiteBannerImagePollIntervalMs,
  promotionAnalysisProgressCacheTimeMs,
  promotionCreateFormToRequest,
  promotionSegmentCreateFormToRequest,
  uniquePromotionsById,
  type PromotionAnalysisProgress,
  type PromotionCreateFormState,
  type PromotionWorkspaceMode,
  type PromotionSegmentCreateFormState,
  type PromotionWorkspaceTab
} from "./promotionUtils.js";

const promotionWorkspaceTabsByMode: Record<PromotionWorkspaceMode, PromotionWorkspaceTab[]> = {
  promotion: ["overview"],
  promotionMetrics: ["overview"],
  segment: ["segments", "segment-detail"]
};

const defaultPromotionWorkspaceTabByMode: Record<PromotionWorkspaceMode, PromotionWorkspaceTab> = {
  promotion: "overview",
  promotionMetrics: "overview",
  segment: "segments"
};

export function PromotionWorkspace({
  data,
  mode = "promotion",
  query
}: {
  data: DashboardMain;
  mode?: PromotionWorkspaceMode;
  query: DashboardQuery;
}) {
  const queryClient = useQueryClient();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const visibleTabs = promotionWorkspaceTabsByMode[mode];
  const [workspaceTab, setWorkspaceTab] = useState<PromotionWorkspaceTab>(
    defaultPromotionWorkspaceTabByMode[mode]
  );
  const selectedCampaign =
    data.campaigns.find((campaign) => campaign.campaign_id === query.selectedCampaignId) ??
    data.campaigns[0];
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const selectedPromotionId = query.selectedPromotionId;
  const campaignDetail = useQuery({
    enabled: Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });
  const createPromotionMutation = useMutation({
    mutationFn: (form: PromotionCreateFormState) =>
      createDashboardPromotion(query, selectedCampaignId, promotionCreateFormToRequest(form)),
    onSuccess: (promotion) => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      void setDashboardQueryState({
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
      const deletedIndex = openPromotions.findIndex(
        (promotion) => promotion.promotion_id === result.promotion_id
      );
      const remainingPromotions = openPromotions.filter(
        (promotion) => promotion.promotion_id !== result.promotion_id
      );
      const nextSelectedPromotion =
        selectedPromotionId === result.promotion_id
          ? (remainingPromotions[deletedIndex] ?? remainingPromotions[deletedIndex - 1])
          : undefined;

      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      if (selectedPromotionId === result.promotion_id) {
        await setDashboardQueryState({
          selectedCampaignId,
          selectedPromotionId: nextSelectedPromotion?.promotion_id ?? "",
          selectedSegmentId: ""
        });
      }
    }
  });

  useEffect(() => {
    if (selectedCampaign && query.selectedCampaignId !== selectedCampaign.campaign_id) {
      void setDashboardQueryState({
        selectedCampaignId: selectedCampaign.campaign_id,
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
    }
  }, [query.selectedCampaignId, selectedCampaign, setDashboardQueryState]);

  useEffect(() => {
    if (!visibleTabs.includes(workspaceTab)) {
      setWorkspaceTab(defaultPromotionWorkspaceTabByMode[mode]);
    }
  }, [mode, visibleTabs, workspaceTab]);

  useEffect(() => {
    if (!campaignDetail.data || !selectedPromotionId) {
      return;
    }

    const hasSelectedPromotion = campaignDetail.data.promotions.some(
      (promotion) => promotion.promotion_id === selectedPromotionId
    );
    if (!hasSelectedPromotion) {
      void setDashboardQueryState({ selectedPromotionId: "", selectedSegmentId: "" });
    }
  }, [campaignDetail.data, selectedPromotionId, setDashboardQueryState]);

  useEffect(() => {
    if (
      !campaignDetail.data ||
      selectedPromotionId ||
      campaignDetail.data.promotions.length === 0
    ) {
      return;
    }

    const firstPromotion = campaignDetail.data.promotions[0];
    if (!firstPromotion) {
      return;
    }

    void setDashboardQueryState({
      selectedCampaignId,
      selectedPromotionId: firstPromotion.promotion_id,
      selectedSegmentId: ""
    });
  }, [campaignDetail.data, selectedCampaignId, selectedPromotionId, setDashboardQueryState]);

  const openPromotions = uniquePromotionsById(campaignDetail.data?.promotions ?? []);
  const selectedOpenPromotion =
    openPromotions.find((promotion) => promotion.promotion_id === selectedPromotionId) ??
    openPromotions[0];
  const selectedPromotionSegments =
    campaignDetail.data?.segments.filter(
      (segment) => segment.promotion_id === selectedOpenPromotion?.promotion_id
    ) ?? [];
  const selectedPromotionSegmentId = selectedPromotionSegments.some(
    (segment) => segment.segment_id === query.selectedSegmentId
  )
    ? query.selectedSegmentId
    : "";
  const promotionDetail = useQuery({
    enabled: Boolean(selectedOpenPromotion?.promotion_id),
    queryFn: ({ signal }) =>
      fetchDashboardPromotionDetail(query, selectedOpenPromotion?.promotion_id ?? "", signal),
    queryKey: dashboardPromotionDetailQueryKey(
      query.projectId,
      selectedOpenPromotion?.promotion_id ?? ""
    )
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
      void setDashboardQueryState({ selectedSegmentId: "" });
    }
  }, [query.selectedSegmentId, selectedPromotionSegmentId, setDashboardQueryState]);
  useEffect(() => {
    if (
      selectedOpenPromotion?.promotion_id &&
      !query.selectedSegmentId &&
      selectedPromotionSegments.length > 0
    ) {
      void setDashboardQueryState({
        selectedSegmentId: latestSegmentPerSegmentId(selectedPromotionSegments)[0]?.segment_id ?? ""
      });
    }
  }, [
    query.selectedSegmentId,
    selectedOpenPromotion?.promotion_id,
    selectedPromotionSegments,
    setDashboardQueryState
  ]);
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
    )
  });
  const isPollingOnsiteBannerImage = Boolean(
    selectedOpenPromotion?.channel === "onsite_banner" &&
    hasPendingOnsiteBannerImage(segmentDetail.data)
  );
  useEffect(() => {
    if (!isPollingOnsiteBannerImage) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void segmentDetail.refetch();
    }, onsiteBannerImagePollIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [isPollingOnsiteBannerImage, segmentDetail.refetch]);
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
    )
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
  const startAnalysisMutation = useMutation({
    mutationFn: (promotionId: string) =>
      startDashboardPromotionAnalysis(query, promotionId, {
        operator_instruction: null
      })
  });
  const startPromotionAnalysis = () => {
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

    void startAnalysisMutation
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
  const startAdExperimentMutation = useMutation({
    mutationFn: ({
      adExperimentId,
      promotionId
    }: {
      adExperimentId: string;
      promotionId: string;
    }) => startDashboardAdExperiment(query, promotionId, adExperimentId),
    onSuccess: async (experiment) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardSegmentDetailQueryKey(
          query.projectId,
          experiment.promotion_id,
          experiment.segment_id
        )
      });
    }
  });
  const createPromotionRunMutation = useMutation({
    mutationFn: ({
      analysisId,
      generationId,
      promotionId
    }: {
      analysisId: string;
      generationId: string;
      promotionId: string;
    }) =>
      createDashboardPromotionRun(query, promotionId, {
        analysis_id: analysisId,
        generation_id: generationId,
        loop_count: 1
      }),
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardSegmentDetailQueryKey(
          query.projectId,
          run.promotion_id,
          selectedPromotionSegmentId
        )
      });
    }
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
  const dispatchPromotionRunMutation = useMutation({
    mutationFn: (promotionRunId: string) => dispatchDashboardPromotionRun(promotionRunId),
    onSuccess: async () => {
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
  });
  const buildPromotionRunAssignmentsMutation = useMutation({
    mutationFn: (promotionRunId: string) =>
      buildDashboardPromotionRunAssignments(query, promotionRunId),
    onSuccess: async () => {
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
  });
  const evaluatePromotionRunMutation = useMutation({
    mutationFn: (promotionRunId: string) => evaluateDashboardPromotionRun(query, promotionRunId),
    onSuccess: async () => {
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
  });
  const createNextLoopMutation = useMutation({
    mutationFn: ({
      failedAdExperimentIds,
      failedSegmentIds,
      promotionRunId
    }: {
      failedAdExperimentIds: string[];
      failedSegmentIds: string[];
      promotionRunId: string;
    }) =>
      createDashboardNextLoop(query, promotionRunId, {
        failed_ad_experiment_ids: failedAdExperimentIds,
        failed_segment_ids: failedSegmentIds,
        operator_instruction: null
      }),
    onSuccess: async () => {
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
  });
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
    mutationFn: () =>
      confirmDashboardPromotionSegmentSuggestions(
        query,
        selectedOpenPromotion?.promotion_id ?? "",
        {}
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
        await setDashboardQueryState({ selectedSegmentId: "" });
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
      selectedCampaignId,
      selectedPromotionId: promotionId,
      selectedSegmentId: segmentId
    });
  };

  const selectSegment = (promotionId: string, segmentId: string) => {
    setWorkspaceTab("segment-detail");
    void setDashboardQueryState({
      selectedCampaignId,
      selectedPromotionId: promotionId,
      selectedSegmentId: segmentId
    });
  };

  const closePromotion = (promotionId: string) => {
    deletePromotionMutation.mutate(promotionId);
  };
  const promotionAnalysisError =
    startAnalysisMutation.error ??
    (analysisProgress.data.status === "error"
      ? new Error(analysisProgress.data.errorMessage ?? "AI 추천 요청에 실패했습니다")
      : null);
  const promotionAnalysisIsError =
    startAnalysisMutation.isError || analysisProgress.data.status === "error";
  const promotionAnalysisIsPending =
    startAnalysisMutation.isPending || analysisProgress.data.status === "pending";

  return (
    <section className="overflow-hidden rounded-[18px] bg-white shadow-none ring-1 ring-black/10">
      {mode === "promotion" ? (
        <PromotionChromeTabs
          onAdd={() => setIsAddDialogOpen(true)}
          onClosePromotion={closePromotion}
          onSelectPromotion={(promotionId) => selectPromotion(promotionId)}
          openPromotions={openPromotions}
          selectedPromotionId={selectedOpenPromotion?.promotion_id ?? ""}
        />
      ) : null}
      <div className="grid gap-6 px-6 py-6">
        {campaignDetail.isError ? (
          <Alert variant="destructive">
            <AlertTitle>프로모션 데이터를 불러오지 못했습니다</AlertTitle>
            <AlertDescription>
              {campaignDetail.error?.message ?? "API 요청에 실패했습니다."}
            </AlertDescription>
          </Alert>
        ) : null}
        {deletePromotionMutation.isError ? (
          <Alert variant="destructive">
            <AlertTitle>프로모션을 삭제하지 못했습니다</AlertTitle>
            <AlertDescription>
              {mutationErrorMessage(deletePromotionMutation.error)}
            </AlertDescription>
          </Alert>
        ) : null}
        {!selectedCampaign ? (
          <EmptyState message="프로모션을 관리할 캠페인을 선택해주세요." />
        ) : null}
        {selectedCampaign && campaignDetail.isLoading ? (
          <EmptyState message="프로모션 데이터를 불러오는 중입니다." />
        ) : null}
        {campaignDetail.data ? (
          <>
            {openPromotions.length === 0 ? (
              mode === "promotion" ? (
                <PromotionEmptyState onAdd={() => setIsAddDialogOpen(true)} />
              ) : (
                <EmptyState
                  message={
                    mode === "promotionMetrics"
                      ? "통계를 확인할 프로모션을 먼저 선택해주세요."
                      : "세그먼트를 관리할 프로모션을 먼저 선택해주세요."
                  }
                />
              )
            ) : null}
            {selectedOpenPromotion ? (
              <PromotionTabWorkspace
                approveContentCandidateError={approveContentCandidateMutation.error}
                approveContentCandidateIsError={approveContentCandidateMutation.isError}
                approveContentCandidateIsPending={approveContentCandidateMutation.isPending}
                confirmError={confirmSuggestionsMutation.error}
                confirmIsError={confirmSuggestionsMutation.isError}
                confirmIsPending={confirmSuggestionsMutation.isPending}
                decideError={decideSuggestionMutation.error}
                decideIsError={decideSuggestionMutation.isError}
                decideIsPending={decideSuggestionMutation.isPending}
                deleteConfirmedSegmentError={deleteConfirmedSegmentMutation.error}
                deleteConfirmedSegmentIsError={deleteConfirmedSegmentMutation.isError}
                deleteConfirmedSegmentIsPending={deleteConfirmedSegmentMutation.isPending}
                dispatchPromotionRunError={dispatchPromotionRunMutation.error}
                dispatchPromotionRunIsError={dispatchPromotionRunMutation.isError}
                dispatchPromotionRunIsPending={dispatchPromotionRunMutation.isPending}
                createPromotionRunError={createPromotionRunMutation.error}
                createPromotionRunIsError={createPromotionRunMutation.isError}
                createPromotionRunIsPending={createPromotionRunMutation.isPending}
                buildAssignmentsError={buildPromotionRunAssignmentsMutation.error}
                buildAssignmentsIsError={buildPromotionRunAssignmentsMutation.isError}
                buildAssignmentsIsPending={buildPromotionRunAssignmentsMutation.isPending}
                evaluatePromotionRunError={evaluatePromotionRunMutation.error}
                evaluatePromotionRunIsError={evaluatePromotionRunMutation.isError}
                evaluatePromotionRunIsPending={evaluatePromotionRunMutation.isPending}
                evaluatePromotionRunResult={evaluatePromotionRunMutation.data ?? null}
                createNextLoopError={createNextLoopMutation.error}
                createNextLoopIsError={createNextLoopMutation.isError}
                createNextLoopIsPending={createNextLoopMutation.isPending}
                archiveScopedSegmentError={archiveScopedSegmentMutation.error}
                archiveScopedSegmentIsError={archiveScopedSegmentMutation.isError}
                archiveScopedSegmentIsPending={archiveScopedSegmentMutation.isPending}
                onArchiveScopedSegment={(segmentId) => {
                  if (!selectedOpenPromotion) {
                    return;
                  }
                  archiveScopedSegmentMutation.mutate({
                    promotionId: selectedOpenPromotion.promotion_id,
                    segmentId
                  });
                }}
                onConfirmSuggestions={() => confirmSuggestionsMutation.mutate()}
                onCreateScopedSegment={(form) => createScopedSegmentMutation.mutate(form)}
                onDecideSuggestion={(suggestionId, status) =>
                  decideSuggestionMutation.mutate({ status, suggestionId })
                }
                onDeleteConfirmedSegment={(promotionId, segmentId) =>
                  deleteConfirmedSegmentMutation.mutate({ promotionId, segmentId })
                }
                onApproveContentCandidate={(promotionId, segmentId, contentId) =>
                  approveContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
                }
                onCreatePromotionRun={(promotionId, analysisId, generationId) =>
                  createPromotionRunMutation.mutate({ analysisId, generationId, promotionId })
                }
                onBuildAssignments={(promotionRunId) =>
                  buildPromotionRunAssignmentsMutation.mutate(promotionRunId)
                }
                onEvaluatePromotionRun={(promotionRunId) =>
                  evaluatePromotionRunMutation.mutate(promotionRunId)
                }
                onCreateNextLoop={(promotionRunId, failedSegmentIds, failedAdExperimentIds) =>
                  createNextLoopMutation.mutate({
                    failedAdExperimentIds,
                    failedSegmentIds,
                    promotionRunId
                  })
                }
                onDispatchPromotionRun={(promotionRunId) =>
                  dispatchPromotionRunMutation.mutate(promotionRunId)
                }
                onRejectContentCandidate={(promotionId, segmentId, contentId) =>
                  rejectContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
                }
                onStartAnalysis={startPromotionAnalysis}
                onStartGeneration={(analysisId) => {
                  if (!selectedOpenPromotion) {
                    return;
                  }
                  startGenerationMutation.mutate({
                    analysisId,
                    promotionId: selectedOpenPromotion.promotion_id
                  });
                }}
                onStartAdExperiment={(promotionId, adExperimentId) =>
                  startAdExperimentMutation.mutate({ adExperimentId, promotionId })
                }
                onSelectSegment={selectSegment}
                onTabChange={setWorkspaceTab}
                promotion={selectedOpenPromotion}
                promotionAnalysisError={promotionAnalysisError}
                promotionAnalysisIsError={promotionAnalysisIsError}
                promotionAnalysisIsPending={promotionAnalysisIsPending}
                promotionGeneration={startGenerationMutation.data ?? null}
                promotionGenerationError={startGenerationMutation.error}
                promotionGenerationIsError={startGenerationMutation.isError}
                promotionGenerationIsPending={startGenerationMutation.isPending}
                rejectContentCandidateError={rejectContentCandidateMutation.error}
                rejectContentCandidateIsError={rejectContentCandidateMutation.isError}
                rejectContentCandidateIsPending={rejectContentCandidateMutation.isPending}
                startAdExperimentError={startAdExperimentMutation.error}
                startAdExperimentIsError={startAdExperimentMutation.isError}
                startAdExperimentIsPending={startAdExperimentMutation.isPending}
                segments={selectedPromotionSegments}
                scopedSegments={scopedSegmentDefinitions.data?.segments ?? []}
                scopedSegmentsError={scopedSegmentDefinitions.error}
                scopedSegmentsIsError={scopedSegmentDefinitions.isError}
                scopedSegmentsIsLoading={scopedSegmentDefinitions.isLoading}
                scopedSegmentCreateError={createScopedSegmentMutation.error}
                scopedSegmentCreateIsError={createScopedSegmentMutation.isError}
                scopedSegmentCreateIsPending={createScopedSegmentMutation.isPending}
                selectedSegmentDetail={segmentDetail.data}
                selectedSegmentDetailError={segmentDetail.error}
                selectedSegmentDetailIsError={segmentDetail.isError}
                selectedSegmentDetailIsLoading={segmentDetail.isLoading}
                selectedSegmentId={selectedPromotionSegmentId}
                suggestions={segmentSuggestions.data?.suggestions ?? []}
                suggestionsError={segmentSuggestions.error}
                suggestionsIsError={segmentSuggestions.isError}
                suggestionsIsLoading={segmentSuggestions.isLoading}
                tab={workspaceTab}
                visibleTabs={visibleTabs}
              />
            ) : null}
            {mode === "promotion" ? (
              <PromotionAddDialog
                createError={createPromotionMutation.error}
                createIsError={createPromotionMutation.isError}
                createIsPending={createPromotionMutation.isPending}
                onCreate={(form) => createPromotionMutation.mutate(form)}
                onOpenChange={setIsAddDialogOpen}
                open={isAddDialogOpen}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
