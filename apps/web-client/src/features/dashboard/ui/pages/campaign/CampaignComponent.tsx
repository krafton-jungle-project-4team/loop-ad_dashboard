import type {
  DashboardAdExperiment,
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardFunnelList,
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
import { ScrollArea } from "@loopad/ui/shadcn/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@loopad/ui/shadcn/sheet";
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
import { Pencil, Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  approveDashboardContentCandidate,
  createDashboardCampaign,
  deleteDashboardCampaign,
  fetchDashboardCampaignDetail,
  fetchDashboardFunnelList,
  fetchDashboardPromotionDetail,
  fetchDashboardSegmentDetail,
  rejectDashboardContentCandidate,
  updateDashboardCampaign
} from "../../../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../../../model/dashboard-format.js";
import { useDashboardQueryState } from "../../../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardFunnelListQueryKey,
  dashboardPromotionDetailQueryKey,
  dashboardSegmentDetailQueryKey
} from "../../../model/dashboard-query-keys.js";
import {
  formatActionLabel,
  formatBasisLabel,
  formatChannelLabel,
  formatLandingTypeLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../../../model/dashboard-labels.js";
import type { DashboardQuery, DashboardTab } from "../../../model/dashboard-types.js";
import { CampaignPromotionTable } from "./promotion/components/CampaignPromotionTable.js";
import { EmptyState } from "../../shared/EmptyState.js";
import { ScopedFunnelAnalysisPanel } from "../../shared/ScopedFunnelAnalysisPanel.js";

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
type CampaignFormSheetState = { mode: "create" } | { campaignId: string; mode: "edit" } | null;

export function CampaignPageSections({
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
  const showsCampaignDetail = tab !== "campaigns";
  const [campaignFormSheet, setCampaignFormSheet] = useState<CampaignFormSheetState>(null);
  const selectedCampaign =
    data.campaigns.find((campaign) => campaign.campaign_id === query.selectedCampaignId) ??
    data.campaigns[0];
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const editingCampaign =
    campaignFormSheet?.mode === "edit"
      ? data.campaigns.find((campaign) => campaign.campaign_id === campaignFormSheet.campaignId)
      : undefined;
  const campaignDetail = useQuery({
    enabled: showsCampaignDetail && Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });
  const funnelList = useQuery({
    enabled: showsCampaignDetail,
    queryFn: ({ signal }) => fetchDashboardFunnelList(query, signal),
    queryKey: dashboardFunnelListQueryKey(query.projectId)
  });
  const promotionDetail = useQuery({
    enabled: showsCampaignDetail && Boolean(selectedPromotionId),
    queryFn: ({ signal }) => fetchDashboardPromotionDetail(query, selectedPromotionId, signal),
    queryKey: dashboardPromotionDetailQueryKey(query.projectId, selectedPromotionId)
  });
  const segmentDetail = useQuery({
    enabled: showsCampaignDetail && Boolean(selectedPromotionId && selectedSegmentId),
    queryFn: ({ signal }) =>
      fetchDashboardSegmentDetail(query, selectedPromotionId, selectedSegmentId, signal),
    queryKey: dashboardSegmentDetailQueryKey(
      query.projectId,
      selectedPromotionId,
      selectedSegmentId
    )
  });
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
      setCampaignFormSheet(null);
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
      setCampaignFormSheet(null);
    }
  });
  const deleteCampaignMutation = useMutation({
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
      setCampaignFormSheet(null);
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
          <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
            <CardHeader className="flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid gap-1.5">
                <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
                  캠페인 목록
                </CardTitle>
                <CardDescription>
                  캠페인을 선택하거나 필요한 캠페인만 생성·수정합니다.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  createCampaignMutation.reset();
                  setCampaignFormSheet({ mode: "create" });
                }}
                type="button"
              >
                <Plus data-icon="inline-start" />
                캠페인 생성
              </Button>
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
                      <TableHead className="text-right">액션</TableHead>
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
                        onEdit={(campaignId) => {
                          updateCampaignMutation.reset();
                          deleteCampaignMutation.reset();
                          void setDashboardQueryState({
                            selectedCampaignId: campaignId,
                            selectedPromotionId: "",
                            selectedSegmentId: ""
                          });
                          setCampaignFormSheet({ campaignId, mode: "edit" });
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
          <CampaignFormSheet
            campaign={editingCampaign}
            createError={createCampaignMutation.error}
            createIsError={createCampaignMutation.isError}
            createIsPending={createCampaignMutation.isPending}
            mode={campaignFormSheet?.mode ?? "create"}
            onCreate={(requestBody) => createCampaignMutation.mutate(requestBody)}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setCampaignFormSheet(null);
              }
            }}
            onDelete={(campaignId) => deleteCampaignMutation.mutate(campaignId)}
            onUpdate={(campaignId, requestBody) =>
              updateCampaignMutation.mutate({ campaignId, requestBody })
            }
            open={Boolean(campaignFormSheet)}
            deleteError={deleteCampaignMutation.error}
            deleteIsError={deleteCampaignMutation.isError}
            deleteIsPending={deleteCampaignMutation.isPending}
            updateError={updateCampaignMutation.error}
            updateIsError={updateCampaignMutation.isError}
            updateIsPending={updateCampaignMutation.isPending}
          />
        </>
      ) : null}

      {showsCampaignDetail ? (
        <CampaignDetailPanel
          campaign={selectedCampaign}
          detail={campaignDetail.data}
          error={campaignDetail.error}
          isError={campaignDetail.isError}
          isLoading={campaignDetail.isLoading}
          funnelList={funnelList.data}
          funnelListError={funnelList.error}
          funnelListIsError={funnelList.isError}
          funnelListIsLoading={funnelList.isLoading}
          onSelectPromotion={(promotionId) => {
            void setDashboardQueryState({ selectedPromotionId: promotionId, selectedSegmentId: "" });
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
      ) : null}
    </div>
  );
}

