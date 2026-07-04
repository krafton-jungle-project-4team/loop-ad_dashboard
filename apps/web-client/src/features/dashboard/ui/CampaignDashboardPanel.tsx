import type {
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardMain,
  DashboardPromotionDetail as DashboardPromotionDetailResource,
  DashboardRealtimeMetrics,
  DashboardSavedSegment,
  DashboardSegmentDetail as DashboardSegmentDetailResource,
  DashboardSegmentQueryPreview
} from "@loopad/shared";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "@loopad/ui/charts";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@loopad/ui/shadcn/chart";
import { Field, FieldGroup, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { Progress } from "@loopad/ui/shadcn/progress";
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
import { Tabs, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  approveDashboardContentCandidate,
  attachDashboardSegmentToPromotion,
  createDashboardCampaign,
  createDashboardPromotion,
  createDashboardSegmentQueryPreview,
  deleteDashboardCampaign,
  deleteDashboardPromotionSegment,
  deleteDashboardPromotion,
  fetchDashboardCampaignDetail,
  fetchDashboardPromotionDetail,
  fetchDashboardSavedSegments,
  fetchDashboardSegmentDetail,
  saveDashboardSegment,
  startDashboardNextLoopAnalysis,
  updateDashboardCampaign,
  updateDashboardPromotion,
  updateDashboardPromotionSegment
} from "../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../model/dashboard-format.js";
import { useDashboardQueryState } from "../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardPromotionDetailQueryKey,
  dashboardSavedSegmentsQueryKey,
  dashboardSegmentDetailQueryKey
} from "../model/dashboard-query-keys.js";
import type { DashboardQuery, DashboardTab } from "../model/dashboard-types.js";
import { EmptyState } from "./EmptyState.js";

const campaignPrimaryMetricOptions = [
  "inflow_rate",
  "booking_conversion_rate",
  "funnel_step_rate",
  "promotion_click_rate",
  "goal_achievement_rate"
] as const;

const campaignStatusOptions = ["draft", "active", "paused", "completed", "stopped"] as const;

type CreateCampaignInput = Parameters<typeof createDashboardCampaign>[1];
type UpdateCampaignInput = Parameters<typeof updateDashboardCampaign>[2];
type CreatePromotionInput = Parameters<typeof createDashboardPromotion>[2];
type UpdatePromotionInput = Parameters<typeof updateDashboardPromotion>[2];
type AttachSegmentInput = Parameters<typeof attachDashboardSegmentToPromotion>[2];
type UpdatePromotionSegmentInput = Parameters<typeof updateDashboardPromotionSegment>[3];

