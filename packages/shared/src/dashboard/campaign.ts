import { z } from "zod";
import { CountSchema, RateSchema } from "./schema-primitives.js";

export const DashboardCampaignSummarySchema = z.object({
  campaign_id: z.string(),
  campaign_name: z.string(),
  objective: z.string().nullable(),
  primary_metric: z.string().nullable(),
  status: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  max_loop_count: CountSchema,
  current_loop_count: CountSchema,
  promotion_count: CountSchema,
  segment_count: CountSchema,
  ad_experiment_count: CountSchema,
  running_ad_experiment_count: CountSchema.default(0),
  latest_goal_achievement_rate: RateSchema.nullable(),
  next_action: z.string(),
  updated_at: z.string()
});
export type DashboardCampaignSummary = z.infer<typeof DashboardCampaignSummarySchema>;

export const DashboardCampaignPrimaryMetricSchema = z.enum([
  "inflow_rate",
  "booking_conversion_rate",
  "funnel_step_rate",
  "promotion_click_rate",
  "goal_achievement_rate"
]);
export type DashboardCampaignPrimaryMetric = z.infer<typeof DashboardCampaignPrimaryMetricSchema>;

export const DashboardCampaignStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
  "stopped"
]);
export type DashboardCampaignStatus = z.infer<typeof DashboardCampaignStatusSchema>;

export const CAMPAIGN_TIME_ZONE = "Asia/Seoul";
const CAMPAIGN_TIME_ZONE_OFFSET = "+09:00";

export type CampaignScheduleRange = {
  end_date: string | null | undefined;
  start_date: string | null | undefined;
};

export type PromotionScheduleRange = {
  scheduled_end_at: string | null | undefined;
  scheduled_start_at: string | null | undefined;
};

export function campaignDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: CAMPAIGN_TIME_ZONE,
    year: "numeric"
  }).formatToParts(date);
  const part = (type: "day" | "month" | "year") =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isCampaignStartDateValid(
  startDate: string | null | undefined,
  today: string
): boolean {
  return !startDate || startDate >= today;
}

export function isCampaignDateRangeValid(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): boolean {
  return !startDate || !endDate || startDate <= endDate;
}

export function campaignScheduleBoundaries(campaign: CampaignScheduleRange): {
  endAt: string | null;
  startAt: string | null;
} {
  return {
    endAt: campaign.end_date ? campaignDateBoundary(campaign.end_date, 1) : null,
    startAt: campaign.start_date ? campaignDateBoundary(campaign.start_date, 0) : null
  };
}

export function isPromotionScheduleWithinCampaign(
  promotion: PromotionScheduleRange,
  campaign: CampaignScheduleRange
): boolean {
  const campaignBoundaries = campaignScheduleBoundaries(campaign);
  const promotionStart = scheduleTimestamp(promotion.scheduled_start_at);
  const promotionEnd = scheduleTimestamp(promotion.scheduled_end_at);
  const campaignStart = scheduleTimestamp(campaignBoundaries.startAt);
  const campaignEnd = scheduleTimestamp(campaignBoundaries.endAt);

  if (promotion.scheduled_start_at && promotionStart === null) {
    return false;
  }
  if (promotion.scheduled_end_at && promotionEnd === null) {
    return false;
  }
  if (promotionStart !== null && promotionEnd !== null && promotionEnd <= promotionStart) {
    return false;
  }
  if (campaignStart !== null && promotionStart !== null && promotionStart < campaignStart) {
    return false;
  }
  if (campaignEnd !== null && promotionStart !== null && promotionStart >= campaignEnd) {
    return false;
  }
  if (campaignStart !== null && promotionEnd !== null && promotionEnd <= campaignStart) {
    return false;
  }
  if (campaignEnd !== null && promotionEnd !== null && promotionEnd > campaignEnd) {
    return false;
  }

  return true;
}

export function isCampaignScheduleExpired(
  campaign: CampaignScheduleRange,
  now = new Date()
): boolean {
  const { endAt } = campaignScheduleBoundaries(campaign);
  return Boolean(endAt && Date.parse(endAt) <= now.getTime());
}

function campaignDateBoundary(dateKey: string, dayOffset: number): string | null {
  const boundary = new Date(`${dateKey}T00:00:00${CAMPAIGN_TIME_ZONE_OFFSET}`);
  if (Number.isNaN(boundary.getTime())) {
    return null;
  }
  boundary.setUTCDate(boundary.getUTCDate() + dayOffset);
  return boundary.toISOString();
}

function scheduleTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

const campaignDateRangeValidation = {
  message: "종료일은 시작일보다 빠를 수 없습니다.",
  path: ["end_date"]
};

const campaignStartDateValidation = {
  message: "시작일은 오늘보다 빠를 수 없습니다.",
  path: ["start_date"]
};

export const DashboardCreateCampaignRequestSchema = z
  .object({
    campaign_name: z.string().min(1),
    objective: z.string().nullable().optional(),
    primary_metric: DashboardCampaignPrimaryMetricSchema.nullable().optional(),
    start_date: z.string().date(),
    end_date: z.string().date(),
    status: DashboardCampaignStatusSchema.default("draft")
  })
  .refine(
    ({ end_date: endDate, start_date: startDate }) => isCampaignDateRangeValid(startDate, endDate),
    campaignDateRangeValidation
  );
export type DashboardCreateCampaignRequest = z.infer<typeof DashboardCreateCampaignRequestSchema>;

export function getDashboardCreateCampaignRequestSchema(today = campaignDateKey()) {
  return DashboardCreateCampaignRequestSchema.refine(
    ({ start_date: startDate }) => isCampaignStartDateValid(startDate, today),
    campaignStartDateValidation
  );
}

export const DashboardUpdateCampaignRequestSchema = z
  .object({
    campaign_name: z.string().min(1).optional(),
    objective: z.string().nullable().optional(),
    primary_metric: DashboardCampaignPrimaryMetricSchema.nullable().optional(),
    start_date: z.string().date().nullable().optional(),
    end_date: z.string().date().nullable().optional(),
    status: DashboardCampaignStatusSchema.optional()
  })
  .refine(
    ({ end_date: endDate, start_date: startDate }) => isCampaignDateRangeValid(startDate, endDate),
    campaignDateRangeValidation
  );
export type DashboardUpdateCampaignRequest = z.infer<typeof DashboardUpdateCampaignRequestSchema>;

export const DashboardDeleteCampaignResultSchema = z.object({
  campaign_id: z.string(),
  status: z.literal("deleted")
});
export type DashboardDeleteCampaignResult = z.infer<typeof DashboardDeleteCampaignResultSchema>;