function CampaignFormSheet({
  campaign,
  createError,
  createIsError,
  createIsPending,
  mode,
  onCreate,
  onOpenChange,
  onDelete,
  onUpdate,
  open,
  deleteError,
  deleteIsError,
  deleteIsPending,
  updateError,
  updateIsError,
  updateIsPending
}: {
  campaign: DashboardCampaignSummary | undefined;
  createError: Error | null;
  createIsError: boolean;
  createIsPending: boolean;
  mode: "create" | "edit";
  onCreate: (requestBody: CreateCampaignInput) => void;
  onOpenChange: (isOpen: boolean) => void;
  onDelete: (campaignId: string) => void;
  onUpdate: (campaignId: string, requestBody: UpdateCampaignInput) => void;
  open: boolean;
  deleteError: Error | null;
  deleteIsError: boolean;
  deleteIsPending: boolean;
  updateError: Error | null;
  updateIsError: boolean;
  updateIsPending: boolean;
}) {
  const isCreateMode = mode === "create";

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-[min(100vw,640px)] gap-0 sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>{isCreateMode ? "캠페인 생성" : "캠페인 수정"}</SheetTitle>
          <SheetDescription>
            {isCreateMode
              ? "프로모션과 세그먼트를 묶을 캠페인 정보를 입력합니다."
              : "선택한 캠페인의 이름, 목표, 기간, 상태를 수정합니다."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-4 p-4">
            {isCreateMode && createIsError ? (
              <Alert variant="destructive">
                <AlertTitle>캠페인을 생성하지 못했습니다</AlertTitle>
                <AlertDescription>{mutationErrorMessage(createError)}</AlertDescription>
              </Alert>
            ) : null}
            {!isCreateMode && updateIsError ? (
              <Alert variant="destructive">
                <AlertTitle>캠페인을 수정하지 못했습니다</AlertTitle>
                <AlertDescription>{mutationErrorMessage(updateError)}</AlertDescription>
              </Alert>
            ) : null}
            {!isCreateMode && deleteIsError ? (
              <Alert variant="destructive">
                <AlertTitle>캠페인을 삭제하지 못했습니다</AlertTitle>
                <AlertDescription>{mutationErrorMessage(deleteError)}</AlertDescription>
              </Alert>
            ) : null}
            {isCreateMode ? (
              <CampaignCreateForm isPending={createIsPending} onSubmit={onCreate} />
            ) : (
              <CampaignEditForm
                campaign={campaign}
                isPending={updateIsPending || deleteIsPending}
                onDelete={onDelete}
                onSubmit={onUpdate}
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
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
        primaryMetric={primaryMetric}
        startDate={startDate}
        status={status}
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
              status
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
  onDelete,
  onSubmit
}: {
  campaign: DashboardCampaignSummary | undefined;
  isPending: boolean;
  onDelete: (campaignId: string) => void;
  onSubmit: (campaignId: string, requestBody: UpdateCampaignInput) => void;
}) {
  const [campaignName, setCampaignName] = useState(campaign?.campaign_name ?? "");
  const [objective, setObjective] = useState(campaign?.objective ?? "");
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
          삭제하면 이 캠페인의 프로모션, 세그먼트, 광고 후보, 실험 기록도 함께 삭제됩니다.
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
        primaryMetric={primaryMetric}
        startDate={startDate}
        status={status}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={isPending}
          onClick={() => onDelete(campaign.campaign_id)}
          type="button"
          variant="outline"
        >
          {isPending ? "삭제 중" : "캠페인 삭제"}
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
              status: status as UpdateCampaignInput["status"]
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
  primaryMetric,
  startDate,
  status
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
  primaryMetric: string;
  startDate: string;
  status: string;
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
  onEdit,
  onSelect
}: {
  campaign: DashboardCampaignSummary;
  isSelected: boolean;
  onEdit: (campaignId: string) => void;
  onSelect: (campaignId: string) => void;
}) {
  return (
    <TableRow
      aria-selected={isSelected}
      className="cursor-pointer"
      onClick={() => onSelect(campaign.campaign_id)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
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
      <TableCell className="text-right">
        <Button
          onClick={(event) => {
            event.stopPropagation();
            onEdit(campaign.campaign_id);
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <Pencil data-icon="inline-start" />
          수정
        </Button>
      </TableCell>
    </TableRow>
  );
}

function CampaignDetailPanel({
  campaign,
  detail,
  error,
  funnelList,
  funnelListError,
  funnelListIsError,
  funnelListIsLoading,
  isError,
  isLoading,
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
  funnelList: DashboardFunnelList | undefined;
  funnelListError: Error | null;
  funnelListIsError: boolean;
  funnelListIsLoading: boolean;
  isError: boolean;
  isLoading: boolean;
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
  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          캠페인 상세
        </CardTitle>
        <CardDescription>캠페인 안에서 실시간 추이와 프로모션 목록을 관리합니다.</CardDescription>
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
            funnelList={funnelList}
            funnelListError={funnelListError}
            funnelListIsError={funnelListIsError}
            funnelListIsLoading={funnelListIsLoading}
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
  funnelList,
  funnelListError,
  funnelListIsError,
  funnelListIsLoading,
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
  detail: DashboardCampaignDetail;
  funnelList: DashboardFunnelList | undefined;
  funnelListError: Error | null;
  funnelListIsError: boolean;
  funnelListIsLoading: boolean;
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
          <ScopedFunnelAnalysisPanel
            error={funnelListError}
            funnels={funnelList?.funnels ?? []}
            isError={funnelListIsError}
            isLoading={funnelListIsLoading}
            query={query}
            scope={{ campaign_id: detail.campaign.campaign_id, scope_type: "campaign" }}
            title="캠페인 퍼널 분석"
          />
          <EvaluationOutcomePanel
            adExperiments={detail.ad_experiments}
            metrics={detail.experiment_metrics}
          />
          <PromotionDetail
            approveContentCandidateError={approveContentCandidateMutation.error}
            approveContentCandidateIsError={approveContentCandidateMutation.isError}
            approveContentCandidateIsPending={approveContentCandidateMutation.isPending}
            detail={promotionDetail}
            error={promotionError}
            funnelList={funnelList}
            funnelListError={funnelListError}
            funnelListIsError={funnelListIsError}
            funnelListIsLoading={funnelListIsLoading}
            isError={promotionIsError}
            isLoading={promotionIsLoading}
            query={query}
            onApproveContentCandidate={(promotionId, segmentId, contentId) =>
              approveContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
            }
            onRejectContentCandidate={(promotionId, segmentId, contentId) =>
              rejectContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
            }
            onSelectSegment={onSelectSegment}
            rejectContentCandidateError={rejectContentCandidateMutation.error}
            rejectContentCandidateIsError={rejectContentCandidateMutation.isError}
            rejectContentCandidateIsPending={rejectContentCandidateMutation.isPending}
            selectedPromotionId={selectedPromotionId}
            selectedSegmentId={selectedSegmentId}
            segmentDetail={segmentDetail}
            segmentError={segmentError}
            segmentIsError={segmentIsError}
            segmentIsLoading={segmentIsLoading}
          />
        </>
      );
    case "campaigns":
    default:
      return (
        <>
          <CampaignSummary detail={detail} />
          <CampaignRealtimeTrend detail={detail} />
          <ScopedFunnelAnalysisPanel
            error={funnelListError}
            funnels={funnelList?.funnels ?? []}
            isError={funnelListIsError}
            isLoading={funnelListIsLoading}
            query={query}
            scope={{ campaign_id: detail.campaign.campaign_id, scope_type: "campaign" }}
            title="캠페인 퍼널 분석"
          />
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
          <PromotionDetail
            approveContentCandidateError={approveContentCandidateMutation.error}
            approveContentCandidateIsError={approveContentCandidateMutation.isError}
            approveContentCandidateIsPending={approveContentCandidateMutation.isPending}
            detail={promotionDetail}
            error={promotionError}
            funnelList={funnelList}
            funnelListError={funnelListError}
            funnelListIsError={funnelListIsError}
            funnelListIsLoading={funnelListIsLoading}
            isError={promotionIsError}
            isLoading={promotionIsLoading}
            query={query}
            onApproveContentCandidate={(promotionId, segmentId, contentId) =>
              approveContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
            }
            onRejectContentCandidate={(promotionId, segmentId, contentId) =>
              rejectContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
            }
            onSelectSegment={onSelectSegment}
            rejectContentCandidateError={rejectContentCandidateMutation.error}
            rejectContentCandidateIsError={rejectContentCandidateMutation.isError}
            rejectContentCandidateIsPending={rejectContentCandidateMutation.isPending}
            selectedPromotionId={selectedPromotionId}
            selectedSegmentId={selectedSegmentId}
            segmentDetail={segmentDetail}
            segmentError={segmentError}
            segmentIsError={segmentIsError}
            segmentIsLoading={segmentIsLoading}
          />
        </>
      );
  }
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
        <SummaryItem label="주요 지표" value={formatMetricLabel(campaign.primary_metric)} />
        <SummaryItem
          label="실시간 이벤트"
          value={formatInteger(detail.realtime_metrics.total_event_count)}
        />
        <SummaryItem label="업데이트" value={campaign.updated_at} />
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

function PromotionDetail({
  approveContentCandidateError,
  approveContentCandidateIsError,
  approveContentCandidateIsPending,
  detail,
  error,
  funnelList,
  funnelListError,
  funnelListIsError,
  funnelListIsLoading,
  isError,
  isLoading,
  onApproveContentCandidate,
  onRejectContentCandidate,
  onSelectSegment,
  query,
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
  funnelList: DashboardFunnelList | undefined;
  funnelListError: Error | null;
  funnelListIsError: boolean;
  funnelListIsLoading: boolean;
  isError: boolean;
  isLoading: boolean;
  onApproveContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  query: DashboardQuery;
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
      <ScopedFunnelAnalysisPanel
        error={funnelListError}
        funnels={funnelList?.funnels ?? []}
        isError={funnelListIsError}
        isLoading={funnelListIsLoading}
        query={query}
        scope={{ promotion_id: promotion.promotion_id, scope_type: "promotion" }}
        title="프로모션 퍼널 분석"
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
        funnelList={funnelList}
        funnelListError={funnelListError}
        funnelListIsError={funnelListIsError}
        funnelListIsLoading={funnelListIsLoading}
        isError={segmentIsError}
        isLoading={segmentIsLoading}
        onApproveContentCandidate={onApproveContentCandidate}
        onRejectContentCandidate={onRejectContentCandidate}
        query={query}
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
  const completedCount = detail.analyses.filter(
    (analysis) => analysis.status === "completed"
  ).length;
  const failedCount = detail.analyses.filter((analysis) => analysis.status === "failed").length;
  const focusSegmentCount = uniqueValues(
    detail.analyses.flatMap((analysis) => analysis.focus_segment_ids)
  ).length;

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#1d1d1f]">프로모션 분석 히스토리</h3>
        <p className="text-sm text-muted-foreground">
          Decision 분석 요청, 대상 세그먼트, 운영자 지시, 결과 JSON을 최신순으로 확인합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem label="분석 요청" value={formatInteger(detail.analyses.length)} />
        <SummaryItem label="완료" value={formatInteger(completedCount)} />
        <SummaryItem label="실패" value={formatInteger(failedCount)} />
        <SummaryItem label="대상 세그먼트" value={formatInteger(focusSegmentCount)} />
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
            <InsightBlock label="운영자 지시" value={latestAnalysis.operator_instruction ?? "-"} />
            <InsightBlock
              label="대상 세그먼트"
              value={formatInteger(latestAnalysis.focus_segment_ids.length)}
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
              <TableHead>대상 세그먼트</TableHead>
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
                    {formatInteger(analysis.focus_segment_ids.length)}
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

function PromotionSegmentRealtimeSummary({ detail }: { detail: DashboardPromotionDetailResource }) {
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
            <h3 className="text-xl font-semibold tracking-tight text-foreground">프로모션 상세</h3>
            <Badge variant={statusBadgeVariant(promotion.status)}>
              {formatStatusLabel(promotion.status)}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatChannelLabel(promotion.channel)}
          </div>
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
                  </div>
                </TableCell>
                <TableCell>
                  <div className="line-clamp-2 min-w-[220px] text-sm">
                    {segment.natural_language_query ?? segment.source ?? "-"}
                  </div>
                </TableCell>
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
                <TableCell>{segment.ad_experiment_id ? "연결됨" : "-"}</TableCell>
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
  funnelList,
  funnelListError,
  funnelListIsError,
  funnelListIsLoading,
  isError,
  isLoading,
  onApproveContentCandidate,
  onRejectContentCandidate,
  query,
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
  funnelList: DashboardFunnelList | undefined;
  funnelListError: Error | null;
  funnelListIsError: boolean;
  funnelListIsLoading: boolean;
  isError: boolean;
  isLoading: boolean;
  onApproveContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  query: DashboardQuery;
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
            선택한 세그먼트의 실험 평가가 insufficient_data 상태입니다. 표본 부족은 실패가 아니라
            판단 보류 상태로 표시합니다.
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
        <SummaryItem label="연결 실험" value={adExperimentCount > 0 ? "연결됨" : "-"} />
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
  const totalEventCount = metrics.events.reduce((sum, event) => sum + event.event_count, 0);
  const peakEvent = metrics.events.reduce<DashboardRealtimeMetrics["events"][number] | null>(
    (current, event) => (!current || event.event_count > current.event_count ? event : current),
    null
  );
  const uniqueUserTotal = metrics.events.reduce((sum, event) => sum + event.unique_user_count, 0);

  return (
    <>
      {metrics.events.length > 0 ? (
        <section className="grid gap-3">
          <div className="grid gap-1">
            <h3 className="text-base font-semibold text-[#1d1d1f]">{title}</h3>
            <p className="text-sm text-muted-foreground">
              수집된 이벤트 수와 유니크 유저를 전체 기준으로 집계합니다.
            </p>
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
            <BarChart data={chartEvents(metrics.events)}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="event_count" fill="var(--color-event_count)" radius={4} />
              <Bar dataKey="unique_user_count" fill="var(--color-unique_user_count)" radius={4} />
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
                    {totalEventCount > 0
                      ? formatPercentValue(event.event_count / totalEventCount)
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

function RealtimeDeliveryAndBannerSummary({ metrics }: { metrics: DashboardRealtimeMetrics }) {
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
          <SummaryItem label="노출" value={formatInteger(banner.promotion_impression_count)} />
          <SummaryItem label="클릭" value={formatInteger(banner.promotion_click_count)} />
          <SummaryItem label="CTR" value={formatPercentValue(banner.promotion_click_rate)} />
          <SummaryItem label="숙소 검색" value={formatInteger(banner.hotel_search_count)} />
          <SummaryItem label="숙소 상세" value={formatInteger(banner.hotel_detail_view_count)} />
          <SummaryItem label="예약 완료" value={formatInteger(banner.booking_complete_count)} />
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
  return metrics.events.find((event) => event.event_name === eventName)?.event_count ?? 0;
}

function realtimeUniqueUserCount(metrics: DashboardRealtimeMetrics, eventName: string) {
  return metrics.events.find((event) => event.event_name === eventName)?.unique_user_count ?? 0;
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
        <SummaryItem label="콘텐츠 후보" value={formatInteger(detail.content_candidates.length)} />
        <SummaryItem label="다음 루프" value={nextLoopMessage} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <InsightBlock label="콘텐츠 브리프 기반 예상 효과" value={contentBriefEffect ?? "-"} />
        <InsightBlock label="데이터 근거 기반 예상 효과" value={evidenceEffect ?? "-"} />
      </div>
    </section>
  );
}

function SegmentAdExperimentStatusPanel({ detail }: { detail: DashboardSegmentDetailResource }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold text-[#1d1d1f]">광고 실험 상태</h3>
      {detail.ad_experiments.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {detail.ad_experiments.map((experiment, index) => (
            <div
              className="grid gap-3 rounded-md border bg-background p-3"
              key={experiment.ad_experiment_id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <div className="text-sm font-medium">
                    {adExperimentDisplayName(experiment.loop_count, index)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatChannelLabel(experiment.channel)}
                  </div>
                </div>
                <Badge variant={statusBadgeVariant(experiment.status)}>
                  {formatStatusLabel(experiment.status)}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <SummaryItem label="콘텐츠" value={experiment.content_option_id} />
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
                      {formatMetricLabel(metric.metric)} 평가
                    </div>
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
                  <SummaryItem label="사전 추정" value={formatInteger(segment.estimated_size)} />
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

function SegmentSampleSizePanel({ metrics }: { metrics: DashboardCampaignExperimentMetric[] }) {
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
                      {formatBasisLabel(metric.basis)}
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
                      {formatGoalValue(metric.target_value)} /{" "}
                      {formatGoalValue(metric.actual_value)}
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
          value={formatInteger(
            candidates.filter((candidate) => candidate.status === "approved").length
          )}
        />
        <SummaryItem
          label="검수 대기"
          value={formatInteger(
            candidates.filter((candidate) => candidate.status === "draft").length
          )}
        />
      </div>
      {candidates.length > 0 ? (
        filteredCandidates.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredCandidates.map((candidate) => (
              <div
                className="grid gap-3 rounded-md border bg-muted/20 p-3"
                key={candidate.content_id}
              >
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
                <InsightBlock
                  label="데이터 근거"
                  value={formatJsonObject(candidate.data_evidence_json)}
                />
                <InsightBlock label="메시지 방향" value={candidate.message_strategy ?? "-"} />
                <InsightBlock label="생성 프롬프트" value={candidate.generation_prompt ?? "-"} />
                <InsightBlock
                  label="메타데이터"
                  value={formatJsonObject(candidate.metadata_json)}
                />
                <div className="grid gap-1 text-sm">
                  <div className="text-xs text-muted-foreground">CTA / 랜딩 URL</div>
                  <div className="font-medium">{candidate.cta ?? "-"}</div>
                  <div className="break-all text-muted-foreground">
                    {candidate.landing_url ?? "-"}
                  </div>
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
                      onReject(candidate.promotion_id, candidate.segment_id, candidate.content_id)
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
                      onApprove(candidate.promotion_id, candidate.segment_id, candidate.content_id)
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

function candidateImageUrl(
  candidate: DashboardSegmentDetailResource["content_candidates"][number]
) {
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
  return entries.map(([key, entryValue]) => `${key}: ${formatJsonValue(entryValue)}`).join("\n");
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
                {[
                  "콘텐츠",
                  "채널",
                  "메시지",
                  "이메일 제목",
                  "생성 이유",
                  "메시지 방향",
                  "상태"
                ].map((header) => (
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
                    <div className="line-clamp-2 min-w-[220px]">
                      {candidate.reason_summary ?? "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-2 min-w-[220px]">
                      {candidate.message_strategy ?? "-"}
                    </div>
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

function adExperimentDisplayName(loopCount: number | null | undefined, index = 0) {
  return loopCount
    ? `루프 ${formatInteger(loopCount)} 실험`
    : `광고 실험 ${formatInteger(index + 1)}`;
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
          <InsightBlock label="실패 세그먼트" value={formatInteger(failedSegmentIds.length)} />
          <InsightBlock
            label="실패 실험"
            value={failedExperimentIds.length > 0 ? formatInteger(failedExperimentIds.length) : "-"}
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
            표본 부족은 목표 미달이 아니라 판단 보류 상태이므로, 사용자가 명시적으로 다시 실험하기를
            선택할 때만 다음 루프 대상으로 다루는 흐름입니다.
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
  const segmentIds = uniqueValues(
    displayMetrics.map((metric) => metric.segment_id).filter(Boolean)
  );
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
                  {segmentNameById(metrics, segmentId)}
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
                <TableHead>평가</TableHead>
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
                      <span className="font-medium">{formatMetricLabel(metric.metric)} 평가</span>
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
                      {metric.next_loop_required ? (
                        <Badge variant="outline">다음 루프</Badge>
                      ) : null}
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

function segmentNameById(metrics: DashboardCampaignExperimentMetric[], segmentId: string) {
  const segmentIds = uniqueValues(
    displayableEvaluationMetrics(metrics)
      .map((metric) => metric.segment_id)
      .filter(Boolean)
  );
  const index = segmentIds.indexOf(segmentId);
  return `세그먼트 ${index >= 0 ? index + 1 : ""}`.trim();
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
