import type {
  DashboardAdExperiment,
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignSummary,
  DashboardFunnelList,
  DashboardMain
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
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
import { useEffect, useState } from "react";
import {
  createDashboardCampaign,
  deleteDashboardCampaign,
  fetchDashboardCampaignDetail,
  fetchDashboardFunnelList,
  updateDashboardCampaign
} from "../../../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../../../model/dashboard-format.js";
import { useDashboardQueryState } from "../../../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardFunnelListQueryKey
} from "../../../model/dashboard-query-keys.js";
import { formatMetricLabel, formatStatusLabel } from "../../../model/dashboard-labels.js";
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
          query={query}
          selectedPromotionId={selectedPromotionId}
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
  query,
  selectedPromotionId,
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
  query: DashboardQuery;
  selectedPromotionId: string;
  tab: DashboardTab;
}) {
  const title = campaignDetailPanelTitle(tab);
  const description = campaignDetailPanelDescription(tab);

  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 px-5">
        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>캠페인 데이터를 불러오지 못했습니다</AlertTitle>
            <AlertDescription>{error?.message ?? "API 요청에 실패했습니다."}</AlertDescription>
          </Alert>
        ) : null}
        {!campaign ? <EmptyState message="상세를 확인할 캠페인을 선택해주세요." /> : null}
        {campaign && isLoading ? <EmptyState message="캠페인 데이터를 불러오는 중입니다." /> : null}
        {detail ? (
          <CampaignTabContent
            detail={detail}
            funnelList={funnelList}
            funnelListError={funnelListError}
            funnelListIsError={funnelListIsError}
            funnelListIsLoading={funnelListIsLoading}
            onSelectPromotion={onSelectPromotion}
            query={query}
            selectedPromotionId={selectedPromotionId}
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
  query,
  selectedPromotionId,
  tab
}: {
  detail: DashboardCampaignDetail;
  funnelList: DashboardFunnelList | undefined;
  funnelListError: Error | null;
  funnelListIsError: boolean;
  funnelListIsLoading: boolean;
  onSelectPromotion: (promotionId: string) => void;
  query: DashboardQuery;
  selectedPromotionId: string;
  tab: DashboardTab;
}) {
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
            title="캠페인 사용자 여정 분석"
          />
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
          <CampaignPromotionTable
            onSelectPromotion={onSelectPromotion}
            promotions={detail.promotions}
            segments={detail.segments}
            selectedPromotionId={selectedPromotionId}
          />
        </>
      );
  }
}

function campaignDetailPanelTitle(tab: DashboardTab) {
  if (tab === "campaign-metrics") {
    return "캠페인 성과";
  }
  return "캠페인 개요";
}

function campaignDetailPanelDescription(tab: DashboardTab) {
  if (tab === "campaign-metrics") {
    return "실시간 추이, 사용자 여정, 실험 평가 결과를 기준으로 캠페인 성과를 확인합니다.";
  }
  return "선택한 캠페인의 기본 정보와 하위 프로모션 구성을 확인합니다.";
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

function mutationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "요청에 실패했습니다.";
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
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
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

function displayableEvaluationMetrics(
  metrics: DashboardCampaignExperimentMetric[],
  adExperiments: DashboardAdExperiment[] = []
) {
  const fallbackSegmentId = "seg_existing_all";
  const experimentsById = new Map(
    adExperiments.map((experiment) => [experiment.ad_experiment_id, experiment])
  );

  return metrics.filter((metric) => {
    if (!metric.ad_experiment_id) {
      return false;
    }

    if (metric.segment_id !== fallbackSegmentId) {
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

function formatPeriod(campaign: DashboardCampaignSummary) {
  if (!campaign.start_date && !campaign.end_date) {
    return "-";
  }
  return `${campaign.start_date ?? "미정"} ~ ${campaign.end_date ?? "미정"}`;
}
