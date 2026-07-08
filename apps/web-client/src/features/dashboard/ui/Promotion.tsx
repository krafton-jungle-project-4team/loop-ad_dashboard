import type {
  DashboardCampaignPromotion,
  DashboardCampaignDetail,
  DashboardCampaignSegment,
  DashboardCreatePromotionSegmentDefinitionRequest,
  DashboardCreatePromotionRequest,
  DashboardEvaluatePromotionRunResult,
  DashboardFunnelList,
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
import {
  BarChart3,
  CheckCircle2,
  FileText,
  ImageIcon,
  Plus,
  Target,
  Trash2,
  Users,
  X
} from "lucide-react";
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
  fetchDashboardFunnelList,
  fetchDashboardPromotionDetail,
  fetchDashboardSegmentDetail,
  fetchDashboardPromotionScopedSegmentDefinitions,
  fetchDashboardPromotionSegmentSuggestions,
  rejectDashboardContentCandidate,
  startDashboardAdExperiment,
  startDashboardPromotionAnalysis,
  startDashboardPromotionGeneration
} from "../api/dashboard-api.js";
import { formatInteger } from "../model/dashboard-format.js";
import {
  formatActionLabel,
  formatBasisLabel,
  formatChannelLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../model/dashboard-labels.js";
import { useDashboardQueryState } from "../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardFunnelListQueryKey,
  dashboardPromotionAnalysisProgressQueryKey,
  dashboardPromotionDetailQueryKey,
  dashboardPromotionScopedSegmentDefinitionsQueryKey,
  dashboardPromotionSegmentSuggestionsQueryKey,
  dashboardSegmentDetailQueryKey
} from "../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { EmptyState } from "./EmptyState.js";
import { ScopedFunnelAnalysisPanel } from "./ScopedFunnelAnalysisPanel.js";

export const promotionChannelOptions = ["email", "sms", "onsite_banner"] as const;
export const promotionStatusOptions = [
  "draft",
  "analysis_ready",
  "content_ready",
  "approved",
  "running",
  "evaluating",
  "partial_goal_met",
  "goal_met",
  "goal_not_met",
  "stopped"
] as const;

const promotionGoalMetricOptions = [
  {
    label: formatMetricLabel("inflow_rate"),
    requestMetric: "inflow_rate",
    value: "inflow_rate"
  },
  {
    label: formatMetricLabel("booking_conversion_rate"),
    requestMetric: "booking_conversion_rate",
    value: "booking_conversion_rate"
  },
  {
    label: formatMetricLabel("funnel_step_rate"),
    requestMetric: "funnel_step_rate",
    value: "funnel_step_rate"
  },
  { label: "광고 클릭률", requestMetric: "inflow_rate", value: "ad_click_rate" },
  {
    label: "랜딩페이지 전환율",
    requestMetric: "booking_conversion_rate",
    value: "landing_page_conversion_rate"
  },
  { label: "일일 활성 사용자수", requestMetric: "inflow_rate", value: "daily_active_users" },
  {
    label: "결제 직전 이탈율",
    requestMetric: "funnel_step_rate",
    value: "checkout_abandonment_rate"
  },
  {
    label: "구매전환율",
    requestMetric: "booking_conversion_rate",
    value: "purchase_conversion_rate"
  }
] satisfies Array<{
  label: string;
  requestMetric: DashboardCreatePromotionRequest["goal_metric"];
  value: string;
}>;
const promotionGoalBasisOptions = ["promotion_average", "all_segments"] as const;
const defaultPromotionLandingUrl = "https://demo-shoppingmall.dev.loop-ad.org/search?deal=summer";
const onsiteBannerImagePollIntervalMs = 3000;
type PromotionWorkspaceTab = "overview" | "segments" | "segment-detail";
type PromotionAnalysisProgress = {
  analysisId: string | null;
  errorMessage: string | null;
  startedAt: number | null;
  status: "idle" | "pending" | "success" | "error";
};

const defaultPromotionAnalysisProgress: PromotionAnalysisProgress = {
  analysisId: null,
  errorMessage: null,
  startedAt: null,
  status: "idle"
};
const promotionAnalysisProgressCacheTimeMs = 1000 * 60 * 30;

export function PromotionPanel({ data, query }: { data: DashboardMain; query: DashboardQuery }) {
  const queryClient = useQueryClient();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<PromotionWorkspaceTab>("overview");
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
  const funnelList = useQuery({
    queryFn: ({ signal }) => fetchDashboardFunnelList(query, signal),
    queryKey: dashboardFunnelListQueryKey(query.projectId)
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
      <PromotionChromeTabs
        onAdd={() => setIsAddDialogOpen(true)}
        onClosePromotion={closePromotion}
        onSelectPromotion={(promotionId) => selectPromotion(promotionId)}
        openPromotions={openPromotions}
        selectedPromotionId={selectedOpenPromotion?.promotion_id ?? ""}
      />
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
              <PromotionEmptyState onAdd={() => setIsAddDialogOpen(true)} />
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
                funnelList={funnelList.data}
                funnelListError={funnelList.error}
                funnelListIsError={funnelList.isError}
                funnelListIsLoading={funnelList.isLoading}
                query={query}
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
              />
            ) : null}
            <PromotionAddDialog
              createError={createPromotionMutation.error}
              createIsError={createPromotionMutation.isError}
              createIsPending={createPromotionMutation.isPending}
              onCreate={(form) => createPromotionMutation.mutate(form)}
              onOpenChange={setIsAddDialogOpen}
              open={isAddDialogOpen}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}

