import type {
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCreatePromotionRequest,
  DashboardUpdatePromotionRequest
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Field, FieldGroup, FieldLabel } from "@loopad/ui/shadcn/field";
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
import { useEffect, useState } from "react";
import { formatInteger } from "../model/dashboard-format.js";
import { EmptyState } from "./EmptyState.js";

export type CreatePromotionInput = DashboardCreatePromotionRequest;
export type UpdatePromotionInput = DashboardUpdatePromotionRequest;

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
const promotionLandingTypeOptions = ["search_page", "hotel_detail_page", "booking_resume"] as const;

export function CampaignPromotionManagementPanel({
  createError,
  createDefaultError,
  createDefaultIsError,
  createDefaultIsPending,
  createIsError,
  createIsPending,
  onCreate,
  onCreateDefault,
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
  createDefaultError: Error | null;
  createDefaultIsError: boolean;
  createDefaultIsPending: boolean;
  createIsError: boolean;
  createIsPending: boolean;
  onCreate: (requestBody: CreatePromotionInput) => void;
  onCreateDefault: () => void;
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
      {createDefaultIsError ? (
        <Alert variant="destructive">
          <AlertTitle>기본 프로모션을 생성하지 못했습니다</AlertTitle>
          <AlertDescription>{mutationErrorMessage(createDefaultError)}</AlertDescription>
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-4">
        <div className="grid gap-1">
          <h4 className="font-semibold text-foreground">기본 프로모션 세트</h4>
          <p className="text-sm text-muted-foreground">
            1.7 기준 email, onsite banner, sms 기본 프로모션 3개를 한 번에 생성합니다.
          </p>
        </div>
        <Button
          disabled={createDefaultIsPending}
          onClick={onCreateDefault}
          type="button"
          variant="outline"
        >
          {createDefaultIsPending ? "생성 중" : "기본 프로모션 생성"}
        </Button>
      </div>
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
  maxLoopCount: string;
  messageBrief: string;
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
      <Field>
        <FieldLabel htmlFor="dashboard-promotion-message-brief">메시지 방향</FieldLabel>
        <Textarea
          id="dashboard-promotion-message-brief"
          onChange={(event) => update("messageBrief", event.target.value)}
          placeholder="세그먼트별 콘텐츠 생성에 사용할 메시지 방향을 입력하세요."
          value={form.messageBrief}
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
          <FieldLabel htmlFor="dashboard-promotion-max-loop">최대 루프</FieldLabel>
          <Input
            id="dashboard-promotion-max-loop"
            min="1"
            onChange={(event) => update("maxLoopCount", event.target.value)}
            type="number"
            value={form.maxLoopCount}
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
      </div>
      <div className="grid gap-3 md:grid-cols-3">
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
    landingType: promotion?.landing_type ?? "none",
    landingUrl: promotion?.landing_url ?? "",
    marketingTheme: promotion?.marketing_theme ?? "",
    maxLoopCount: String(promotion?.max_loop_count ?? 3),
    messageBrief: promotion?.message_brief ?? "",
    minSampleSize: String(promotion?.min_sample_size ?? 1000),
    offerType: promotion?.offer_type ?? "",
    status: promotion?.status ?? "draft",
    targetAudience: promotion?.target_audience ?? "existing_users"
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
    max_loop_count: positiveInteger(form.maxLoopCount),
    message_brief: nullableText(form.messageBrief),
    min_sample_size: Math.trunc(nonnegativeNumber(form.minSampleSize)),
    offer_type: nullableText(form.offerType),
    status: form.status as CreatePromotionInput["status"],
    target_audience: form.targetAudience.trim() || "existing_users"
  };
}

function promotionFormToUpdateRequest(form: PromotionFormState): UpdatePromotionInput {
  return promotionFormToCreateRequest(form);
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

function mutationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

function nullableLandingType(value: string): CreatePromotionInput["landing_type"] {
  return value === "none" ? null : (value as CreatePromotionInput["landing_type"]);
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nonnegativeNumber(value: string): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
}

function positiveInteger(value: string): number {
  const numberValue = Math.trunc(Number(value));
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 1;
}
