import type {
  DashboardAdExperiment,
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardMain,
  DashboardPromotionDetail as DashboardPromotionDetailResource,
  DashboardRealtimeMetrics,
  DashboardSegmentDetail as DashboardSegmentDetailResource
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
  createDashboardCampaign,
  deleteDashboardCampaign,
  fetchDashboardCampaignDetail,
  fetchDashboardPromotionDetail,
  fetchDashboardSegmentDetail,
  rejectDashboardContentCandidate,
  startDashboardNextLoopAnalysis,
  updateDashboardCampaign
} from "../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../model/dashboard-format.js";
import { useDashboardQueryState } from "../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardPromotionDetailQueryKey,
  dashboardSegmentDetailQueryKey
} from "../model/dashboard-query-keys.js";
import {
  formatActionLabel,
  formatAudienceLabel,
  formatBasisLabel,
  formatChannelLabel,
  formatLandingTypeLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../model/dashboard-labels.js";
import type { DashboardQuery, DashboardTab } from "../model/dashboard-types.js";
import {
  CampaignPromotionTable,
  promotionChannelOptions,
  promotionStatusOptions
} from "./Promotion.js";
import { EmptyState } from "./EmptyState.js";

const campaignPrimaryMetricOptions = [
  "inflow_rate",
  "booking_conversion_rate",
  "funnel_step_rate",
  "promotion_click_rate",
  "goal_achievement_rate"
] as const;

const campaignStatusOptions = ["draft", "active", "paused", "completed", "stopped"] as const;
const FALLBACK_SEGMENT_ID = "seg_existing_all";

type CreateCampaignInput = Parameters<typeof createDashboardCampaign>[1];
type UpdateCampaignInput = Parameters<typeof updateDashboardCampaign>[2];

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
      {tab === "campaigns" ? (
        <>
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
                캠페인 → 프로모션 → 세그먼트 → 광고 실험 실행 구조를 기준으로 조회합니다.
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
        </>
      ) : null}

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
        <Badge variant="secondary">캠페인</Badge>
        <span className="text-sm font-medium">{campaign.campaign_name}</span>
        {promotion ? (
          <>
            <span className="text-sm text-muted-foreground">/</span>
            <Badge variant="secondary">프로모션</Badge>
            <span className="text-sm font-medium">{promotion.marketing_theme}</span>
            <Button onClick={onClearPromotion} size="xs" type="button" variant="ghost">
              선택 해제
            </Button>
          </>
        ) : null}
        {segment ? (
          <>
            <span className="text-sm text-muted-foreground">/</span>
            <Badge variant="secondary">세그먼트</Badge>
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
                  {formatMetricLabel(metric)}
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
                  {formatStatusLabel(option)}
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
        <Badge variant={statusBadgeVariant(campaign.status)}>
          {formatStatusLabel(campaign.status)}
        </Badge>
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
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({
          queryKey: dashboardCampaignDetailQueryKey(query.projectId, detail.campaign.campaign_id)
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardPromotionDetailQueryKey(query.projectId, result.promotion_id)
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardSegmentDetailQueryKey(
            query.projectId,
            result.promotion_id,
            result.segment_id
          )
        })
      ]);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({
          queryKey: dashboardCampaignDetailQueryKey(query.projectId, detail.campaign.campaign_id)
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardPromotionDetailQueryKey(query.projectId, result.promotion_id)
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardSegmentDetailQueryKey(
            query.projectId,
            result.promotion_id,
            result.segment_id
          )
        })
      ]);
    }
  });
  switch (tab) {
    case "campaign-metrics":
      return (
        <>
          <CampaignRealtimeTrend detail={detail} />
          <EvaluationOutcomePanel
            adExperiments={detail.ad_experiments}
            metrics={detail.experiment_metrics}
          />
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
          <CampaignPromotionTable
            onSelectPromotion={onSelectPromotion}
            promotions={detail.promotions}
            segments={detail.segments}
            selectedPromotionId={selectedPromotionId}
          />
          <EvaluationOutcomePanel
            adExperiments={detail.ad_experiments}
            metrics={detail.experiment_metrics}
          />
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
            <Badge variant={statusBadgeVariant(campaign.status)}>
              {formatStatusLabel(campaign.status)}
            </Badge>
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
        <SummaryItem label="대상" value={formatAudienceLabel(campaign.target_audience)} />
        <SummaryItem label="기간" value={formatPeriod(campaign)} />
        <SummaryItem
          label="루프"
          value={`${formatInteger(campaign.current_loop_count)} / ${formatInteger(campaign.max_loop_count)}`}
        />
        <SummaryItem label="프로모션" value={formatInteger(campaign.promotion_count)} />
        <SummaryItem label="세그먼트" value={formatInteger(campaign.segment_count)} />
        <SummaryItem label="광고 실험" value={formatInteger(campaign.ad_experiment_count)} />
        <SummaryItem label="주요 지표" value={formatMetricLabel(campaign.primary_metric)} />
        <SummaryItem label="다음 액션" value={formatActionLabel(campaign.next_action)} />
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
                {formatChannelLabel(promotion.channel)} · {formatMetricLabel(promotion.goal_metric)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div>목표값: {formatGoalValue(promotion.goal_target_value)}</div>
              <div>목표 기준: {formatBasisLabel(promotion.goal_basis)}</div>
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
          캠페인 → 프로모션 → 세그먼트 → 광고 실험 → 평가 → 다음 루프 흐름을
          DB 상태로 확인합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="프로모션" value={formatInteger(detail.promotions.length)} />
        <SummaryItem label="세그먼트" value={formatInteger(totalSegments)} />
        <SummaryItem label="광고 실험" value={formatInteger(totalExperiments)} />
        <SummaryItem label="평가된 프로모션" value={formatInteger(evaluatedPromotionCount)} />
      </div>
      <Card className="shadow-none">
        <CardHeader className="gap-1">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">{detail.campaign.campaign_name}</CardTitle>
            <Badge variant={statusBadgeVariant(detail.campaign.status)}>
              {formatStatusLabel(detail.campaign.status)}
            </Badge>
          </div>
          <CardDescription>
            캠페인 노드 · {detail.campaign.campaign_id} ·{" "}
            {formatMetricLabel(detail.campaign.primary_metric)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryItem label="목표" value={detail.campaign.objective ?? "-"} />
            <SummaryItem label="기간" value={formatPeriod(detail.campaign)} />
            <SummaryItem
              label="최근 목표 달성률"
              value={
                detail.campaign.latest_goal_achievement_rate === null
                  ? "-"
                  : formatPercent(detail.campaign.latest_goal_achievement_rate)
              }
            />
            <SummaryItem
              label="계층"
              value={`${formatInteger(detail.promotions.length)}개 프로모션 / ${formatInteger(totalSegments)}개 세그먼트`}
            />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {detail.promotions.map((promotion) => {
          const segments = detail.segments.filter(
            (segment) => segment.promotion_id === promotion.promotion_id
          );
          const metrics = detail.experiment_metrics.filter(
            (metric) => metric.promotion_id === promotion.promotion_id
          );
          const workflowSteps = campaignWorkflowSteps(detail.campaign, promotion, segments, metrics);
          return (
            <Card className="shadow-none" key={promotion.promotion_id}>
              <CardHeader className="gap-1">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{promotion.marketing_theme}</CardTitle>
                  <Badge variant={statusBadgeVariant(promotion.status)}>
                    {formatStatusLabel(promotion.status)}
                  </Badge>
                </div>
                <CardDescription>
                  프로모션 노드 · {promotion.promotion_id} ·{" "}
                  {formatChannelLabel(promotion.channel)} · {formatMetricLabel(promotion.goal_metric)}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="grid gap-2 md:grid-cols-6">
                  {workflowSteps.map((step) => (
                    <div
                      className="grid gap-2 rounded-md border bg-muted/20 p-3"
                      key={`${promotion.promotion_id}-${step.label}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{step.label}</span>
                        <Badge variant={step.variant}>{formatStatusLabel(step.status)}</Badge>
                      </div>
                      <div className="text-sm font-medium">{step.value}</div>
                    </div>
                  ))}
                </div>
                <WorkflowSegmentTable metrics={metrics} segments={segments} />
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
  campaign: DashboardCampaignSummary,
  promotion: DashboardCampaignPromotion,
  segments: DashboardCampaignSegment[],
  metrics: DashboardCampaignExperimentMetric[]
) {
  const insufficientCount = metrics.filter((metric) => metric.status === "insufficient_data").length;
  const goalNotMetCount = metrics.filter((metric) => metric.status === "goal_not_met").length;
  const nextLoopCount = metrics.filter((metric) => metric.next_loop_required).length;
  const experimentIds = uniqueValues(metrics.map((metric) => metric.ad_experiment_id));
  const experimentCount = Math.max(promotion.ad_experiment_count, experimentIds.length);
  const evaluationStatus =
    metrics.length === 0
      ? "waiting"
      : insufficientCount > 0
        ? "insufficient_data"
        : goalNotMetCount > 0
          ? "goal_not_met"
          : metrics.some((metric) => metric.status === "goal_met")
            ? "goal_met"
            : "evaluated";

  return [
    {
      label: "캠페인",
      status: campaign.status,
      value: campaign.campaign_name,
      variant: statusBadgeVariant(campaign.status)
    },
    {
      label: "프로모션",
      status: promotion.status,
      value: promotion.channel,
      variant: statusBadgeVariant(promotion.status)
    },
    {
      label: "세그먼트",
      status: segments.length > 0 ? "ready" : "empty",
      value: formatInteger(segments.length),
      variant: segments.length > 0 ? "secondary" : "outline"
    },
    {
      label: "광고 실험",
      status: experimentCount > 0 ? "created" : "empty",
      value: formatInteger(experimentCount),
      variant: experimentCount > 0 ? "secondary" : "outline"
    },
    {
      label: "평가",
      status: evaluationStatus,
      value: formatInteger(metrics.length),
      variant: statusBadgeVariant(evaluationStatus)
    },
    {
      label: "다음 루프",
      status: nextLoopCount > 0 ? "required" : insufficientCount > 0 ? "hold" : "none",
      value:
        nextLoopCount > 0
          ? `${formatInteger(nextLoopCount)}개 후보`
          : goalNotMetCount > 0
            ? `목표 미달 ${formatInteger(goalNotMetCount)}개`
            : "-",
      variant: nextLoopCount > 0 ? "destructive" : "outline"
    }
  ] as const;
}

function WorkflowSegmentTable({
  metrics,
  segments
}: {
  metrics: DashboardCampaignExperimentMetric[];
  segments: DashboardCampaignSegment[];
}) {
  if (segments.length === 0) {
    return <EmptyState message="이 프로모션에 연결된 세그먼트가 없습니다." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>세그먼트</TableHead>
          <TableHead>광고 실험</TableHead>
          <TableHead>평가</TableHead>
          <TableHead className="text-right">표본</TableHead>
          <TableHead>다음 루프</TableHead>
          <TableHead>근거 / 사유</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {segments.map((segment) => {
          const segmentMetrics = metrics.filter((metric) => metric.segment_id === segment.segment_id);
          const latestMetric = segmentMetrics[0] ?? null;
          const experimentIds = uniqueValues(segmentMetrics.map((metric) => metric.ad_experiment_id));
          const insufficientMetric = segmentMetrics.find(
            (metric) => metric.status === "insufficient_data"
          );
          const insufficientDetails = insufficientMetric
            ? insufficientDataDetails(insufficientMetric)
            : null;
          const nextLoopCount = segmentMetrics.filter((metric) => metric.next_loop_required).length;
          const evaluationStatus = latestMetric?.status ?? segment.status;
          const basis =
            insufficientDetails?.reason ??
            latestMetric?.feedback ??
            segment.natural_language_query ??
            "-";

          return (
            <TableRow key={segment.segment_id}>
              <TableCell>
                <div className="grid min-w-[180px] gap-1">
                  <span className="font-medium">{segment.segment_name}</span>
                  <span className="text-xs text-muted-foreground">{segment.segment_id}</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={statusBadgeVariant(segment.status)}>
                      {formatStatusLabel(segment.status)}
                    </Badge>
                    {segment.priority ? <Badge variant="outline">{segment.priority}</Badge> : null}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="grid min-w-[160px] gap-1">
                  <span>{experimentIds.length > 0 ? experimentIds.join(", ") : "-"}</span>
                  <span className="text-xs text-muted-foreground">
                    평가 {formatInteger(segmentMetrics.length)}개
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={statusBadgeVariant(evaluationStatus)}>
                    {formatStatusLabel(evaluationStatus)}
                  </Badge>
                  {latestMetric ? (
                    <Badge variant="outline">{formatMetricLabel(latestMetric.metric)}</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <div className="grid gap-1">
                  <span>{formatInteger(segment.sample_size)}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatPercent(segment.sample_ratio)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {nextLoopCount > 0 ? (
                  <Badge variant="destructive">{formatInteger(nextLoopCount)}개 필요</Badge>
                ) : insufficientMetric ? (
                  <Badge variant="outline">보류</Badge>
                ) : (
                  <Badge variant="outline">없음</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="grid min-w-[240px] gap-1">
                  <span className="line-clamp-2">{basis}</span>
                  {insufficientDetails ? (
                    <span className="text-xs text-muted-foreground">
                      배정 {formatNullableInteger(insufficientDetails.assignedUserCount)} / 최소{" "}
                      {formatNullableInteger(insufficientDetails.minimumRequiredSampleSize)}
                    </span>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
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

function CampaignNextAction({
  detail,
  query
}: {
  detail: DashboardCampaignDetail;
  query: DashboardQuery;
}) {
  const queryClient = useQueryClient();
  const [requestedAnalysisId, setRequestedAnalysisId] = useState("");
  const evaluationMetrics = displayableEvaluationMetrics(
    detail.experiment_metrics,
    detail.ad_experiments
  );
  const nextLoopMetrics = evaluationMetrics.filter((metric) => metric.next_loop_required);
  const goalNotMetMetrics = evaluationMetrics.filter(
    (metric) => metric.status === "goal_not_met"
  );
  const insufficientMetrics = evaluationMetrics.filter(
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
        operator_instruction: "대시보드에서 목표 미달 세그먼트 다음 루프 분석 요청"
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
        <SummaryItem label="다음 루프 후보" value={formatInteger(nextLoopMetrics.length)} />
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
          <AlertTitle>다음 루프 분석 요청 실패</AlertTitle>
          <AlertDescription>{mutationErrorMessage(nextLoopMutation.error)}</AlertDescription>
        </Alert>
      ) : null}
      {requestedAnalysisId ? (
        <Alert>
          <AlertTitle>다음 루프 분석을 요청했습니다</AlertTitle>
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
              <InsightBlock label="대상 세그먼트 ID" value={target.focusSegmentIds.join("\n")} />
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
                {nextLoopMutation.isPending ? "요청 중" : "다음 루프 분석 요청"}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <InsightBlock
          label="다음 루프 대상 세그먼트"
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
      title: "표본 부족 평가가 포함되어 있습니다.",
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
  onRejectContentCandidate,
  onSelectSegment,
  rejectContentCandidateError,
  rejectContentCandidateIsError,
  rejectContentCandidateIsPending,
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
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  rejectContentCandidateError: Error | null;
  rejectContentCandidateIsError: boolean;
  rejectContentCandidateIsPending: boolean;
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
      <PromotionAnalysisPanel detail={detail} />
      <RealtimeEventTable
        emptyMessage="프로모션 실시간 이벤트가 아직 수집되지 않았습니다."
        metrics={detail.realtime_metrics}
        title="프로모션 이벤트 집계"
      />
      <PromotionSegmentRealtimeSummary detail={detail} />
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
        onRejectContentCandidate={onRejectContentCandidate}
        rejectError={rejectContentCandidateError}
        rejectIsError={rejectContentCandidateIsError}
        rejectIsPending={rejectContentCandidateIsPending}
        selectedSegmentId={selectedSegmentId}
      />
      <EvaluationOutcomePanel metrics={detail.experiment_metrics} />
      <ExperimentMetricTable metrics={detail.experiment_metrics} />
    </section>
  );
}

function PromotionAnalysisPanel({ detail }: { detail: DashboardPromotionDetailResource }) {
  const latestAnalysis = detail.analyses[0];
  const completedCount = detail.analyses.filter((analysis) => analysis.status === "completed").length;
  const failedCount = detail.analyses.filter((analysis) => analysis.status === "failed").length;
  const focusSegmentCount = uniqueValues(
    detail.analyses.flatMap((analysis) => analysis.focus_segment_ids)
  ).length;

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">프로모션 분석 히스토리</h3>
        <p className="text-sm text-muted-foreground">
          Decision 분석 요청, focus segment, 운영자 지시, 결과 JSON을 최신순으로 확인합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="분석 요청" value={formatInteger(detail.analyses.length)} />
        <SummaryItem label="완료" value={formatInteger(completedCount)} />
        <SummaryItem label="실패" value={formatInteger(failedCount)} />
        <SummaryItem label="focus segment" value={formatInteger(focusSegmentCount)} />
      </div>
      {latestAnalysis ? (
        <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <div className="font-medium">{latestAnalysis.analysis_id}</div>
              <div className="text-xs text-muted-foreground">
                updated {latestAnalysis.updated_at}
              </div>
            </div>
            <Badge variant={statusBadgeVariant(latestAnalysis.status)}>
              {formatStatusLabel(latestAnalysis.status)}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InsightBlock
              label="운영자 지시"
              value={latestAnalysis.operator_instruction ?? "-"}
            />
            <InsightBlock
              label="focus segment"
              value={
                latestAnalysis.focus_segment_ids.length > 0
                  ? latestAnalysis.focus_segment_ids.join("\n")
                  : "-"
              }
            />
            <InsightBlock
              label="프로필 요약"
              value={formatJsonObject(latestAnalysis.profile_summary_json)}
            />
            <InsightBlock
              label="분석 결과"
              value={
                latestAnalysis.output_json ? formatJsonObject(latestAnalysis.output_json) : "-"
              }
            />
          </div>
        </div>
      ) : (
        <EmptyState message="프로모션 분석 히스토리가 없습니다." />
      )}
      {detail.analyses.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>분석 ID</TableHead>
              <TableHead>focus segment</TableHead>
              <TableHead>운영자 지시</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>업데이트</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.analyses.map((analysis) => (
              <TableRow key={analysis.analysis_id}>
                <TableCell>
                  <div className="min-w-[180px] font-medium">{analysis.analysis_id}</div>
                </TableCell>
                <TableCell>
                  <div className="line-clamp-2 min-w-[180px]">
                    {analysis.focus_segment_ids.length > 0
                      ? analysis.focus_segment_ids.join(", ")
                      : "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="line-clamp-2 min-w-[220px]">
                    {analysis.operator_instruction ?? "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(analysis.status)}>
                    {formatStatusLabel(analysis.status)}
                  </Badge>
                </TableCell>
                <TableCell>{analysis.updated_at}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </section>
  );
}

function PromotionSegmentRealtimeSummary({
  detail
}: {
  detail: DashboardPromotionDetailResource;
}) {
  const summariesBySegment = new Map(
    detail.segment_realtime_summaries.map((summary) => [summary.segment_id, summary])
  );

  return (
    <DetailTable
      emptyMessage="세그먼트별 실시간 집계가 없습니다."
      headers={[
        "세그먼트",
        "대상",
        "발송",
        "도달",
        "노출",
        "클릭",
        "랜딩",
        "예약 시작",
        "예약 완료",
        "목표",
        "상태"
      ]}
      title="세그먼트 집계"
    >
      {detail.segments.map((segment) => {
        const summary = summariesBySegment.get(segment.segment_id);
        return (
          <TableRow key={`${segment.promotion_id}-${segment.segment_id}-realtime`}>
            <TableCell>
              <div className="flex min-w-[180px] flex-col gap-1">
                <span className="font-medium">{segment.segment_name}</span>
                <span className="text-xs text-muted-foreground">{segment.segment_id}</span>
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatInteger(summary?.segment_user_count ?? segment.estimated_size)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatInteger(summary?.delivery_count ?? 0)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatInteger(summary?.reach_count ?? 0)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatInteger(summary?.promotion_impression_count ?? 0)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatInteger(summary?.promotion_click_count ?? 0)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatInteger(summary?.campaign_landing_count ?? 0)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatInteger(summary?.booking_start_count ?? 0)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatInteger(summary?.booking_complete_count ?? 0)}
            </TableCell>
            <TableCell>
              <div className="grid min-w-[160px] gap-1">
                <span>{formatMetricLabel(segment.goal_metric)}</span>
                <span className="text-xs text-muted-foreground">
                  {segment.latest_actual_value === null
                    ? "-"
                    : formatGoalValue(segment.latest_actual_value)}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={statusBadgeVariant(segment.status)}>
                  {formatStatusLabel(segment.status)}
                </Badge>
                <Badge variant="outline">{formatActionLabel(segment.next_action)}</Badge>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </DetailTable>
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
                    {isSelected ? "열림" : formatStatusLabel(segment.status)}
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
            <Badge variant={statusBadgeVariant(promotion.status)}>
              {formatStatusLabel(promotion.status)}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatChannelLabel(promotion.channel)} · {formatAudienceLabel(promotion.target_audience)}
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
        <SummaryItem label="목표 지표" value={formatMetricLabel(promotion.goal_metric)} />
        <SummaryItem label="목표값" value={formatGoalValue(promotion.goal_target_value)} />
        <SummaryItem label="목표 기준" value={formatBasisLabel(promotion.goal_basis)} />
        <SummaryItem label="최소 표본" value={formatInteger(promotion.min_sample_size)} />
        <SummaryItem
          label="루프"
          value={`${formatInteger(promotion.current_loop_count)} / ${formatInteger(promotion.max_loop_count)}`}
        />
        <SummaryItem label="랜딩 타입" value={formatLandingTypeLabel(promotion.landing_type)} />
        <SummaryItem label="오퍼" value={promotion.offer_type ?? "-"} />
        <SummaryItem label="세그먼트" value={formatInteger(detail.segments.length)} />
        <SummaryItem label="실험 지표" value={formatInteger(detail.experiment_metrics.length)} />
        <SummaryItem
          label="실시간 이벤트"
          value={formatInteger(detail.realtime_metrics.total_event_count)}
        />
        <SummaryItem label="목표 달성률" value={formatPercent(achievementRate)} />
        <SummaryItem label="다음 액션" value={formatActionLabel(promotion.next_action)} />
      </div>
      <InsightBlock label="메시지 방향" value={promotion.message_brief ?? "-"} />
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
              <TableHead>목표</TableHead>
              <TableHead>실험</TableHead>
              <TableHead className="text-right">예상 규모</TableHead>
              <TableHead className="text-right">표본 비율</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>다음 액션</TableHead>
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
                <TableCell>
                  <div className="grid min-w-[140px] gap-1">
                    <span>{formatMetricLabel(segment.goal_metric)}</span>
                    <span className="text-xs text-muted-foreground">
                      {segment.latest_actual_value === null
                        ? "-"
                        : formatGoalValue(segment.latest_actual_value)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{segment.ad_experiment_id ?? "-"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(segment.estimated_size)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercentValue(segment.sample_ratio)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={statusBadgeVariant(segment.status)}>
                      {formatStatusLabel(segment.status)}
                    </Badge>
                    {segment.priority ? <Badge variant="outline">{segment.priority}</Badge> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{formatActionLabel(segment.next_action)}</Badge>
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

function SegmentDetailPanel({
  approveError,
  approveIsError,
  approveIsPending,
  detail,
  error,
  isError,
  isLoading,
  onApproveContentCandidate,
  onRejectContentCandidate,
  rejectError,
  rejectIsError,
  rejectIsPending,
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
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  rejectError: Error | null;
  rejectIsError: boolean;
  rejectIsPending: boolean;
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
        onReject={onRejectContentCandidate}
        rejectError={rejectError}
        rejectIsError={rejectIsError}
        rejectIsPending={rejectIsPending}
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
              {formatStatusLabel(detail.segment.status)}
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
              ? `${formatMetricLabel(latestMetric.metric)} ${formatGoalValue(latestMetric.actual_value)}`
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
        <SummaryItem label="목표 지표" value={formatMetricLabel(detail.segment.goal_metric)} />
        <SummaryItem
          label="현재 목표값"
          value={
            detail.segment.latest_actual_value === null
              ? "-"
              : formatGoalValue(detail.segment.latest_actual_value)
          }
        />
        <SummaryItem label="연결 실험" value={detail.segment.ad_experiment_id ?? "-"} />
        <SummaryItem label="다음 액션" value={formatActionLabel(detail.segment.next_action)} />
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
  const [eventNameFilter, setEventNameFilter] = useState("all");
  const filteredEvents =
    eventNameFilter === "all"
      ? metrics.events
      : metrics.events.filter((event) => event.event_name === eventNameFilter);
  const filteredTotalEventCount = filteredEvents.reduce(
    (sum, event) => sum + event.event_count,
    0
  );
  const peakEvent = metrics.events.reduce<DashboardRealtimeMetrics["events"][number] | null>(
    (current, event) => (!current || event.event_count > current.event_count ? event : current),
    null
  );
  const uniqueUserTotal = metrics.events.reduce(
    (sum, event) => sum + event.unique_user_count,
    0
  );

  return (
    <>
      {metrics.events.length > 0 ? (
        <section className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid gap-1">
              <h3 className="text-base font-semibold text-[#1d1d1f]">{title}</h3>
              <p className="text-sm text-muted-foreground">
                수집 이벤트를 event_name 기준으로 필터링합니다.
              </p>
            </div>
            <Field className="max-w-[260px]">
              <FieldLabel>이벤트 종류</FieldLabel>
              <Select onValueChange={setEventNameFilter} value={eventNameFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="이벤트 종류" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 이벤트</SelectItem>
                  {metrics.events.map((event) => (
                    <SelectItem key={event.event_name} value={event.event_name}>
                      {eventDisplayName(event.event_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryItem label="이벤트 합계" value={formatInteger(metrics.total_event_count)} />
            <SummaryItem
              label="최근 5분 이벤트"
              value={formatInteger(metrics.recent_5m_event_count)}
            />
            <SummaryItem
              label="최근 1시간 이벤트"
              value={formatInteger(metrics.recent_1h_event_count)}
            />
            <SummaryItem label="피크타임" value={metrics.peak_time ?? "-"} />
            <SummaryItem label="유니크 유저 합계" value={formatInteger(uniqueUserTotal)} />
            <SummaryItem
              label="프로모션 노출"
              value={formatInteger(realtimeEventCount(metrics, "promotion_impression"))}
            />
            <SummaryItem
              label="프로모션 클릭"
              value={formatInteger(realtimeEventCount(metrics, "promotion_click"))}
            />
            <SummaryItem
              label="캠페인 랜딩"
              value={formatInteger(realtimeEventCount(metrics, "campaign_landing"))}
            />
            <SummaryItem
              label="예약 시작"
              value={formatInteger(realtimeEventCount(metrics, "booking_start"))}
            />
            <SummaryItem
              label="예약 완료"
              value={formatInteger(realtimeEventCount(metrics, "booking_complete"))}
            />
            <SummaryItem
              label="피크 이벤트"
              value={
                peakEvent
                  ? `${eventDisplayName(peakEvent.event_name)} ${formatInteger(peakEvent.event_count)}`
                  : "-"
              }
            />
          </div>
          <RealtimeFunnelSummary metrics={metrics} />
          <RealtimeDeliveryAndBannerSummary metrics={metrics} />
          <RealtimeBreakdownSummary metrics={metrics} />
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
            <BarChart data={chartEvents(filteredEvents)}>
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
              {filteredEvents.map((event) => (
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
                    {filteredTotalEventCount > 0
                      ? formatPercentValue(event.event_count / filteredTotalEventCount)
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

function RealtimeBreakdownSummary({ metrics }: { metrics: DashboardRealtimeMetrics }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <RealtimeBreakdownList
        emptyMessage="channel 집계가 없습니다."
        items={metrics.channel_breakdown}
        title="channel별 추이"
      />
      <RealtimeBreakdownList
        emptyMessage="landing_type 집계가 없습니다."
        items={metrics.landing_type_breakdown}
        title="landing_type별 추이"
      />
      <RealtimeBreakdownList
        emptyMessage="hotel_cluster 집계가 없습니다."
        items={metrics.hotel_cluster_breakdown}
        title="hotel_cluster별 추이"
      />
      <RealtimeTimeBucketList buckets={metrics.time_buckets} />
    </div>
  );
}

function RealtimeBreakdownList({
  emptyMessage,
  items,
  title
}: {
  emptyMessage: string;
  items: DashboardRealtimeMetrics["channel_breakdown"];
  title: string;
}) {
  const maxCount = Math.max(...items.map((item) => item.event_count), 1);

  return (
    <div className="grid gap-3 rounded-md border bg-background p-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <div className="grid gap-1.5" key={item.key}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{item.key}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatInteger(item.event_count)} / unique {formatInteger(item.unique_user_count)}
                </span>
              </div>
              <Progress value={(item.event_count / maxCount) * 100} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{emptyMessage}</div>
      )}
    </div>
  );
}

function RealtimeTimeBucketList({
  buckets
}: {
  buckets: DashboardRealtimeMetrics["time_buckets"];
}) {
  const recentBuckets = buckets.slice(-6);
  const maxCount = Math.max(...recentBuckets.map((bucket) => bucket.event_count), 1);

  return (
    <div className="grid gap-3 rounded-md border bg-background p-3">
      <h4 className="text-sm font-semibold text-foreground">time_range별 추이</h4>
      {recentBuckets.length > 0 ? (
        <div className="grid gap-3">
          {recentBuckets.map((bucket) => (
            <div className="grid gap-1.5" key={bucket.time_bucket}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{bucket.time_bucket}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatInteger(bucket.event_count)} / unique{" "}
                  {formatInteger(bucket.unique_user_count)}
                </span>
              </div>
              <Progress value={(bucket.event_count / maxCount) * 100} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">time_range 집계가 없습니다.</div>
      )}
    </div>
  );
}

function RealtimeFunnelSummary({ metrics }: { metrics: DashboardRealtimeMetrics }) {
  const steps = [
    "hotel_search",
    "hotel_click",
    "hotel_detail_view",
    "booking_start",
    "booking_complete"
  ].map((eventName) => ({
    count: realtimeEventCount(metrics, eventName),
    eventName,
    label: eventDisplayName(eventName),
    uniqueUserCount: realtimeUniqueUserCount(metrics, eventName)
  }));
  const maxCount = Math.max(...steps.map((step) => step.count), 1);

  return (
    <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
      <div className="grid gap-1">
        <h4 className="text-sm font-semibold text-foreground">예약 퍼널 집계</h4>
        <p className="text-xs text-muted-foreground">
          hotel_search → hotel_click → hotel_detail_view → booking_start → booking_complete
        </p>
      </div>
      <div className="grid gap-3">
        {steps.map((step, index) => {
          const previousStep = index > 0 ? steps[index - 1] : null;
          const stepRate =
            previousStep && previousStep.count > 0 ? step.count / previousStep.count : null;

          return (
            <div className="grid gap-1.5" key={step.eventName}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="grid gap-0.5">
                  <span className="font-medium">{step.label}</span>
                  <span className="text-xs text-muted-foreground">{step.eventName}</span>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-medium">{formatInteger(step.count)}</div>
                  <div className="text-xs text-muted-foreground">
                    unique {formatInteger(step.uniqueUserCount)}
                    {stepRate === null ? "" : ` · ${formatPercentValue(stepRate)}`}
                  </div>
                </div>
              </div>
              <Progress value={(step.count / maxCount) * 100} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RealtimeDeliveryAndBannerSummary({
  metrics
}: {
  metrics: DashboardRealtimeMetrics;
}) {
  const delivery = metrics.delivery_status;
  const banner = metrics.banner_response;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="grid gap-3 rounded-md border bg-background p-3">
        <div className="grid gap-1">
          <h4 className="text-sm font-semibold text-foreground">SMS/Email 발송 상태</h4>
          <p className="text-xs text-muted-foreground">
            ad_dispatch_jobs와 수집 이벤트를 함께 집계합니다.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryItem label="예약됨" value={formatInteger(delivery.scheduled_count)} />
          <SummaryItem label="발송됨" value={formatInteger(delivery.sent_count)} />
          <SummaryItem label="도달" value={formatInteger(delivery.delivered_count)} />
          <SummaryItem label="열람" value={formatInteger(delivery.opened_count)} />
          <SummaryItem label="클릭" value={formatInteger(delivery.clicked_count)} />
          <SummaryItem label="실패" value={formatInteger(delivery.failed_count)} />
        </div>
        <Progress
          value={
            delivery.scheduled_count > 0
              ? (delivery.delivered_count / delivery.scheduled_count) * 100
              : 0
          }
        />
      </div>
      <div className="grid gap-3 rounded-md border bg-background p-3">
        <div className="grid gap-1">
          <h4 className="text-sm font-semibold text-foreground">배너 조회/클릭률</h4>
          <p className="text-xs text-muted-foreground">
            onsite_banner 노출, 클릭, 예약 이벤트를 함께 봅니다.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryItem
            label="노출"
            value={formatInteger(banner.promotion_impression_count)}
          />
          <SummaryItem label="클릭" value={formatInteger(banner.promotion_click_count)} />
          <SummaryItem label="CTR" value={formatPercentValue(banner.promotion_click_rate)} />
          <SummaryItem
            label="숙소 검색"
            value={formatInteger(banner.hotel_search_count)}
          />
          <SummaryItem
            label="숙소 상세"
            value={formatInteger(banner.hotel_detail_view_count)}
          />
          <SummaryItem
            label="예약 완료"
            value={formatInteger(banner.booking_complete_count)}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          banner_position: {banner.banner_position ?? "-"}
        </div>
      </div>
    </div>
  );
}

function chartEvents(events: DashboardRealtimeMetrics["events"]) {
  return events.map((event) => ({
    event_count: event.event_count,
    label: eventDisplayName(event.event_name),
    unique_user_count: event.unique_user_count
  }));
}

function realtimeEventCount(metrics: DashboardRealtimeMetrics, eventName: string) {
  return (
    metrics.events.find((event) => event.event_name === eventName)?.event_count ?? 0
  );
}

function realtimeUniqueUserCount(metrics: DashboardRealtimeMetrics, eventName: string) {
  return (
    metrics.events.find((event) => event.event_name === eventName)?.unique_user_count ?? 0
  );
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
    : "현재 지표 기준으로 자동 다음 루프 대상은 아닙니다.";

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
                <Badge variant={statusBadgeVariant(experiment.status)}>
                  {formatStatusLabel(experiment.status)}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <SummaryItem label="프로모션" value={experiment.promotion_id} />
                <SummaryItem label="세그먼트" value={experiment.segment_id} />
                <SummaryItem label="콘텐츠" value={experiment.content_id} />
                <SummaryItem label="채널" value={formatChannelLabel(experiment.channel)} />
                <SummaryItem label="루프" value={formatInteger(experiment.loop_count)} />
                <SummaryItem
                  label="목표"
                  value={`${formatMetricLabel(experiment.goal_metric)} / ${formatGoalValue(experiment.goal_target_value)}`}
                />
              </div>
              <InsightBlock label="목표 기준" value={formatBasisLabel(experiment.goal_basis)} />
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
                      {metric.ad_experiment_id ?? formatMetricLabel(metric.metric)}
                    </div>
                    <div className="text-xs text-muted-foreground">{metric.segment_id ?? "-"}</div>
                  </div>
                  <Badge variant="destructive">표본 부족</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <SummaryItem
                    label="후보 유저"
                    value={formatNullableInteger(details.candidateUserCount)}
                  />
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
                  <SummaryItem
                    label="겹침 제외"
                    value={formatNullableInteger(details.overlapExcludedUserCount)}
                  />
                  <SummaryItem
                    label="다른 세그먼트 배정"
                    value={formatNullableInteger(details.assignedToOtherSegmentCount)}
                  />
                </div>
                <InsightBlock label="부족 사유" value={details.reason ?? metric.feedback ?? "-"} />
                <InsightBlock
                  label="교집합/배정 근거"
                  value={insufficientAssignmentSummary(details)}
                />
                <InsightBlock label="상세 설명" value={details.note ?? "-"} />
              </div>
            );
          })}
        </div>
      ) : (
        <Alert>
          <AlertTitle>세그먼트 상태가 표본 부족입니다</AlertTitle>
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
      <h3 className="text-base font-semibold text-[#1d1d1f]">표본 수 검증</h3>
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
                    <div className="text-sm font-medium">{formatMetricLabel(metric.metric)}</div>
                    <div className="text-xs text-muted-foreground">
                      {metric.ad_experiment_id ?? "-"}
                    </div>
                  </div>
                  <Badge variant={statusBadgeVariant(metric.status)}>
                    {formatStatusLabel(metric.status)}
                  </Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">평가 기준</span>
                    <span className="font-medium">{formatBasisLabel(metric.basis)}</span>
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
  onApprove,
  onReject,
  rejectError,
  rejectIsError,
  rejectIsPending
}: {
  approveError: Error | null;
  approveIsError: boolean;
  approveIsPending: boolean;
  candidates: DashboardSegmentDetailResource["content_candidates"];
  onApprove: (promotionId: string, segmentId: string, contentId: string) => void;
  onReject: (promotionId: string, segmentId: string, contentId: string) => void;
  rejectError: Error | null;
  rejectIsError: boolean;
  rejectIsPending: boolean;
}) {
  const [candidateSearch, setCandidateSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const statusOptions = uniqueValues(candidates.map((candidate) => candidate.status));
  const channelOptions = uniqueValues(candidates.map((candidate) => candidate.channel));
  const filteredCandidates = filterContentCandidates(
    candidates,
    candidateSearch,
    statusFilter,
    channelFilter
  );

  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">생성 이유 리포트</h3>
      {approveIsError ? (
        <Alert variant="destructive">
          <AlertTitle>콘텐츠 후보를 승인하지 못했습니다</AlertTitle>
          <AlertDescription>{mutationErrorMessage(approveError)}</AlertDescription>
        </Alert>
      ) : null}
      {rejectIsError ? (
        <Alert variant="destructive">
          <AlertTitle>콘텐츠 후보를 거절하지 못했습니다</AlertTitle>
          <AlertDescription>{mutationErrorMessage(rejectError)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <Field>
          <FieldLabel>콘텐츠 후보 검색</FieldLabel>
          <Input
            onChange={(event) => setCandidateSearch(event.target.value)}
            placeholder="제목, 메시지, 이유, 콘텐츠 ID"
            value={candidateSearch}
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
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatStatusLabel(status)}
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
              {channelOptions.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {formatChannelLabel(channel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="전체 후보" value={formatInteger(candidates.length)} />
        <SummaryItem label="필터 결과" value={formatInteger(filteredCandidates.length)} />
        <SummaryItem
          label="승인 후보"
          value={formatInteger(candidates.filter((candidate) => candidate.status === "approved").length)}
        />
        <SummaryItem
          label="검수 대기"
          value={formatInteger(candidates.filter((candidate) => candidate.status === "draft").length)}
        />
      </div>
      {candidates.length > 0 ? (
        filteredCandidates.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredCandidates.map((candidate) => (
              <div className="grid gap-3 rounded-md border bg-muted/20 p-3" key={candidate.content_id}>
                <ContentCandidateVisual candidate={candidate} />
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <div className="text-sm font-medium">
                      {candidate.title ?? candidate.content_option_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatChannelLabel(candidate.channel)} / {candidate.content_id}
                    </div>
                  </div>
                  <Badge variant={statusBadgeVariant(candidate.status)}>
                    {formatStatusLabel(candidate.status)}
                  </Badge>
                </div>
                <InsightBlock label="메시지" value={candidate.message ?? candidate.body ?? "-"} />
                <InsightBlock label="이메일 제목" value={candidate.subject ?? "-"} />
                <InsightBlock label="프리헤더" value={candidate.preheader ?? "-"} />
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
                <div className="flex justify-end gap-2">
                  <Button
                    disabled={
                      approveIsPending ||
                      rejectIsPending ||
                      candidate.status === "approved" ||
                      candidate.status === "rejected"
                    }
                    onClick={() =>
                      onReject(
                        candidate.promotion_id,
                        candidate.segment_id,
                        candidate.content_id
                      )
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {candidate.status === "rejected" ? "거절됨" : "거절"}
                  </Button>
                  <Button
                    disabled={
                      approveIsPending ||
                      rejectIsPending ||
                      candidate.status === "approved" ||
                      candidate.status === "rejected"
                    }
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
                    {candidate.status === "approved" ? "승인됨" : "승인"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="필터 조건에 맞는 콘텐츠 후보가 없습니다." />
        )
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
      "finalAssignedUserCount",
      "final_assignment_count",
      "finalAssignmentCount"
    ]),
    assignedToOtherSegmentCount: pickJsonNumber(metric.result_json, [
      "assigned_to_other_segment_count",
      "assignedToOtherSegmentCount",
      "lost_to_other_segment_count",
      "lostToOtherSegmentCount",
      "other_segment_assigned_count",
      "otherSegmentAssignedCount"
    ]),
    assignmentBuildId: pickJsonString(metric.result_json, [
      "assignment_build_id",
      "assignmentBuildId",
      "segment_assignment_build_id",
      "segmentAssignmentBuildId"
    ]),
    candidateUserCount: pickJsonNumber(metric.result_json, [
      "candidate_user_count",
      "candidateUserCount",
      "estimated_candidate_user_count",
      "estimatedCandidateUserCount",
      "pre_assignment_user_count",
      "preAssignmentUserCount"
    ]),
    minimumRequiredSampleSize: pickJsonNumber(metric.result_json, [
      "minimum_required_sample_size",
      "minimumRequiredSampleSize",
      "min_sample_size",
      "minSampleSize"
    ]),
    overlapExcludedUserCount: pickJsonNumber(metric.result_json, [
      "overlap_excluded_user_count",
      "overlapExcludedUserCount",
      "overlap_removed_user_count",
      "overlapRemovedUserCount",
      "excluded_by_overlap_count",
      "excludedByOverlapCount"
    ]),
    thresholdFallbackCount: pickJsonNumber(metric.result_json, [
      "threshold_fallback_count",
      "thresholdFallbackCount",
      "below_threshold_user_count",
      "belowThresholdUserCount"
    ]),
    note: pickJsonString(metric.result_json, ["note", "message", "description"]),
    reason: pickJsonString(metric.result_json, [
      "insufficient_reason",
      "insufficientReason",
      "reason",
      "cause"
    ]),
    overlapReason: pickJsonString(metric.result_json, [
      "overlap_reason",
      "overlapReason",
      "assignment_reason",
      "assignmentReason"
    ])
  };
}

function insufficientAssignmentSummary(
  details: ReturnType<typeof insufficientDataDetails>
): string {
  const lines = [
    details.assignmentBuildId ? `배정 빌드 ID: ${details.assignmentBuildId}` : null,
    details.overlapReason ? `겹침 사유: ${details.overlapReason}` : null,
    details.assignedToOtherSegmentCount !== null
      ? `다른 세그먼트 배정 수: ${formatInteger(details.assignedToOtherSegmentCount)}`
      : null,
    details.overlapExcludedUserCount !== null
      ? `겹침 제외 수: ${formatInteger(details.overlapExcludedUserCount)}`
      : null,
    details.thresholdFallbackCount !== null
      ? `기준 미달 보정 수: ${formatInteger(details.thresholdFallbackCount)}`
      : null
  ].filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join("\n") : "-";
}

function formatNullableInteger(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatInteger(value);
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

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nonnegativeNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function positiveInteger(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.trunc(number)) : 1;
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
  const [candidateSearch, setCandidateSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const statusOptions = uniqueValues(candidates.map((candidate) => candidate.status));
  const channelOptions = uniqueValues(candidates.map((candidate) => candidate.channel));
  const filteredCandidates = filterContentCandidates(
    candidates,
    candidateSearch,
    statusFilter,
    channelFilter
  );

  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">생성 콘텐츠 카드</h3>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <Field>
          <FieldLabel>콘텐츠 후보 검색</FieldLabel>
          <Input
            onChange={(event) => setCandidateSearch(event.target.value)}
            placeholder="제목, 메시지, 이유, 콘텐츠 ID"
            value={candidateSearch}
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
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatStatusLabel(status)}
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
              {channelOptions.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {formatChannelLabel(channel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      {candidates.length > 0 ? (
        filteredCandidates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                {["콘텐츠", "채널", "메시지", "이메일 제목", "생성 이유", "메시지 방향", "상태"].map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate) => (
                <TableRow key={candidate.content_id}>
                  <TableCell>
                    <div className="flex min-w-[180px] flex-col gap-1">
                      <span className="font-medium">{candidate.content_option_id}</span>
                      <span className="text-xs text-muted-foreground">{candidate.content_id}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatChannelLabel(candidate.channel)}</TableCell>
                  <TableCell>
                    <div className="line-clamp-2 min-w-[220px]">
                      {candidate.title ?? candidate.message ?? candidate.body ?? "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-2 min-w-[180px]">
                      {candidate.subject ?? candidate.preheader ?? "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-2 min-w-[220px]">{candidate.reason_summary ?? "-"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-2 min-w-[220px]">{candidate.message_strategy ?? "-"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(candidate.status)}>
                      {formatStatusLabel(candidate.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="필터 조건에 맞는 생성 콘텐츠 후보가 없습니다." />
        )
      ) : (
        <EmptyState message="생성 콘텐츠 후보가 없습니다." />
      )}
    </section>
  );
}

function filterContentCandidates(
  candidates: DashboardSegmentDetailResource["content_candidates"],
  search: string,
  statusFilter: string,
  channelFilter: string
) {
  const normalizedSearch = search.trim().toLowerCase();

  return candidates.filter((candidate) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        candidate.content_id,
        candidate.content_option_id,
        candidate.title,
        candidate.body,
        candidate.message,
        candidate.subject,
        candidate.preheader,
        candidate.reason_summary,
        candidate.message_strategy
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    const matchesStatus = statusFilter === "all" || candidate.status === statusFilter;
    const matchesChannel = channelFilter === "all" || candidate.channel === channelFilter;

    return matchesSearch && matchesStatus && matchesChannel;
  });
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

function displayableEvaluationMetrics(
  metrics: DashboardCampaignExperimentMetric[],
  adExperiments: DashboardAdExperiment[] = []
) {
  const experimentsById = new Map(
    adExperiments.map((experiment) => [experiment.ad_experiment_id, experiment])
  );

  return metrics.filter((metric) => {
    if (!metric.ad_experiment_id) {
      return false;
    }

    if (metric.segment_id !== FALLBACK_SEGMENT_ID) {
      return true;
    }

    const assignmentCount = experimentsById.get(metric.ad_experiment_id)?.assignment_count ?? 0;
    return assignmentCount > 0 || hasEvaluationSignal(metric);
  });
}

function hasEvaluationSignal(metric: DashboardCampaignExperimentMetric) {
  return metric.sample_size > 0 || metric.denominator_count > 0 || metric.numerator_count > 0;
}

function EvaluationOutcomePanel({
  adExperiments = [],
  metrics
}: {
  adExperiments?: DashboardAdExperiment[];
  metrics: DashboardCampaignExperimentMetric[];
}) {
  const evaluationMetrics = displayableEvaluationMetrics(metrics, adExperiments);
  const goalMetCount = evaluationMetrics.filter((metric) => metric.status === "goal_met").length;
  const goalNotMetMetrics = evaluationMetrics.filter((metric) => metric.status === "goal_not_met");
  const insufficientMetrics = evaluationMetrics.filter(
    (metric) => metric.status === "insufficient_data"
  );
  const nextLoopMetrics = evaluationMetrics.filter((metric) => metric.next_loop_required);
  const failedSegmentIds = uniqueValues(goalNotMetMetrics.map((metric) => metric.segment_id));
  const failedExperimentIds = uniqueValues(
    goalNotMetMetrics.map((metric) => metric.ad_experiment_id)
  );
  const nextLoopSegmentIds = uniqueValues(nextLoopMetrics.map((metric) => metric.segment_id));

  if (evaluationMetrics.length === 0) {
    return <EmptyState message="종료 후 결과를 표시할 실험 평가가 없습니다." />;
  }

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">종료 후 결과 / 재실험 흐름</h3>
        <p className="text-sm text-muted-foreground">
          프로모션 평가 기준으로 목표 미달 세그먼트만 다음 루프 후보로 분리합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="평가 완료" value={formatInteger(evaluationMetrics.length)} />
        <SummaryItem label="목표 달성" value={formatInteger(goalMetCount)} />
        <SummaryItem label="목표 미달" value={formatInteger(goalNotMetMetrics.length)} />
        <SummaryItem label="표본 부족" value={formatInteger(insufficientMetrics.length)} />
        <SummaryItem label="다음 루프 후보" value={formatInteger(nextLoopMetrics.length)} />
        <SummaryItem label="실패 세그먼트" value={formatInteger(failedSegmentIds.length)} />
        <SummaryItem label="실패 실험" value={formatInteger(failedExperimentIds.length)} />
      </div>
      {nextLoopMetrics.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBlock
            label="실패 세그먼트 ID"
            value={nextLoopSegmentIds.length > 0 ? nextLoopSegmentIds.join("\n") : "-"}
          />
          <InsightBlock
            label="실패 광고 실험 ID"
            value={failedExperimentIds.length > 0 ? failedExperimentIds.join("\n") : "-"}
          />
        </div>
      ) : (
        <Alert>
          <AlertTitle>재실험 후보 없음</AlertTitle>
          <AlertDescription>
            목표 미달 상태의 평가가 없거나 다음 루프 필요 여부가 false입니다.
          </AlertDescription>
        </Alert>
      )}
      {insufficientMetrics.length > 0 ? (
        <Alert>
          <AlertTitle>표본 부족은 자동 재실험 대상에서 분리합니다</AlertTitle>
          <AlertDescription>
            표본 부족은 목표 미달이 아니라 판단 보류 상태이므로, 사용자가 명시적으로
            다시 실험하기를 선택할 때만 다음 루프 대상으로 다루는 흐름입니다.
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

function ExperimentMetricTable({ metrics }: { metrics: DashboardCampaignExperimentMetric[] }) {
  const [promotionFilter, setPromotionFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [metricFilter, setMetricFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const displayMetrics = displayableEvaluationMetrics(metrics);
  const promotionIds = uniqueValues(displayMetrics.map((metric) => metric.promotion_id));
  const segmentIds = uniqueValues(displayMetrics.map((metric) => metric.segment_id).filter(Boolean));
  const metricNames = uniqueValues(displayMetrics.map((metric) => metric.metric));
  const statusNames = uniqueValues(displayMetrics.map((metric) => metric.status));
  const filteredMetrics = displayMetrics.filter(
    (metric) =>
      (promotionFilter === "all" || metric.promotion_id === promotionFilter) &&
      (segmentFilter === "all" || metric.segment_id === segmentFilter) &&
      (metricFilter === "all" || metric.metric === metricFilter) &&
      (statusFilter === "all" || metric.status === statusFilter)
  );
  const insufficientCount = filteredMetrics.filter(
    (metric) => metric.status === "insufficient_data"
  ).length;
  const nextLoopCount = filteredMetrics.filter((metric) => metric.next_loop_required).length;
  const totalSampleSize = filteredMetrics.reduce((sum, metric) => sum + metric.sample_size, 0);
  const averageActualValue =
    filteredMetrics.length > 0
      ? filteredMetrics.reduce((sum, metric) => sum + metric.actual_value, 0) /
        filteredMetrics.length
      : 0;

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">실험 지표</h3>
        <p className="text-sm text-muted-foreground">
          광고 실험별 목표 대비 실제값, 표본 수, 재실행 필요 여부를 확인합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Field>
          <FieldLabel>프로모션 필터</FieldLabel>
          <Select onValueChange={setPromotionFilter} value={promotionFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 프로모션</SelectItem>
              {promotionIds.map((promotionId) => (
                <SelectItem key={promotionId} value={promotionId}>
                  {promotionId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>세그먼트 필터</FieldLabel>
          <Select onValueChange={setSegmentFilter} value={segmentFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 세그먼트</SelectItem>
              {segmentIds.map((segmentId) => (
                <SelectItem key={segmentId} value={segmentId}>
                  {segmentId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>지표 필터</FieldLabel>
          <Select onValueChange={setMetricFilter} value={metricFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 지표</SelectItem>
              {metricNames.map((metricName) => (
                <SelectItem key={metricName} value={metricName}>
                  {formatMetricLabel(metricName)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>상태 필터</FieldLabel>
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              {statusNames.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="실험 지표" value={formatInteger(metrics.length)} />
        <SummaryItem label="필터 결과" value={formatInteger(filteredMetrics.length)} />
        <SummaryItem label="표본 합계" value={formatInteger(totalSampleSize)} />
        <SummaryItem label="표본 부족" value={formatInteger(insufficientCount)} />
        <SummaryItem label="다음 루프 필요" value={formatInteger(nextLoopCount)} />
        <SummaryItem label="평균 실제값" value={formatGoalValue(averageActualValue)} />
      </div>
      {metrics.length > 0 ? (
        filteredMetrics.length > 0 ? (
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
              {filteredMetrics.map((metric) => (
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
                      <span>{formatMetricLabel(metric.metric)}</span>
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
                  <TableCell>{formatBasisLabel(metric.basis)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={statusBadgeVariant(metric.status)}>
                        {formatStatusLabel(metric.status)}
                      </Badge>
                      {metric.next_loop_required ? <Badge variant="outline">다음 루프</Badge> : null}
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
          <EmptyState message="필터 조건에 맞는 실험 지표가 없습니다." />
        )
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