function PromotionChromeTabs({
  onAdd,
  onClosePromotion,
  onSelectPromotion,
  openPromotions,
  selectedPromotionId
}: {
  onAdd: () => void;
  onClosePromotion: (promotionId: string) => void;
  onSelectPromotion: (promotionId: string) => void;
  openPromotions: DashboardCampaignPromotion[];
  selectedPromotionId: string;
}) {
  return (
    <div className="flex min-h-14 items-end gap-1 border-b bg-[#edf3ff] px-5 pt-3">
      <Button
        aria-label="프로모션 탭 추가"
        className="mb-0 h-11 w-14 rounded-b-none rounded-t-md border-b-0 bg-white text-[#1d1d1f] shadow-none hover:bg-white"
        onClick={onAdd}
        size="icon"
        type="button"
        variant="outline"
      >
        <Plus className="size-4" />
      </Button>
      {openPromotions.map((promotion) => {
        const isSelected = promotion.promotion_id === selectedPromotionId;
        return (
          <button
            className={`mb-0 flex h-11 max-w-[260px] items-center gap-2 rounded-b-none rounded-t-md border px-3 text-left text-sm ${
              isSelected
                ? "border-b-white bg-white font-semibold text-[#2f24d9]"
                : "border-transparent bg-transparent text-muted-foreground hover:bg-white/60"
            }`}
            key={promotion.promotion_id}
            onClick={() => onSelectPromotion(promotion.promotion_id)}
            type="button"
          >
            <span className="truncate">{promotion.marketing_theme}</span>
            <span
              className="grid size-5 place-items-center rounded-sm text-muted-foreground hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation();
                onClosePromotion(promotion.promotion_id);
              }}
              role="button"
              tabIndex={0}
            >
              <X className="size-3.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function uniquePromotionsById(
  promotions: DashboardCampaignPromotion[]
): DashboardCampaignPromotion[] {
  const promotionMap = new Map<string, DashboardCampaignPromotion>();
  for (const promotion of promotions) {
    if (!promotionMap.has(promotion.promotion_id)) {
      promotionMap.set(promotion.promotion_id, promotion);
    }
  }
  return [...promotionMap.values()];
}

function PromotionEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="grid min-h-[620px] content-between gap-8">
      <div className="grid place-items-center gap-6 pt-14 text-center">
        <div className="relative h-40 w-40">
          <div className="absolute left-9 top-10 size-28 rotate-3 rounded-[28px] border bg-[#dfe9ff]" />
          <div className="absolute right-3 top-6 grid size-12 place-items-center rounded-md bg-emerald-300 text-emerald-900">
            <Target className="size-6" />
          </div>
          <div className="absolute bottom-4 left-3 grid size-14 -rotate-12 place-items-center rounded-md bg-rose-100 text-rose-600">
            <BarChart3 className="size-6" />
          </div>
        </div>
        <div className="grid max-w-xl gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-[#102033]">
            현재 프로모션이 없습니다.
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            새 프로모션을 생성하면 현재 캠페인의 프로모션 탭으로 열립니다. 진행 중인 캠페인의 상세
            지표와 워크플로우를 한눈에 관리할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button className="gap-2 bg-[#3927d9] px-8" onClick={onAdd} type="button">
            <Plus className="size-4" />탭 추가
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <PromotionGuideCard
          icon={<Target className="size-5" />}
          title="빠른 설정"
          value="새 프로모션을 생성하면 캠페인 하위 탭으로 바로 동기화됩니다."
        />
        <PromotionGuideCard
          icon={<Users className="size-5" />}
          title="세그먼트 타겟팅"
          value="고객군별로 특화된 프로모션 뷰를 구성하여 정밀한 마케팅을 지원합니다."
        />
        <PromotionGuideCard
          icon={<BarChart3 className="size-5" />}
          title="실시간 분석"
          value="추가된 탭에서 각 프로모션의 성과를 실시간으로 모니터링할 수 있습니다."
        />
      </div>
    </section>
  );
}

function PromotionGuideCard({
  icon,
  title,
  value
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="grid gap-4 rounded-md border bg-[#f2f6ff] p-6">
      <div className="text-[#3927d9]">{icon}</div>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-[#1d1d1f]">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

function PromotionTabWorkspace({
  archiveScopedSegmentError,
  archiveScopedSegmentIsError,
  archiveScopedSegmentIsPending,
  approveContentCandidateError,
  approveContentCandidateIsError,
  approveContentCandidateIsPending,
  confirmError,
  confirmIsError,
  confirmIsPending,
  decideError,
  decideIsError,
  decideIsPending,
  deleteConfirmedSegmentError,
  deleteConfirmedSegmentIsError,
  deleteConfirmedSegmentIsPending,
  dispatchPromotionRunError,
  dispatchPromotionRunIsError,
  dispatchPromotionRunIsPending,
  createPromotionRunError,
  createPromotionRunIsError,
  createPromotionRunIsPending,
  buildAssignmentsError,
  buildAssignmentsIsError,
  buildAssignmentsIsPending,
  evaluatePromotionRunError,
  evaluatePromotionRunIsError,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  funnelList,
  funnelListError,
  funnelListIsError,
  funnelListIsLoading,
  createNextLoopError,
  createNextLoopIsError,
  createNextLoopIsPending,
  onArchiveScopedSegment,
  onApproveContentCandidate,
  onBuildAssignments,
  onConfirmSuggestions,
  onCreateNextLoop,
  onCreatePromotionRun,
  onCreateScopedSegment,
  onDecideSuggestion,
  onDeleteConfirmedSegment,
  onDispatchPromotionRun,
  onEvaluatePromotionRun,
  onRejectContentCandidate,
  onSelectSegment,
  onStartAdExperiment,
  onStartAnalysis,
  onStartGeneration,
  onTabChange,
  promotion,
  promotionAnalysisError,
  promotionAnalysisIsError,
  promotionAnalysisIsPending,
  promotionGeneration,
  promotionGenerationError,
  promotionGenerationIsError,
  promotionGenerationIsPending,
  query,
  rejectContentCandidateError,
  rejectContentCandidateIsError,
  rejectContentCandidateIsPending,
  startAdExperimentError,
  startAdExperimentIsError,
  startAdExperimentIsPending,
  scopedSegmentCreateError,
  scopedSegmentCreateIsError,
  scopedSegmentCreateIsPending,
  scopedSegments,
  scopedSegmentsError,
  scopedSegmentsIsError,
  scopedSegmentsIsLoading,
  segments,
  selectedSegmentDetail,
  selectedSegmentDetailError,
  selectedSegmentDetailIsError,
  selectedSegmentDetailIsLoading,
  selectedSegmentId,
  suggestions,
  suggestionsError,
  suggestionsIsError,
  suggestionsIsLoading,
  tab
}: {
  archiveScopedSegmentError: Error | null;
  archiveScopedSegmentIsError: boolean;
  archiveScopedSegmentIsPending: boolean;
  approveContentCandidateError: Error | null;
  approveContentCandidateIsError: boolean;
  approveContentCandidateIsPending: boolean;
  confirmError: Error | null;
  confirmIsError: boolean;
  confirmIsPending: boolean;
  decideError: Error | null;
  decideIsError: boolean;
  decideIsPending: boolean;
  deleteConfirmedSegmentError: Error | null;
  deleteConfirmedSegmentIsError: boolean;
  deleteConfirmedSegmentIsPending: boolean;
  dispatchPromotionRunError: Error | null;
  dispatchPromotionRunIsError: boolean;
  dispatchPromotionRunIsPending: boolean;
  createPromotionRunError: Error | null;
  createPromotionRunIsError: boolean;
  createPromotionRunIsPending: boolean;
  buildAssignmentsError: Error | null;
  buildAssignmentsIsError: boolean;
  buildAssignmentsIsPending: boolean;
  evaluatePromotionRunError: Error | null;
  evaluatePromotionRunIsError: boolean;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  funnelList: DashboardFunnelList | undefined;
  funnelListError: Error | null;
  funnelListIsError: boolean;
  funnelListIsLoading: boolean;
  createNextLoopError: Error | null;
  createNextLoopIsError: boolean;
  createNextLoopIsPending: boolean;
  onArchiveScopedSegment: (segmentId: string) => void;
  onApproveContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onBuildAssignments: (promotionRunId: string) => void;
  onConfirmSuggestions: () => void;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  onCreatePromotionRun: (promotionId: string, analysisId: string, generationId: string) => void;
  onCreateScopedSegment: (form: PromotionSegmentCreateFormState) => void;
  onDecideSuggestion: (suggestionId: string, status: "accepted" | "dismissed") => void;
  onDeleteConfirmedSegment: (promotionId: string, segmentId: string) => void;
  onDispatchPromotionRun: (promotionRunId: string) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  onStartAdExperiment: (promotionId: string, adExperimentId: string) => void;
  onStartAnalysis: () => void;
  onStartGeneration: (analysisId: string) => void;
  onTabChange: (tab: PromotionWorkspaceTab) => void;
  promotion: DashboardCampaignPromotion;
  promotionAnalysisError: Error | null;
  promotionAnalysisIsError: boolean;
  promotionAnalysisIsPending: boolean;
  promotionGeneration: DashboardStartPromotionGenerationResult | null;
  promotionGenerationError: Error | null;
  promotionGenerationIsError: boolean;
  promotionGenerationIsPending: boolean;
  query: DashboardQuery;
  rejectContentCandidateError: Error | null;
  rejectContentCandidateIsError: boolean;
  rejectContentCandidateIsPending: boolean;
  startAdExperimentError: Error | null;
  startAdExperimentIsError: boolean;
  startAdExperimentIsPending: boolean;
  scopedSegmentCreateError: Error | null;
  scopedSegmentCreateIsError: boolean;
  scopedSegmentCreateIsPending: boolean;
  scopedSegments: DashboardPromotionScopedSegmentDefinition[];
  scopedSegmentsError: Error | null;
  scopedSegmentsIsError: boolean;
  scopedSegmentsIsLoading: boolean;
  segments: DashboardCampaignSegment[];
  selectedSegmentDetail: DashboardSegmentDetail | undefined;
  selectedSegmentDetailError: Error | null;
  selectedSegmentDetailIsError: boolean;
  selectedSegmentDetailIsLoading: boolean;
  selectedSegmentId: string;
  suggestions: DashboardPromotionSegmentSuggestion[];
  suggestionsError: Error | null;
  suggestionsIsError: boolean;
  suggestionsIsLoading: boolean;
  tab: PromotionWorkspaceTab;
}) {
  const activeSegments = segments.filter((segment) => segment.status !== "stopped");
  const selectedSegmentSuggestion =
    suggestions.find((suggestion) => suggestion.segment_id === selectedSegmentId) ?? null;
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="text-sm font-medium text-[#3927d9]">프로모션 보기</div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#102033]">
            {promotion.marketing_theme}
          </h2>
          <p className="text-sm text-muted-foreground">{formatChannelLabel(promotion.channel)}</p>
        </div>
        <Badge variant={statusBadgeVariant(promotion.status)}>
          {formatStatusLabel(promotion.status)}
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <PromotionMetricCard label="목표 지표" value={formatMetricLabel(promotion.goal_metric)} />
        <PromotionMetricCard label="목표값" value={formatGoalValue(promotion.goal_target_value)} />
        <PromotionMetricCard
          label="현재값"
          value={
            promotion.latest_actual_value === null
              ? "-"
              : formatGoalValue(promotion.latest_actual_value)
          }
        />
        <PromotionMetricCard label="세그먼트" value={formatInteger(activeSegments.length)} />
        <PromotionMetricCard label="실험" value={formatInteger(promotion.ad_experiment_count)} />
      </div>
      <ScopedFunnelAnalysisPanel
        error={funnelListError}
        funnels={funnelList?.funnels ?? []}
        isError={funnelListIsError}
        isLoading={funnelListIsLoading}
        query={query}
        scope={{ promotion_id: promotion.promotion_id, scope_type: "promotion" }}
        title="프로모션 퍼널 분석"
      />
      <Tabs
        className="grid gap-4"
        onValueChange={(value) => onTabChange(value as PromotionWorkspaceTab)}
        value={tab}
      >
        <TabsList className="w-fit" variant="line">
          <TabsTrigger value="overview">프로모션 개요</TabsTrigger>
          <TabsTrigger value="segments">세그먼트 추천/확정</TabsTrigger>
          <TabsTrigger value="segment-detail">세그먼트 상세</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <PromotionOverviewTab
            activeSegments={activeSegments}
            deleteError={deleteConfirmedSegmentError}
            deleteIsError={deleteConfirmedSegmentIsError}
            deleteIsPending={deleteConfirmedSegmentIsPending}
            onDeleteSegment={onDeleteConfirmedSegment}
            onSelectSegment={onSelectSegment}
            promotion={promotion}
            segments={activeSegments}
            selectedSegmentId={selectedSegmentId}
          />
        </TabsContent>
        <TabsContent value="segments">
          <div className="grid gap-4">
            <PromotionCurrentSegmentsPanel
              deleteError={deleteConfirmedSegmentError}
              deleteIsError={deleteConfirmedSegmentIsError}
              deleteIsPending={deleteConfirmedSegmentIsPending}
              onDeleteSegment={onDeleteConfirmedSegment}
              onSelectSegment={onSelectSegment}
              promotion={promotion}
              segments={activeSegments}
              selectedSegmentId={selectedSegmentId}
            />
            <PromotionSegmentSuggestionPanel
              confirmError={confirmError}
              confirmIsError={confirmIsError}
              confirmIsPending={confirmIsPending}
              createScopedSegmentError={scopedSegmentCreateError}
              createScopedSegmentIsError={scopedSegmentCreateIsError}
              createScopedSegmentIsPending={scopedSegmentCreateIsPending}
              decideError={decideError}
              decideIsError={decideIsError}
              decideIsPending={decideIsPending}
              archiveScopedSegmentError={archiveScopedSegmentError}
              archiveScopedSegmentIsError={archiveScopedSegmentIsError}
              archiveScopedSegmentIsPending={archiveScopedSegmentIsPending}
              onArchiveScopedSegment={onArchiveScopedSegment}
              onConfirmSuggestions={onConfirmSuggestions}
              onCreateScopedSegment={onCreateScopedSegment}
              onDecideSuggestion={onDecideSuggestion}
              onStartAnalysis={onStartAnalysis}
              promotionAnalysisError={promotionAnalysisError}
              promotionAnalysisIsError={promotionAnalysisIsError}
              promotionAnalysisIsPending={promotionAnalysisIsPending}
              scopedSegments={scopedSegments}
              scopedSegmentsError={scopedSegmentsError}
              scopedSegmentsIsError={scopedSegmentsIsError}
              scopedSegmentsIsLoading={scopedSegmentsIsLoading}
              suggestions={suggestions}
              suggestionsError={suggestionsError}
              suggestionsIsError={suggestionsIsError}
              suggestionsIsLoading={suggestionsIsLoading}
            />
          </div>
        </TabsContent>
        <TabsContent value="segment-detail">
          <PromotionSegmentDetailTab
            approveContentCandidateError={approveContentCandidateError}
            approveContentCandidateIsError={approveContentCandidateIsError}
            approveContentCandidateIsPending={approveContentCandidateIsPending}
            detail={selectedSegmentDetail}
            dispatchPromotionRunError={dispatchPromotionRunError}
            dispatchPromotionRunIsError={dispatchPromotionRunIsError}
            dispatchPromotionRunIsPending={dispatchPromotionRunIsPending}
            createPromotionRunError={createPromotionRunError}
            createPromotionRunIsError={createPromotionRunIsError}
            createPromotionRunIsPending={createPromotionRunIsPending}
            buildAssignmentsError={buildAssignmentsError}
            buildAssignmentsIsError={buildAssignmentsIsError}
            buildAssignmentsIsPending={buildAssignmentsIsPending}
            evaluatePromotionRunError={evaluatePromotionRunError}
            evaluatePromotionRunIsError={evaluatePromotionRunIsError}
            evaluatePromotionRunIsPending={evaluatePromotionRunIsPending}
            evaluatePromotionRunResult={evaluatePromotionRunResult}
            createNextLoopError={createNextLoopError}
            createNextLoopIsError={createNextLoopIsError}
            createNextLoopIsPending={createNextLoopIsPending}
            error={selectedSegmentDetailError}
            generation={promotionGeneration}
            generationError={promotionGenerationError}
            generationIsError={promotionGenerationIsError}
            generationIsPending={promotionGenerationIsPending}
            funnelList={funnelList}
            funnelListError={funnelListError}
            funnelListIsError={funnelListIsError}
            funnelListIsLoading={funnelListIsLoading}
            isError={selectedSegmentDetailIsError}
            isLoading={selectedSegmentDetailIsLoading}
            onApproveContentCandidate={onApproveContentCandidate}
            onBuildAssignments={onBuildAssignments}
            onCreateNextLoop={onCreateNextLoop}
            onCreatePromotionRun={onCreatePromotionRun}
            onDispatchPromotionRun={onDispatchPromotionRun}
            onEvaluatePromotionRun={onEvaluatePromotionRun}
            onRejectContentCandidate={onRejectContentCandidate}
            onStartAdExperiment={onStartAdExperiment}
            onStartGeneration={onStartGeneration}
            query={query}
            rejectContentCandidateError={rejectContentCandidateError}
            rejectContentCandidateIsError={rejectContentCandidateIsError}
            rejectContentCandidateIsPending={rejectContentCandidateIsPending}
            segmentSuggestion={selectedSegmentSuggestion}
            selectedSegmentId={selectedSegmentId}
            startAdExperimentError={startAdExperimentError}
            startAdExperimentIsError={startAdExperimentIsError}
            startAdExperimentIsPending={startAdExperimentIsPending}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function PromotionOverviewTab({
  activeSegments,
  deleteError,
  deleteIsError,
  deleteIsPending,
  onDeleteSegment,
  onSelectSegment,
  promotion,
  segments,
  selectedSegmentId
}: {
  activeSegments: DashboardCampaignSegment[];
  deleteError: Error | null;
  deleteIsError: boolean;
  deleteIsPending: boolean;
  onDeleteSegment: (promotionId: string, segmentId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  promotion: DashboardCampaignPromotion;
  segments: DashboardCampaignSegment[];
  selectedSegmentId: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>프로모션 퍼널 효율</CardTitle>
          <CardDescription>현재 프로모션 목표와 루프 상태를 기준으로 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <PromotionProgressRow
            label="목표 달성"
            value={Math.min((promotion.latest_actual_value ?? 0) * 100, 100)}
          />
          <PromotionProgressRow
            label="루프 진행"
            value={
              promotion.max_loop_count > 0
                ? Math.min((promotion.current_loop_count / promotion.max_loop_count) * 100, 100)
                : 0
            }
          />
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryItem label="목표 기준" value={formatBasisLabel(promotion.goal_basis)} />
            <SummaryItem label="최소 표본" value={formatInteger(promotion.min_sample_size)} />
            <SummaryItem label="다음 액션" value={formatActionLabel(promotion.next_action)} />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        <PromotionCurrentSegmentsPanel
          deleteError={deleteError}
          deleteIsError={deleteIsError}
          deleteIsPending={deleteIsPending}
          onDeleteSegment={onDeleteSegment}
          onSelectSegment={onSelectSegment}
          promotion={promotion}
          segments={segments}
          selectedSegmentId={selectedSegmentId}
        />
        <Card className="border-[#3927d9]/20 bg-[#f2f6ff] shadow-none">
          <CardContent className="grid gap-2 p-5">
            <div className="flex items-center gap-2 font-semibold text-[#3927d9]">
              <CheckCircle2 className="size-4" />
              최적화 힌트
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              목표 달성률과 세그먼트 반응을 기준으로 다음 루프 분석 후보를 확인하세요.
            </p>
            <div className="text-xs text-muted-foreground">
              활성 세그먼트 {formatInteger(activeSegments.length)}개 · 실험{" "}
              {formatInteger(promotion.ad_experiment_count)}개
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PromotionCurrentSegmentsPanel({
  deleteError,
  deleteIsError,
  deleteIsPending,
  onDeleteSegment,
  onSelectSegment,
  promotion,
  segments,
  selectedSegmentId
}: {
  deleteError: Error | null;
  deleteIsError: boolean;
  deleteIsPending: boolean;
  onDeleteSegment: (promotionId: string, segmentId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  promotion: DashboardCampaignPromotion;
  segments: DashboardCampaignSegment[];
  selectedSegmentId: string;
}) {
  const visibleSegments = latestSegmentPerSegmentId(segments);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">확정 세그먼트</CardTitle>
        <CardDescription>현재 프로모션에 최종 연결된 세그먼트입니다.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {deleteIsError ? (
          <Alert variant="destructive">
            <AlertTitle>확정 세그먼트를 삭제하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(deleteError)}</AlertDescription>
          </Alert>
        ) : null}
        {visibleSegments.length > 0 ? (
          visibleSegments.map((segment) => {
            const isSelected = segment.segment_id === selectedSegmentId;
            const loopCount = segmentLoopCount(segment);
            const displayCopy = campaignSegmentDisplayCopy(segment);
            const hiddenLoopCount = segments.filter(
              (candidate) =>
                candidate.segment_id === segment.segment_id &&
                candidate.analysis_id !== segment.analysis_id
            ).length;
            return (
              <div
                className={`rounded-md border p-3 text-left transition ${
                  isSelected ? "border-[#3927d9] bg-[#f2f0ff]" : "bg-background hover:bg-muted/30"
                }`}
                key={`${segment.segment_id}:${segment.analysis_id}`}
                onClick={() => onSelectSegment(promotion.promotion_id, segment.segment_id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectSegment(promotion.promotion_id, segment.segment_id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate font-medium">
                        {displayCopy?.title ?? segment.segment_name}
                      </span>
                      <Badge variant="secondary">루프 {formatInteger(loopCount)}</Badge>
                      {loopCount > 1 ? <Badge variant="default">다음 루프</Badge> : null}
                    </div>
                    {displayCopy?.signal_chips.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {displayCopy.signal_chips.map((chip) => (
                          <Badge className="text-[11px]" key={chip} variant="outline">
                            {chip}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {displayCopy?.audience_summary ??
                        `${formatInteger(segment.estimated_size)}명 · 표본 ${formatInteger(
                          segment.sample_size
                        )} · ${formatMetricLabel(segment.goal_metric)}`}
                      {hiddenLoopCount > 0
                        ? ` · 이전 루프 ${formatInteger(hiddenLoopCount)}개 숨김`
                        : ""}
                    </div>
                    {displayCopy?.reason ? (
                      <div className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {displayCopy.reason}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={statusBadgeVariant(segment.status)}>
                      {formatStatusLabel(segment.status)}
                    </Badge>
                    <Button
                      aria-label={`${segment.segment_name} 확정 세그먼트 삭제`}
                      disabled={deleteIsPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteSegment(promotion.promotion_id, segment.segment_id);
                      }}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState message="확정된 세그먼트가 없습니다. 세그먼트 추천/확정 탭에서 후보를 확정해주세요." />
        )}
      </CardContent>
    </Card>
  );
}

function PromotionSegmentDetailTab({
  approveContentCandidateError,
  approveContentCandidateIsError,
  approveContentCandidateIsPending,
  detail,
  dispatchPromotionRunError,
  dispatchPromotionRunIsError,
  dispatchPromotionRunIsPending,
  createPromotionRunError,
  createPromotionRunIsError,
  createPromotionRunIsPending,
  buildAssignmentsError,
  buildAssignmentsIsError,
  buildAssignmentsIsPending,
  evaluatePromotionRunError,
  evaluatePromotionRunIsError,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  createNextLoopError,
  createNextLoopIsError,
  createNextLoopIsPending,
  error,
  generation,
  generationError,
  generationIsError,
  generationIsPending,
  funnelList,
  funnelListError,
  funnelListIsError,
  funnelListIsLoading,
  isError,
  isLoading,
  onApproveContentCandidate,
  onBuildAssignments,
  onCreateNextLoop,
  onCreatePromotionRun,
  onDispatchPromotionRun,
  onEvaluatePromotionRun,
  onRejectContentCandidate,
  onStartAdExperiment,
  onStartGeneration,
  query,
  rejectContentCandidateError,
  rejectContentCandidateIsError,
  rejectContentCandidateIsPending,
  segmentSuggestion,
  selectedSegmentId,
  startAdExperimentError,
  startAdExperimentIsError,
  startAdExperimentIsPending
}: {
  approveContentCandidateError: Error | null;
  approveContentCandidateIsError: boolean;
  approveContentCandidateIsPending: boolean;
  detail: DashboardSegmentDetail | undefined;
  dispatchPromotionRunError: Error | null;
  dispatchPromotionRunIsError: boolean;
  dispatchPromotionRunIsPending: boolean;
  createPromotionRunError: Error | null;
  createPromotionRunIsError: boolean;
  createPromotionRunIsPending: boolean;
  buildAssignmentsError: Error | null;
  buildAssignmentsIsError: boolean;
  buildAssignmentsIsPending: boolean;
  evaluatePromotionRunError: Error | null;
  evaluatePromotionRunIsError: boolean;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  createNextLoopError: Error | null;
  createNextLoopIsError: boolean;
  createNextLoopIsPending: boolean;
  error: Error | null;
  generation: DashboardStartPromotionGenerationResult | null;
  generationError: Error | null;
  generationIsError: boolean;
  generationIsPending: boolean;
  funnelList: DashboardFunnelList | undefined;
  funnelListError: Error | null;
  funnelListIsError: boolean;
  funnelListIsLoading: boolean;
  isError: boolean;
  isLoading: boolean;
  onApproveContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onBuildAssignments: (promotionRunId: string) => void;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  onCreatePromotionRun: (promotionId: string, analysisId: string, generationId: string) => void;
  onDispatchPromotionRun: (promotionRunId: string) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onStartAdExperiment: (promotionId: string, adExperimentId: string) => void;
  onStartGeneration: (analysisId: string) => void;
  query: DashboardQuery;
  rejectContentCandidateError: Error | null;
  rejectContentCandidateIsError: boolean;
  rejectContentCandidateIsPending: boolean;
  segmentSuggestion: DashboardPromotionSegmentSuggestion | null;
  selectedSegmentId: string;
  startAdExperimentError: Error | null;
  startAdExperimentIsError: boolean;
  startAdExperimentIsPending: boolean;
}) {
  if (!selectedSegmentId) {
    return <EmptyState message="상세를 확인할 세그먼트를 선택해주세요." />;
  }
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>세그먼트 상세를 불러오지 못했습니다</AlertTitle>
        <AlertDescription>{error?.message ?? "API 요청에 실패했습니다."}</AlertDescription>
      </Alert>
    );
  }
  if (isLoading || !detail) {
    return <EmptyState message="세그먼트 상세를 불러오는 중입니다." />;
  }

  const insufficientMetrics = detail.experiment_metrics.filter(
    (metric) => metric.status === "insufficient_data"
  );
  const latestMetric = detail.experiment_metrics[0];
  const approvedContentCandidate = detail.content_candidates.find(
    (candidate) => candidate.status === "approved"
  );
  const hasGeneratedContentCandidates = detail.content_candidates.length > 0;
  const hasPendingImage = hasPendingOnsiteBannerImage(detail);
  const generationFailed = generation?.status.toLowerCase() === "failed";

  return (
    <section className="grid gap-4">
      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-1">
            <CardTitle>{detail.segment.segment_name}</CardTitle>
            <CardDescription>
              {detail.segment.natural_language_query ?? "세그먼트 조건 미등록"}
            </CardDescription>
          </div>
          <Badge variant={statusBadgeVariant(detail.segment.status)}>
            {formatStatusLabel(detail.segment.status)}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <SummaryItem label="대상 규모" value={formatInteger(detail.segment.estimated_size)} />
          <SummaryItem label="표본 수" value={formatInteger(detail.segment.sample_size)} />
          <SummaryItem label="표본 비율" value={formatPercentValue(detail.segment.sample_ratio)} />
          <SummaryItem label="연결 실험" value={formatInteger(detail.ad_experiments.length)} />
          <SummaryItem label="목표 지표" value={formatMetricLabel(detail.segment.goal_metric)} />
          <SummaryItem
            label="최근 지표"
            value={
              latestMetric
                ? `${formatMetricLabel(latestMetric.metric)} ${formatGoalValue(latestMetric.actual_value)}`
                : "-"
            }
          />
          <SummaryItem
            label="콘텐츠 후보"
            value={formatInteger(detail.content_candidates.length)}
          />
          <SummaryItem
            label="실시간 이벤트"
            value={formatInteger(detail.realtime_metrics.total_event_count)}
          />
        </CardContent>
      </Card>

      {insufficientMetrics.length > 0 || detail.segment.status === "insufficient_data" ? (
        <Alert variant="destructive">
          <AlertTitle>표본 부족 상태</AlertTitle>
          <AlertDescription>
            표본 부족은 실패가 아니라 판단 보류 상태입니다. 실험 대상 수와 평가 결과 JSON을 함께
            확인해야 합니다.
          </AlertDescription>
        </Alert>
      ) : null}

      <ScopedFunnelAnalysisPanel
        error={funnelListError}
        funnels={funnelList?.funnels ?? []}
        isError={funnelListIsError}
        isLoading={funnelListIsLoading}
        query={query}
        scope={{
          promotion_id: detail.segment.promotion_id,
          scope_type: "segment",
          segment_id: detail.segment.segment_id
        }}
        title="세그먼트 퍼널 분석"
      />

      <SegmentDetailReportCard suggestion={segmentSuggestion} />

      <section className="grid gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-1">
            <h3 className="text-base font-semibold">세그먼트별 생성 광고</h3>
            <p className="text-sm text-muted-foreground">
              Decision 생성 결과로 저장된 콘텐츠 후보를 세그먼트 기준으로 조회합니다.
            </p>
          </div>
          <Button
            disabled={
              generationIsPending || !detail.segment.analysis_id || hasGeneratedContentCandidates
            }
            onClick={() => onStartGeneration(detail.segment.analysis_id)}
            type="button"
            variant="outline"
          >
            <ImageIcon className="mr-2 size-4" />
            {generationIsPending
              ? "생성 요청 중"
              : hasGeneratedContentCandidates
                ? "생성 완료"
                : "광고 생성 요청"}
          </Button>
        </div>
        <div className="grid gap-3">
          {generationIsError ? (
            <Alert variant="destructive">
              <AlertTitle>광고 생성 요청에 실패했습니다</AlertTitle>
              <AlertDescription>{mutationErrorMessage(generationError)}</AlertDescription>
            </Alert>
          ) : null}
          {generation && generationFailed ? (
            <Alert variant={generationFailed ? "destructive" : "default"}>
              <AlertTitle>광고 생성이 실패했습니다</AlertTitle>
              <AlertDescription>
                {generation.generation_id} · {formatStatusLabel(generation.status)}
                {generation.content_candidate_count === undefined
                  ? ""
                  : ` · 후보 ${formatInteger(generation.content_candidate_count)}개`}
              </AlertDescription>
            </Alert>
          ) : null}
          {hasPendingImage ? (
            <Alert>
              <AlertTitle>배너 이미지를 생성하는 중입니다</AlertTitle>
              <AlertDescription>
                이미지 URL이 저장되면 자동으로 다시 불러와 카드에 표시합니다.
              </AlertDescription>
            </Alert>
          ) : null}
          {approveContentCandidateIsError ? (
            <Alert variant="destructive">
              <AlertTitle>광고 후보를 승인하지 못했습니다</AlertTitle>
              <AlertDescription>
                {mutationErrorMessage(approveContentCandidateError)}
              </AlertDescription>
            </Alert>
          ) : null}
          {rejectContentCandidateIsError ? (
            <Alert variant="destructive">
              <AlertTitle>광고 후보를 거절하지 못했습니다</AlertTitle>
              <AlertDescription>
                {mutationErrorMessage(rejectContentCandidateError)}
              </AlertDescription>
            </Alert>
          ) : null}
          {detail.content_candidates.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {detail.content_candidates.map((candidate) => {
                const hasDifferentApprovedCandidate = Boolean(
                  approvedContentCandidate &&
                  approvedContentCandidate.content_id !== candidate.content_id
                );
                const selectionLabel =
                  candidate.status === "approved"
                    ? "선택됨"
                    : hasDifferentApprovedCandidate
                      ? "선택 불가"
                      : "선택";

                return (
                  <Card className="shadow-none" key={candidate.content_id}>
                    <CardHeader className="grid gap-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="grid min-w-0 gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{formatChannelLabel(candidate.channel)}</Badge>
                            <Badge variant={statusBadgeVariant(candidate.status)}>
                              {formatStatusLabel(candidate.status)}
                            </Badge>
                          </div>
                          <CardTitle className="break-words text-base">
                            {contentCandidateTitle(candidate)}
                          </CardTitle>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            disabled={
                              approveContentCandidateIsPending ||
                              hasDifferentApprovedCandidate ||
                              candidate.status === "approved" ||
                              candidate.status === "rejected"
                            }
                            onClick={() =>
                              onApproveContentCandidate(
                                detail.segment.promotion_id,
                                detail.segment.segment_id,
                                candidate.content_id
                              )
                            }
                            size="sm"
                            type="button"
                            variant={candidate.status === "approved" ? "secondary" : "default"}
                          >
                            <CheckCircle2 className="mr-2 size-4" />
                            {selectionLabel}
                          </Button>
                          <Button
                            disabled={
                              rejectContentCandidateIsPending ||
                              Boolean(approvedContentCandidate) ||
                              candidate.status === "approved" ||
                              candidate.status === "rejected"
                            }
                            onClick={() =>
                              onRejectContentCandidate(
                                detail.segment.promotion_id,
                                detail.segment.segment_id,
                                candidate.content_id
                              )
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <X className="mr-2 size-4" />
                            {candidate.status === "rejected" ? "거절됨" : "거절"}
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="break-all">
                        {candidate.content_option_id}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      {candidate.image_url ? (
                        <img
                          alt={`${contentCandidateTitle(candidate)} 이미지`}
                          className="aspect-video w-full rounded-md border object-cover"
                          src={candidate.image_url}
                        />
                      ) : null}
                      <div className="grid gap-3 md:grid-cols-2">
                        <InsightBlock
                          label="메시지"
                          value={[
                            candidate.subject,
                            candidate.preheader,
                            contentCandidateMessage(candidate)
                          ]
                            .filter(Boolean)
                            .join("\n")}
                        />
                        <InsightBlock
                          label="CTA / 랜딩"
                          value={[
                            candidate.cta ?? "-",
                            candidate.landing_url ?? "랜딩 URL 없음"
                          ].join("\n")}
                        />
                      </div>
                      <div className="rounded-md border bg-muted/20 p-3">
                        <div className="mb-2 text-xs font-medium text-muted-foreground">근거</div>
                        <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
                          <p className="break-words">{candidate.reason_summary ?? "-"}</p>
                          {candidate.message_strategy ? (
                            <p className="break-words">전략: {candidate.message_strategy}</p>
                          ) : null}
                          {candidate.image_prompt ? (
                            <p className="break-words">이미지: {candidate.image_prompt}</p>
                          ) : null}
                          {candidate.image_url ? (
                            <a
                              className="break-all underline underline-offset-4"
                              href={candidate.image_url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              이미지 URL
                            </a>
                          ) : null}
                          <p className="break-all">
                            {formatJsonObject(candidate.data_evidence_json)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState message="아직 생성된 광고 후보가 없습니다." />
          )}
        </div>
      </section>
    </section>
  );
}

function PromotionSegmentSuggestionPanel({
  archiveScopedSegmentError,
  archiveScopedSegmentIsError,
  archiveScopedSegmentIsPending,
  confirmError,
  confirmIsError,
  confirmIsPending,
  createScopedSegmentError,
  createScopedSegmentIsError,
  createScopedSegmentIsPending,
  decideError,
  decideIsError,
  decideIsPending,
  onArchiveScopedSegment,
  onConfirmSuggestions,
  onCreateScopedSegment,
  onDecideSuggestion,
  onStartAnalysis,
  promotionAnalysisError,
  promotionAnalysisIsError,
  promotionAnalysisIsPending,
  scopedSegments,
  scopedSegmentsError,
  scopedSegmentsIsError,
  scopedSegmentsIsLoading,
  suggestions,
  suggestionsError,
  suggestionsIsError,
  suggestionsIsLoading
}: {
  archiveScopedSegmentError: Error | null;
  archiveScopedSegmentIsError: boolean;
  archiveScopedSegmentIsPending: boolean;
  confirmError: Error | null;
  confirmIsError: boolean;
  confirmIsPending: boolean;
  createScopedSegmentError: Error | null;
  createScopedSegmentIsError: boolean;
  createScopedSegmentIsPending: boolean;
  decideError: Error | null;
  decideIsError: boolean;
  decideIsPending: boolean;
  onArchiveScopedSegment: (segmentId: string) => void;
  onConfirmSuggestions: () => void;
  onCreateScopedSegment: (form: PromotionSegmentCreateFormState) => void;
  onDecideSuggestion: (suggestionId: string, status: "accepted" | "dismissed") => void;
  onStartAnalysis: () => void;
  promotionAnalysisError: Error | null;
  promotionAnalysisIsError: boolean;
  promotionAnalysisIsPending: boolean;
  scopedSegments: DashboardPromotionScopedSegmentDefinition[];
  scopedSegmentsError: Error | null;
  scopedSegmentsIsError: boolean;
  scopedSegmentsIsLoading: boolean;
  suggestions: DashboardPromotionSegmentSuggestion[];
  suggestionsError: Error | null;
  suggestionsIsError: boolean;
  suggestionsIsLoading: boolean;
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reportSuggestion, setReportSuggestion] =
    useState<DashboardPromotionSegmentSuggestion | null>(null);
  const acceptedCount = suggestions.filter(
    (suggestion) => suggestion.suggestion_status === "accepted"
  ).length;
  const confirmableCount = acceptedCount + scopedSegments.length;

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-1">
          <CardTitle>추천 세그먼트 후보</CardTitle>
          <CardDescription>
            AI가 제안한 후보와 직접 추가한 후보를 확인합니다. 확정 시 최종 타겟 세그먼트로
            저장됩니다.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={promotionAnalysisIsPending}
            onClick={onStartAnalysis}
            type="button"
            variant="outline"
          >
            <BarChart3 className="mr-2 size-4" />
            {promotionAnalysisIsPending ? "분석 요청 중" : "AI 추천 요청"}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} type="button" variant="outline">
            <Plus className="mr-2 size-4" />
            직접 추가
          </Button>
          <Button
            className="bg-[#3927d9]"
            disabled={confirmableCount === 0 || confirmIsPending}
            onClick={onConfirmSuggestions}
            type="button"
          >
            {confirmIsPending ? "확정 중" : `후보 확정 (${confirmableCount})`}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {promotionAnalysisIsError ? (
          <Alert variant="destructive">
            <AlertTitle>AI 추천 요청에 실패했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(promotionAnalysisError)}</AlertDescription>
          </Alert>
        ) : null}
        {suggestionsIsError ? (
          <Alert variant="destructive">
            <AlertTitle>추천 세그먼트를 불러오지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(suggestionsError)}</AlertDescription>
          </Alert>
        ) : null}
        {decideIsError ? (
          <Alert variant="destructive">
            <AlertTitle>추천 후보 상태를 변경하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(decideError)}</AlertDescription>
          </Alert>
        ) : null}
        {confirmIsError ? (
          <Alert variant="destructive">
            <AlertTitle>추천 후보를 확정하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(confirmError)}</AlertDescription>
          </Alert>
        ) : null}
        {scopedSegmentsIsError ? (
          <Alert variant="destructive">
            <AlertTitle>직접 추가 세그먼트를 불러오지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(scopedSegmentsError)}</AlertDescription>
          </Alert>
        ) : null}
        {createScopedSegmentIsError ? (
          <Alert variant="destructive">
            <AlertTitle>직접 추가 세그먼트를 저장하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(createScopedSegmentError)}</AlertDescription>
          </Alert>
        ) : null}
        {archiveScopedSegmentIsError ? (
          <Alert variant="destructive">
            <AlertTitle>직접 추가 세그먼트를 삭제하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(archiveScopedSegmentError)}</AlertDescription>
          </Alert>
        ) : null}
        {scopedSegmentsIsLoading ? (
          <EmptyState message="직접 추가 세그먼트를 불러오는 중입니다." />
        ) : null}
        {scopedSegments.length > 0 ? (
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">직접 추가 세그먼트 후보</h3>
              <Badge variant="secondary">{formatInteger(scopedSegments.length)}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {scopedSegments.map((segment) => (
                <div
                  className="grid gap-3 rounded-md border bg-[#f7fbff] p-4"
                  key={segment.segment_id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <div className="text-xs font-semibold text-[#3927d9]">{segment.source}</div>
                      <h3 className="text-base font-semibold">{segment.segment_name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusBadgeVariant(segment.status)}>
                        {formatStatusLabel(segment.status)}
                      </Badge>
                      <Button
                        aria-label={`${segment.segment_name} 직접 추가 후보 삭제`}
                        disabled={archiveScopedSegmentIsPending}
                        onClick={() => onArchiveScopedSegment(segment.segment_id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div>
                      표본 {formatInteger(segment.sample_size)}명 · 비율{" "}
                      {formatInteger(segment.sample_ratio * 100)}%
                    </div>
                    <div className="line-clamp-2">
                      {(segment.natural_language_query ?? formatJsonObject(segment.rule_json)) ||
                        "조건 설명이 비어 있습니다."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {suggestionsIsLoading ? <EmptyState message="추천 세그먼트를 불러오는 중입니다." /> : null}
        {!suggestionsIsLoading && suggestions.length === 0 && scopedSegments.length === 0 ? (
          <EmptyState message="표시할 세그먼트 후보가 없습니다." />
        ) : null}
        {suggestions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((suggestion) => {
              const isAccepted = suggestion.suggestion_status === "accepted";
              const isConfirmed = suggestion.suggestion_status === "confirmed";
              const isDismissed = suggestion.suggestion_status === "dismissed";
              const displayCopy = suggestion.display_copy;
              const fallbackSummary = segmentAudienceSummary(
                suggestion.sample_size,
                suggestion.sample_ratio
              );
              return (
                <div
                  className={`grid gap-3 rounded-md border p-4 ${
                    isAccepted ? "border-[#3927d9] bg-[#f2f0ff]" : "bg-white"
                  }`}
                  key={suggestion.suggestion_id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <div className="text-xs font-semibold text-[#3927d9]">
                        Rank {formatInteger(suggestion.suggested_rank)}
                      </div>
                      <h3 className="text-base font-semibold">
                        {displayCopy?.title ?? suggestion.segment_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {displayCopy
                          ? "AI 추천 세그먼트"
                          : `${suggestion.segment_source} · ${suggestion.suggestion_source}`}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(suggestion.suggestion_status)}>
                      {formatStatusLabel(suggestion.suggestion_status)}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div>{displayCopy?.audience_summary ?? fallbackSummary}</div>
                    {displayCopy?.signal_chips.length ? (
                      <div className="flex flex-wrap gap-1">
                        {displayCopy.signal_chips.map((chip) => (
                          <Badge className="text-[11px]" key={chip} variant="outline">
                            {chip}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="line-clamp-2">
                      {displayCopy?.reason ||
                        formatJsonObject(suggestion.reason_json) ||
                        "추천 사유가 비어 있습니다."}
                    </div>
                    {displayCopy?.action_hint ? (
                      <div className="rounded-md bg-[#f7f8ff] px-3 py-2 text-xs leading-5 text-foreground">
                        {displayCopy.action_hint}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.ai_report ? (
                      <Button
                        onClick={() => setReportSuggestion(suggestion)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <FileText className="mr-2 size-3.5" />
                        리포트
                      </Button>
                    ) : null}
                    <Button
                      disabled={decideIsPending || isAccepted || isConfirmed}
                      onClick={() => onDecideSuggestion(suggestion.suggestion_id, "accepted")}
                      size="sm"
                      type="button"
                    >
                      수락
                    </Button>
                    <Button
                      disabled={decideIsPending || isDismissed || isConfirmed}
                      onClick={() => onDecideSuggestion(suggestion.suggestion_id, "dismissed")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      삭제
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        <SegmentSuggestionReportDialog
          onOpenChange={(open) => {
            if (!open) {
              setReportSuggestion(null);
            }
          }}
          suggestion={reportSuggestion}
        />
        <PromotionSegmentCreateDialog
          createIsPending={createScopedSegmentIsPending}
          onCreate={onCreateScopedSegment}
          onOpenChange={setIsCreateDialogOpen}
          open={isCreateDialogOpen}
        />
      </CardContent>
    </Card>
  );
}

function SegmentSuggestionReportDialog({
  onOpenChange,
  suggestion
}: {
  onOpenChange: (open: boolean) => void;
  suggestion: DashboardPromotionSegmentSuggestion | null;
}) {
  const report = suggestion?.ai_report ?? null;

  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(report)}>
      {report ? (
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                Rank {formatInteger(suggestion?.suggested_rank ?? 0)}
              </Badge>
              <Badge variant="outline">AI 추천 리포트</Badge>
            </div>
            <DialogTitle>{report.title}</DialogTitle>
            <DialogDescription>
              후보를 확정하기 전에 고객군의 성격과 추천 근거를 확인합니다.
            </DialogDescription>
          </DialogHeader>
          <SegmentSuggestionReportContent suggestion={suggestion} />
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button">
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function SegmentDetailReportCard({
  suggestion
}: {
  suggestion: DashboardPromotionSegmentSuggestion | null;
}) {
  const report = suggestion?.ai_report ?? null;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">세그먼트 리포트</CardTitle>
        <CardDescription>
          AI가 정리한 고객군 성격, 추천 근거, 활용 방법을 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {report ? (
          <SegmentSuggestionReportContent suggestion={suggestion} />
        ) : (
          <EmptyState message="이 세그먼트에 연결된 AI 추천 리포트가 없습니다." />
        )}
      </CardContent>
    </Card>
  );
}

function SegmentSuggestionReportContent({
  suggestion
}: {
  suggestion: DashboardPromotionSegmentSuggestion | null;
}) {
  const report = suggestion?.ai_report ?? null;
  const displayCopy = suggestion?.display_copy ?? null;

  if (!report) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-2 rounded-md border bg-[#f8f8ff] p-4">
        <div className="text-sm font-medium text-foreground">{report.summary}</div>
        <div className="text-sm text-muted-foreground">
          {displayCopy?.audience_summary ??
            segmentAudienceSummary(suggestion?.sample_size ?? 0, suggestion?.sample_ratio ?? 0)}
        </div>
        {displayCopy?.signal_chips.length ? (
          <div className="flex flex-wrap gap-1">
            {displayCopy.signal_chips.map((chip) => (
              <Badge className="text-[11px]" key={chip} variant="outline">
                {chip}
              </Badge>
            ))}
          </div>
        ) : null}
      </section>
      <ReportSection items={report.why_recommended} title="왜 추천했나요" />
      <ReportSection items={report.evidence} title="확인된 근거" />
      <section className="grid gap-2 rounded-md border p-4">
        <h4 className="text-sm font-semibold">활용 방법</h4>
        <p className="text-sm leading-6 text-muted-foreground">{report.action_hint}</p>
      </section>
      <section className="grid gap-2 rounded-md border border-[#fee2e2] bg-[#fff7f7] p-4">
        <h4 className="text-sm font-semibold text-[#b42318]">주의할 점</h4>
        <p className="text-sm leading-6 text-[#7a271a]">{report.caution}</p>
      </section>
    </div>
  );
}

function ReportSection({ items, title }: { items: string[]; title: string }) {
  return (
    <section className="grid gap-2 rounded-md border p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item, index) => (
          <li className="flex gap-2" key={`${title}-${index}-${item}`}>
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#3927d9]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PromotionSegmentCreateDialog({
  createIsPending,
  onCreate,
  onOpenChange,
  open
}: {
  createIsPending: boolean;
  onCreate: (form: PromotionSegmentCreateFormState) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [form, setForm] = useState<PromotionSegmentCreateFormState>(
    createEmptyPromotionSegmentFormState()
  );
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(createEmptyPromotionSegmentFormState());
      setJsonError("");
    }
  }, [open]);

  const canSubmit = Boolean(form.segmentName.trim()) && !createIsPending;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>프로모션 세그먼트 후보 추가</DialogTitle>
          <DialogDescription>
            현재 프로모션에 종속되는 세그먼트 후보를 저장합니다. 최종 타겟 반영은 후보 확정 버튼에서
            처리합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {jsonError ? (
            <Alert variant="destructive">
              <AlertTitle>조건 JSON을 확인해주세요</AlertTitle>
              <AlertDescription>{jsonError}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="promotion-segment-name">세그먼트 이름</FieldLabel>
            <Input
              id="promotion-segment-name"
              onChange={(event) => setForm({ ...form, segmentName: event.target.value })}
              placeholder="VIP 장기 미구매 고객"
              value={form.segmentName}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="promotion-segment-natural-query">생성 이유/조건 설명</FieldLabel>
            <Textarea
              id="promotion-segment-natural-query"
              onChange={(event) => setForm({ ...form, naturalLanguageQuery: event.target.value })}
              placeholder="최근 30일 내 상세 조회는 했지만 예약 전환이 없는 고객"
              value={form.naturalLanguageQuery}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="promotion-segment-rule-json">조건 JSON</FieldLabel>
            <Textarea
              className="font-mono text-xs"
              id="promotion-segment-rule-json"
              onChange={(event) => setForm({ ...form, ruleJsonText: event.target.value })}
              value={form.ruleJsonText}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="promotion-segment-sample-size">샘플 수</FieldLabel>
              <Input
                id="promotion-segment-sample-size"
                min="0"
                onChange={(event) => setForm({ ...form, sampleSize: event.target.value })}
                type="number"
                value={form.sampleSize}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="promotion-segment-eligible-size">모수</FieldLabel>
              <Input
                id="promotion-segment-eligible-size"
                min="0"
                onChange={(event) =>
                  setForm({ ...form, totalEligibleUserCount: event.target.value })
                }
                type="number"
                value={form.totalEligibleUserCount}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="promotion-segment-sample-ratio">샘플 비율</FieldLabel>
              <Input
                id="promotion-segment-sample-ratio"
                min="0"
                onChange={(event) => setForm({ ...form, sampleRatio: event.target.value })}
                step="0.001"
                type="number"
                value={form.sampleRatio}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
            취소
          </Button>
          <Button
            className="bg-[#3927d9]"
            disabled={!canSubmit}
            onClick={() => {
              const ruleJson = parseJsonObject(form.ruleJsonText);
              if (!ruleJson) {
                setJsonError("객체 형태의 JSON만 입력할 수 있습니다.");
                return;
              }
              setJsonError("");
              onCreate({ ...form, ruleJsonText: JSON.stringify(ruleJson) });
              onOpenChange(false);
            }}
            type="button"
          >
            {createIsPending ? "저장 중" : "후보 저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PromotionMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-28 content-between rounded-md border bg-[#f2f6ff] p-5">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="truncate text-2xl font-semibold text-[#102033]">{value}</div>
    </div>
  );
}

function PromotionProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{formatInteger(value)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-sm bg-[#e8eefc]">
        <div className="h-full bg-[#3927d9]" style={{ width: `${Math.max(value, 4)}%` }} />
      </div>
    </div>
  );
}

function PromotionAddDialog({
  createError,
  createIsError,
  createIsPending,
  onCreate,
  onOpenChange,
  open
}: {
  createError: Error | null;
  createIsError: boolean;
  createIsPending: boolean;
  onCreate: (form: PromotionCreateFormState) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [form, setForm] = useState<PromotionCreateFormState>(createEmptyPromotionFormState());

  useEffect(() => {
    if (open) {
      setForm(createEmptyPromotionFormState());
    }
  }, [open]);

  const canSubmit =
    Boolean(form.marketingTheme.trim()) && isValidHttpUrl(form.landingUrl) && !createIsPending;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle className="text-2xl font-semibold">새 프로모션 추가</DialogTitle>
          <DialogDescription>
            선택된 캠페인 하위에 새 프로모션을 생성하고 탭으로 엽니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 px-8 py-6">
          {createIsError ? (
            <Alert variant="destructive">
              <AlertTitle>프로모션을 생성하지 못했습니다</AlertTitle>
              <AlertDescription>{mutationErrorMessage(createError)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <Field>
              <FieldLabel htmlFor="promotion-create-theme">프로모션 이름</FieldLabel>
              <Input
                id="promotion-create-theme"
                onChange={(event) => setForm({ ...form, marketingTheme: event.target.value })}
                placeholder="여름 블랙 프라이데이"
                value={form.marketingTheme}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="promotion-create-message-brief">프로모션 설명</FieldLabel>
              <Textarea
                id="promotion-create-message-brief"
                onChange={(event) => setForm({ ...form, messageBrief: event.target.value })}
                placeholder="여름 휴가를 준비하는 20-30대 사용자를 대상으로 제주/오키나와 숙소 예약을 유도하는 여행 프로모션입니다. 인기 여행지, 조기 예약 할인, 후기 기반 추천을 강조합니다."
                rows={4}
                value={form.messageBrief}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>채널</FieldLabel>
                <Select
                  onValueChange={(value) => setForm({ ...form, channel: value })}
                  value={form.channel}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {promotionChannelOptions.map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {formatChannelLabel(channel)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel>목표 지표</FieldLabel>
                <Select
                  onValueChange={(value) => setForm({ ...form, goalMetric: value })}
                  value={form.goalMetric}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {promotionGoalMetricOptions.map((metric) => (
                      <SelectItem key={metric.value} value={metric.value}>
                        {metric.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="promotion-create-goal">목표값</FieldLabel>
                <Input
                  id="promotion-create-goal"
                  min="0"
                  onChange={(event) => setForm({ ...form, goalTargetValue: event.target.value })}
                  step="0.001"
                  type="number"
                  value={form.goalTargetValue}
                />
              </Field>
              <Field>
                <FieldLabel>목표 기준</FieldLabel>
                <Select
                  onValueChange={(value) => setForm({ ...form, goalBasis: value })}
                  value={form.goalBasis}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {promotionGoalBasisOptions.map((basis) => (
                      <SelectItem key={basis} value={basis}>
                        {formatBasisLabel(basis)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="promotion-create-sample">최소 표본</FieldLabel>
                <Input
                  id="promotion-create-sample"
                  min="0"
                  onChange={(event) => setForm({ ...form, minSampleSize: event.target.value })}
                  type="number"
                  value={form.minSampleSize}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="promotion-create-loop">최대 루프</FieldLabel>
                <Input
                  id="promotion-create-loop"
                  min="1"
                  onChange={(event) => setForm({ ...form, maxLoopCount: event.target.value })}
                  type="number"
                  value={form.maxLoopCount}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="promotion-create-landing-url">랜딩 URL</FieldLabel>
              <Input
                id="promotion-create-landing-url"
                onChange={(event) => setForm({ ...form, landingUrl: event.target.value })}
                placeholder={defaultPromotionLandingUrl}
                type="url"
                value={form.landingUrl}
              />
              <p className="text-xs text-muted-foreground">
                발송 링크와 리다이렉트 목적지로 사용할 실제 URL입니다.
              </p>
            </Field>
          </div>
        </div>
        <DialogFooter className="px-8 py-5">
          <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
            취소
          </Button>
          <Button
            className="bg-[#3927d9] px-8"
            disabled={!canSubmit}
            onClick={() => onCreate(form)}
            type="button"
          >
            {createIsPending ? "생성 중" : "프로모션 생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PromotionCreateFormState = {
  channel: string;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: string;
  landingUrl: string;
  marketingTheme: string;
  maxLoopCount: string;
  messageBrief: string;
  minSampleSize: string;
};

function createEmptyPromotionFormState(): PromotionCreateFormState {
  return {
    channel: "email",
    goalBasis: "promotion_average",
    goalMetric: "inflow_rate",
    goalTargetValue: "0.1",
    landingUrl: defaultPromotionLandingUrl,
    marketingTheme: "",
    maxLoopCount: "3",
    messageBrief: "",
    minSampleSize: "1000"
  };
}

function promotionCreateFormToRequest(
  form: PromotionCreateFormState
): DashboardCreatePromotionRequest {
  return {
    channel: form.channel as DashboardCreatePromotionRequest["channel"],
    goal_basis: form.goalBasis as DashboardCreatePromotionRequest["goal_basis"],
    goal_metric: promotionGoalMetricToRequestMetric(form.goalMetric),
    goal_target_value: nonnegativeNumber(form.goalTargetValue),
    landing_url: form.landingUrl.trim(),
    marketing_theme: form.marketingTheme.trim(),
    max_loop_count: positiveInteger(form.maxLoopCount),
    message_brief: form.messageBrief.trim() || null,
    min_sample_size: Math.trunc(nonnegativeNumber(form.minSampleSize)),
    status: "draft"
  };
}

function promotionGoalMetricToRequestMetric(
  metric: string
): DashboardCreatePromotionRequest["goal_metric"] {
  return (
    promotionGoalMetricOptions.find((option) => option.value === metric)?.requestMetric ??
    "inflow_rate"
  );
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

type PromotionSegmentCreateFormState = {
  naturalLanguageQuery: string;
  ruleJsonText: string;
  sampleRatio: string;
  sampleSize: string;
  segmentName: string;
  totalEligibleUserCount: string;
};

function createEmptyPromotionSegmentFormState(): PromotionSegmentCreateFormState {
  return {
    naturalLanguageQuery: "",
    ruleJsonText: JSON.stringify({ source: "manual_rule" }, null, 2),
    sampleRatio: "0",
    sampleSize: "0",
    segmentName: "",
    totalEligibleUserCount: "0"
  };
}

function promotionSegmentCreateFormToRequest(
  form: PromotionSegmentCreateFormState
): DashboardCreatePromotionSegmentDefinitionRequest {
  const sampleSize = Math.trunc(nonnegativeNumber(form.sampleSize));
  const totalEligibleUserCount = Math.trunc(nonnegativeNumber(form.totalEligibleUserCount));

  return {
    natural_language_query: form.naturalLanguageQuery.trim() || null,
    profile_json: {
      source: "dashboard_manual",
      total_eligible_user_count: totalEligibleUserCount
    },
    rule_json: parseJsonObject(form.ruleJsonText) ?? {},
    sample_ratio: nonnegativeNumber(form.sampleRatio),
    sample_size: sampleSize,
    segment_name: form.segmentName.trim(),
    source: "manual_rule",
    total_eligible_user_count: totalEligibleUserCount
  };
}

export function CampaignPromotionTable({
  onSelectPromotion,
  promotions,
  segments,
  selectedPromotionId
}: {
  onSelectPromotion: (promotionId: string) => void;
  promotions: DashboardCampaignPromotion[];
  segments: DashboardCampaignSegment[];
  selectedPromotionId: string;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold text-[#1d1d1f]">프로모션 목록</h3>
          <p className="text-sm text-muted-foreground">
            Promotion → Segment → Ad Experiment 연결 상태를 기준으로 확인합니다.
          </p>
        </div>
      </div>
      {promotions.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>프로모션</TableHead>
              <TableHead>대상 세그먼트</TableHead>
              <TableHead>목표</TableHead>
              <TableHead className="text-right">루프</TableHead>
              <TableHead className="text-right">실험</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>다음 액션</TableHead>
              <TableHead>상세</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.map((promotion) => {
              const promotionSegments = segments.filter(
                (segment) => segment.promotion_id === promotion.promotion_id
              );
              return (
                <TableRow
                  aria-selected={selectedPromotionId === promotion.promotion_id}
                  className="cursor-pointer"
                  key={promotion.promotion_id}
                  onClick={() => onSelectPromotion(promotion.promotion_id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectPromotion(promotion.promotion_id);
                    }
                  }}
                  tabIndex={0}
                >
                  <TableCell>
                    <div className="flex min-w-[220px] flex-col gap-1">
                      <span className="font-medium">{promotion.marketing_theme}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatChannelLabel(promotion.channel)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-[240px] flex-wrap gap-1.5">
                      {promotionSegments.slice(0, 3).map((segment) => (
                        <Badge key={segment.segment_id} variant="outline">
                          {segment.segment_name}
                        </Badge>
                      ))}
                      {promotionSegments.length > 3 ? (
                        <Badge variant="secondary">+{promotionSegments.length - 3}</Badge>
                      ) : null}
                      {promotionSegments.length === 0 ? (
                        <span className="text-sm text-muted-foreground">세그먼트 없음</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid min-w-[160px] gap-1">
                      <span className="text-sm">{formatMetricLabel(promotion.goal_metric)}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatGoalValue(promotion.goal_target_value)} ·{" "}
                        {formatBasisLabel(promotion.goal_basis)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(promotion.current_loop_count)} /{" "}
                    {formatInteger(promotion.max_loop_count)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(promotion.ad_experiment_count)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(promotion.status)}>
                      {formatStatusLabel(promotion.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatActionLabel(promotion.next_action)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectPromotion(promotion.promotion_id);
                      }}
                      size="sm"
                      variant={
                        selectedPromotionId === promotion.promotion_id ? "default" : "outline"
                      }
                    >
                      {selectedPromotionId === promotion.promotion_id ? "열림" : "상세"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState message="등록된 프로모션이 없습니다." />
      )}
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function InsightBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border bg-muted/20 p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap text-sm leading-6">{value || "-"}</div>
    </div>
  );
}

function latestSegmentPerSegmentId(segments: DashboardCampaignSegment[]) {
  const latestSegments = new Map<string, DashboardCampaignSegment>();
  for (const segment of segments) {
    const current = latestSegments.get(segment.segment_id);
    if (!current || compareSegmentLoopRecency(segment, current) < 0) {
      latestSegments.set(segment.segment_id, segment);
    }
  }
  return Array.from(latestSegments.values()).sort(compareSegmentLoopRecency);
}

function compareSegmentLoopRecency(
  segmentA: DashboardCampaignSegment,
  segmentB: DashboardCampaignSegment
) {
  const loopDelta = segmentLoopCount(segmentB) - segmentLoopCount(segmentA);
  if (loopDelta !== 0) {
    return loopDelta;
  }
  return segmentB.analysis_id.localeCompare(segmentA.analysis_id);
}

function segmentLoopCount(segment: DashboardCampaignSegment) {
  const loopMatch = /(?:^|_)loop_(\d+)(?:$|_)/.exec(segment.analysis_id);
  if (!loopMatch) {
    return 1;
  }
  const loopCount = Number(loopMatch[1]);
  return Number.isFinite(loopCount) && loopCount > 0 ? loopCount : 1;
}

function formatGoalValue(value: number) {
  return value <= 1 ? `${formatInteger(value * 100)}%` : formatInteger(value);
}

function formatPercentValue(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

type SegmentDisplayCopy = NonNullable<DashboardPromotionSegmentSuggestion["display_copy"]>;

function campaignSegmentDisplayCopy(segment: DashboardCampaignSegment): SegmentDisplayCopy | null {
  return normalizeSegmentDisplayCopy(segment.data_evidence_json.display_copy);
}

function normalizeSegmentDisplayCopy(value: unknown): SegmentDisplayCopy | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const title = nonEmptyText(raw.title);
  const audienceSummary = nonEmptyText(raw.audience_summary);
  const reason = nonEmptyText(raw.reason);
  const actionHint = nonEmptyText(raw.action_hint);
  if (!title || !audienceSummary || !reason || !actionHint) {
    return null;
  }

  const signalChips = Array.isArray(raw.signal_chips)
    ? raw.signal_chips.map(nonEmptyText).filter((chip): chip is string => chip !== null)
    : [];

  return {
    title,
    audience_summary: audienceSummary,
    signal_chips: signalChips,
    reason,
    action_hint: actionHint
  };
}

function segmentAudienceSummary(sampleSize: number, sampleRatio: number) {
  return `표본 ${formatInteger(sampleSize)}명 · 비율 ${formatInteger(sampleRatio * 100)}%`;
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function contentCandidateTitle(candidate: DashboardSegmentDetail["content_candidates"][number]) {
  return candidate.title ?? candidate.subject ?? candidate.message ?? candidate.content_id;
}

function contentCandidateMessage(candidate: DashboardSegmentDetail["content_candidates"][number]) {
  return candidate.body ?? candidate.message ?? candidate.generation_prompt ?? "-";
}

function hasPendingOnsiteBannerImage(detail: DashboardSegmentDetail | undefined) {
  return Boolean(
    detail?.content_candidates.some(
      (candidate) =>
        candidate.channel === "onsite_banner" && candidate.image_prompt && !candidate.image_url
    )
  );
}

function insufficientReason(metric: DashboardSegmentDetail["experiment_metrics"][number]) {
  const reason =
    pickJsonString(metric.result_json, ["insufficient_reason", "reason", "message", "note"]) ??
    metric.feedback;
  const minimumRequiredSampleSize = pickJsonNumber(metric.result_json, [
    "minimum_required_sample_size",
    "min_sample_size"
  ]);
  const assignedUserCount = pickJsonNumber(metric.result_json, [
    "assigned_user_count",
    "final_assigned_user_count"
  ]);
  const sampleReason =
    minimumRequiredSampleSize === null
      ? null
      : `최소 필요 ${formatInteger(minimumRequiredSampleSize)}명`;
  const assignedReason =
    assignedUserCount === null ? null : `최종 배정 ${formatInteger(assignedUserCount)}명`;

  return [reason, assignedReason, sampleReason].filter(Boolean).join(" · ") || "-";
}

function pickJsonString(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const item = value[key];
    if (typeof item === "string" && item.trim()) {
      return item;
    }
  }
  return null;
}

function pickJsonNumber(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const item = value[key];
    if (typeof item === "number" && Number.isFinite(item)) {
      return item;
    }
    if (typeof item === "string") {
      const numberValue = Number(item);
      if (Number.isFinite(numberValue)) {
        return numberValue;
      }
    }
  }
  return null;
}

function statusBadgeVariant(status: string) {
  if (status.includes("goal_met") || status === "active" || status === "running") {
    return "default" as const;
  }
  if (status.includes("not_met") || status === "failed" || status === "stopped") {
    return "destructive" as const;
  }
  if (status.includes("insufficient") || status.includes("near")) {
    return "secondary" as const;
  }
  return "outline" as const;
}

function formatJsonObject(value: Record<string, unknown>): string {
  return Object.entries(value)
    .slice(0, 3)
    .map(([key, item]) => `${key}: ${formatJsonValue(item)}`)
    .join(" · ");
}

function formatJsonValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatJsonValue).join(", ");
  }
  if (value && typeof value === "object") {
    return Object.keys(value).join(", ");
  }
  return "";
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function mutationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function nonnegativeNumber(value: string): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
}

function positiveInteger(value: string): number {
  const numberValue = Math.trunc(Number(value));
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 1;
}
