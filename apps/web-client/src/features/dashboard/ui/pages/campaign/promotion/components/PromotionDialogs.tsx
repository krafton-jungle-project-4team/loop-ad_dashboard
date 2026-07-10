import { Button } from "@loopad/ui/shadcn/button";
import { DialogFooter } from "@loopad/ui/shadcn/dialog";
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
import { formatBasisLabel, formatChannelLabel } from "../../../../../model/dashboard-labels.js";
import { DashboardFormDialog } from "../../../../shared/DashboardFormDialog.js";
import {
  createEmptyPromotionFormState,
  defaultPromotionLandingUrl,
  isValidHttpUrl,
  promotionChannelOptions,
  promotionGoalBasisOptions,
  promotionGoalMetricOptions,
  type PromotionCreateFormState
} from "../promotionUtils.js";

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

  return (
    <DashboardFormDialog
      description="선택된 캠페인 하위에 새 프로모션을 생성하고 탭으로 엽니다."
      onOpenChange={onOpenChange}
      open={open}
      title="새 프로모션 추가"
    >
      <div className="grid gap-6 px-8 py-6">
        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="promotion-create-theme">프로모션 이름</FieldLabel>
            <Input
              autoComplete="off"
              id="promotion-create-theme"
              name="promotionTheme"
              onChange={(event) => setForm({ ...form, marketingTheme: event.target.value })}
              placeholder="여름 블랙 프라이데이"
              value={form.marketingTheme}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="promotion-create-message-brief">프로모션 설명</FieldLabel>
            <Textarea
              id="promotion-create-message-brief"
              name="promotionMessageBrief"
              onChange={(event) => setForm({ ...form, messageBrief: event.target.value })}
              placeholder="여름 휴가를 준비하는 20-30대 사용자를 대상으로 제주/오키나와 숙소 예약을 유도하는 여행 프로모션입니다. 인기 여행지, 조기 예약 할인, 후기 기반 추천을 강조합니다."
              rows={4}
              value={form.messageBrief}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel id="promotion-create-channel-label">채널</FieldLabel>
              <Select
                onValueChange={(value) => setForm({ ...form, channel: value })}
                value={form.channel}
              >
                <SelectTrigger aria-labelledby="promotion-create-channel-label" className="w-full">
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
              <FieldLabel id="promotion-create-goal-metric-label">목표 지표</FieldLabel>
              <Select
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    goalMetric: value as PromotionCreateFormState["goalMetric"]
                  })
                }
                value={form.goalMetric}
              >
                <SelectTrigger
                  aria-labelledby="promotion-create-goal-metric-label"
                  className="w-full"
                >
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
                inputMode="decimal"
                min="0"
                name="promotionGoalTargetValue"
                onChange={(event) => setForm({ ...form, goalTargetValue: event.target.value })}
                step="0.001"
                type="number"
                value={form.goalTargetValue}
              />
            </Field>
            <Field>
              <FieldLabel id="promotion-create-goal-basis-label">목표 기준</FieldLabel>
              <Select
                onValueChange={(value) => setForm({ ...form, goalBasis: value })}
                value={form.goalBasis}
              >
                <SelectTrigger
                  aria-labelledby="promotion-create-goal-basis-label"
                  className="w-full"
                >
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
                inputMode="numeric"
                min="0"
                name="promotionMinSampleSize"
                onChange={(event) => setForm({ ...form, minSampleSize: event.target.value })}
                type="number"
                value={form.minSampleSize}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="promotion-create-loop">최대 루프</FieldLabel>
              <Input
                id="promotion-create-loop"
                inputMode="numeric"
                min="1"
                name="promotionMaxLoopCount"
                onChange={(event) => setForm({ ...form, maxLoopCount: event.target.value })}
                type="number"
                value={form.maxLoopCount}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="promotion-create-landing-url">랜딩 URL</FieldLabel>
            <Input
              autoComplete="url"
              id="promotion-create-landing-url"
              name="promotionLandingUrl"
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
        <Button className="px-8" disabled={!canSubmit} onClick={() => onCreate(form)} type="button">
          {createIsPending ? "생성 중" : "프로모션 생성"}
        </Button>
      </DialogFooter>
    </DashboardFormDialog>
  );
}
