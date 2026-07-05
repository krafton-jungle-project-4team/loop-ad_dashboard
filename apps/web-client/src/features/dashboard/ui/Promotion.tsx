import type {
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCreatePromotionSegmentDefinitionRequest,
  DashboardCreatePromotionRequest,
  DashboardMain,
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionSegmentSuggestion
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
import { BarChart3, CheckCircle2, Plus, Target, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  confirmDashboardPromotionSegmentSuggestions,
  createDashboardPromotion,
  createDashboardPromotionScopedSegmentDefinition,
  deleteDashboardPromotion,
  decideDashboardPromotionSegmentSuggestion,
  fetchDashboardCampaignDetail,
  fetchDashboardPromotionScopedSegmentDefinitions,
  fetchDashboardPromotionSegmentSuggestions
} from "../api/dashboard-api.js";
import { formatInteger } from "../model/dashboard-format.js";
import { useDashboardQueryState } from "../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardPromotionScopedSegmentDefinitionsQueryKey,
  dashboardPromotionSegmentSuggestionsQueryKey
} from "../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { EmptyState } from "./EmptyState.js";

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
  "inflow_rate",
  "booking_conversion_rate",
  "funnel_step_rate"
] as const;
const promotionGoalBasisOptions = ["promotion_average", "all_segments"] as const;

