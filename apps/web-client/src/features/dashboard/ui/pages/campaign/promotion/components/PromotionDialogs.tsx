import {
  type DashboardCampaignPromotion,
  type DashboardUpdatePromotionRequest
} from "@loopad/shared";
import { Button } from "@loopad/ui/shadcn/button";
import { DialogClose, DialogFooter } from "@loopad/ui/shadcn/dialog";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@loopad/ui/shadcn/select";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { useEffect, useState } from "react";
import {
  formatBasisLabel,
  formatChannelLabel,
  formatStatusLabel
} from "../../../../../model/dashboard-labels.js";
import { DashboardFormDialog } from "../../../../shared/DashboardFormDialog.js";
import {
  createEmptyPromotionFormState,
  defaultPromotionLandingUrl,
  isValidHttpUrl,
  promotionChannelOptions,
  promotionGoalBasisOptions,
  promotionGoalMetricOptions,
  promotionFormToUpdateRequest,
  promotionStatusOptions,
  promotionToFormState,
  type PromotionCreateFormState
} from "../promotionUtils.js";

export function PromotionEditDialog({
  isPending,
  onOpenChange,
  onUpdate,
  open,
  promotion
}: {
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (requestBody: DashboardUpdatePromotionRequest) => void;
  open: boolean;
  promotion: DashboardCampaignPromotion | undefined;
}) {
  const [form, setForm] = useState<PromotionCreateFormState>(createEmptyPromotionFormState());
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    if (open && promotion) {
      setForm(promotionToFormState(promotion));
      setStatus(promotion.status);
    }
  }, [open, promotion]);
  const isDirty = Boolean(
    promotion &&
    (JSON.stringify(form) !== JSON.stringify(promotionToFormState(promotion)) ||
      status !== promotion.status)
  );
  const canSubmit =
    Boolean(promotion && form.marketingTheme.trim()) &&
    isValidHttpUrl(form.landingUrl) &&
    !isPending;

  return (
    <DashboardFormDialog
      description="프로모션의 운영 조건과 상태를 바꿀 수 있어요."
      dirty={isDirty}
      onOpenChange={onOpenChange}
      open={open}
      title="프로모션 수정"
      width="promotion"
    >
      <div className="grid gap-6 px-5 py-5 sm:px-8 sm:py-6">
        <PromotionFormFields form={form} idPrefix="promotion-edit" onChange={setForm} />
        <Field>
          <FieldLabel id="promotion-edit-status-label">상태</FieldLabel>
          <Select onValueChange={setStatus} value={status}>
            <SelectTrigger aria-labelledby="promotion-edit-status-label" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {promotionStatusOptions.map((statusOption) => (
                <SelectItem key={statusOption} value={statusOption}>
                  {formatStatusLabel(statusOption)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DialogFooter className="border-t pt-5">
          <Button
            disabled={!canSubmit}
            onClick={() =>
              onUpdate(
                promotionFormToUpdateRequest(
                  form,
                  status as DashboardUpdatePromotionRequest["status"]
                )
              )
            }
            type="button"
          >
            {isPending ? "프로모션 저장 중…" : "프로모션 저장"}
          </Button>
        </DialogFooter>
      </div>
    </DashboardFormDialog>
  );
}

export function PromotionAddDialog({
  createIsPending,
  onCreate,
  onOpenChange,
  open
}: {
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
  const isDirty = JSON.stringify(form) !== JSON.stringify(createEmptyPromotionFormState());

  return (
    <DashboardFormDialog
      description="프로모션을 만들면 바로 관리 화면으로 이동해요."
      dirty={isDirty}
      onOpenChange={onOpenChange}
      open={open}
      title="새 프로모션 만들기"
      width="promotion"
    >
      <div className="grid gap-6 px-5 py-5 sm:px-8 sm:py-6">
        <PromotionFormFields form={form} idPrefix="promotion-create" onChange={setForm} />
      </div>
      <DialogFooter className="px-5 py-5 sm:px-8">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            취소
          </Button>
        </DialogClose>
        <Button className="px-8" disabled={!canSubmit} onClick={() => onCreate(form)} type="button">
          {createIsPending ? "프로모션 만드는 중…" : "프로모션 만들기"}
        </Button>
      </DialogFooter>
    </DashboardFormDialog>
  );
}

function PromotionFormFields({
  form,
  idPrefix,
  onChange
}: {
  form: PromotionCreateFormState;
  idPrefix: string;
  onChange: (form: PromotionCreateFormState) => void;
}) {
  return (
    <div className="grid gap-4">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-theme`}>프로모션 이름</FieldLabel>
        <Input
          autoComplete="off"
          id={`${idPrefix}-theme`}
          name={`${idPrefix}Theme`}
          onChange={(event) => onChange({ ...form, marketingTheme: event.target.value })}
          placeholder="여름 블랙 프라이데이"
          value={form.marketingTheme}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-message-brief`}>프로모션 설명</FieldLabel>
        <Textarea
          id={`${idPrefix}-message-brief`}
          name={`${idPrefix}MessageBrief`}
          onChange={(event) => onChange({ ...form, messageBrief: event.target.value })}
          placeholder="여름 휴가를 준비하는 20~30대에게 인기 여행지와 조기 예약 할인을 소개해요."
          rows={4}
          value={form.messageBrief}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel id={`${idPrefix}-channel-label`}>노출 방식</FieldLabel>
          <Select
            onValueChange={(value) => onChange({ ...form, channel: value })}
            value={form.channel}
          >
            <SelectTrigger aria-labelledby={`${idPrefix}-channel-label`} className="w-full">
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
          <FieldLabel id={`${idPrefix}-goal-metric-label`}>목표 지표</FieldLabel>
          <Select
            onValueChange={(value) =>
              onChange({
                ...form,
                goalMetric: value as PromotionCreateFormState["goalMetric"]
              })
            }
            value={form.goalMetric}
          >
            <SelectTrigger aria-labelledby={`${idPrefix}-goal-metric-label`} className="w-full">
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
          <FieldLabel htmlFor={`${idPrefix}-goal`}>목표값</FieldLabel>
          <Input
            id={`${idPrefix}-goal`}
            inputMode="decimal"
            min="0"
            name={`${idPrefix}GoalTargetValue`}
            onChange={(event) => onChange({ ...form, goalTargetValue: event.target.value })}
            step="0.001"
            type="number"
            value={form.goalTargetValue}
          />
        </Field>
        <Field>
          <FieldLabel id={`${idPrefix}-goal-basis-label`}>목표 기준</FieldLabel>
          <Select
            onValueChange={(value) => onChange({ ...form, goalBasis: value })}
            value={form.goalBasis}
          >
            <SelectTrigger aria-labelledby={`${idPrefix}-goal-basis-label`} className="w-full">
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
          <FieldLabel htmlFor={`${idPrefix}-sample`}>최소 평가 대상</FieldLabel>
          <Input
            id={`${idPrefix}-sample`}
            inputMode="numeric"
            min="0"
            name={`${idPrefix}MinSampleSize`}
            onChange={(event) => onChange({ ...form, minSampleSize: event.target.value })}
            type="number"
            value={form.minSampleSize}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-loop`}>최대 반복 횟수</FieldLabel>
          <Input
            id={`${idPrefix}-loop`}
            inputMode="numeric"
            min="1"
            name={`${idPrefix}MaxLoopCount`}
            onChange={(event) => onChange({ ...form, maxLoopCount: event.target.value })}
            type="number"
            value={form.maxLoopCount}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-landing-url`}>연결 페이지 주소</FieldLabel>
        <Input
          autoComplete="url"
          id={`${idPrefix}-landing-url`}
          name={`${idPrefix}LandingUrl`}
          onChange={(event) => onChange({ ...form, landingUrl: event.target.value })}
          placeholder={defaultPromotionLandingUrl}
          type="url"
          value={form.landingUrl}
        />
        <p className="text-xs text-muted-foreground">
          발송 링크와 리다이렉트 목적지로 사용할 실제 URL입니다.
        </p>
      </Field>
    </div>
  );
}
