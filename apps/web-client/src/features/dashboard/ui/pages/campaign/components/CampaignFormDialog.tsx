import {
  DashboardCampaignPrimaryMetricSchema,
  DashboardCampaignStatusSchema,
  type DashboardCampaignSummary
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@loopad/ui/shadcn/alert-dialog";
import { Button } from "@loopad/ui/shadcn/button";
import { DialogFooter } from "@loopad/ui/shadcn/dialog";
import { Field, FieldGroup, FieldLabel } from "@loopad/ui/shadcn/field";
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
import { DashboardFormDialog } from "../../../shared/DashboardFormDialog.js";

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
    <DashboardFormDialog
      description={
        isCreateMode
          ? "새 캠페인을 생성하고 탭으로 엽니다."
          : "선택한 캠페인의 이름, 목표, 기간, 상태를 수정합니다."
      }
      onOpenChange={onOpenChange}
      open={open}
      title={isCreateMode ? "새 캠페인 추가" : "캠페인 수정"}
    >
      <div className="grid gap-4 px-8 py-6">
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
          <CampaignCreateForm
            isPending={createIsPending}
            onCancel={() => onOpenChange(false)}
            onSubmit={onCreate}
          />
        ) : (
          <CampaignEditForm
            campaign={campaign}
            isPending={updateIsPending || deleteIsPending}
            key={campaign?.campaign_id ?? "missing-campaign"}
            onCancel={() => onOpenChange(false)}
            onDelete={onDelete}
            onSubmit={onUpdate}
          />
        )}
      </div>
    </DashboardFormDialog>
  );
}

function CampaignCreateForm({
  isPending,
  onCancel,
  onSubmit
}: {
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (requestBody: CreateCampaignInput) => void;
}) {
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState("");
  const [primaryMetric, setPrimaryMetric] = useState<string>("none");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const canSubmit = Boolean(campaignName.trim()) && !isPending;

  return (
    <section className="grid gap-4">
      <CampaignFormFields
        campaignName={campaignName}
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
        <Button onClick={onCancel} type="button" variant="ghost">
          취소
        </Button>
        <Button
          className="bg-[#3927d9] px-8"
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
          {isPending ? "생성 중" : "캠페인 생성"}
        </Button>
      </DialogFooter>
    </section>
  );
}

function CampaignEditForm({
  campaign,
  isPending,
  onCancel,
  onDelete,
  onSubmit
}: {
  campaign: DashboardCampaignSummary | undefined;
  isPending: boolean;
  onCancel: () => void;
  onDelete: (campaignId: string) => void;
  onSubmit: (campaignId: string, requestBody: UpdateCampaignInput) => void;
}) {
  const [campaignName, setCampaignName] = useState(campaign?.campaign_name ?? "");
  const [objective, setObjective] = useState(campaign?.objective ?? "");
  const [primaryMetric, setPrimaryMetric] = useState<string>(campaign?.primary_metric ?? "none");
  const [status, setStatus] = useState<string>(campaign?.status ?? "draft");
  const [startDate, setStartDate] = useState(campaign?.start_date ?? "");
  const [endDate, setEndDate] = useState(campaign?.end_date ?? "");

  if (!campaign) {
    return (
      <section className="grid place-items-center rounded-md border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        수정할 캠페인을 목록에서 선택해주세요.
      </section>
    );
  }

  const canSubmit = Boolean(campaignName.trim()) && !isPending;

  return (
    <section className="grid gap-4">
      <CampaignFormFields
        campaignName={campaignName}
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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isPending} type="button" variant="outline">
              {isPending ? "삭제 중" : "캠페인 삭제"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>캠페인을 삭제할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                {campaign.campaign_name} 캠페인이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(campaign.campaign_id)}
                variant="destructive"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={onCancel} type="button" variant="ghost">
          취소
        </Button>
        <Button
          className="bg-[#3927d9] px-8"
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
      </DialogFooter>
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
  onStartDateChange,
  primaryMetricControl,
  startDate,
  statusControl
}: {
  campaignName: string;
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
          placeholder="기존 유저의 예약 전환 증가"
          value={objective}
        />
      </Field>
      {primaryMetricControl ? (
        <Field>
          <FieldLabel id="dashboard-campaign-primary-metric-label">주요 지표</FieldLabel>
          <Select
            onValueChange={primaryMetricControl.onValueChange}
            value={primaryMetricControl.value}
          >
            <SelectTrigger
              aria-labelledby="dashboard-campaign-primary-metric-label"
              className="w-full"
            >
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
            autoComplete="off"
            id="dashboard-campaign-end-date"
            name="campaignEndDate"
            onChange={(event) => onEndDateChange(event.target.value)}
            type="date"
            value={endDate}
          />
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
  return error instanceof Error ? error.message : "요청에 실패했습니다.";
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
