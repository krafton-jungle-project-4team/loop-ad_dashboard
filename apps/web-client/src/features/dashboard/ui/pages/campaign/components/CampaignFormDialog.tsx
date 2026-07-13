import {
  DashboardCampaignPrimaryMetricSchema,
  DashboardCampaignStatusSchema,
  type DashboardCampaignSummary,
  isCampaignDateRangeValid
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Button } from "@loopad/ui/shadcn/button";
import { DialogFooter } from "@loopad/ui/shadcn/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@loopad/ui/shadcn/select";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { useState } from "react";
import { createDashboardCampaign, updateDashboardCampaign } from "../../../../api/dashboard-api.js";
import { formatMetricLabel, formatStatusLabel } from "../../../../model/dashboard-labels.js";
import { DashboardFormDialog, useDashboardFormDraft } from "../../../shared/DashboardFormDialog.js";

const campaignPrimaryMetricOptions = DashboardCampaignPrimaryMetricSchema.options;
const campaignStatusOptions = DashboardCampaignStatusSchema.options;
type CreateCampaignInput = Parameters<typeof createDashboardCampaign>[1];
type UpdateCampaignInput = Parameters<typeof updateDashboardCampaign>[2];

export function CampaignFormDialog({
  campaign,
  createError,
  createIsError,
  createIsPending,
  mode,
  onCreate,
  onOpenChange,
  onUpdate,
  open,
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
  onUpdate: (campaignId: string, requestBody: UpdateCampaignInput) => void;
  open: boolean;
  updateError: Error | null;
  updateIsError: boolean;
  updateIsPending: boolean;
}) {
  const isCreateMode = mode === "create";

  return (
    <DashboardFormDialog
      description={
        isCreateMode
          ? "캠페인을 만들면 바로 관리 화면으로 이동해요."
          : "캠페인의 이름, 목표, 기간, 상태를 바꿀 수 있어요."
      }
      onOpenChange={onOpenChange}
      open={open}
      title={isCreateMode ? "새 캠페인 만들기" : "캠페인 수정"}
    >
      <div className="grid gap-4 px-5 py-5 sm:px-8 sm:py-6">
        {isCreateMode && createIsError ? (
          <Alert variant="destructive">
            <AlertTitle>캠페인을 만들지 못했어요</AlertTitle>
            <AlertDescription>{mutationErrorMessage(createError)}</AlertDescription>
          </Alert>
        ) : null}
        {!isCreateMode && updateIsError ? (
          <Alert variant="destructive">
            <AlertTitle>캠페인을 수정하지 못했어요</AlertTitle>
            <AlertDescription>{mutationErrorMessage(updateError)}</AlertDescription>
          </Alert>
        ) : null}
        {isCreateMode ? (
          <CampaignCreateForm isPending={createIsPending} onSubmit={onCreate} />
        ) : (
          <CampaignEditForm
            campaign={campaign}
            isPending={updateIsPending}
            key={campaign?.campaign_id ?? "missing-campaign"}
            onSubmit={onUpdate}
          />
        )}
      </div>
    </DashboardFormDialog>
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const requestClose = useDashboardFormDraft(
    Boolean(campaignName || objective || startDate || endDate || primaryMetric !== "none")
  );
  const dateRangeIsValid = isCampaignDateRangeValid(startDate, endDate);
  const canSubmit = Boolean(campaignName.trim()) && dateRangeIsValid && !isPending;

  return (
    <section className="grid gap-4">
      <CampaignFormFields
        campaignName={campaignName}
        dateRangeIsValid={dateRangeIsValid}
        endDate={endDate}
        objective={objective}
        onCampaignNameChange={setCampaignName}
        onEndDateChange={setEndDate}
        onObjectiveChange={setObjective}
        onStartDateChange={setStartDate}
        primaryMetricControl={{ onValueChange: setPrimaryMetric, value: primaryMetric }}
        startDate={startDate}
      />
      <DialogFooter className="border-t pt-5">
        <Button onClick={requestClose} type="button" variant="ghost">
          취소
        </Button>
        <Button
          className="px-8"
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({
              campaign_name: campaignName.trim(),
              end_date: nullableDate(endDate),
              objective: nullableText(objective),
              primary_metric: nullableMetric(primaryMetric),
              start_date: nullableDate(startDate),
              status: "draft"
            })
          }
          type="button"
        >
          {isPending ? "만드는 중" : "캠페인 만들기"}
        </Button>
      </DialogFooter>
    </section>
  );
}