const promotionChannelOptions = ["email", "sms", "onsite_banner"] as const;
const promotionGoalMetricOptions = [
  "inflow_rate",
  "booking_conversion_rate",
  "funnel_step_rate"
] as const;
const promotionGoalBasisOptions = ["promotion_average", "all_segments"] as const;
const promotionLandingTypeOptions = ["search_page", "hotel_detail_page", "booking_resume"] as const;
const promotionStatusOptions = [
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
const segmentPriorityOptions = ["low", "medium", "high"] as const;
const promotionSegmentStatusOptions = [
  "planned",
  "content_ready",
  "approved",
  "running",
  "goal_met",
  "goal_not_met",
  "insufficient_data",
  "stopped"
] as const;

export function CampaignDashboardPanel({
  data,
  query,
  tab
}: {
  data: DashboardMain;
  query: DashboardQuery;
  tab: DashboardTab;
}) {
  const queryClient = useQueryClient();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const selectedPromotionId = query.selectedPromotionId;
  const selectedSegmentId = query.selectedSegmentId;
  const selectedCampaign =
    data.campaigns.find((campaign) => campaign.campaign_id === query.selectedCampaignId) ??
    data.campaigns[0];
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const campaignDetail = useQuery({
    enabled: Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });
  const promotionDetail = useQuery({
    enabled: Boolean(selectedPromotionId),
    queryFn: ({ signal }) => fetchDashboardPromotionDetail(query, selectedPromotionId, signal),
    queryKey: dashboardPromotionDetailQueryKey(query.projectId, selectedPromotionId)
  });
  const segmentDetail = useQuery({
    enabled: Boolean(selectedPromotionId && selectedSegmentId),
    queryFn: ({ signal }) =>
      fetchDashboardSegmentDetail(query, selectedPromotionId, selectedSegmentId, signal),
    queryKey: dashboardSegmentDetailQueryKey(
      query.projectId,
      selectedPromotionId,
      selectedSegmentId
    )
  });
  const savedSegments = useQuery({
    queryFn: ({ signal }) => fetchDashboardSavedSegments(query, signal),
    queryKey: dashboardSavedSegmentsQueryKey(query.projectId)
  });
  const selectedPromotion = campaignDetail.data?.promotions.find(
    (promotion) => promotion.promotion_id === selectedPromotionId
  );
  const selectedSegment = (promotionDetail.data?.segments ?? campaignDetail.data?.segments ?? []).find(
    (segment) =>
      segment.segment_id === selectedSegmentId &&
      (!selectedPromotionId || segment.promotion_id === selectedPromotionId)
  );
  const createCampaignMutation = useMutation({
    mutationFn: (requestBody: Parameters<typeof createDashboardCampaign>[1]) =>
      createDashboardCampaign(query, requestBody),
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({
        selectedCampaignId: campaign.campaign_id,
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
    }
  });
  const updateCampaignMutation = useMutation({
    mutationFn: ({
      campaignId,
      requestBody
    }: {
      campaignId: string;
      requestBody: Parameters<typeof updateDashboardCampaign>[2];
    }) => updateDashboardCampaign(query, campaignId, requestBody),
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({
        selectedCampaignId: campaign.campaign_id,
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
    }
  });
  const stopCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => deleteDashboardCampaign(query, campaignId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (query.selectedCampaignId === result.campaign_id) {
        await setDashboardQueryState({
          selectedCampaignId: "",
          selectedPromotionId: "",
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
    if (!selectedSegmentId || !selectedPromotionId || !promotionDetail.data) {
      return;
    }

    const hasSelectedSegment = promotionDetail.data.segments.some(
      (segment) => segment.segment_id === selectedSegmentId
    );
    if (!hasSelectedSegment) {
      void setDashboardQueryState({ selectedSegmentId: "" });
    }
  }, [promotionDetail.data, selectedPromotionId, selectedSegmentId, setDashboardQueryState]);

  return (
    <div className="grid gap-6">
      <CampaignManagementPanel
        campaign={selectedCampaign}
        createError={createCampaignMutation.error}
        createIsError={createCampaignMutation.isError}
        createIsPending={createCampaignMutation.isPending}
        onCreate={(requestBody) => createCampaignMutation.mutate(requestBody)}
        onStop={(campaignId) => stopCampaignMutation.mutate(campaignId)}
        onUpdate={(campaignId, requestBody) =>
          updateCampaignMutation.mutate({ campaignId, requestBody })
        }
        stopError={stopCampaignMutation.error}
        stopIsError={stopCampaignMutation.isError}
        stopIsPending={stopCampaignMutation.isPending}
        updateError={updateCampaignMutation.error}
        updateIsError={updateCampaignMutation.isError}
        updateIsPending={updateCampaignMutation.isPending}
      />
      <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
        <CardHeader className="gap-1.5 px-5">
          <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
            캠페인 목록
          </CardTitle>
          <CardDescription>
            Campaign → Promotion → Segment → Ad Experiment 실행 구조를 기준으로 조회합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          {data.campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>캠페인</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-right">프로모션</TableHead>
                  <TableHead className="text-right">세그먼트</TableHead>
                  <TableHead className="text-right">실험</TableHead>
                  <TableHead className="text-right">최근 목표 달성률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.campaigns.map((campaign) => (
                  <CampaignRow
                    campaign={campaign}
                    isSelected={selectedCampaignId === campaign.campaign_id}
                    key={campaign.campaign_id}
                    onSelect={(campaignId) => {
                      void setDashboardQueryState({
                        selectedCampaignId: campaignId,
                        selectedPromotionId: "",
                        selectedSegmentId: ""
                      });
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState message="등록된 캠페인이 없습니다." />
          )}
        </CardContent>
      </Card>

      <CampaignSelectionContext
        campaign={selectedCampaign}
        onClearPromotion={() => {
          void setDashboardQueryState({ selectedPromotionId: "", selectedSegmentId: "" });
        }}
        onClearSegment={() => {
          void setDashboardQueryState({ selectedSegmentId: "" });
        }}
        promotion={selectedPromotion}
        segment={selectedSegment}
      />

      <CampaignDetailPanel
        campaign={selectedCampaign}
        detail={campaignDetail.data}
        error={campaignDetail.error}
        isError={campaignDetail.isError}
        isLoading={campaignDetail.isLoading}
        onSelectPromotion={(promotionId) => {
          void setDashboardQueryState({ selectedPromotionId: promotionId, selectedSegmentId: "" });
        }}
        onClearPromotion={() => {
          void setDashboardQueryState({ selectedPromotionId: "", selectedSegmentId: "" });
        }}
        onClearSegment={() => {
          void setDashboardQueryState({ selectedSegmentId: "" });
        }}
        onSelectSegment={(promotionId, segmentId) => {
          void setDashboardQueryState({
            selectedPromotionId: promotionId,
            selectedSegmentId: segmentId
          });
        }}
        promotionDetail={promotionDetail.data}
        promotionError={promotionDetail.error}
        promotionIsError={promotionDetail.isError}
        promotionIsLoading={promotionDetail.isLoading}
        query={query}
        savedSegments={savedSegments.data?.segments ?? []}
        savedSegmentsError={savedSegments.error}
        savedSegmentsIsError={savedSegments.isError}
        savedSegmentsIsLoading={savedSegments.isLoading}
        segmentDetail={segmentDetail.data}
        segmentError={segmentDetail.error}
        segmentIsError={segmentDetail.isError}
        segmentIsLoading={segmentDetail.isLoading}
        selectedPromotionId={selectedPromotionId}
        selectedSegmentId={selectedSegmentId}
        tab={tab}
      />
    </div>
  );
}

function CampaignSelectionContext({
  campaign,
  onClearPromotion,
  onClearSegment,
  promotion,
  segment
}: {
  campaign: DashboardCampaignSummary | undefined;
  onClearPromotion: () => void;
  onClearSegment: () => void;
  promotion: DashboardCampaignPromotion | undefined;
  segment: DashboardCampaignSegment | undefined;
}) {
  if (!campaign) {
    return null;
  }

  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-4 shadow-none ring-1 ring-black/10">
      <CardContent className="flex flex-wrap items-center gap-2 px-5">
        <Badge variant="secondary">Campaign</Badge>
        <span className="text-sm font-medium">{campaign.campaign_name}</span>
        {promotion ? (
          <>
            <span className="text-sm text-muted-foreground">/</span>
            <Badge variant="secondary">Promotion</Badge>
            <span className="text-sm font-medium">{promotion.marketing_theme}</span>
            <Button onClick={onClearPromotion} size="xs" type="button" variant="ghost">
              선택 해제
            </Button>
          </>
        ) : null}
        {segment ? (
          <>
            <span className="text-sm text-muted-foreground">/</span>
            <Badge variant="secondary">Segment</Badge>
            <span className="text-sm font-medium">{segment.segment_name}</span>
            <Button onClick={onClearSegment} size="xs" type="button" variant="ghost">
              선택 해제
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CampaignManagementPanel({
  campaign,
  createError,
  createIsError,
  createIsPending,
  onCreate,
  onStop,
  onUpdate,
  stopError,
  stopIsError,
  stopIsPending,
  updateError,
  updateIsError,
  updateIsPending
}: {
  campaign: DashboardCampaignSummary | undefined;
  createError: Error | null;
  createIsError: boolean;
  createIsPending: boolean;
  onCreate: (requestBody: CreateCampaignInput) => void;
  onStop: (campaignId: string) => void;
  onUpdate: (campaignId: string, requestBody: UpdateCampaignInput) => void;
  stopError: Error | null;
  stopIsError: boolean;
  stopIsPending: boolean;
  updateError: Error | null;
  updateIsError: boolean;
  updateIsPending: boolean;
}) {
  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          캠페인 관리
        </CardTitle>
        <CardDescription>
          1.7 기준 Campaign 최상위 단위를 생성하고 상태를 관리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 px-5">
        {createIsError ? (
          <Alert variant="destructive">
            <AlertTitle>캠페인을 생성하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(createError)}</AlertDescription>
          </Alert>
        ) : null}
        {updateIsError ? (
          <Alert variant="destructive">
            <AlertTitle>캠페인을 수정하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(updateError)}</AlertDescription>
          </Alert>
        ) : null}
        {stopIsError ? (
          <Alert variant="destructive">
            <AlertTitle>캠페인을 중지하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(stopError)}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <CampaignCreateForm isPending={createIsPending} onSubmit={onCreate} />
          <CampaignEditForm
            campaign={campaign}
            isPending={updateIsPending || stopIsPending}
            onStop={onStop}
            onSubmit={onUpdate}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignCreateForm({
  isPending,
  onSubmit
}: {
  isPending: boolean;
  onSubmit: (requestBody: CreateCampaignInput) => void;
}) {
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState("");
  const [targetAudience, setTargetAudience] = useState("existing_users");
  const [primaryMetric, setPrimaryMetric] = useState<string>("none");
  const [status, setStatus] = useState<CreateCampaignInput["status"]>("draft");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const canSubmit = Boolean(campaignName.trim()) && !isPending;

  return (
    <section className="grid gap-3 rounded-md border bg-muted/20 p-4">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-foreground">캠페인 생성</h3>
        <p className="text-sm text-muted-foreground">
          생성된 캠페인은 프로모션과 세그먼트의 상위 작업 단위가 됩니다.
        </p>
      </div>
      <CampaignFormFields
        campaignName={campaignName}
        endDate={endDate}
        objective={objective}
        onCampaignNameChange={setCampaignName}
        onEndDateChange={setEndDate}
        onObjectiveChange={setObjective}
        onPrimaryMetricChange={setPrimaryMetric}
        onStartDateChange={setStartDate}
        onStatusChange={(nextStatus) => setStatus(nextStatus as CreateCampaignInput["status"])}
        onTargetAudienceChange={setTargetAudience}
        primaryMetric={primaryMetric}
        startDate={startDate}
        status={status}
        targetAudience={targetAudience}
      />
      <div className="flex justify-end">
        <Button
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({
              campaign_name: campaignName.trim(),
              end_date: nullableDate(endDate),
              objective: nullableText(objective),
              primary_metric: nullableMetric(primaryMetric),
              start_date: nullableDate(startDate),
              status,
              target_audience: targetAudience.trim() || "existing_users"
            })
          }
          type="button"
        >
          {isPending ? "생성 중" : "캠페인 생성"}
        </Button>
      </div>
    </section>
  );
}

function CampaignEditForm({
  campaign,
  isPending,
  onStop,
  onSubmit
}: {
  campaign: DashboardCampaignSummary | undefined;
  isPending: boolean;
  onStop: (campaignId: string) => void;
  onSubmit: (campaignId: string, requestBody: UpdateCampaignInput) => void;
}) {
  const [campaignName, setCampaignName] = useState(campaign?.campaign_name ?? "");
  const [objective, setObjective] = useState(campaign?.objective ?? "");
  const [targetAudience, setTargetAudience] = useState("existing_users");
  const [primaryMetric, setPrimaryMetric] = useState<string>(campaign?.primary_metric ?? "none");
  const [status, setStatus] = useState<string>(campaign?.status ?? "draft");
  const [startDate, setStartDate] = useState(campaign?.start_date ?? "");
  const [endDate, setEndDate] = useState(campaign?.end_date ?? "");

  useEffect(() => {
    setCampaignName(campaign?.campaign_name ?? "");
    setObjective(campaign?.objective ?? "");
    setPrimaryMetric(campaign?.primary_metric ?? "none");
    setStatus(campaign?.status ?? "draft");
    setStartDate(campaign?.start_date ?? "");
    setEndDate(campaign?.end_date ?? "");
  }, [campaign]);

  if (!campaign) {
    return (
      <section className="grid place-items-center rounded-md border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        수정할 캠페인을 목록에서 선택해주세요.
      </section>
    );
  }

  const canSubmit = Boolean(campaignName.trim()) && !isPending;

  return (
    <section className="grid gap-3 rounded-md border bg-muted/20 p-4">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-foreground">선택 캠페인 수정</h3>
        <p className="text-sm text-muted-foreground">
          FK가 연결된 캠페인은 삭제 대신 stopped 상태로 전환합니다.
        </p>
      </div>
      <CampaignFormFields
        campaignName={campaignName}
        endDate={endDate}
        objective={objective}
        onCampaignNameChange={setCampaignName}
        onEndDateChange={setEndDate}
        onObjectiveChange={setObjective}
        onPrimaryMetricChange={setPrimaryMetric}
        onStartDateChange={setStartDate}
        onStatusChange={setStatus}
        onTargetAudienceChange={setTargetAudience}
        primaryMetric={primaryMetric}
        startDate={startDate}
        status={status}
        targetAudience={targetAudience}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={isPending || campaign.status === "stopped"}
          onClick={() => onStop(campaign.campaign_id)}
          type="button"
          variant="outline"
        >
          {isPending ? "처리 중" : "캠페인 중지"}
        </Button>
        <Button
          disabled={!canSubmit}
          onClick={() =>
            onSubmit(campaign.campaign_id, {
              campaign_name: campaignName.trim(),
              end_date: nullableDate(endDate),
              objective: nullableText(objective),
              primary_metric: nullableMetric(primaryMetric),
              start_date: nullableDate(startDate),
              status: status as UpdateCampaignInput["status"],
              target_audience: targetAudience.trim() || "existing_users"
            })
          }
          type="button"
        >
          {isPending ? "저장 중" : "수정 저장"}
        </Button>
      </div>
    </section>
  );
}

function CampaignFormFields({
  campaignName,
  endDate,
  objective,
  onCampaignNameChange,
  onEndDateChange,
  onObjectiveChange,
  onPrimaryMetricChange,
  onStartDateChange,
  onStatusChange,
  onTargetAudienceChange,
  primaryMetric,
  startDate,
  status,
  targetAudience
}: {
  campaignName: string;
  endDate: string;
  objective: string;
  onCampaignNameChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onObjectiveChange: (value: string) => void;
  onPrimaryMetricChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTargetAudienceChange: (value: string) => void;
  primaryMetric: string;
  startDate: string;
  status: string;
  targetAudience: string;
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="dashboard-campaign-name">캠페인 이름</FieldLabel>
        <Input
          id="dashboard-campaign-name"
          onChange={(event) => onCampaignNameChange(event.target.value)}
          placeholder="여름 특가 캠페인"
          value={campaignName}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="dashboard-campaign-objective">목표</FieldLabel>
        <Textarea
          id="dashboard-campaign-objective"
          onChange={(event) => onObjectiveChange(event.target.value)}
          placeholder="기존 유저의 예약 전환 증가"
          value={objective}
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="dashboard-campaign-target-audience">대상</FieldLabel>
          <Input
            id="dashboard-campaign-target-audience"
            onChange={(event) => onTargetAudienceChange(event.target.value)}
            value={targetAudience}
          />
        </Field>
        <Field>
          <FieldLabel>주요 지표</FieldLabel>
          <Select onValueChange={onPrimaryMetricChange} value={primaryMetric}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="주요 지표 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">미설정</SelectItem>
              {campaignPrimaryMetricOptions.map((metric) => (
                <SelectItem key={metric} value={metric}>
                  {metric}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="dashboard-campaign-start-date">시작일</FieldLabel>
          <Input
            id="dashboard-campaign-start-date"
            onChange={(event) => onStartDateChange(event.target.value)}
            type="date"
            value={startDate}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dashboard-campaign-end-date">종료일</FieldLabel>
          <Input
            id="dashboard-campaign-end-date"
            onChange={(event) => onEndDateChange(event.target.value)}
            type="date"
            value={endDate}
          />
        </Field>
        <Field>
          <FieldLabel>상태</FieldLabel>
          <Select onValueChange={onStatusChange} value={status}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              {campaignStatusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </FieldGroup>
  );
}

function CampaignRow({
  campaign,
  isSelected,
  onSelect
}: {
  campaign: DashboardCampaignSummary;
  isSelected: boolean;
  onSelect: (campaignId: string) => void;
}) {
  return (
    <TableRow
      aria-selected={isSelected}
      className="cursor-pointer"
      onClick={() => onSelect(campaign.campaign_id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(campaign.campaign_id);
        }
      }}
      tabIndex={0}
    >
      <TableCell>
        <div className="flex min-w-[220px] flex-col gap-1">
          <span className="flex items-center gap-2 font-medium text-foreground">
            {campaign.campaign_name}
            {isSelected ? <Badge variant="outline">선택됨</Badge> : null}
          </span>
          <span className="truncate text-xs text-muted-foreground">{campaign.campaign_id}</span>
          {campaign.objective ? (
            <span className="line-clamp-2 text-sm text-muted-foreground">{campaign.objective}</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant(campaign.status)}>{campaign.status}</Badge>
      </TableCell>
      <TableCell>{formatPeriod(campaign)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatInteger(campaign.promotion_count)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatInteger(campaign.segment_count)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatInteger(campaign.ad_experiment_count)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {campaign.latest_goal_achievement_rate === null
          ? "-"
          : formatPercent(campaign.latest_goal_achievement_rate)}
      </TableCell>
    </TableRow>
  );
}

function CampaignDetailPanel({
  campaign,
  detail,
  error,
  isError,
  isLoading,
  onClearPromotion,
  onClearSegment,
  onSelectPromotion,
  onSelectSegment,
  promotionDetail,
  promotionError,
  promotionIsError,
  promotionIsLoading,
  query,
  savedSegments,
  savedSegmentsError,
  savedSegmentsIsError,
  savedSegmentsIsLoading,
  segmentDetail,
  segmentError,
  segmentIsError,
  segmentIsLoading,
  selectedPromotionId,
  selectedSegmentId,
  tab
}: {
  campaign: DashboardCampaignSummary | undefined;
  detail: DashboardCampaignDetail | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  onClearPromotion: () => void;
  onClearSegment: () => void;
  onSelectPromotion: (promotionId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  promotionDetail: DashboardPromotionDetailResource | undefined;
  promotionError: Error | null;
  promotionIsError: boolean;
  promotionIsLoading: boolean;
  query: DashboardQuery;
  savedSegments: DashboardSavedSegment[];
  savedSegmentsError: Error | null;
  savedSegmentsIsError: boolean;
  savedSegmentsIsLoading: boolean;
  segmentDetail: DashboardSegmentDetailResource | undefined;
  segmentError: Error | null;
  segmentIsError: boolean;
  segmentIsLoading: boolean;
  selectedPromotionId: string;
  selectedSegmentId: string;
  tab: DashboardTab;
}) {
  const selectedPromotion = detail?.promotions.find(
    (promotion) => promotion.promotion_id === selectedPromotionId
  );

  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          캠페인 상세
        </CardTitle>
        <CardDescription>
          캠페인 안에서 마케팅 기획, 실시간 추이, 워크플로우, 프로모션 목록을 관리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 px-5">
        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>캠페인 상세를 불러오지 못했습니다</AlertTitle>
            <AlertDescription>{error?.message ?? "API 요청에 실패했습니다."}</AlertDescription>
          </Alert>
        ) : null}
        {!campaign ? <EmptyState message="상세를 확인할 캠페인을 선택해주세요." /> : null}
        {campaign && isLoading ? <EmptyState message="캠페인 상세를 불러오는 중입니다." /> : null}
        {detail ? (
          <CampaignTabContent
            detail={detail}
            onClearPromotion={onClearPromotion}
            onClearSegment={onClearSegment}
            onSelectPromotion={onSelectPromotion}
            onSelectSegment={onSelectSegment}
            promotionDetail={promotionDetail}
            promotionError={promotionError}
            promotionIsError={promotionIsError}
            promotionIsLoading={promotionIsLoading}
            query={query}
            savedSegments={savedSegments}
            savedSegmentsError={savedSegmentsError}
            savedSegmentsIsError={savedSegmentsIsError}
            savedSegmentsIsLoading={savedSegmentsIsLoading}
            segmentDetail={segmentDetail}
            segmentError={segmentError}
            segmentIsError={segmentIsError}
            segmentIsLoading={segmentIsLoading}
            selectedPromotion={selectedPromotion}
            selectedPromotionId={selectedPromotionId}
            selectedSegmentId={selectedSegmentId}
            tab={tab}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function CampaignTabContent({
  detail,
  onClearPromotion,
  onClearSegment,
  onSelectPromotion,
  onSelectSegment,
  promotionDetail,
  promotionError,
  promotionIsError,
  promotionIsLoading,
  query,
  savedSegments,
  savedSegmentsError,
  savedSegmentsIsError,
  savedSegmentsIsLoading,
  segmentDetail,
  segmentError,
  segmentIsError,
  segmentIsLoading,
  selectedPromotion,
  selectedPromotionId,
  selectedSegmentId,
  tab
}: {
  detail: DashboardCampaignDetail;
  onClearPromotion: () => void;
  onClearSegment: () => void;
  onSelectPromotion: (promotionId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  promotionDetail: DashboardPromotionDetailResource | undefined;
  promotionError: Error | null;
  promotionIsError: boolean;
  promotionIsLoading: boolean;
  query: DashboardQuery;
  savedSegments: DashboardSavedSegment[];
  savedSegmentsError: Error | null;
  savedSegmentsIsError: boolean;
  savedSegmentsIsLoading: boolean;
  segmentDetail: DashboardSegmentDetailResource | undefined;
  segmentError: Error | null;
  segmentIsError: boolean;
  segmentIsLoading: boolean;
  selectedPromotion: DashboardCampaignPromotion | undefined;
  selectedPromotionId: string;
  selectedSegmentId: string;
  tab: DashboardTab;
}) {
  const selectedSegment = (promotionDetail?.segments ?? detail.segments).find(
    (segment) =>
      segment.segment_id === selectedSegmentId &&
      (!selectedPromotionId || segment.promotion_id === selectedPromotionId)
  );
  const queryClient = useQueryClient();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const createPromotionMutation = useMutation({
    mutationFn: (requestBody: CreatePromotionInput) =>
      createDashboardPromotion(query, detail.campaign.campaign_id, requestBody),
    onSuccess: async (promotion) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({
        selectedPromotionId: promotion.promotion_id,
        selectedSegmentId: ""
      });
    }
  });
  const updatePromotionMutation = useMutation({
    mutationFn: ({
      promotionId,
      requestBody
    }: {
      promotionId: string;
      requestBody: UpdatePromotionInput;
    }) => updateDashboardPromotion(query, promotionId, requestBody),
    onSuccess: async (promotion) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({
        selectedPromotionId: promotion.promotion_id,
        selectedSegmentId: ""
      });
    }
  });
  const stopPromotionMutation = useMutation({
    mutationFn: (promotionId: string) => deleteDashboardPromotion(query, promotionId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (selectedPromotionId === result.promotion_id) {
        await setDashboardQueryState({ selectedPromotionId: "", selectedSegmentId: "" });
      }
    }
  });
  const attachSegmentMutation = useMutation({
    mutationFn: ({
      promotionId,
      requestBody
    }: {
      promotionId: string;
      requestBody: AttachSegmentInput;
    }) => attachDashboardSegmentToPromotion(query, promotionId, requestBody),
    onSuccess: async (segment) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({
        selectedPromotionId: segment.promotion_id,
        selectedSegmentId: segment.segment_id
      });
    }
  });
  const updateSegmentMutation = useMutation({
    mutationFn: ({
      promotionId,
      requestBody,
      segmentId
    }: {
      promotionId: string;
      requestBody: UpdatePromotionSegmentInput;
      segmentId: string;
    }) => updateDashboardPromotionSegment(query, promotionId, segmentId, requestBody),
    onSuccess: async (segment) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({
        selectedPromotionId: segment.promotion_id,
        selectedSegmentId: segment.segment_id
      });
    }
  });
  const stopSegmentMutation = useMutation({
    mutationFn: ({ promotionId, segmentId }: { promotionId: string; segmentId: string }) =>
      deleteDashboardPromotionSegment(query, promotionId, segmentId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (selectedSegmentId === result.segment_id) {
        await setDashboardQueryState({
          selectedPromotionId: result.promotion_id,
          selectedSegmentId: ""
        });
      }
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
    onSuccess: async (experiment) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({
          queryKey: dashboardCampaignDetailQueryKey(query.projectId, detail.campaign.campaign_id)
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardPromotionDetailQueryKey(query.projectId, experiment.promotion_id)
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardSegmentDetailQueryKey(
            query.projectId,
            experiment.promotion_id,
            experiment.segment_id
          )
        })
      ]);
    }
  });

  switch (tab) {
    case "campaign-promotions":
      return (
        <>
          <CampaignOpenTabs
            onClearPromotion={onClearPromotion}
            onClearSegment={onClearSegment}
            selectedPromotion={selectedPromotion}
            selectedSegment={selectedSegment}
          />
          <PromotionManagementPanel
            createError={createPromotionMutation.error}
            createIsError={createPromotionMutation.isError}
            createIsPending={createPromotionMutation.isPending}
            onCreate={(requestBody) => createPromotionMutation.mutate(requestBody)}
            onStop={(promotionId) => stopPromotionMutation.mutate(promotionId)}
            onUpdate={(promotionId, requestBody) =>
              updatePromotionMutation.mutate({ promotionId, requestBody })
            }
            promotion={selectedPromotion}
            stopError={stopPromotionMutation.error}
            stopIsError={stopPromotionMutation.isError}
            stopIsPending={stopPromotionMutation.isPending}
            updateError={updatePromotionMutation.error}
            updateIsError={updatePromotionMutation.isError}
            updateIsPending={updatePromotionMutation.isPending}
          />
          <PromotionTable
            onSelectPromotion={onSelectPromotion}
            promotions={detail.promotions}
            segments={detail.segments}
            selectedPromotionId={selectedPromotionId}
          />
          <PromotionDetail
            detail={promotionDetail}
            error={promotionError}
            isError={promotionIsError}
            isLoading={promotionIsLoading}
            onSelectSegment={onSelectSegment}
            selectedPromotionId={selectedPromotionId}
            selectedSegmentId={selectedSegmentId}
            segmentDetail={segmentDetail}
            segmentError={segmentError}
            segmentIsError={segmentIsError}
            segmentIsLoading={segmentIsLoading}
            approveContentCandidateError={approveContentCandidateMutation.error}
            approveContentCandidateIsError={approveContentCandidateMutation.isError}
            approveContentCandidateIsPending={approveContentCandidateMutation.isPending}
            onApproveContentCandidate={(promotionId, segmentId, contentId) =>
              approveContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
            }
          />
        </>
      );
    case "campaign-segments":
      return (
        <>
          <CampaignOpenTabs
            onClearPromotion={onClearPromotion}
            onClearSegment={onClearSegment}
            selectedPromotion={selectedPromotion}
            selectedSegment={selectedSegment}
          />
          <SegmentQueryPreviewPanel query={query} />
          <SavedSegmentTable
            error={savedSegmentsError}
            isError={savedSegmentsIsError}
            isLoading={savedSegmentsIsLoading}
            segments={savedSegments}
          />
          <SegmentAttachmentPanel
            attachError={attachSegmentMutation.error}
            attachIsError={attachSegmentMutation.isError}
            attachIsPending={attachSegmentMutation.isPending}
            onAttach={(promotionId, requestBody) =>
              attachSegmentMutation.mutate({ promotionId, requestBody })
            }
            onStop={(promotionId, segmentId) =>
              stopSegmentMutation.mutate({ promotionId, segmentId })
            }
            onUpdate={(promotionId, segmentId, requestBody) =>
              updateSegmentMutation.mutate({ promotionId, requestBody, segmentId })
            }
            promotion={selectedPromotion}
            savedSegments={savedSegments}
            segment={selectedSegment}
            stopError={stopSegmentMutation.error}
            stopIsError={stopSegmentMutation.isError}
            stopIsPending={stopSegmentMutation.isPending}
            updateError={updateSegmentMutation.error}
            updateIsError={updateSegmentMutation.isError}
            updateIsPending={updateSegmentMutation.isPending}
          />
          <SegmentTable
            onSelectSegment={onSelectSegment}
            segments={promotionDetail?.segments ?? detail.segments}
            selectedSegmentId={selectedSegmentId}
          />
          <SegmentDetailPanel
            approveError={approveContentCandidateMutation.error}
            approveIsError={approveContentCandidateMutation.isError}
            approveIsPending={approveContentCandidateMutation.isPending}
            detail={segmentDetail}
            error={segmentError}
            isError={segmentIsError}
            isLoading={segmentIsLoading}
            onApproveContentCandidate={(promotionId, segmentId, contentId) =>
              approveContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
            }
            selectedSegmentId={selectedSegmentId}
          />
        </>
      );
    case "campaign-experiment-metrics":
      return (
        <>
          <CampaignOpenTabs
            onClearPromotion={onClearPromotion}
            onClearSegment={onClearSegment}
            selectedPromotion={selectedPromotion}
            selectedSegment={selectedSegment}
          />
          <EvaluationOutcomePanel
            metrics={promotionDetail?.experiment_metrics ?? detail.experiment_metrics}
          />
          <ExperimentMetricTable
            metrics={promotionDetail?.experiment_metrics ?? detail.experiment_metrics}
          />
        </>
      );
    case "campaign-promotion-metrics":
      return (
        <>
          <CampaignOpenTabs
            onClearPromotion={onClearPromotion}
            onClearSegment={onClearSegment}
            selectedPromotion={selectedPromotion}
            selectedSegment={selectedSegment}
          />
          <PromotionMetricsPanel detail={detail} selectedPromotion={selectedPromotion} />
        </>
      );
    case "campaign-metrics":
      return (
        <>
          <CampaignRealtimeTrend detail={detail} />
          <EvaluationOutcomePanel metrics={detail.experiment_metrics} />
        </>
      );
    case "campaigns":
    default:
      return (
        <>
          <CampaignSummary detail={detail} />
          <CampaignOpenTabs
            onClearPromotion={onClearPromotion}
            onClearSegment={onClearSegment}
            selectedPromotion={selectedPromotion}
            selectedSegment={selectedSegment}
          />
          <MarketingPlan detail={detail} />
          <CampaignRealtimeTrend detail={detail} />
          <CampaignWorkflow detail={detail} />
          <PromotionTable
            onSelectPromotion={onSelectPromotion}
            promotions={detail.promotions}
            segments={detail.segments}
            selectedPromotionId={selectedPromotionId}
          />
          <EvaluationOutcomePanel metrics={detail.experiment_metrics} />
          <CampaignNextAction detail={detail} query={query} />
        </>
      );
  }
}

function CampaignOpenTabs({
  onClearPromotion,
  onClearSegment,
  selectedPromotion,
  selectedSegment
}: {
  onClearPromotion: () => void;
  onClearSegment: () => void;
  selectedPromotion: DashboardCampaignPromotion | undefined;
  selectedSegment: DashboardCampaignSegment | undefined;
}) {
  const value = selectedSegment ? "segment" : selectedPromotion ? "promotion" : "all";

  return (
    <Tabs
      onValueChange={(nextValue) => {
        if (nextValue === "all") {
          onClearPromotion();
        }
        if (nextValue === "promotion") {
          onClearSegment();
        }
      }}
      value={value}
    >
      <TabsList variant="line">
        <TabsTrigger value="all">전체 목록</TabsTrigger>
        {selectedPromotion ? (
          <TabsTrigger value="promotion">{selectedPromotion.marketing_theme}</TabsTrigger>
        ) : null}
        {selectedSegment ? (
          <TabsTrigger value="segment">{selectedSegment.segment_name}</TabsTrigger>
        ) : null}
      </TabsList>
    </Tabs>
  );
}

function PromotionManagementPanel({
  createError,
  createIsError,
  createIsPending,
  onCreate,
  onStop,
  onUpdate,
  promotion,
  stopError,
  stopIsError,
  stopIsPending,
  updateError,
  updateIsError,
  updateIsPending
}: {
  createError: Error | null;
  createIsError: boolean;
  createIsPending: boolean;
  onCreate: (requestBody: CreatePromotionInput) => void;
  onStop: (promotionId: string) => void;
  onUpdate: (promotionId: string, requestBody: UpdatePromotionInput) => void;
  promotion: DashboardCampaignPromotion | undefined;
  stopError: Error | null;
  stopIsError: boolean;
  stopIsPending: boolean;
  updateError: Error | null;
  updateIsError: boolean;
  updateIsPending: boolean;
}) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">프로모션 관리</h3>
        <p className="text-sm text-muted-foreground">
          선택된 캠페인 안에서 채널별 실행 단위인 프로모션을 생성하고 상태를 관리합니다.
        </p>
      </div>
      {createIsError ? (
        <Alert variant="destructive">
          <AlertTitle>프로모션을 생성하지 못했습니다</AlertTitle>
          <AlertDescription>{mutationErrorMessage(createError)}</AlertDescription>
        </Alert>
      ) : null}
      {updateIsError ? (
        <Alert variant="destructive">
          <AlertTitle>프로모션을 수정하지 못했습니다</AlertTitle>
          <AlertDescription>{mutationErrorMessage(updateError)}</AlertDescription>
        </Alert>
      ) : null}
      {stopIsError ? (
        <Alert variant="destructive">
          <AlertTitle>프로모션을 중지하지 못했습니다</AlertTitle>
          <AlertDescription>{mutationErrorMessage(stopError)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <PromotionCreateForm isPending={createIsPending} onSubmit={onCreate} />
        <PromotionEditForm
          isPending={updateIsPending || stopIsPending}
          onStop={onStop}
          onSubmit={onUpdate}
          promotion={promotion}
        />
      </div>
    </section>
  );
}

function PromotionCreateForm({
  isPending,
  onSubmit
}: {
  isPending: boolean;
  onSubmit: (requestBody: CreatePromotionInput) => void;
}) {
  const [form, setForm] = useState(createPromotionFormState());
  const canSubmit = Boolean(form.marketingTheme.trim()) && !isPending;

  return (
    <section className="grid gap-3 rounded-md border bg-muted/20 p-4">
      <div className="grid gap-1">
        <h4 className="font-semibold text-foreground">프로모션 생성</h4>
        <p className="text-sm text-muted-foreground">
          Email, SMS, 내부 배너 중 하나의 실행 단위를 생성합니다.
        </p>
      </div>
      <PromotionFormFields form={form} onChange={setForm} />
      <div className="flex justify-end">
        <Button
          disabled={!canSubmit}
          onClick={() => onSubmit(promotionFormToCreateRequest(form))}
          type="button"
        >
          {isPending ? "생성 중" : "프로모션 생성"}
        </Button>
      </div>
    </section>
  );
}

function PromotionEditForm({
  isPending,
  onStop,
  onSubmit,
  promotion
}: {
  isPending: boolean;
  onStop: (promotionId: string) => void;
  onSubmit: (promotionId: string, requestBody: UpdatePromotionInput) => void;
  promotion: DashboardCampaignPromotion | undefined;
}) {
  const [form, setForm] = useState(createPromotionFormState(promotion));

  useEffect(() => {
    setForm(createPromotionFormState(promotion));
  }, [promotion]);

  if (!promotion) {
    return (
      <section className="grid place-items-center rounded-md border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        수정할 프로모션을 목록에서 선택해주세요.
      </section>
    );
  }

  const canSubmit = Boolean(form.marketingTheme.trim()) && !isPending;

  return (
    <section className="grid gap-3 rounded-md border bg-muted/20 p-4">
      <div className="grid gap-1">
        <h4 className="font-semibold text-foreground">선택 프로모션 수정</h4>
        <p className="text-sm text-muted-foreground">
          연결된 세그먼트와 실험을 보존하기 위해 삭제 대신 stopped 상태로 전환합니다.
        </p>
      </div>
      <PromotionFormFields form={form} onChange={setForm} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={isPending || promotion.status === "stopped"}
          onClick={() => onStop(promotion.promotion_id)}
          type="button"
          variant="outline"
        >
          {isPending ? "처리 중" : "프로모션 중지"}
        </Button>
        <Button
          disabled={!canSubmit}
          onClick={() => onSubmit(promotion.promotion_id, promotionFormToUpdateRequest(form))}
          type="button"
        >
          {isPending ? "저장 중" : "수정 저장"}
        </Button>
      </div>
    </section>
  );
}

type PromotionFormState = {
  channel: string;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: string;
  landingType: string;
  landingUrl: string;
  marketingTheme: string;
  minSampleSize: string;
  offerType: string;
  status: string;
  targetAudience: string;
};

function PromotionFormFields({
  form,
  onChange
}: {
  form: PromotionFormState;
  onChange: (form: PromotionFormState) => void;
}) {
  const update = (key: keyof PromotionFormState, value: string) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="dashboard-promotion-theme">마케팅 테마</FieldLabel>
        <Input
          id="dashboard-promotion-theme"
          onChange={(event) => update("marketingTheme", event.target.value)}
          placeholder="여름 숙박 리마인드"
          value={form.marketingTheme}
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field>
          <FieldLabel>채널</FieldLabel>
          <Select onValueChange={(value) => update("channel", value)} value={form.channel}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="채널 선택" />
            </SelectTrigger>
            <SelectContent>
              {promotionChannelOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="dashboard-promotion-target">대상</FieldLabel>
          <Input
            id="dashboard-promotion-target"
            onChange={(event) => update("targetAudience", event.target.value)}
            value={form.targetAudience}
          />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field>
          <FieldLabel>목표 지표</FieldLabel>
          <Select onValueChange={(value) => update("goalMetric", value)} value={form.goalMetric}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="목표 지표" />
            </SelectTrigger>
            <SelectContent>
              {promotionGoalMetricOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="dashboard-promotion-goal-value">목표값</FieldLabel>
          <Input
            id="dashboard-promotion-goal-value"
            min="0"
            onChange={(event) => update("goalTargetValue", event.target.value)}
            step="0.001"
            type="number"
            value={form.goalTargetValue}
          />
        </Field>
        <Field>
          <FieldLabel>목표 기준</FieldLabel>
          <Select onValueChange={(value) => update("goalBasis", value)} value={form.goalBasis}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="목표 기준" />
            </SelectTrigger>
            <SelectContent>
              {promotionGoalBasisOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="dashboard-promotion-min-sample">최소 표본</FieldLabel>
          <Input
            id="dashboard-promotion-min-sample"
            min="0"
            onChange={(event) => update("minSampleSize", event.target.value)}
            type="number"
            value={form.minSampleSize}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dashboard-promotion-offer-type">오퍼</FieldLabel>
          <Input
            id="dashboard-promotion-offer-type"
            onChange={(event) => update("offerType", event.target.value)}
            placeholder="coupon"
            value={form.offerType}
          />
        </Field>
        <Field>
          <FieldLabel>상태</FieldLabel>
          <Select onValueChange={(value) => update("status", value)} value={form.status}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              {promotionStatusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="dashboard-promotion-landing-url">랜딩 URL</FieldLabel>
          <Input
            id="dashboard-promotion-landing-url"
            onChange={(event) => update("landingUrl", event.target.value)}
            placeholder="https://..."
            value={form.landingUrl}
          />
        </Field>
        <Field>
          <FieldLabel>랜딩 타입</FieldLabel>
          <Select onValueChange={(value) => update("landingType", value)} value={form.landingType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="랜딩 타입" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">미설정</SelectItem>
              {promotionLandingTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </FieldGroup>
  );
}

function createPromotionFormState(
  promotion?: DashboardCampaignPromotion
): PromotionFormState {
  return {
    channel: promotion?.channel ?? "email",
    goalBasis: promotion?.goal_basis ?? "promotion_average",
    goalMetric: promotion?.goal_metric ?? "inflow_rate",
    goalTargetValue: String(promotion?.goal_target_value ?? 0.1),
    landingType: "none",
    landingUrl: "",
    marketingTheme: promotion?.marketing_theme ?? "",
    minSampleSize: "1000",
    offerType: "",
    status: promotion?.status ?? "draft",
    targetAudience: "existing_users"
  };
}

function promotionFormToCreateRequest(form: PromotionFormState): CreatePromotionInput {
  return {
    channel: form.channel as CreatePromotionInput["channel"],
    goal_basis: form.goalBasis as CreatePromotionInput["goal_basis"],
    goal_metric: form.goalMetric as CreatePromotionInput["goal_metric"],
    goal_target_value: nonnegativeNumber(form.goalTargetValue),
    landing_type: nullableLandingType(form.landingType),
    landing_url: nullableText(form.landingUrl),
    marketing_theme: form.marketingTheme.trim(),
    max_loop_count: 3,
    min_sample_size: Math.trunc(nonnegativeNumber(form.minSampleSize)),
    offer_type: nullableText(form.offerType),
    status: form.status as CreatePromotionInput["status"],
    target_audience: form.targetAudience.trim() || "existing_users"
  };
}

function promotionFormToUpdateRequest(form: PromotionFormState): UpdatePromotionInput {
  return promotionFormToCreateRequest(form);
}

function CampaignSummary({ detail }: { detail: DashboardCampaignDetail }) {
  const campaign = detail.campaign;
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              {campaign.campaign_name}
            </h3>
            <Badge variant={statusBadgeVariant(campaign.status)}>{campaign.status}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">{campaign.objective ?? "목표 미등록"}</div>
          <div className="text-xs text-muted-foreground">{campaign.campaign_id}</div>
        </div>
        <SummaryItem
          label="최근 목표 달성률"
          value={
            campaign.latest_goal_achievement_rate === null
              ? "-"
              : formatPercent(campaign.latest_goal_achievement_rate)
          }
        />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="기간" value={formatPeriod(campaign)} />
        <SummaryItem label="프로모션" value={formatInteger(campaign.promotion_count)} />
        <SummaryItem label="세그먼트" value={formatInteger(campaign.segment_count)} />
        <SummaryItem label="광고 실험" value={formatInteger(campaign.ad_experiment_count)} />
        <SummaryItem label="주요 지표" value={campaign.primary_metric ?? "-"} />
        <SummaryItem
          label="실시간 이벤트"
          value={formatInteger(detail.realtime_metrics.total_event_count)}
        />
        <SummaryItem label="업데이트" value={campaign.updated_at} />
      </div>
    </section>
  );
}

function MarketingPlan({ detail }: { detail: DashboardCampaignDetail }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">마케팅 기획</h3>
      <div className="grid gap-3 md:grid-cols-3">
        {detail.promotions.map((promotion) => (
          <Card className="shadow-none" key={promotion.promotion_id}>
            <CardHeader>
              <CardTitle className="text-base">{promotion.marketing_theme}</CardTitle>
              <CardDescription>
                {promotion.channel} · {promotion.goal_metric}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div>목표값: {formatGoalValue(promotion.goal_target_value)}</div>
              <div>목표 기준: {promotion.goal_basis}</div>
              <div>세그먼트: {formatInteger(promotion.target_segment_count)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CampaignRealtimeTrend({ detail }: { detail: DashboardCampaignDetail }) {
  const campaign = detail.campaign;
  const achievementRate = campaign.latest_goal_achievement_rate ?? 0;

  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">실시간 추이</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryItem label="목표 달성률" value={formatPercent(achievementRate)} />
        <SummaryItem label="프로모션 집계" value={formatInteger(detail.promotions.length)} />
        <SummaryItem
          label="실시간 이벤트"
          value={formatInteger(detail.realtime_metrics.total_event_count)}
        />
      </div>
      <Progress value={Math.min(achievementRate * 100, 100)} />
      <RealtimeEventTable
        emptyMessage="캠페인 실시간 이벤트가 아직 수집되지 않았습니다."
        metrics={detail.realtime_metrics}
        title="캠페인 이벤트 집계"
      />
    </section>
  );
}

function PromotionMetricsPanel({
  detail,
  selectedPromotion
}: {
  detail: DashboardCampaignDetail;
  selectedPromotion: DashboardCampaignPromotion | undefined;
}) {
  const promotions = selectedPromotion ? [selectedPromotion] : detail.promotions;
  const metrics = selectedPromotion
    ? detail.experiment_metrics.filter(
        (metric) => metric.promotion_id === selectedPromotion.promotion_id
      )
    : detail.experiment_metrics;

  return (
    <section className="grid gap-4">
      <PromotionMetricSummary promotions={promotions} metrics={metrics} />
      <DetailTable
        emptyMessage="표시할 프로모션 지표가 없습니다."
        headers={[
          "프로모션",
          "채널",
          "목표 지표",
          "목표값",
          "현재값",
          "세그먼트",
          "상태"
        ]}
        title="프로모션 지표"
      >
        {promotions.map((promotion) => (
          <TableRow key={promotion.promotion_id}>
            <TableCell>{promotion.promotion_id}</TableCell>
            <TableCell>{promotion.channel}</TableCell>
            <TableCell>{promotion.goal_metric}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatGoalValue(promotion.goal_target_value)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {promotion.latest_actual_value === null
                ? "-"
                : formatGoalValue(promotion.latest_actual_value)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatInteger(promotion.target_segment_count)}
            </TableCell>
            <TableCell>
              <Badge variant={statusBadgeVariant(promotion.status)}>{promotion.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </DetailTable>
      <EvaluationOutcomePanel metrics={metrics} />
    </section>
  );
}

function PromotionMetricSummary({
  metrics,
  promotions
}: {
  metrics: DashboardCampaignExperimentMetric[];
  promotions: DashboardCampaignPromotion[];
}) {
  const goalNotMetCount = metrics.filter((metric) => metric.status === "goal_not_met").length;
  const nextLoopCount = metrics.filter((metric) => metric.next_loop_required).length;
  const activePromotionCount = promotions.filter((promotion) => promotion.status === "active").length;
  const averageActualValue =
    promotions.length > 0
      ? promotions.reduce((sum, promotion) => sum + (promotion.latest_actual_value ?? 0), 0) /
        promotions.length
      : 0;

  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">프로모션 지표 요약</h3>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="프로모션" value={formatInteger(promotions.length)} />
        <SummaryItem label="활성 프로모션" value={formatInteger(activePromotionCount)} />
        <SummaryItem label="목표 미달 실험" value={formatInteger(goalNotMetCount)} />
        <SummaryItem label="next-loop 후보" value={formatInteger(nextLoopCount)} />
        <SummaryItem label="평균 현재값" value={formatGoalValue(averageActualValue)} />
      </div>
    </section>
  );
}

function CampaignWorkflow({ detail }: { detail: DashboardCampaignDetail }) {
  const totalSegments = detail.segments.length;
  const totalExperiments = detail.promotions.reduce(
    (sum, promotion) => sum + promotion.ad_experiment_count,
    0
  );
  const evaluatedPromotionCount = detail.promotions.filter((promotion) =>
    detail.experiment_metrics.some((metric) => metric.promotion_id === promotion.promotion_id)
  ).length;

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">워크플로우 View</h3>
        <p className="text-sm text-muted-foreground">
          Campaign → Promotion → Segment → Ad Experiment → Evaluation 흐름을 DB 상태로
          확인합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="프로모션" value={formatInteger(detail.promotions.length)} />
        <SummaryItem label="세그먼트" value={formatInteger(totalSegments)} />
        <SummaryItem label="광고 실험" value={formatInteger(totalExperiments)} />
        <SummaryItem label="평가된 프로모션" value={formatInteger(evaluatedPromotionCount)} />
      </div>
      <div className="grid gap-3">
        {detail.promotions.map((promotion) => {
          const segments = detail.segments.filter(
            (segment) => segment.promotion_id === promotion.promotion_id
          );
          const metrics = detail.experiment_metrics.filter(
            (metric) => metric.promotion_id === promotion.promotion_id
          );
          const workflowSteps = campaignWorkflowSteps(promotion, segments, metrics);
          return (
            <Card className="shadow-none" key={promotion.promotion_id}>
              <CardHeader className="gap-1">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{promotion.marketing_theme}</CardTitle>
                  <Badge variant={statusBadgeVariant(promotion.status)}>{promotion.status}</Badge>
                </div>
                <CardDescription>{promotion.promotion_id}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="grid gap-2 md:grid-cols-5">
                  {workflowSteps.map((step) => (
                    <div
                      className="grid gap-2 rounded-md border bg-muted/20 p-3"
                      key={`${promotion.promotion_id}-${step.label}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{step.label}</span>
                        <Badge variant={step.variant}>{step.status}</Badge>
                      </div>
                      <div className="text-sm font-medium">{step.value}</div>
                    </div>
                  ))}
                </div>
                <WorkflowRiskNotice metrics={metrics} segments={segments} />
                <Progress value={Math.min((promotion.latest_actual_value ?? 0) * 100, 100)} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function campaignWorkflowSteps(
  promotion: DashboardCampaignPromotion,
  segments: DashboardCampaignSegment[],
  metrics: DashboardCampaignExperimentMetric[]
) {
  const insufficientCount = metrics.filter((metric) => metric.status === "insufficient_data").length;
  const goalNotMetCount = metrics.filter((metric) => metric.status === "goal_not_met").length;
  const nextLoopCount = metrics.filter((metric) => metric.next_loop_required).length;

  return [
    {
      label: "Promotion",
      status: promotion.status,
      value: promotion.channel,
      variant: statusBadgeVariant(promotion.status)
    },
    {
      label: "Segment",
      status: segments.length > 0 ? "ready" : "empty",
      value: formatInteger(segments.length),
      variant: segments.length > 0 ? "secondary" : "outline"
    },
    {
      label: "Ad Experiment",
      status: promotion.ad_experiment_count > 0 ? "created" : "empty",
      value: formatInteger(promotion.ad_experiment_count),
      variant: promotion.ad_experiment_count > 0 ? "secondary" : "outline"
    },
    {
      label: "Evaluation",
      status: metrics.length > 0 ? "evaluated" : "waiting",
      value: formatInteger(metrics.length),
      variant: metrics.length > 0 ? "secondary" : "outline"
    },
    {
      label: "Next Loop",
      status: nextLoopCount > 0 ? "required" : insufficientCount > 0 ? "hold" : "none",
      value:
        nextLoopCount > 0
          ? `${formatInteger(nextLoopCount)} candidates`
          : goalNotMetCount > 0
            ? `${formatInteger(goalNotMetCount)} goal_not_met`
            : "-",
      variant: nextLoopCount > 0 ? "destructive" : "outline"
    }
  ] as const;
}

function WorkflowRiskNotice({
  metrics,
  segments
}: {
  metrics: DashboardCampaignExperimentMetric[];
  segments: DashboardCampaignSegment[];
}) {
  const insufficientMetrics = metrics.filter((metric) => metric.status === "insufficient_data");
  const insufficientSegments = segments.filter((segment) => segment.status === "insufficient_data");
  const hasRisk = insufficientMetrics.length > 0 || insufficientSegments.length > 0;

  if (!hasRisk) {
    return null;
  }

  return (
    <Alert>
      <AlertTitle>표본 부족 확인 필요</AlertTitle>
      <AlertDescription>
        insufficient_data 상태가 있는 세그먼트는 숨기지 않고 표본 부족 이유를 확인해야 합니다.
      </AlertDescription>
    </Alert>
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

function PromotionTable({
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
  const activeCount = promotions.filter((promotion) => promotion.status === "active").length;
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
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="전체 프로모션" value={formatInteger(promotions.length)} />
        <SummaryItem label="활성 프로모션" value={formatInteger(activeCount)} />
        <SummaryItem label="연결 세그먼트" value={formatInteger(segments.length)} />
        <SummaryItem label="광고 실험" value={formatInteger(totalExperimentCount)} />
      </div>
      {promotions.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>프로모션</TableHead>
              <TableHead>대상 세그먼트</TableHead>
              <TableHead>목표</TableHead>
              <TableHead className="text-right">실험</TableHead>
              <TableHead>상태</TableHead>
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
                        {promotion.channel} · {promotion.promotion_id}
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
                      <span className="text-sm">{promotion.goal_metric}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatGoalValue(promotion.goal_target_value)} · {promotion.goal_basis}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(promotion.ad_experiment_count)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(promotion.status)}>{promotion.status}</Badge>
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

function CampaignNextAction({
  detail,
  query
}: {
  detail: DashboardCampaignDetail;
  query: DashboardQuery;
}) {
  const queryClient = useQueryClient();
  const [requestedAnalysisId, setRequestedAnalysisId] = useState("");
  const nextLoopMetrics = detail.experiment_metrics.filter((metric) => metric.next_loop_required);
  const goalNotMetMetrics = detail.experiment_metrics.filter(
    (metric) => metric.status === "goal_not_met"
  );
  const insufficientMetrics = detail.experiment_metrics.filter(
    (metric) => metric.status === "insufficient_data"
  );
  const nextLoopSegmentIds = uniqueValues(nextLoopMetrics.map((metric) => metric.segment_id));
  const goalNotMetSegmentIds = uniqueValues(goalNotMetMetrics.map((metric) => metric.segment_id));
  const insufficientSegmentIds = uniqueValues(
    insufficientMetrics.map((metric) => metric.segment_id)
  );
  const recommendation = campaignActionRecommendation({
    goalNotMetSegmentCount: goalNotMetSegmentIds.length,
    insufficientCount: insufficientMetrics.length,
    nextLoopCount: nextLoopMetrics.length
  });
  const nextLoopTargets = nextLoopPromotionTargets(nextLoopMetrics);
  const nextLoopMutation = useMutation({
    mutationFn: ({
      focusSegmentIds,
      promotionId
    }: {
      focusSegmentIds: string[];
      promotionId: string;
    }) =>
      startDashboardNextLoopAnalysis(query, promotionId, {
        focus_segment_ids: focusSegmentIds,
        operator_instruction: "Dashboard에서 목표 미달 세그먼트 next-loop 분석 요청"
      }),
    onSuccess: async (analysis) => {
      setRequestedAnalysisId(analysis.analysis_id);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">다음 액션</h3>
          <p className="text-sm text-muted-foreground">
            실험 지표 상태를 기준으로 재실험, 표본 보강, 유지 여부를 판단합니다.
          </p>
        </div>
        <Badge variant={recommendation.variant}>{recommendation.label}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="next-loop 후보" value={formatInteger(nextLoopMetrics.length)} />
        <SummaryItem label="목표 미달" value={formatInteger(goalNotMetMetrics.length)} />
        <SummaryItem label="표본 부족" value={formatInteger(insufficientMetrics.length)} />
        <SummaryItem label="재검토 세그먼트" value={formatInteger(goalNotMetSegmentIds.length)} />
      </div>
      <Alert variant={recommendation.alertVariant}>
        <AlertTitle>{recommendation.title}</AlertTitle>
        <AlertDescription>{recommendation.description}</AlertDescription>
      </Alert>
      {nextLoopMutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>next-loop 분석 요청 실패</AlertTitle>
          <AlertDescription>{mutationErrorMessage(nextLoopMutation.error)}</AlertDescription>
        </Alert>
      ) : null}
      {requestedAnalysisId ? (
        <Alert>
          <AlertTitle>next-loop 분석을 요청했습니다</AlertTitle>
          <AlertDescription>{requestedAnalysisId}</AlertDescription>
        </Alert>
      ) : null}
      {nextLoopTargets.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {nextLoopTargets.map((target) => (
            <div
              className="grid gap-3 rounded-md border bg-muted/20 p-3"
              key={target.promotionId}
            >
              <div className="grid gap-1">
                <div className="text-sm font-medium">{target.promotionId}</div>
                <div className="text-xs text-muted-foreground">
                  실패 세그먼트 {formatInteger(target.focusSegmentIds.length)}개만 재분석합니다.
                </div>
              </div>
              <InsightBlock label="focus_segment_ids" value={target.focusSegmentIds.join("\n")} />
              <Button
                disabled={nextLoopMutation.isPending}
                onClick={() =>
                  nextLoopMutation.mutate({
                    focusSegmentIds: target.focusSegmentIds,
                    promotionId: target.promotionId
                  })
                }
                type="button"
              >
                {nextLoopMutation.isPending ? "요청 중" : "next-loop 분석 요청"}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <InsightBlock
          label="next-loop 대상 세그먼트"
          value={nextLoopSegmentIds.length > 0 ? nextLoopSegmentIds.join("\n") : "-"}
        />
        <InsightBlock
          label="목표 미달 세그먼트"
          value={goalNotMetSegmentIds.length > 0 ? goalNotMetSegmentIds.join("\n") : "-"}
        />
        <InsightBlock
          label="표본 부족 세그먼트"
          value={insufficientSegmentIds.length > 0 ? insufficientSegmentIds.join("\n") : "-"}
        />
      </div>
    </section>
  );
}

function nextLoopPromotionTargets(metrics: DashboardCampaignExperimentMetric[]) {
  const promotionToSegments = new Map<string, Set<string>>();
  for (const metric of metrics) {
    if (!metric.segment_id) {
      continue;
    }
    const segments = promotionToSegments.get(metric.promotion_id) ?? new Set<string>();
    segments.add(metric.segment_id);
    promotionToSegments.set(metric.promotion_id, segments);
  }

  return [...promotionToSegments.entries()].map(([promotionId, segments]) => ({
    focusSegmentIds: [...segments],
    promotionId
  }));
}

function campaignActionRecommendation({
  goalNotMetSegmentCount,
  insufficientCount,
  nextLoopCount
}: {
  goalNotMetSegmentCount: number;
  insufficientCount: number;
  nextLoopCount: number;
}) {
  if (nextLoopCount > 0) {
    return {
      alertVariant: "destructive" as const,
      description:
        "next_loop_required 실험이 있습니다. 해당 세그먼트의 소재, 채널, 조건을 조정한 뒤 재실험 대상으로 분리하세요.",
      label: "재실험 필요",
      title: "다음 루프를 생성해야 합니다.",
      variant: "destructive" as const
    };
  }

  if (goalNotMetSegmentCount > 0) {
    return {
      alertVariant: "default" as const,
      description:
        "목표 미달 세그먼트가 있습니다. 프로모션별 실험 지표에서 목표값과 실제값 차이를 확인하세요.",
      label: "목표 미달",
      title: "세그먼트 조건 또는 메시지 조정이 필요합니다.",
      variant: "secondary" as const
    };
  }

  if (insufficientCount > 0) {
    return {
      alertVariant: "default" as const,
      description:
        "표본 부족 상태가 있습니다. 1.7 규약에 따라 실패로 확정하지 않고 표본 보강 후 다시 평가해야 합니다.",
      label: "표본 보강",
      title: "insufficient_data 평가가 포함되어 있습니다.",
      variant: "secondary" as const
    };
  }

  return {
    alertVariant: "default" as const,
    description: "현재 응답 기준으로 즉시 재실험이 필요한 항목은 없습니다.",
    label: "정상",
    title: "캠페인 평가가 안정적입니다.",
    variant: "outline" as const
  };
}

function PromotionDetail({
  approveContentCandidateError,
  approveContentCandidateIsError,
  approveContentCandidateIsPending,
  detail,
  error,
  isError,
  isLoading,
  onApproveContentCandidate,
  onSelectSegment,
  selectedPromotionId,
  selectedSegmentId,
  segmentDetail,
  segmentError,
  segmentIsError,
  segmentIsLoading
}: {
  approveContentCandidateError: Error | null;
  approveContentCandidateIsError: boolean;
  approveContentCandidateIsPending: boolean;
  detail: DashboardPromotionDetailResource | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  onApproveContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  selectedPromotionId: string;
  selectedSegmentId: string;
  segmentDetail: DashboardSegmentDetailResource | undefined;
  segmentError: Error | null;
  segmentIsError: boolean;
  segmentIsLoading: boolean;
}) {
  if (!selectedPromotionId) {
    return <EmptyState message="상세를 확인할 프로모션을 선택해주세요." />;
  }
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>프로모션 상세를 불러오지 못했습니다</AlertTitle>
        <AlertDescription>{error?.message ?? "API 요청에 실패했습니다."}</AlertDescription>
      </Alert>
    );
  }
  if (isLoading || !detail) {
    return <EmptyState message="프로모션 상세를 불러오는 중입니다." />;
  }

  const promotion = detail.promotion;

  return (
    <section className="grid gap-4">
      <PromotionOverview detail={detail} />
      <RealtimeEventTable
        emptyMessage="프로모션 실시간 이벤트가 아직 수집되지 않았습니다."
        metrics={detail.realtime_metrics}
        title="프로모션 이벤트 집계"
      />
      <PromotionSegmentCards
        onSelectSegment={onSelectSegment}
        segments={detail.segments}
        selectedSegmentId={selectedSegmentId}
      />
      <SegmentTable
        onSelectSegment={onSelectSegment}
        segments={detail.segments}
        selectedSegmentId={selectedSegmentId}
      />
      <SegmentDetailPanel
        approveError={approveContentCandidateError}
        approveIsError={approveContentCandidateIsError}
        approveIsPending={approveContentCandidateIsPending}
        detail={segmentDetail}
        error={segmentError}
        isError={segmentIsError}
        isLoading={segmentIsLoading}
        onApproveContentCandidate={onApproveContentCandidate}
        selectedSegmentId={selectedSegmentId}
      />
      <EvaluationOutcomePanel metrics={detail.experiment_metrics} />
      <ExperimentMetricTable metrics={detail.experiment_metrics} />
    </section>
  );
}

function PromotionSegmentCards({
  onSelectSegment,
  segments,
  selectedSegmentId
}: {
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  segments: DashboardCampaignSegment[];
  selectedSegmentId: string;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">세그먼트 선택</h3>
      {segments.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {segments.map((segment) => {
            const isSelected = selectedSegmentId === segment.segment_id;
            return (
              <button
                aria-pressed={isSelected}
                className="grid gap-3 rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted/60 aria-pressed:border-primary aria-pressed:bg-muted"
                key={segment.segment_id}
                onClick={() => onSelectSegment(segment.promotion_id, segment.segment_id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <span className="font-medium">{segment.segment_name}</span>
                    <span className="text-xs text-muted-foreground">{segment.segment_id}</span>
                  </div>
                  <Badge variant={isSelected ? "default" : statusBadgeVariant(segment.status)}>
                    {isSelected ? "열림" : segment.status}
                  </Badge>
                </div>
                <div className="line-clamp-2 text-sm text-muted-foreground">
                  {segment.natural_language_query ?? segment.source ?? "-"}
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">예상 규모</span>
                    <span className="font-medium tabular-nums">
                      {formatInteger(segment.estimated_size)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">표본 비율</span>
                    <span className="font-medium tabular-nums">
                      {formatPercentValue(segment.sample_ratio)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState message="프로모션에 연결된 세그먼트가 없습니다." />
      )}
    </section>
  );
}

function PromotionOverview({ detail }: { detail: DashboardPromotionDetailResource }) {
  const promotion = detail.promotion;
  const achievementRate = promotion.latest_actual_value ?? 0;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              {promotion.marketing_theme}
            </h3>
            <Badge variant={statusBadgeVariant(promotion.status)}>{promotion.status}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {promotion.channel} · {promotion.target_audience}
          </div>
          <div className="text-xs text-muted-foreground">{promotion.promotion_id}</div>
        </div>
        {promotion.landing_url ? (
          <Button asChild size="sm" variant="outline">
            <a href={promotion.landing_url} rel="noreferrer" target="_blank">
              랜딩 확인
            </a>
          </Button>
        ) : (
          <Button disabled size="sm" variant="outline">
            랜딩 없음
          </Button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="목표 지표" value={promotion.goal_metric} />
        <SummaryItem label="목표값" value={formatGoalValue(promotion.goal_target_value)} />
        <SummaryItem label="목표 기준" value={promotion.goal_basis} />
        <SummaryItem label="최소 표본" value={formatInteger(promotion.min_sample_size)} />
        <SummaryItem label="세그먼트" value={formatInteger(detail.segments.length)} />
        <SummaryItem label="실험 지표" value={formatInteger(detail.experiment_metrics.length)} />
        <SummaryItem
          label="실시간 이벤트"
          value={formatInteger(detail.realtime_metrics.total_event_count)}
        />
        <SummaryItem label="목표 달성률" value={formatPercent(achievementRate)} />
      </div>
      <Progress value={Math.min(achievementRate * 100, 100)} />
    </section>
  );
}

function SegmentTable({
  onSelectSegment,
  segments,
  selectedSegmentId
}: {
  onSelectSegment?: (promotionId: string, segmentId: string) => void;
  segments: DashboardCampaignSegment[];
  selectedSegmentId?: string;
}) {
  const activeCount = segments.filter((segment) => segment.status === "active").length;
  const totalEstimatedSize = segments.reduce((sum, segment) => sum + segment.estimated_size, 0);
  const averageSampleRatio =
    segments.length > 0
      ? segments.reduce((sum, segment) => sum + segment.sample_ratio, 0) / segments.length
      : 0;

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">세그먼트 목록</h3>
        <p className="text-sm text-muted-foreground">
          프로모션별 타겟 조건, 표본, 예상 규모를 기준으로 세그먼트를 확인합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="전체 세그먼트" value={formatInteger(segments.length)} />
        <SummaryItem label="활성 세그먼트" value={formatInteger(activeCount)} />
        <SummaryItem label="예상 대상" value={formatInteger(totalEstimatedSize)} />
        <SummaryItem label="평균 표본 비율" value={formatPercentValue(averageSampleRatio)} />
      </div>
      {segments.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>세그먼트</TableHead>
              <TableHead>조건</TableHead>
              <TableHead>프로모션</TableHead>
              <TableHead className="text-right">예상 규모</TableHead>
              <TableHead className="text-right">표본 비율</TableHead>
              <TableHead>상태</TableHead>
              {onSelectSegment ? <TableHead>상세</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment) => (
              <TableRow
                aria-selected={selectedSegmentId === segment.segment_id}
                className={onSelectSegment ? "cursor-pointer" : undefined}
                key={`${segment.promotion_id}-${segment.segment_id}`}
                onClick={() => onSelectSegment?.(segment.promotion_id, segment.segment_id)}
                onKeyDown={(event) => {
                  if (!onSelectSegment) {
                    return;
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectSegment(segment.promotion_id, segment.segment_id);
                  }
                }}
                tabIndex={onSelectSegment ? 0 : undefined}
              >
                <TableCell>
                  <div className="flex min-w-[180px] flex-col gap-1">
                    <span className="font-medium">{segment.segment_name}</span>
                    <span className="text-xs text-muted-foreground">{segment.segment_id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="line-clamp-2 min-w-[220px] text-sm">
                    {segment.natural_language_query ?? segment.source ?? "-"}
                  </div>
                </TableCell>
                <TableCell>{segment.promotion_id}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(segment.estimated_size)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercentValue(segment.sample_ratio)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={statusBadgeVariant(segment.status)}>{segment.status}</Badge>
                    {segment.priority ? <Badge variant="outline">{segment.priority}</Badge> : null}
                  </div>
                </TableCell>
                {onSelectSegment ? (
                  <TableCell>
                    <Button
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectSegment(segment.promotion_id, segment.segment_id);
                      }}
                      size="sm"
                      variant={selectedSegmentId === segment.segment_id ? "default" : "outline"}
                    >
                      {selectedSegmentId === segment.segment_id ? "열림" : "상세"}
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState message="등록된 세그먼트가 없습니다." />
      )}
    </section>
  );
}

function SegmentAttachmentPanel({
  attachError,
  attachIsError,
  attachIsPending,
  onAttach,
  onStop,
  onUpdate,
  promotion,
  savedSegments,
  segment,
  stopError,
  stopIsError,
  stopIsPending,
  updateError,
  updateIsError,
  updateIsPending
}: {
  attachError: Error | null;
  attachIsError: boolean;
  attachIsPending: boolean;
  onAttach: (promotionId: string, requestBody: AttachSegmentInput) => void;
  onStop: (promotionId: string, segmentId: string) => void;
  onUpdate: (
    promotionId: string,
    segmentId: string,
    requestBody: UpdatePromotionSegmentInput
  ) => void;
  promotion: DashboardCampaignPromotion | undefined;
  savedSegments: DashboardSavedSegment[];
  segment: DashboardCampaignSegment | undefined;
  stopError: Error | null;
  stopIsError: boolean;
  stopIsPending: boolean;
  updateError: Error | null;
  updateIsError: boolean;
  updateIsPending: boolean;
}) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">프로모션 세그먼트 연결</h3>
        <p className="text-sm text-muted-foreground">
          저장된 segment_definitions를 선택된 프로모션의 타겟 세그먼트로 연결합니다.
        </p>
      </div>
      {attachIsError ? (
        <Alert variant="destructive">
          <AlertTitle>세그먼트를 연결하지 못했습니다</AlertTitle>
          <AlertDescription>{mutationErrorMessage(attachError)}</AlertDescription>
        </Alert>
      ) : null}
      {updateIsError ? (
        <Alert variant="destructive">
          <AlertTitle>세그먼트를 수정하지 못했습니다</AlertTitle>
          <AlertDescription>{mutationErrorMessage(updateError)}</AlertDescription>
        </Alert>
      ) : null}
      {stopIsError ? (
        <Alert variant="destructive">
          <AlertTitle>세그먼트를 중지하지 못했습니다</AlertTitle>
          <AlertDescription>{mutationErrorMessage(stopError)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <SegmentAttachForm
          isPending={attachIsPending}
          onSubmit={onAttach}
          promotion={promotion}
          savedSegments={savedSegments}
        />
        <SegmentEditForm
          isPending={updateIsPending || stopIsPending}
          onStop={onStop}
          onSubmit={onUpdate}
          segment={segment}
        />
      </div>
    </section>
  );
}

function SegmentAttachForm({
  isPending,
  onSubmit,
  promotion,
  savedSegments
}: {
  isPending: boolean;
  onSubmit: (promotionId: string, requestBody: AttachSegmentInput) => void;
  promotion: DashboardCampaignPromotion | undefined;
  savedSegments: DashboardSavedSegment[];
}) {
  const [segmentId, setSegmentId] = useState("");
  const [segmentName, setSegmentName] = useState("");
  const [priority, setPriority] = useState("none");
  const [status, setStatus] = useState<AttachSegmentInput["status"]>("planned");
  const selectedSavedSegment = savedSegments.find((segment) => segment.segment_id === segmentId);
  const canSubmit = Boolean(promotion && segmentId) && !isPending;

  useEffect(() => {
    if (selectedSavedSegment && !segmentName.trim()) {
      setSegmentName(selectedSavedSegment.segment_name);
    }
  }, [selectedSavedSegment, segmentName]);

  if (!promotion) {
    return (
      <section className="grid place-items-center rounded-md border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        세그먼트를 연결할 프로모션을 먼저 선택해주세요.
      </section>
    );
  }

  return (
    <section className="grid gap-3 rounded-md border bg-muted/20 p-4">
      <div className="grid gap-1">
        <h4 className="font-semibold text-foreground">저장 세그먼트 연결</h4>
        <p className="text-sm text-muted-foreground">{promotion.marketing_theme}</p>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel>저장 세그먼트</FieldLabel>
          <Select onValueChange={setSegmentId} value={segmentId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="세그먼트 선택" />
            </SelectTrigger>
            <SelectContent>
              {savedSegments.map((segment) => (
                <SelectItem key={segment.segment_id} value={segment.segment_id}>
                  {segment.segment_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="dashboard-segment-attach-name">표시 이름</FieldLabel>
          <Input
            id="dashboard-segment-attach-name"
            onChange={(event) => setSegmentName(event.target.value)}
            placeholder={selectedSavedSegment?.segment_name ?? "세그먼트 이름"}
            value={segmentName}
          />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel>우선순위</FieldLabel>
            <Select onValueChange={setPriority} value={priority}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="우선순위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">미설정</SelectItem>
                {segmentPriorityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>상태</FieldLabel>
            <Select onValueChange={(value) => setStatus(value as AttachSegmentInput["status"])} value={status}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                {promotionSegmentStatusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FieldGroup>
      <div className="flex justify-end">
        <Button
          disabled={!canSubmit}
          onClick={() =>
            onSubmit(promotion.promotion_id, {
              priority: nullablePriority(priority),
              segment_id: segmentId,
              segment_name: segmentName.trim() || selectedSavedSegment?.segment_name,
              status
            })
          }
          type="button"
        >
          {isPending ? "연결 중" : "세그먼트 연결"}
        </Button>
      </div>
    </section>
  );
}

function SegmentEditForm({
  isPending,
  onStop,
  onSubmit,
  segment
}: {
  isPending: boolean;
  onStop: (promotionId: string, segmentId: string) => void;
  onSubmit: (
    promotionId: string,
    segmentId: string,
    requestBody: UpdatePromotionSegmentInput
  ) => void;
  segment: DashboardCampaignSegment | undefined;
}) {
  const [segmentName, setSegmentName] = useState(segment?.segment_name ?? "");
  const [priority, setPriority] = useState(segment?.priority ?? "none");
  const [status, setStatus] = useState(segment?.status ?? "planned");

  useEffect(() => {
    setSegmentName(segment?.segment_name ?? "");
    setPriority(segment?.priority ?? "none");
    setStatus(segment?.status ?? "planned");
  }, [segment]);

  if (!segment) {
    return (
      <section className="grid place-items-center rounded-md border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        수정할 프로모션 세그먼트를 선택해주세요.
      </section>
    );
  }

  const canSubmit = Boolean(segmentName.trim()) && !isPending;

  return (
    <section className="grid gap-3 rounded-md border bg-muted/20 p-4">
      <div className="grid gap-1">
        <h4 className="font-semibold text-foreground">선택 세그먼트 수정</h4>
        <p className="text-sm text-muted-foreground">{segment.segment_id}</p>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="dashboard-segment-edit-name">표시 이름</FieldLabel>
          <Input
            id="dashboard-segment-edit-name"
            onChange={(event) => setSegmentName(event.target.value)}
            value={segmentName}
          />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel>우선순위</FieldLabel>
            <Select onValueChange={setPriority} value={priority}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="우선순위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">미설정</SelectItem>
                {segmentPriorityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>상태</FieldLabel>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                {promotionSegmentStatusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FieldGroup>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={isPending || segment.status === "stopped"}
          onClick={() => onStop(segment.promotion_id, segment.segment_id)}
          type="button"
          variant="outline"
        >
          {isPending ? "처리 중" : "세그먼트 중지"}
        </Button>
        <Button
          disabled={!canSubmit}
          onClick={() =>
            onSubmit(segment.promotion_id, segment.segment_id, {
              priority: nullablePriority(priority),
              segment_name: segmentName.trim(),
              status: status as UpdatePromotionSegmentInput["status"]
            })
          }
          type="button"
        >
          {isPending ? "저장 중" : "수정 저장"}
        </Button>
      </div>
    </section>
  );
}

function SegmentQueryPreviewPanel({ query }: { query: DashboardQuery }) {
  const queryClient = useQueryClient();
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("");
  const [segmentName, setSegmentName] = useState("");
  const [preview, setPreview] = useState<DashboardSegmentQueryPreview | null>(null);
  const previewMutation = useMutation({
    mutationFn: () =>
      createDashboardSegmentQueryPreview(query, {
        natural_language_query: naturalLanguageQuery.trim()
      }),
    onSuccess: (result) => {
      setPreview(result);
      if (!segmentName.trim()) {
        setSegmentName(segmentNameFromQuery(naturalLanguageQuery));
      }
    }
  });
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!preview) {
        throw new Error("저장할 preview가 없습니다.");
      }
      return saveDashboardSegment(query, {
        query_preview_id: preview.query_preview_id,
        segment_name: segmentName.trim()
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardSavedSegmentsQueryKey(query.projectId)
      });
    }
  });
  const canPreview = Boolean(naturalLanguageQuery.trim()) && !previewMutation.isPending;
  const canSave =
    preview?.sample_size_status === "valid" &&
    Boolean(segmentName.trim()) &&
    !saveMutation.isPending;

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">세그먼트 추가</h3>
        <p className="text-sm text-muted-foreground">
          자연어 조건을 ClickHouse read-only SQL로 미리 실행하고, sample size가 유효하면
          사용자 정의 세그먼트로 저장합니다.
        </p>
      </div>
      <div className="grid gap-4 rounded-md border bg-muted/20 p-4">
        {previewMutation.isError ? (
          <Alert variant="destructive">
            <AlertTitle>SQL preview 생성 실패</AlertTitle>
            <AlertDescription>{mutationErrorMessage(previewMutation.error)}</AlertDescription>
          </Alert>
        ) : null}
        {saveMutation.isError ? (
          <Alert variant="destructive">
            <AlertTitle>세그먼트 저장 실패</AlertTitle>
            <AlertDescription>{mutationErrorMessage(saveMutation.error)}</AlertDescription>
          </Alert>
        ) : null}
        {saveMutation.isSuccess ? (
          <Alert>
            <AlertTitle>세그먼트를 저장했습니다</AlertTitle>
            <AlertDescription>
              {saveMutation.data.segment_name} / {saveMutation.data.segment_id}
            </AlertDescription>
          </Alert>
        ) : null}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="segment-natural-language-query">세그먼트 조건</FieldLabel>
            <Textarea
              disabled={previewMutation.isPending || saveMutation.isPending}
              id="segment-natural-language-query"
              onChange={(event) => {
                setNaturalLanguageQuery(event.target.value);
                setPreview(null);
                saveMutation.reset();
              }}
              placeholder="예: 최근 7일간 숙소 상세를 3회 이상 봤지만 예약 완료가 없는 사용자"
              value={naturalLanguageQuery}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="segment-name">세그먼트 이름</FieldLabel>
            <Input
              disabled={saveMutation.isPending}
              id="segment-name"
              onChange={(event) => setSegmentName(event.target.value)}
              placeholder="같은 숙소 반복 조회 후 미예약 고객"
              value={segmentName}
            />
          </Field>
        </FieldGroup>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!canPreview}
            onClick={() => previewMutation.mutate()}
            type="button"
            variant="outline"
          >
            {previewMutation.isPending ? "preview 생성 중" : "조건 미리보기"}
          </Button>
          <Button disabled={!canSave} onClick={() => saveMutation.mutate()} type="button">
            {saveMutation.isPending ? "저장 중" : "세그먼트 저장"}
          </Button>
        </div>
        {preview ? <SegmentQueryPreviewResult preview={preview} /> : null}
      </div>
    </section>
  );
}

function SavedSegmentTable({
  error,
  isError,
  isLoading,
  segments
}: {
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  segments: DashboardSavedSegment[];
}) {
  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">사용자 정의 세그먼트 목록</h3>
        <p className="text-sm text-muted-foreground">
          SQL preview 검증을 통과해 segment_definitions에 저장된 세그먼트입니다.
        </p>
      </div>
      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>사용자 정의 세그먼트를 불러오지 못했습니다</AlertTitle>
          <AlertDescription>{mutationErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}
      {isLoading ? <EmptyState message="사용자 정의 세그먼트를 불러오는 중입니다." /> : null}
      {!isLoading && segments.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>세그먼트</TableHead>
              <TableHead>조건</TableHead>
              <TableHead>출처</TableHead>
              <TableHead className="text-right">sample size</TableHead>
              <TableHead className="text-right">sample ratio</TableHead>
              <TableHead className="text-right">전체 적격 유저</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment) => (
              <TableRow key={segment.segment_id}>
                <TableCell>
                  <div className="grid min-w-[220px] gap-1">
                    <span className="font-medium">{segment.segment_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {segment.segment_id} · {segment.query_preview_id}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="grid min-w-[280px] gap-2">
                    <span className="line-clamp-2 text-sm">
                      {segment.natural_language_query ?? "조건 설명이 저장되지 않았습니다."}
                    </span>
                    {segment.generated_sql ? (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer">SQL preview</summary>
                        <pre className="mt-2 max-h-[180px] overflow-auto rounded-md border bg-background p-2 leading-5">
                          {segment.generated_sql}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{segment.source}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(segment.sample_size)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercentValue(segment.sample_ratio)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(segment.total_eligible_user_count)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={statusBadgeVariant(segment.status)}>{segment.status}</Badge>
                    <Badge variant={isSavedSegmentSampleValid(segment) ? "outline" : "destructive"}>
                      {isSavedSegmentSampleValid(segment) ? "sample valid" : "sample check"}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      {!isLoading && !isError && segments.length === 0 ? (
        <EmptyState message="저장된 사용자 정의 세그먼트가 없습니다." />
      ) : null}
    </section>
  );
}

function isSavedSegmentSampleValid(segment: DashboardSavedSegment) {
  return segment.sample_size >= 100 && segment.sample_ratio >= 0.005;
}

function SegmentQueryPreviewResult({ preview }: { preview: DashboardSegmentQueryPreview }) {
  const statusVariant = preview.sample_size_status === "valid" ? "secondary" : "destructive";

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="sample size" value={formatInteger(preview.sample_size)} />
        <SummaryItem
          label="전체 적격 유저"
          value={formatInteger(preview.total_eligible_user_count)}
        />
        <SummaryItem label="sample ratio" value={formatPercentValue(preview.sample_ratio)} />
        <div className="rounded-md border bg-background p-3">
          <div className="text-xs text-muted-foreground">저장 가능 상태</div>
          <Badge className="mt-2" variant={statusVariant}>
            {preview.sample_size_status}
          </Badge>
          {preview.sample_size_status !== "valid" ? (
            <div className="mt-2 text-xs text-muted-foreground">
              표본 기준을 충족하지 못해 segment_definitions 저장을 막습니다.
            </div>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2">
        <div className="text-xs text-muted-foreground">generated_sql</div>
        <pre className="max-h-[220px] overflow-auto rounded-md border bg-background p-3 text-xs leading-5">
          {preview.generated_sql}
        </pre>
      </div>
      <PreviewRowsTable preview={preview} />
    </div>
  );
}

function PreviewRowsTable({ preview }: { preview: DashboardSegmentQueryPreview }) {
  const columns = preview.columns.slice(0, 8);

  if (preview.rows.length === 0 || columns.length === 0) {
    return <EmptyState message="preview 결과 row가 없습니다." />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.rows.slice(0, 10).map((row, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell className="max-w-[220px] truncate" key={column}>
                  {formatPreviewValue(row[column])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SegmentDetailPanel({
  approveError,
  approveIsError,
  approveIsPending,
  detail,
  error,
  isError,
  isLoading,
  onApproveContentCandidate,
  selectedSegmentId
}: {
  approveError: Error | null;
  approveIsError: boolean;
  approveIsPending: boolean;
  detail: DashboardSegmentDetailResource | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  onApproveContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  selectedSegmentId: string;
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

  const adExperimentIds = uniqueValues(
    detail.ad_experiments.map((experiment) => experiment.ad_experiment_id)
  );
  const latestMetric = detail.experiment_metrics[0];
  const hasInsufficientData = detail.experiment_metrics.some(
    (metric) => metric.status === "insufficient_data"
  );
  const insufficientMetrics = detail.experiment_metrics.filter(
    (metric) => metric.status === "insufficient_data"
  );

  return (
    <section className="grid gap-4">
      <SegmentOverview
        adExperimentCount={adExperimentIds.length}
        detail={detail}
        latestMetric={latestMetric}
      />
      {hasInsufficientData ? (
        <Alert variant="destructive">
          <AlertTitle>표본 부족 상태</AlertTitle>
          <AlertDescription>
            선택한 세그먼트의 실험 평가가 insufficient_data 상태입니다. 표본 부족은 실패가
            아니라 판단 보류 상태로 표시합니다.
          </AlertDescription>
        </Alert>
      ) : null}
      <SegmentDefinitionPanel segment={detail.segment} />
      <SegmentExpectedEffectPanel detail={detail} latestMetric={latestMetric} />
      <SegmentAdExperimentStatusPanel detail={detail} />
      <RealtimeEventTable
        emptyMessage="실시간 이벤트가 아직 수집되지 않았습니다."
        metrics={detail.realtime_metrics}
        title="실시간 추이"
      />
      <SegmentInsufficientDataPanel metrics={insufficientMetrics} segment={detail.segment} />
      <SegmentSampleSizePanel metrics={detail.experiment_metrics} />
      <ContentCandidateCards
        approveError={approveError}
        approveIsError={approveIsError}
        approveIsPending={approveIsPending}
        candidates={detail.content_candidates}
        onApprove={onApproveContentCandidate}
      />
      <ContentCandidateTable candidates={detail.content_candidates} />
      <ExperimentMetricTable metrics={detail.experiment_metrics} />
    </section>
  );
}

function SegmentOverview({
  adExperimentCount,
  detail,
  latestMetric
}: {
  adExperimentCount: number;
  detail: DashboardSegmentDetailResource;
  latestMetric: DashboardCampaignExperimentMetric | undefined;
}) {
  const sampleRatioPercent = Math.min(detail.segment.sample_ratio * 100, 100);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              {detail.segment.segment_name}
            </h3>
            <Badge variant={statusBadgeVariant(detail.segment.status)}>
              {detail.segment.status}
            </Badge>
            {detail.segment.priority ? (
              <Badge variant="outline">{detail.segment.priority}</Badge>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground">
            {detail.segment.natural_language_query ?? "세그먼트 조건 미등록"}
          </div>
          <div className="text-xs text-muted-foreground">
            {detail.segment.promotion_id} · {detail.segment.segment_id}
          </div>
        </div>
        <SummaryItem
          label="최근 지표"
          value={
            latestMetric
              ? `${latestMetric.metric} ${formatGoalValue(latestMetric.actual_value)}`
              : "-"
          }
        />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="세그먼트 출처" value={detail.segment.source ?? "-"} />
        <SummaryItem label="대상 규모" value={formatInteger(detail.segment.estimated_size)} />
        <SummaryItem label="정의 표본" value={formatInteger(detail.segment.sample_size)} />
        <SummaryItem
          label="전체 적격 유저"
          value={formatInteger(detail.segment.total_eligible_user_count)}
        />
        <SummaryItem label="표본 비율" value={formatPercentValue(detail.segment.sample_ratio)} />
        <SummaryItem
          label="연결 실험"
          value={adExperimentCount > 0 ? formatInteger(adExperimentCount) : "-"}
        />
        <SummaryItem
          label="최근 표본"
          value={latestMetric ? formatInteger(latestMetric.sample_size) : "-"}
        />
        <SummaryItem label="콘텐츠 후보" value={formatInteger(detail.content_candidates.length)} />
        <SummaryItem
          label="실시간 이벤트"
          value={formatInteger(detail.realtime_metrics.total_event_count)}
        />
      </div>
      <Progress value={sampleRatioPercent} />
    </section>
  );
}

function RealtimeEventTable({
  emptyMessage,
  metrics,
  title
}: {
  emptyMessage: string;
  metrics: DashboardRealtimeMetrics;
  title: string;
}) {
  return (
    <>
      {metrics.events.length > 0 ? (
        <section className="grid gap-3">
          <h3 className="text-base font-semibold text-[#1d1d1f]">{title}</h3>
          <ChartContainer
            className="min-h-[260px] w-full"
            config={{
              event_count: {
                color: "var(--chart-1)",
                label: "이벤트 수"
              },
              unique_user_count: {
                color: "var(--chart-2)",
                label: "유니크 유저"
              }
            }}
          >
            <BarChart data={chartEvents(metrics)}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="event_count" fill="var(--color-event_count)" radius={4} />
              <Bar
                dataKey="unique_user_count"
                fill="var(--color-unique_user_count)"
                radius={4}
              />
            </BarChart>
          </ChartContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이벤트</TableHead>
                <TableHead className="text-right">이벤트 수</TableHead>
                <TableHead className="text-right">유니크 유저</TableHead>
                <TableHead className="text-right">비중</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.events.map((event) => (
                <TableRow key={event.event_name}>
                  <TableCell>
                    <div className="grid gap-1">
                      <span className="font-medium">{eventDisplayName(event.event_name)}</span>
                      <span className="text-xs text-muted-foreground">{event.event_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(event.event_count)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(event.unique_user_count)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {metrics.total_event_count > 0
                      ? formatPercentValue(event.event_count / metrics.total_event_count)
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : (
        <EmptyState message={emptyMessage} />
      )}
    </>
  );
}

function chartEvents(metrics: DashboardRealtimeMetrics) {
  return metrics.events.map((event) => ({
    event_count: event.event_count,
    label: eventDisplayName(event.event_name),
    unique_user_count: event.unique_user_count
  }));
}

function SegmentDefinitionPanel({ segment }: { segment: DashboardCampaignSegment }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">세그먼트 조건과 데이터 근거</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <InsightBlock label="자연어 조건" value={segment.natural_language_query ?? "-"} />
        <InsightBlock label="조건 요약" value={formatJsonObject(segment.rule_json)} />
        <InsightBlock label="프로필 요약" value={formatJsonObject(segment.profile_json)} />
        <InsightBlock label="콘텐츠 브리프" value={formatJsonObject(segment.content_brief_json)} />
        <InsightBlock label="데이터 근거" value={formatJsonObject(segment.data_evidence_json)} />
      </div>
    </section>
  );
}

function SegmentExpectedEffectPanel({
  detail,
  latestMetric
}: {
  detail: DashboardSegmentDetailResource;
  latestMetric: DashboardCampaignExperimentMetric | undefined;
}) {
  const contentBriefEffect = pickJsonString(detail.segment.content_brief_json, [
    "expected_effect",
    "expectedEffect",
    "effect",
    "hypothesis"
  ]);
  const evidenceEffect = pickJsonString(detail.segment.data_evidence_json, [
    "expected_effect",
    "expectedEffect",
    "expected_lift",
    "conversion_lift",
    "rationale"
  ]);
  const nextLoopMessage = latestMetric?.next_loop_required
    ? "목표 미달 세그먼트로 다음 루프 후보입니다."
    : "현재 지표 기준으로 자동 next-loop 대상은 아닙니다.";

  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">예상 효과</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryItem
          label="최근 목표 대비"
          value={
            latestMetric
              ? `${formatGoalValue(latestMetric.actual_value)} / ${formatGoalValue(
                  latestMetric.target_value
                )}`
              : "-"
          }
        />
        <SummaryItem
          label="콘텐츠 후보"
          value={formatInteger(detail.content_candidates.length)}
        />
        <SummaryItem label="다음 루프" value={nextLoopMessage} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <InsightBlock label="콘텐츠 브리프 기반 예상 효과" value={contentBriefEffect ?? "-"} />
        <InsightBlock label="데이터 근거 기반 예상 효과" value={evidenceEffect ?? "-"} />
      </div>
    </section>
  );
}

function SegmentAdExperimentStatusPanel({
  detail
}: {
  detail: DashboardSegmentDetailResource;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">광고 실험 상태</h3>
      {detail.ad_experiments.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {detail.ad_experiments.map((experiment) => (
            <div className="grid gap-3 rounded-md border bg-background p-3" key={experiment.ad_experiment_id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <div className="text-sm font-medium">{experiment.ad_experiment_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {experiment.promotion_run_id} / {experiment.content_option_id}
                  </div>
                </div>
                <Badge variant={statusBadgeVariant(experiment.status)}>{experiment.status}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <SummaryItem label="프로모션" value={experiment.promotion_id} />
                <SummaryItem label="세그먼트" value={experiment.segment_id} />
                <SummaryItem label="콘텐츠" value={experiment.content_id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="승인된 콘텐츠로 생성된 광고 실험이 아직 없습니다." />
      )}
    </section>
  );
}

function SegmentInsufficientDataPanel({
  metrics,
  segment
}: {
  metrics: DashboardCampaignExperimentMetric[];
  segment: DashboardCampaignSegment;
}) {
  if (metrics.length === 0 && segment.status !== "insufficient_data") {
    return null;
  }

  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">표본 부족 사유</h3>
      {metrics.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {metrics.map((metric) => {
            const details = insufficientDataDetails(metric);
            return (
              <div
                className="grid gap-3 rounded-md border bg-muted/20 p-3"
                key={`${metric.ad_experiment_id ?? metric.segment_id}-${metric.created_at}-insufficient`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <div className="text-sm font-medium">
                      {metric.ad_experiment_id ?? metric.metric}
                    </div>
                    <div className="text-xs text-muted-foreground">{metric.segment_id ?? "-"}</div>
                  </div>
                  <Badge variant="destructive">insufficient_data</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <SummaryItem
                    label="최종 배정"
                    value={formatNullableInteger(details.assignedUserCount ?? metric.sample_size)}
                  />
                  <SummaryItem
                    label="최소 필요"
                    value={formatNullableInteger(details.minimumRequiredSampleSize)}
                  />
                  <SummaryItem
                    label="사전 추정"
                    value={formatInteger(segment.estimated_size)}
                  />
                </div>
                <InsightBlock label="부족 사유" value={details.reason ?? metric.feedback ?? "-"} />
                <InsightBlock label="상세 설명" value={details.note ?? "-"} />
              </div>
            );
          })}
        </div>
      ) : (
        <Alert>
          <AlertTitle>세그먼트 상태가 insufficient_data입니다</AlertTitle>
          <AlertDescription>
            실험 지표가 아직 없어서 상세 사유는 표시할 수 없습니다.
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}

function SegmentSampleSizePanel({
  metrics
}: {
  metrics: DashboardCampaignExperimentMetric[];
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">sample size 검증</h3>
      {metrics.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {metrics.map((metric) => {
            const rate =
              metric.denominator_count > 0
                ? Math.min((metric.numerator_count / metric.denominator_count) * 100, 100)
                : 0;

            return (
              <div
                className="grid gap-3 rounded-md border bg-muted/20 p-3"
                key={`${metric.ad_experiment_id ?? metric.segment_id}-${metric.created_at}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <div className="text-sm font-medium">{metric.metric}</div>
                    <div className="text-xs text-muted-foreground">
                      {metric.ad_experiment_id ?? "-"}
                    </div>
                  </div>
                  <Badge variant={statusBadgeVariant(metric.status)}>
                    {metric.status}
                  </Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">평가 기준</span>
                    <span className="font-medium">{metric.basis}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">표본</span>
                    <span className="font-medium tabular-nums">
                      {formatInteger(metric.sample_size)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">분자 / 분모</span>
                    <span className="font-medium tabular-nums">
                      {formatInteger(metric.numerator_count)} /{" "}
                      {formatInteger(metric.denominator_count)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">목표 / 실제</span>
                    <span className="font-medium tabular-nums">
                      {formatGoalValue(metric.target_value)} / {formatGoalValue(metric.actual_value)}
                    </span>
                  </div>
                </div>
                <InsightBlock label="평가 피드백" value={metric.feedback ?? "-"} />
                {metric.status === "insufficient_data" ? (
                  <InsightBlock
                    label="표본 부족 이유"
                    value={insufficientDataDetails(metric).reason ?? metric.feedback ?? "-"}
                  />
                ) : null}
                <InsightBlock label="평가 결과 JSON" value={formatJsonObject(metric.result_json)} />
                <Progress value={rate} />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState message="표본 검증에 사용할 실험 지표가 없습니다." />
      )}
    </section>
  );
}

function ContentCandidateCards({
  approveError,
  approveIsError,
  approveIsPending,
  candidates,
  onApprove
}: {
  approveError: Error | null;
  approveIsError: boolean;
  approveIsPending: boolean;
  candidates: DashboardSegmentDetailResource["content_candidates"];
  onApprove: (promotionId: string, segmentId: string, contentId: string) => void;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">생성 이유 리포트</h3>
      {approveIsError ? (
        <Alert variant="destructive">
          <AlertTitle>콘텐츠 후보를 승인하지 못했습니다</AlertTitle>
          <AlertDescription>{mutationErrorMessage(approveError)}</AlertDescription>
        </Alert>
      ) : null}
      {candidates.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {candidates.map((candidate) => (
            <div className="grid gap-3 rounded-md border bg-muted/20 p-3" key={candidate.content_id}>
              <ContentCandidateVisual candidate={candidate} />
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <div className="text-sm font-medium">
                    {candidate.title ?? candidate.content_option_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {candidate.channel} / {candidate.content_id}
                  </div>
                </div>
                <Badge variant={statusBadgeVariant(candidate.status)}>{candidate.status}</Badge>
              </div>
              <InsightBlock label="메시지" value={candidate.message ?? candidate.body ?? "-"} />
              <InsightBlock label="생성 이유" value={candidate.reason_summary ?? "-"} />
              <InsightBlock label="데이터 근거" value={formatJsonObject(candidate.data_evidence_json)} />
              <InsightBlock label="메시지 방향" value={candidate.message_strategy ?? "-"} />
              <InsightBlock label="생성 프롬프트" value={candidate.generation_prompt ?? "-"} />
              <InsightBlock label="메타데이터" value={formatJsonObject(candidate.metadata_json)} />
              <div className="grid gap-1 text-sm">
                <div className="text-xs text-muted-foreground">CTA / 랜딩 URL</div>
                <div className="font-medium">{candidate.cta ?? "-"}</div>
                <div className="break-all text-muted-foreground">{candidate.landing_url ?? "-"}</div>
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={approveIsPending || candidate.status === "approved"}
                  onClick={() =>
                    onApprove(
                      candidate.promotion_id,
                      candidate.segment_id,
                      candidate.content_id
                    )
                  }
                  size="sm"
                  type="button"
                >
                  {candidate.status === "approved" ? "승인됨" : "승인하고 실험 생성"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="생성 이유를 표시할 콘텐츠 후보가 없습니다." />
      )}
    </section>
  );
}

function ContentCandidateVisual({
  candidate
}: {
  candidate: DashboardSegmentDetailResource["content_candidates"][number];
}) {
  const imageUrl = candidateImageUrl(candidate);

  if (imageUrl) {
    return (
      <div className="overflow-hidden rounded-md border bg-background">
        <img
          alt={candidate.title ?? candidate.content_option_id}
          className="h-40 w-full object-cover"
          src={imageUrl}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[96px] items-center justify-center rounded-md border border-dashed bg-background px-3 text-center text-sm text-muted-foreground">
      {candidate.image_prompt ?? "생성 이미지 URL이 metadata_json에 아직 저장되지 않았습니다."}
    </div>
  );
}

function candidateImageUrl(candidate: DashboardSegmentDetailResource["content_candidates"][number]) {
  return pickJsonString(candidate.metadata_json, [
    "image_url",
    "imageUrl",
    "asset_url",
    "assetUrl",
    "generated_image_url",
    "generatedImageUrl"
  ]);
}

function formatJsonObject(value: Record<string, unknown>): string {
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return "-";
  }
  return entries
    .map(([key, entryValue]) => `${key}: ${formatJsonValue(entryValue)}`)
    .join("\n");
}

function formatJsonValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function pickJsonString(value: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const foundValue = value[key];
    if (typeof foundValue === "string" && foundValue.trim()) {
      return foundValue;
    }
    if (typeof foundValue === "number" || typeof foundValue === "boolean") {
      return String(foundValue);
    }
  }
  return null;
}

function pickJsonNumber(value: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const foundValue = value[key];
    const number = Number(foundValue);
    if (Number.isFinite(number)) {
      return number;
    }
  }
  return null;
}

function insufficientDataDetails(metric: DashboardCampaignExperimentMetric) {
  return {
    assignedUserCount: pickJsonNumber(metric.result_json, [
      "assigned_user_count",
      "assignedUserCount",
      "final_assigned_user_count",
      "finalAssignedUserCount"
    ]),
    minimumRequiredSampleSize: pickJsonNumber(metric.result_json, [
      "minimum_required_sample_size",
      "minimumRequiredSampleSize",
      "min_sample_size",
      "minSampleSize"
    ]),
    note: pickJsonString(metric.result_json, ["note", "message", "description"]),
    reason: pickJsonString(metric.result_json, [
      "insufficient_reason",
      "insufficientReason",
      "reason",
      "cause"
    ])
  };
}

function formatNullableInteger(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatInteger(value);
}

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function segmentNameFromQuery(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.length > 32 ? `${trimmed.slice(0, 32)}...` : trimmed;
}

function mutationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "API 요청 실패";
}

function nullableDate(value: string): string | null {
  return value.trim() ? value : null;
}

function nullableMetric(value: string): CreateCampaignInput["primary_metric"] {
  return value === "none" ? null : (value as CreateCampaignInput["primary_metric"]);
}

function nullableLandingType(value: string): CreatePromotionInput["landing_type"] {
  return value === "none" ? null : (value as CreatePromotionInput["landing_type"]);
}

function nullablePriority(value: string): AttachSegmentInput["priority"] {
  return value === "none" ? null : (value as AttachSegmentInput["priority"]);
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nonnegativeNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function InsightBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="whitespace-pre-line break-words leading-6">{value}</div>
    </div>
  );
}

function ContentCandidateTable({
  candidates
}: {
  candidates: DashboardSegmentDetailResource["content_candidates"];
}) {
  return (
    <DetailTable
      emptyMessage="생성 콘텐츠 후보가 없습니다."
      headers={["콘텐츠", "채널", "메시지", "생성 이유", "메시지 방향", "상태"]}
      title="생성 콘텐츠 카드"
    >
      {candidates.map((candidate) => (
        <TableRow key={candidate.content_id}>
          <TableCell>
            <div className="flex min-w-[180px] flex-col gap-1">
              <span className="font-medium">{candidate.content_option_id}</span>
              <span className="text-xs text-muted-foreground">{candidate.content_id}</span>
            </div>
          </TableCell>
          <TableCell>{candidate.channel}</TableCell>
          <TableCell>
            <div className="line-clamp-2 min-w-[220px]">
              {candidate.title ?? candidate.message ?? candidate.body ?? "-"}
            </div>
          </TableCell>
          <TableCell>
            <div className="line-clamp-2 min-w-[220px]">{candidate.reason_summary ?? "-"}</div>
          </TableCell>
          <TableCell>
            <div className="line-clamp-2 min-w-[220px]">{candidate.message_strategy ?? "-"}</div>
          </TableCell>
          <TableCell>
            <Badge variant={statusBadgeVariant(candidate.status)}>{candidate.status}</Badge>
          </TableCell>
        </TableRow>
      ))}
    </DetailTable>
  );
}

function uniqueValues(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function statusBadgeVariant(status: string) {
  return status === "insufficient_data" ||
    status === "failed" ||
    status === "goal_not_met" ||
    status === "cancelled"
    ? "destructive"
    : "secondary";
}

function EvaluationOutcomePanel({
  metrics
}: {
  metrics: DashboardCampaignExperimentMetric[];
}) {
  const goalMetCount = metrics.filter((metric) => metric.status === "goal_met").length;
  const goalNotMetMetrics = metrics.filter((metric) => metric.status === "goal_not_met");
  const insufficientMetrics = metrics.filter((metric) => metric.status === "insufficient_data");
  const nextLoopMetrics = metrics.filter((metric) => metric.next_loop_required);
  const failedSegmentIds = uniqueValues(goalNotMetMetrics.map((metric) => metric.segment_id));
  const failedExperimentIds = uniqueValues(
    goalNotMetMetrics.map((metric) => metric.ad_experiment_id)
  );
  const nextLoopSegmentIds = uniqueValues(nextLoopMetrics.map((metric) => metric.segment_id));

  if (metrics.length === 0) {
    return <EmptyState message="종료 후 결과를 표시할 실험 평가가 없습니다." />;
  }

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">종료 후 결과 / 재실험 흐름</h3>
        <p className="text-sm text-muted-foreground">
          promotion_evaluations 기준으로 목표 미달 세그먼트만 next-loop 후보로 분리합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="평가 완료" value={formatInteger(metrics.length)} />
        <SummaryItem label="목표 달성" value={formatInteger(goalMetCount)} />
        <SummaryItem label="목표 미달" value={formatInteger(goalNotMetMetrics.length)} />
        <SummaryItem label="표본 부족" value={formatInteger(insufficientMetrics.length)} />
        <SummaryItem label="next-loop 후보" value={formatInteger(nextLoopMetrics.length)} />
        <SummaryItem label="실패 세그먼트" value={formatInteger(failedSegmentIds.length)} />
        <SummaryItem label="실패 실험" value={formatInteger(failedExperimentIds.length)} />
      </div>
      {nextLoopMetrics.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBlock
            label="failed_segment_ids"
            value={nextLoopSegmentIds.length > 0 ? nextLoopSegmentIds.join("\n") : "-"}
          />
          <InsightBlock
            label="failed_ad_experiment_ids"
            value={failedExperimentIds.length > 0 ? failedExperimentIds.join("\n") : "-"}
          />
        </div>
      ) : (
        <Alert>
          <AlertTitle>재실험 후보 없음</AlertTitle>
          <AlertDescription>
            goal_not_met 상태의 평가가 없거나 next_loop_required가 false입니다.
          </AlertDescription>
        </Alert>
      )}
      {insufficientMetrics.length > 0 ? (
        <Alert>
          <AlertTitle>표본 부족은 자동 재실험 대상에서 분리합니다</AlertTitle>
          <AlertDescription>
            insufficient_data는 목표 미달이 아니라 판단 보류 상태이므로, 사용자가 명시적으로
            다시 실험하기를 선택할 때만 next-loop 대상으로 다루는 흐름입니다.
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

function ExperimentMetricTable({ metrics }: { metrics: DashboardCampaignExperimentMetric[] }) {
  const insufficientCount = metrics.filter((metric) => metric.status === "insufficient_data").length;
  const nextLoopCount = metrics.filter((metric) => metric.next_loop_required).length;
  const totalSampleSize = metrics.reduce((sum, metric) => sum + metric.sample_size, 0);
  const averageActualValue =
    metrics.length > 0
      ? metrics.reduce((sum, metric) => sum + metric.actual_value, 0) / metrics.length
      : 0;

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">실험 지표</h3>
        <p className="text-sm text-muted-foreground">
          광고 실험별 목표 대비 실제값, sample size, 재실행 필요 여부를 확인합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="실험 지표" value={formatInteger(metrics.length)} />
        <SummaryItem label="표본 합계" value={formatInteger(totalSampleSize)} />
        <SummaryItem label="표본 부족" value={formatInteger(insufficientCount)} />
        <SummaryItem label="다음 루프 필요" value={formatInteger(nextLoopCount)} />
        <SummaryItem label="평균 실제값" value={formatGoalValue(averageActualValue)} />
      </div>
      {metrics.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>실험</TableHead>
              <TableHead>지표</TableHead>
              <TableHead className="text-right">목표 / 실제</TableHead>
              <TableHead className="text-right">표본</TableHead>
              <TableHead className="text-right">분자 / 분모</TableHead>
              <TableHead>기준</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>피드백</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric) => (
              <TableRow
                key={`${metric.promotion_run_id}-${metric.ad_experiment_id ?? metric.segment_id}-${metric.created_at}`}
              >
                <TableCell>
                  <div className="grid min-w-[180px] gap-1">
                    <span className="font-medium">{metric.ad_experiment_id ?? "-"}</span>
                    <span className="text-xs text-muted-foreground">
                      {metric.promotion_id} · {metric.segment_id ?? "-"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="grid gap-1">
                    <span>{metric.metric}</span>
                    <span className="text-xs text-muted-foreground">
                      {metric.content_option_id ?? metric.content_id ?? "-"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatGoalValue(metric.target_value)} / {formatGoalValue(metric.actual_value)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(metric.sample_size)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(metric.numerator_count)} /{" "}
                  {formatInteger(metric.denominator_count)}
                </TableCell>
                <TableCell>{metric.basis}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={statusBadgeVariant(metric.status)}>
                      {metric.status}
                    </Badge>
                    {metric.next_loop_required ? <Badge variant="outline">next loop</Badge> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="line-clamp-2 min-w-[220px] text-sm">
                    {metric.feedback ?? "-"}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState message="등록된 실험 지표가 없습니다." />
      )}
    </section>
  );
}

function DetailTable({
  children,
  emptyMessage,
  headers,
  title
}: {
  children: ReactNode;
  emptyMessage: string;
  headers: string[];
  title: string;
}) {
  const rows = Array.isArray(children) ? children : [children];
  const hasRows = rows.some(Boolean);

  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">{title}</h3>
      {hasRows ? (
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      ) : (
        <EmptyState message={emptyMessage} />
      )}
    </section>
  );
}

function formatGoalValue(value: number) {
  return value <= 1 ? formatPercent(value) : formatInteger(value);
}

function formatPercentValue(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function eventDisplayName(eventName: string): string {
  return EVENT_DISPLAY_NAMES[eventName] ?? eventName;
}

const EVENT_DISPLAY_NAMES: Record<string, string> = {
  booking_cancel: "예약 취소",
  booking_complete: "예약 완료",
  booking_start: "예약 시작",
  campaign_landing: "캠페인 랜딩",
  campaign_redirect_click: "캠페인 리다이렉트 클릭",
  hotel_click: "숙소 클릭",
  hotel_detail_view: "숙소 상세 조회",
  hotel_search: "숙소 검색",
  page_view: "페이지 조회",
  promotion_click: "프로모션 클릭",
  promotion_impression: "프로모션 노출"
};

function formatPeriod(campaign: DashboardCampaignSummary) {
  if (!campaign.start_date && !campaign.end_date) {
    return "-";
  }
  return `${campaign.start_date ?? "미정"} ~ ${campaign.end_date ?? "미정"}`;
}