export function PromotionPanel({ data, query }: { data: DashboardMain; query: DashboardQuery }) {
  const queryClient = useQueryClient();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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
    if (!campaignDetail.data || selectedPromotionId || campaignDetail.data.promotions.length === 0) {
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
  }, [
    campaignDetail.data,
    selectedCampaignId,
    selectedPromotionId,
    setDashboardQueryState
  ]);

  const openPromotions = uniquePromotionsById(campaignDetail.data?.promotions ?? []);
  const selectedOpenPromotion =
    openPromotions.find((promotion) => promotion.promotion_id === selectedPromotionId) ??
    openPromotions[0];
  const selectedPromotionSegments =
    campaignDetail.data?.segments.filter(
      (segment) => segment.promotion_id === selectedOpenPromotion?.promotion_id
    ) ?? [];
  const segmentSuggestions = useQuery({
    enabled: Boolean(selectedOpenPromotion?.promotion_id),
    queryFn: ({ signal }) =>
      fetchDashboardPromotionSegmentSuggestions(
        query,
        selectedOpenPromotion?.promotion_id ?? "",
        signal
      ),
    queryKey: dashboardPromotionSegmentSuggestionsQueryKey(
      query.projectId,
      selectedOpenPromotion?.promotion_id ?? ""
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
          selectedOpenPromotion?.promotion_id ?? ""
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
          selectedOpenPromotion?.promotion_id ?? ""
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

  const closePromotion = (promotionId: string) => {
    deletePromotionMutation.mutate(promotionId);
  };

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
        {!selectedCampaign ? <EmptyState message="프로모션을 관리할 캠페인을 선택해주세요." /> : null}
        {selectedCampaign && campaignDetail.isLoading ? (
          <EmptyState message="프로모션 데이터를 불러오는 중입니다." />
        ) : null}
        {campaignDetail.data ? (
          <>
            {openPromotions.length === 0 ? (
              <PromotionEmptyState
                onAdd={() => setIsAddDialogOpen(true)}
              />
            ) : null}
            {selectedOpenPromotion ? (
              <PromotionTabWorkspace
                confirmError={confirmSuggestionsMutation.error}
                confirmIsError={confirmSuggestionsMutation.isError}
                confirmIsPending={confirmSuggestionsMutation.isPending}
                decideError={decideSuggestionMutation.error}
                decideIsError={decideSuggestionMutation.isError}
                decideIsPending={decideSuggestionMutation.isPending}
                onConfirmSuggestions={() => confirmSuggestionsMutation.mutate()}
                onCreateScopedSegment={(form) => createScopedSegmentMutation.mutate(form)}
                onDecideSuggestion={(suggestionId, status) =>
                  decideSuggestionMutation.mutate({ status, suggestionId })
                }
                promotion={selectedOpenPromotion}
                segments={selectedPromotionSegments}
                scopedSegments={scopedSegmentDefinitions.data?.segments ?? []}
                scopedSegmentsError={scopedSegmentDefinitions.error}
                scopedSegmentsIsError={scopedSegmentDefinitions.isError}
                scopedSegmentsIsLoading={scopedSegmentDefinitions.isLoading}
                scopedSegmentCreateError={createScopedSegmentMutation.error}
                scopedSegmentCreateIsError={createScopedSegmentMutation.isError}
                scopedSegmentCreateIsPending={createScopedSegmentMutation.isPending}
                suggestions={segmentSuggestions.data?.suggestions ?? []}
                suggestionsError={segmentSuggestions.error}
                suggestionsIsError={segmentSuggestions.isError}
                suggestionsIsLoading={segmentSuggestions.isLoading}
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

function PromotionEmptyState({
  onAdd
}: {
  onAdd: () => void;
}) {
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
            새 프로모션을 생성하면 현재 캠페인의 프로모션 탭으로 열립니다. 진행 중인 캠페인의
            상세 지표와 워크플로우를 한눈에 관리할 수 있습니다.
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
  confirmError,
  confirmIsError,
  confirmIsPending,
  decideError,
  decideIsError,
  decideIsPending,
  onConfirmSuggestions,
  onCreateScopedSegment,
  onDecideSuggestion,
  promotion,
  scopedSegmentCreateError,
  scopedSegmentCreateIsError,
  scopedSegmentCreateIsPending,
  scopedSegments,
  scopedSegmentsError,
  scopedSegmentsIsError,
  scopedSegmentsIsLoading,
  segments,
  suggestions,
  suggestionsError,
  suggestionsIsError,
  suggestionsIsLoading
}: {
  confirmError: Error | null;
  confirmIsError: boolean;
  confirmIsPending: boolean;
  decideError: Error | null;
  decideIsError: boolean;
  decideIsPending: boolean;
  onConfirmSuggestions: () => void;
  onCreateScopedSegment: (form: PromotionSegmentCreateFormState) => void;
  onDecideSuggestion: (suggestionId: string, status: "accepted" | "dismissed") => void;
  promotion: DashboardCampaignPromotion;
  scopedSegmentCreateError: Error | null;
  scopedSegmentCreateIsError: boolean;
  scopedSegmentCreateIsPending: boolean;
  scopedSegments: DashboardPromotionScopedSegmentDefinition[];
  scopedSegmentsError: Error | null;
  scopedSegmentsIsError: boolean;
  scopedSegmentsIsLoading: boolean;
  segments: DashboardCampaignSegment[];
  suggestions: DashboardPromotionSegmentSuggestion[];
  suggestionsError: Error | null;
  suggestionsIsError: boolean;
  suggestionsIsLoading: boolean;
}) {
  const activeSegments = segments.filter((segment) => segment.status !== "stopped");
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="text-sm font-medium text-[#3927d9]">Promotion View</div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#102033]">
            {promotion.marketing_theme}
          </h2>
          <p className="text-sm text-muted-foreground">
            {promotion.channel} · {promotion.target_audience} · {promotion.promotion_id}
          </p>
        </div>
        <Badge variant={statusBadgeVariant(promotion.status)}>{promotion.status}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <PromotionMetricCard label="목표 지표" value={promotion.goal_metric} />
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
              <SummaryItem label="목표 기준" value={promotion.goal_basis} />
              <SummaryItem label="최소 표본" value={formatInteger(promotion.min_sample_size)} />
              <SummaryItem label="다음 액션" value={promotion.next_action} />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">세그먼트</CardTitle>
              <CardDescription>선택 프로모션에 연결된 세그먼트입니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {segments.length > 0 ? (
                segments.map((segment) => (
                  <div className="rounded-md border p-3" key={segment.segment_id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{segment.segment_name}</div>
                      <Badge variant={statusBadgeVariant(segment.status)}>{segment.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatInteger(segment.estimated_size)}명 · {segment.goal_metric}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="연결된 세그먼트가 없습니다." />
              )}
            </CardContent>
          </Card>
          <Card className="border-[#3927d9]/20 bg-[#f2f6ff] shadow-none">
            <CardContent className="grid gap-2 p-5">
              <div className="flex items-center gap-2 font-semibold text-[#3927d9]">
                <CheckCircle2 className="size-4" />
                Optimization Hint
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                목표 달성률과 세그먼트 반응을 기준으로 다음 루프 분석 후보를 확인하세요.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
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
        onConfirmSuggestions={onConfirmSuggestions}
        onCreateScopedSegment={onCreateScopedSegment}
        onDecideSuggestion={onDecideSuggestion}
        scopedSegments={scopedSegments}
        scopedSegmentsError={scopedSegmentsError}
        scopedSegmentsIsError={scopedSegmentsIsError}
        scopedSegmentsIsLoading={scopedSegmentsIsLoading}
        suggestions={suggestions}
        suggestionsError={suggestionsError}
        suggestionsIsError={suggestionsIsError}
        suggestionsIsLoading={suggestionsIsLoading}
      />
    </section>
  );
}

function PromotionSegmentSuggestionPanel({
  confirmError,
  confirmIsError,
  confirmIsPending,
  createScopedSegmentError,
  createScopedSegmentIsError,
  createScopedSegmentIsPending,
  decideError,
  decideIsError,
  decideIsPending,
  onConfirmSuggestions,
  onCreateScopedSegment,
  onDecideSuggestion,
  scopedSegments,
  scopedSegmentsError,
  scopedSegmentsIsError,
  scopedSegmentsIsLoading,
  suggestions,
  suggestionsError,
  suggestionsIsError,
  suggestionsIsLoading
}: {
  confirmError: Error | null;
  confirmIsError: boolean;
  confirmIsPending: boolean;
  createScopedSegmentError: Error | null;
  createScopedSegmentIsError: boolean;
  createScopedSegmentIsPending: boolean;
  decideError: Error | null;
  decideIsError: boolean;
  decideIsPending: boolean;
  onConfirmSuggestions: () => void;
  onCreateScopedSegment: (form: PromotionSegmentCreateFormState) => void;
  onDecideSuggestion: (suggestionId: string, status: "accepted" | "dismissed") => void;
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
            AI가 제안한 후보와 직접 추가한 후보를 확인합니다. 확정 시 최종 타겟 세그먼트로 저장됩니다.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
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
                <div className="grid gap-3 rounded-md border bg-[#f7fbff] p-4" key={segment.segment_id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <div className="text-xs font-semibold text-[#3927d9]">{segment.source}</div>
                      <h3 className="text-base font-semibold">{segment.segment_name}</h3>
                      <p className="text-xs text-muted-foreground">{segment.segment_id}</p>
                    </div>
                    <Badge variant={statusBadgeVariant(segment.status)}>{segment.status}</Badge>
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
                      <h3 className="text-base font-semibold">{suggestion.segment_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.segment_source} · {suggestion.suggestion_source}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(suggestion.suggestion_status)}>
                      {suggestion.suggestion_status}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div>
                      표본 {formatInteger(suggestion.sample_size)}명 · 비율{" "}
                      {formatInteger(suggestion.sample_ratio * 100)}%
                    </div>
                    <div className="line-clamp-2">
                      {formatJsonObject(suggestion.reason_json) || "추천 사유가 비어 있습니다."}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                      제외
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
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
            현재 프로모션에 종속되는 세그먼트 후보를 저장합니다. 최종 타겟 반영은 후보 확정
            버튼에서 처리합니다.
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
              onChange={(event) =>
                setForm({ ...form, naturalLanguageQuery: event.target.value })
              }
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

  const canSubmit = Boolean(form.marketingTheme.trim()) && !createIsPending;

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
                placeholder="Main Sale Event 2024"
                value={form.marketingTheme}
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
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="promotion-create-audience">대상 범위</FieldLabel>
                <Input
                  id="promotion-create-audience"
                  onChange={(event) => setForm({ ...form, targetAudience: event.target.value })}
                  placeholder="existing_users"
                  value={form.targetAudience}
                />
                <p className="text-xs text-muted-foreground">
                  세그먼트는 프로모션 생성 후 프로모션 상세의 세그먼트 목록에서 생성/연결합니다.
                </p>
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
                      <SelectItem key={metric} value={metric}>
                        {metric}
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
                        {basis}
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
  marketingTheme: string;
  maxLoopCount: string;
  minSampleSize: string;
  targetAudience: string;
};

function createEmptyPromotionFormState(): PromotionCreateFormState {
  return {
    channel: "email",
    goalBasis: "promotion_average",
    goalMetric: "inflow_rate",
    goalTargetValue: "0.1",
    marketingTheme: "",
    maxLoopCount: "3",
    minSampleSize: "1000",
    targetAudience: "existing_users"
  };
}

function promotionCreateFormToRequest(
  form: PromotionCreateFormState
): DashboardCreatePromotionRequest {
  return {
    channel: form.channel as DashboardCreatePromotionRequest["channel"],
    goal_basis: form.goalBasis as DashboardCreatePromotionRequest["goal_basis"],
    goal_metric: form.goalMetric as DashboardCreatePromotionRequest["goal_metric"],
    goal_target_value: nonnegativeNumber(form.goalTargetValue),
    marketing_theme: form.marketingTheme.trim(),
    max_loop_count: positiveInteger(form.maxLoopCount),
    min_sample_size: Math.trunc(nonnegativeNumber(form.minSampleSize)),
    status: "draft",
    target_audience: form.targetAudience.trim() || "existing_users"
  };
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
  const [promotionSearch, setPromotionSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const activeCount = promotions.filter((promotion) => promotion.status === "active").length;
  const normalizedSearch = promotionSearch.trim().toLowerCase();
  const filteredPromotions = promotions.filter((promotion) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        promotion.promotion_id,
        promotion.marketing_theme,
        promotion.channel,
        promotion.target_audience,
        promotion.goal_metric,
        promotion.goal_basis,
        promotion.next_action,
        promotion.message_brief ?? ""
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesStatus = statusFilter === "all" || promotion.status === statusFilter;
    const matchesChannel = channelFilter === "all" || promotion.channel === channelFilter;

    return matchesSearch && matchesStatus && matchesChannel;
  });
  const totalExperimentCount = promotions.reduce(
    (sum, promotion) => sum + promotion.ad_experiment_count,
    0
  );

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
      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <Field>
          <FieldLabel htmlFor="dashboard-promotion-search">프로모션 검색</FieldLabel>
          <Input
            id="dashboard-promotion-search"
            onChange={(event) => setPromotionSearch(event.target.value)}
            placeholder="이름, ID, 채널, 목표, 메시지 방향"
            value={promotionSearch}
          />
        </Field>
        <Field>
          <FieldLabel>상태 필터</FieldLabel>
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              {promotionStatusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>채널 필터</FieldLabel>
          <Select onValueChange={setChannelFilter} value={channelFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 채널</SelectItem>
              {promotionChannelOptions.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {channel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="전체 프로모션" value={formatInteger(promotions.length)} />
        <SummaryItem label="필터 결과" value={formatInteger(filteredPromotions.length)} />
        <SummaryItem label="활성 프로모션" value={formatInteger(activeCount)} />
        <SummaryItem label="연결 세그먼트" value={formatInteger(segments.length)} />
        <SummaryItem label="광고 실험" value={formatInteger(totalExperimentCount)} />
      </div>
      {promotions.length > 0 ? (
        filteredPromotions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>프로모션</TableHead>
                <TableHead>대상</TableHead>
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
              {filteredPromotions.map((promotion) => {
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
                          {promotion.channel} · {promotion.promotion_id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{promotion.target_audience}</TableCell>
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
                        <span className="text-sm">{promotion.goal_metric}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatGoalValue(promotion.goal_target_value)} · {promotion.goal_basis}
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
                      <Badge variant={statusBadgeVariant(promotion.status)}>{promotion.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{promotion.next_action}</Badge>
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
          <EmptyState message="검색/필터 조건에 맞는 프로모션이 없습니다." />
        )
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

function formatGoalValue(value: number) {
  return value <= 1 ? `${formatInteger(value * 100)}%` : formatInteger(value);
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

function nonnegativeNumber(value: string): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
}

function positiveInteger(value: string): number {
  const numberValue = Math.trunc(Number(value));
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 1;
}
