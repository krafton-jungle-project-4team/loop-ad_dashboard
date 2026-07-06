import type { DashboardCampaignSummary, DashboardMain } from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  createDashboardCampaign,
  deleteDashboardCampaign,
  updateDashboardCampaign
} from "../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../model/dashboard-format.js";
import { useDashboardQueryState } from "../model/dashboard-query.js";
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

export function CampaignDashboardPanel({
  data,
  query,
  tab: _tab
}: {
  data: DashboardMain;
  query: DashboardQuery;
  tab: DashboardTab;
}) {
  const queryClient = useQueryClient();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const selectedCampaign =
    data.campaigns.find((campaign) => campaign.campaign_id === query.selectedCampaignId) ??
    data.campaigns[0];
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";

  const createCampaignMutation = useMutation({
    mutationFn: (requestBody: CreateCampaignInput) => createDashboardCampaign(query, requestBody),
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
      requestBody: UpdateCampaignInput;
    }) => updateDashboardCampaign(query, campaignId, requestBody),
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({ selectedCampaignId: campaign.campaign_id });
    }
  });
  const stopCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => deleteDashboardCampaign(query, campaignId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({
        selectedCampaignId: "",
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
    }
  });

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
      <CampaignListPanel
        campaigns={data.campaigns}
        onSelect={(campaignId) => {
          void setDashboardQueryState({
            selectedCampaignId: campaignId,
            selectedPromotionId: "",
            selectedSegmentId: ""
          });
        }}
        selectedCampaignId={selectedCampaignId}
      />
    </div>
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
        <CardDescription>캠페인을 생성하고 기본 정보를 수정합니다.</CardDescription>
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
          프로모션과 세그먼트를 묶는 최상위 작업 단위입니다.
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
  const [targetAudience, setTargetAudience] = useState(campaign?.target_audience ?? "existing_users");
  const [primaryMetric, setPrimaryMetric] = useState<string>(campaign?.primary_metric ?? "none");
  const [status, setStatus] = useState<string>(campaign?.status ?? "draft");
  const [startDate, setStartDate] = useState(campaign?.start_date ?? "");
  const [endDate, setEndDate] = useState(campaign?.end_date ?? "");

  useEffect(() => {
    setCampaignName(campaign?.campaign_name ?? "");
    setObjective(campaign?.objective ?? "");
    setTargetAudience(campaign?.target_audience ?? "existing_users");
    setPrimaryMetric(campaign?.primary_metric ?? "none");
    setStatus(campaign?.status ?? "draft");
    setStartDate(campaign?.start_date ?? "");
    setEndDate(campaign?.end_date ?? "");
  }, [campaign]);

  if (!campaign) {
    return (
      <section className="grid content-center gap-2 rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        수정할 캠페인을 선택해주세요.
      </section>
    );
  }

  const canSubmit = Boolean(campaignName.trim()) && !isPending;

  return (
    <section className="grid gap-3 rounded-md border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold text-foreground">캠페인 수정</h3>
          <p className="text-sm text-muted-foreground">{campaign.campaign_id}</p>
        </div>
        <Badge variant={statusBadgeVariant(campaign.status)}>{campaign.status}</Badge>
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
      <div className="flex justify-between gap-2">
        <Button
          disabled={isPending}
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
          {isPending ? "저장 중" : "변경 저장"}
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
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm font-medium">
        캠페인 이름
        <Input
          onChange={(event) => onCampaignNameChange(event.target.value)}
          placeholder="캠페인 이름"
          value={campaignName}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        목표
        <Input
          onChange={(event) => onObjectiveChange(event.target.value)}
          placeholder="목표"
          value={objective}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        대상
        <Input
          onChange={(event) => onTargetAudienceChange(event.target.value)}
          placeholder="existing_users"
          value={targetAudience}
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          주요 지표
          <Select onValueChange={onPrimaryMetricChange} value={primaryMetric}>
            <SelectTrigger>
              <SelectValue placeholder="주요 지표" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">없음</SelectItem>
              {campaignPrimaryMetricOptions.map((metric) => (
                <SelectItem key={metric} value={metric}>
                  {metric}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          상태
          <Select onValueChange={onStatusChange} value={status}>
            <SelectTrigger>
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              {campaignStatusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          시작일
          <Input
            onChange={(event) => onStartDateChange(event.target.value)}
            type="date"
            value={startDate}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          종료일
          <Input
            onChange={(event) => onEndDateChange(event.target.value)}
            type="date"
            value={endDate}
          />
        </label>
      </div>
    </div>
  );
}

function CampaignListPanel({
  campaigns,
  onSelect,
  selectedCampaignId
}: {
  campaigns: DashboardCampaignSummary[];
  onSelect: (campaignId: string) => void;
  selectedCampaignId: string;
}) {
  return (
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          캠페인 목록
        </CardTitle>
        <CardDescription>캠페인의 기본 상태와 하위 리소스 수만 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        {campaigns.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>캠페인</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>대상</TableHead>
                <TableHead>기간</TableHead>
                <TableHead className="text-right">프로모션</TableHead>
                <TableHead className="text-right">세그먼트</TableHead>
                <TableHead className="text-right">실험</TableHead>
                <TableHead className="text-right">최근 목표 달성률</TableHead>
                <TableHead className="text-right">선택</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <CampaignRow
                  campaign={campaign}
                  isSelected={selectedCampaignId === campaign.campaign_id}
                  key={campaign.campaign_id}
                  onSelect={onSelect}
                />
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="등록된 캠페인이 없습니다." />
        )}
      </CardContent>
    </Card>
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
    <TableRow className={isSelected ? "bg-muted/40" : undefined}>
      <TableCell>
        <div className="grid gap-1">
          <span className="font-medium">{campaign.campaign_name}</span>
          <span className="text-xs text-muted-foreground">{campaign.campaign_id}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant(campaign.status)}>{campaign.status}</Badge>
      </TableCell>
      <TableCell>{campaign.target_audience}</TableCell>
      <TableCell>{formatPeriod(campaign.start_date, campaign.end_date)}</TableCell>
      <TableCell className="text-right">{formatInteger(campaign.promotion_count)}</TableCell>
      <TableCell className="text-right">{formatInteger(campaign.segment_count)}</TableCell>
      <TableCell className="text-right">{formatInteger(campaign.ad_experiment_count)}</TableCell>
      <TableCell className="text-right">
        {formatOptionalRate(campaign.latest_goal_achievement_rate)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          disabled={isSelected}
          onClick={() => onSelect(campaign.campaign_id)}
          size="sm"
          type="button"
          variant={isSelected ? "secondary" : "outline"}
        >
          {isSelected ? "선택됨" : "선택"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function statusBadgeVariant(status: string) {
  if (status === "active" || status === "completed") {
    return "secondary";
  }
  if (status === "stopped" || status === "paused") {
    return "destructive";
  }
  return "outline";
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableDate(value: string): string | null {
  return value ? value : null;
}

function nullableMetric(value: string): CreateCampaignInput["primary_metric"] {
  return value === "none" ? null : (value as CreateCampaignInput["primary_metric"]);
}

function formatPeriod(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) {
    return "-";
  }
  return `${startDate ?? "-"} - ${endDate ?? "-"}`;
}

function formatOptionalRate(value: number | null) {
  return typeof value === "number" ? formatPercent(value) : "-";
}

function mutationErrorMessage(error: Error | null) {
  return error?.message ?? "API 요청에 실패했습니다.";
}