function CampaignEditForm({
  campaign,
  isPending,
  onSubmit
}: {
  campaign: DashboardCampaignSummary | undefined;
  isPending: boolean;
  onSubmit: (campaignId: string, requestBody: UpdateCampaignInput) => void;
}) {
  const [campaignName, setCampaignName] = useState(campaign?.campaign_name ?? "");
  const [objective, setObjective] = useState(campaign?.objective ?? "");
  const [primaryMetric, setPrimaryMetric] = useState<string>(campaign?.primary_metric ?? "none");
  const [status, setStatus] = useState<string>(campaign?.status ?? "draft");
  const [startDate, setStartDate] = useState(campaign?.start_date ?? "");
  const [endDate, setEndDate] = useState(campaign?.end_date ?? "");
  useDashboardFormDraft(
    Boolean(
      campaign &&
      (campaignName !== campaign.campaign_name ||
        objective !== (campaign.objective ?? "") ||
        primaryMetric !== (campaign.primary_metric ?? "none") ||
        status !== campaign.status ||
        startDate !== (campaign.start_date ?? "") ||
        endDate !== (campaign.end_date ?? ""))
    )
  );

  if (!campaign) {
    return (
      <section className="grid place-items-center rounded-md border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        수정할 캠페인을 목록에서 선택해 주세요.
      </section>
    );
  }

  const dateRangeIsValid = isCampaignDateRangeValid(startDate, endDate);
  const canSubmit = Boolean(campaignName.trim()) && dateRangeIsValid && !isPending;

  return (
    <section className="grid gap-4">
      <CampaignFormFields
        campaignName={campaignName}
        dateRangeIsValid={dateRangeIsValid}
        endDate={endDate}
        objective={objective}
        onCampaignNameChange={setCampaignName}
        onEndDateChange={setEndDate}
        onObjectiveChange={setObjective}
        onStartDateChange={setStartDate}
        primaryMetricControl={{ onValueChange: setPrimaryMetric, value: primaryMetric }}
        startDate={startDate}
        statusControl={{ onValueChange: setStatus, value: status }}
      />
      <DialogFooter className="border-t pt-5">
        <Button
          className="px-8"
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
          {isPending ? "저장 중" : "저장하기"}
        </Button>
      </DialogFooter>
    </section>
  );
}

function CampaignFormFields({
  campaignName,
  dateRangeIsValid,
  endDate,
  objective,
  onCampaignNameChange,
  onEndDateChange,
  onObjectiveChange,
  onStartDateChange,
  primaryMetricControl,
  startDate,
  statusControl
}: {
  campaignName: string;
  dateRangeIsValid: boolean;
  endDate: string;
  objective: string;
  onCampaignNameChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onObjectiveChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  primaryMetricControl?: { onValueChange: (value: string) => void; value: string };
  startDate: string;
  statusControl?: { onValueChange: (value: string) => void; value: string };
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="dashboard-campaign-name">캠페인 이름</FieldLabel>
        <Input
          autoComplete="off"
          id="dashboard-campaign-name"
          name="campaignName"
          onChange={(event) => onCampaignNameChange(event.target.value)}
          placeholder="여름 특가 캠페인"
          value={campaignName}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="dashboard-campaign-objective">목표</FieldLabel>
        <Textarea
          id="dashboard-campaign-objective"
          name="campaignObjective"
          onChange={(event) => onObjectiveChange(event.target.value)}
          placeholder="기존 고객의 예약 전환 늘리기"
          value={objective}
        />
      </Field>
      {primaryMetricControl ? (
        <Field>
          <FieldLabel id="dashboard-campaign-primary-metric-label">핵심 지표</FieldLabel>
          <Select
            onValueChange={primaryMetricControl.onValueChange}
            value={primaryMetricControl.value}
          >
            <SelectTrigger
              aria-labelledby="dashboard-campaign-primary-metric-label"
              className="w-full"
            >
              <SelectValue placeholder="핵심 지표 선택" />
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
      ) : null}
      <div className={`grid gap-3 ${statusControl ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <Field>
          <FieldLabel htmlFor="dashboard-campaign-start-date">시작일</FieldLabel>
          <Input
            autoComplete="off"
            id="dashboard-campaign-start-date"
            name="campaignStartDate"
            onChange={(event) => onStartDateChange(event.target.value)}
            type="date"
            value={startDate}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dashboard-campaign-end-date">종료일</FieldLabel>
          <Input
            aria-invalid={!dateRangeIsValid}
            autoComplete="off"
            aria-describedby={!dateRangeIsValid ? "dashboard-campaign-date-error" : undefined}
            id="dashboard-campaign-end-date"
            name="campaignEndDate"
            onChange={(event) => onEndDateChange(event.target.value)}
            type="date"
            value={endDate}
          />
          {!dateRangeIsValid ? (
            <FieldError id="dashboard-campaign-date-error">
              종료일은 시작일보다 빠를 수 없어요.
            </FieldError>
          ) : null}
        </Field>
        {statusControl ? (
          <Field>
            <FieldLabel id="dashboard-campaign-status-label">상태</FieldLabel>
            <Select onValueChange={statusControl.onValueChange} value={statusControl.value}>
              <SelectTrigger aria-labelledby="dashboard-campaign-status-label" className="w-full">
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
        ) : null}
      </div>
    </FieldGroup>
  );
}

function mutationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "요청하지 못했어요. 다시 시도해 주세요.";
}

function nullableDate(value: string): string | null {
  return value.trim() ? value : null;
}

function nullableMetric(value: string): UpdateCampaignInput["primary_metric"] {
  return value === "none" ? null : (value as UpdateCampaignInput["primary_metric"]);
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
