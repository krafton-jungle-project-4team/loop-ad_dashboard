import { randomUUID } from "node:crypto";
import { DashboardFunnelEventNameSchema } from "@loopad/shared";
import type {
  DashboardBannerResponse,
  DashboardCampaignRealtimeMetrics,
  DashboardCreateFunnelRequest,
  DashboardDeleteFunnelResult,
  DashboardDeliveryStatus,
  DashboardEventCatalogItem,
  DashboardFunnel,
  DashboardFunnelMetrics,
  DashboardFunnelStep,
  DashboardPromotionRealtimeMetrics,
  DashboardRealtimeBreakdownItem,
  DashboardRealtimeEvent,
  DashboardRealtimeTimeBucket,
  DashboardSegmentRealtimeMetrics
} from "@loopad/shared";
import { type ClickHouseClient } from "@clickhouse/client";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Inject, Injectable } from "@nestjs/common";
import { CLICKHOUSE_CLIENT } from "../../../infra/database/index.js";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import {
  deleteFunnelDefinition,
  deleteFunnelSteps,
  getActiveFunnelById,
  getDashboardCampaignDeliveryStatus,
  getDashboardPromotionDeliveryStatus,
  getDashboardSegmentDeliveryStatus,
  insertFunnelDefinition,
  insertFunnelStep,
  listActiveFunnels,
  listActiveFunnelSteps,
  listActiveFunnelStepsByFunnelId,
  type IGetActiveFunnelByIdResult,
  type IGetDashboardCampaignDeliveryStatusResult,
  type IGetDashboardPromotionDeliveryStatusResult,
  type IGetDashboardSegmentDeliveryStatusResult,
  type IInsertFunnelDefinitionResult,
  type IInsertFunnelStepResult,
  type IListActiveFunnelsResult,
  type IListActiveFunnelStepsByFunnelIdResult,
  type IListActiveFunnelStepsResult
} from "../database/__generated__/dashboard.queries.js";

type EventCatalogRow = {
  event_name: string;
  event_count: number | string;
};

type FunnelStepMetricRow = {
  event_name: string;
  event_count: number | string;
};

type SegmentRealtimeMetricRow = {
  event_name: string;
  event_count: number | string;
  unique_user_count: number | string;
};

type RealtimeTimeBucketRow = {
  time_bucket: string;
  event_count: number | string;
  unique_user_count: number | string;
};

type RealtimeBreakdownRow = {
  breakdown_key: string | null;
  event_count: number | string;
  unique_user_count: number | string;
};

type RealtimeMetricScope = {
  filterColumn: "campaign_id" | "promotion_id";
  filterValue: string;
  projectId: string;
  segmentId?: string;
};

type RealtimeBreakdowns = {
  time_buckets: DashboardRealtimeTimeBucket[];
  channel_breakdown: DashboardRealtimeBreakdownItem[];
  landing_type_breakdown: DashboardRealtimeBreakdownItem[];
  hotel_cluster_breakdown: DashboardRealtimeBreakdownItem[];
};

type DeliveryStatusRow =
  | IGetDashboardCampaignDeliveryStatusResult
  | IGetDashboardPromotionDeliveryStatusResult
  | IGetDashboardSegmentDeliveryStatusResult;

@Injectable()
export class DashboardFunnelReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>,
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouse: ClickHouseClient
  ) {}

  async listEventCatalog(projectId: string): Promise<DashboardEventCatalogItem[]> {
    const result = await this.clickhouse.query({
      query: `
        SELECT
          event_name,
          count() AS event_count
        FROM funnel_step_events
        WHERE project_id = {projectId:String}
        GROUP BY event_name
        ORDER BY event_count DESC, event_name ASC
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    const rows = await result.json<EventCatalogRow>();

    return rows.map((row) => {
      const eventName = DashboardFunnelEventNameSchema.parse(row.event_name);
      return {
        event_name: eventName,
        display_name: eventDisplayName(eventName),
        event_count: countValue(row.event_count)
      };
    });
  }

  async listFunnels(projectId: string): Promise<DashboardFunnel[]> {
    const [funnels, steps] = await Promise.all([
      this.db.query(listActiveFunnels, { projectId }).multiple(),
      this.db.query(listActiveFunnelSteps, { projectId }).multiple()
    ]);

    return funnels.map((funnel) => toFunnel(funnel, steps));
  }

  async getFunnelMetrics(projectId: string, funnelId: string): Promise<DashboardFunnelMetrics> {
    const [funnel, steps] = await Promise.all([
      this.db.query(getActiveFunnelById, { funnelId, projectId }).single(),
      this.db.query(listActiveFunnelStepsByFunnelId, { funnelId, projectId }).multiple()
    ]);
    const eventCounts = await this.countFunnelStepEvents(projectId, steps);

    return {
      funnel_id: funnel.funnelId,
      funnel_name: funnel.funnelName,
      steps: steps.map((step) => ({
        step_order: step.stepOrder,
        step_name: step.stepName,
        event_name: DashboardFunnelEventNameSchema.parse(step.eventName),
        event_count: eventCounts.get(step.eventName) ?? 0
      }))
    };
  }

  async getCampaignRealtimeMetrics(
    projectId: string,
    campaignId: string
  ): Promise<DashboardCampaignRealtimeMetrics> {
    const scope = {
      filterColumn: "campaign_id",
      filterValue: campaignId,
      projectId
    } as const;
    const [events, breakdowns] = await Promise.all([
      this.countRealtimeEvents(scope),
      this.countRealtimeBreakdowns(scope)
    ]);
    const deliveryStatus = await this.getCampaignDeliveryStatus(projectId, campaignId, events);

    return {
      campaign_id: campaignId,
      total_event_count: totalEventCount(events),
      events,
      ...breakdowns,
      delivery_status: deliveryStatus,
      banner_response: toBannerResponse(events)
    };
  }

  async getPromotionRealtimeMetrics(
    projectId: string,
    promotionId: string
  ): Promise<DashboardPromotionRealtimeMetrics> {
    const scope = {
      filterColumn: "promotion_id",
      filterValue: promotionId,
      projectId
    } as const;
    const [events, breakdowns] = await Promise.all([
      this.countRealtimeEvents(scope),
      this.countRealtimeBreakdowns(scope)
    ]);
    const deliveryStatus = await this.getPromotionDeliveryStatus(projectId, promotionId, events);

    return {
      promotion_id: promotionId,
      total_event_count: totalEventCount(events),
      events,
      ...breakdowns,
      delivery_status: deliveryStatus,
      banner_response: toBannerResponse(events)
    };
  }

  async getSegmentRealtimeMetrics(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardSegmentRealtimeMetrics> {
    const scope = {
      filterColumn: "promotion_id",
      filterValue: promotionId,
      projectId,
      segmentId
    } as const;
    const [events, breakdowns] = await Promise.all([
      this.countRealtimeEvents(scope),
      this.countRealtimeBreakdowns(scope)
    ]);
    const deliveryStatus = await this.getSegmentDeliveryStatus(
      projectId,
      promotionId,
      segmentId,
      events
    );

    return {
      promotion_id: promotionId,
      segment_id: segmentId,
      total_event_count: totalEventCount(events),
      events,
      ...breakdowns,
      delivery_status: deliveryStatus,
      banner_response: toBannerResponse(events)
    };
  }

  async createFunnel(
    projectId: string,
    request: DashboardCreateFunnelRequest
  ): Promise<DashboardFunnel> {
    const funnelId = `funnel_${randomUUID()}`;
    const funnel = await this.db
      .query(insertFunnelDefinition, {
        funnelId,
        projectId,
        funnelName: request.funnel_name
      })
      .single();

    const steps: IInsertFunnelStepResult[] = [];
    for (const [index, step] of request.steps.entries()) {
      steps.push(
        await this.db
          .query(insertFunnelStep, {
            funnelId,
            stepOrder: index + 1,
            stepName: step.step_name,
            eventName: step.event_name
          })
          .single()
      );
    }

    return toFunnel(funnel, steps);
  }

  async deleteFunnel(
    projectId: string,
    funnelId: string
  ): Promise<DashboardDeleteFunnelResult> {
    await this.db.query(deleteFunnelSteps, { funnelId, projectId }).multiple();
    const deleted = await this.db
      .query(deleteFunnelDefinition, { funnelId, projectId })
      .single();

    return {
      funnel_id: deleted.funnelId,
      deleted: true
    };
  }

  private async countRealtimeEvents({
    filterColumn,
    filterValue,
    projectId,
    segmentId
  }: RealtimeMetricScope): Promise<DashboardRealtimeEvent[]> {
    const segmentTouchFilter = segmentId ? "AND segment_id = {segmentId:String}" : "";
    const segmentBookingFilter = segmentId
      ? "AND ifNull(segment_id, '') = {segmentId:String}"
      : "";
    const result = await this.clickhouse.query({
      query: `
        SELECT
          event_name,
          count() AS event_count,
          uniqExact(user_id) AS unique_user_count
        FROM (
          SELECT event_name, user_id
          FROM promotion_touch_events
          WHERE project_id = {projectId:String}
            AND ${filterColumn} = {filterValue:String}
            ${segmentTouchFilter}

          UNION ALL

          SELECT event_name, user_id
          FROM booking_outcome_events
          WHERE project_id = {projectId:String}
            AND ifNull(${filterColumn}, '') = {filterValue:String}
            ${segmentBookingFilter}
        )
        GROUP BY event_name
        ORDER BY event_count DESC, event_name ASC
      `,
      format: "JSONEachRow",
      query_params: { filterValue, projectId, segmentId: segmentId ?? "" }
    });
    const rows = await result.json<SegmentRealtimeMetricRow>();

    return rows.map((row) => ({
      event_name: DashboardFunnelEventNameSchema.parse(row.event_name),
      event_count: countValue(row.event_count),
      unique_user_count: countValue(row.unique_user_count)
    }));
  }

  private async getCampaignDeliveryStatus(
    projectId: string,
    campaignId: string,
    events: DashboardRealtimeEvent[]
  ): Promise<DashboardDeliveryStatus> {
    const row = await this.db
      .query(getDashboardCampaignDeliveryStatus, { campaignId, projectId })
      .single();

    return toDeliveryStatus(row, events);
  }

  private async getPromotionDeliveryStatus(
    projectId: string,
    promotionId: string,
    events: DashboardRealtimeEvent[]
  ): Promise<DashboardDeliveryStatus> {
    const row = await this.db
      .query(getDashboardPromotionDeliveryStatus, { projectId, promotionId })
      .single();

    return toDeliveryStatus(row, events);
  }

  private async getSegmentDeliveryStatus(
    projectId: string,
    promotionId: string,
    segmentId: string,
    events: DashboardRealtimeEvent[]
  ): Promise<DashboardDeliveryStatus> {
    const row = await this.db
      .query(getDashboardSegmentDeliveryStatus, { projectId, promotionId, segmentId })
      .single();

    return toDeliveryStatus(row, events);
  }

  private async countRealtimeBreakdowns(
    scope: RealtimeMetricScope
  ): Promise<RealtimeBreakdowns> {
    const [timeBuckets, channelBreakdown, landingTypeBreakdown, hotelClusterBreakdown] =
      await Promise.all([
        this.countRealtimeTimeBuckets(scope),
        this.countRealtimeBreakdown(scope, {
          bookingKeyExpression: "nullIf(JSONExtractString(properties_json, 'promotion_channel'), '')",
          labelPrefix: "channel",
          touchKeyExpression: "nullIf(channel, '')"
        }),
        this.countRealtimeBreakdown(scope, {
          bookingKeyExpression: "nullIf(JSONExtractString(properties_json, 'landing_type'), '')",
          labelPrefix: "landing_type",
          touchKeyExpression: "nullIf(JSONExtractString(properties_json, 'landing_type'), '')"
        }),
        this.countRealtimeBreakdown(scope, {
          bookingKeyExpression: "nullIf(ifNull(toString(hotel_cluster), ''), '')",
          labelPrefix: "hotel_cluster",
          touchKeyExpression: "nullIf(JSONExtractString(properties_json, 'hotel_cluster'), '')"
        })
      ]);

    return {
      time_buckets: timeBuckets,
      channel_breakdown: channelBreakdown,
      landing_type_breakdown: landingTypeBreakdown,
      hotel_cluster_breakdown: hotelClusterBreakdown
    };
  }

  private async countRealtimeTimeBuckets({
    filterColumn,
    filterValue,
    projectId,
    segmentId
  }: RealtimeMetricScope): Promise<DashboardRealtimeTimeBucket[]> {
    const segmentTouchFilter = segmentId ? "AND segment_id = {segmentId:String}" : "";
    const segmentBookingFilter = segmentId
      ? "AND ifNull(segment_id, '') = {segmentId:String}"
      : "";
    const result = await this.clickhouse.query({
      query: `
        SELECT
          toString(time_bucket) AS time_bucket,
          count() AS event_count,
          uniqExact(user_id) AS unique_user_count
        FROM (
          SELECT toStartOfHour(event_time) AS time_bucket, user_id
          FROM promotion_touch_events
          WHERE project_id = {projectId:String}
            AND ${filterColumn} = {filterValue:String}
            ${segmentTouchFilter}

          UNION ALL

          SELECT toStartOfHour(event_time) AS time_bucket, user_id
          FROM booking_outcome_events
          WHERE project_id = {projectId:String}
            AND ifNull(${filterColumn}, '') = {filterValue:String}
            ${segmentBookingFilter}
        )
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `,
      format: "JSONEachRow",
      query_params: { filterValue, projectId, segmentId: segmentId ?? "" }
    });
    const rows = await result.json<RealtimeTimeBucketRow>();

    return rows.map((row) => ({
      time_bucket: row.time_bucket,
      event_count: countValue(row.event_count),
      unique_user_count: countValue(row.unique_user_count)
    }));
  }

  private async countRealtimeBreakdown(
    {
      filterColumn,
      filterValue,
      projectId,
      segmentId
    }: RealtimeMetricScope,
    {
      bookingKeyExpression,
      labelPrefix,
      touchKeyExpression
    }: {
      bookingKeyExpression: string;
      labelPrefix: string;
      touchKeyExpression: string;
    }
  ): Promise<DashboardRealtimeBreakdownItem[]> {
    const segmentTouchFilter = segmentId ? "AND segment_id = {segmentId:String}" : "";
    const segmentBookingFilter = segmentId
      ? "AND ifNull(segment_id, '') = {segmentId:String}"
      : "";
    const result = await this.clickhouse.query({
      query: `
        SELECT
          breakdown_key,
          count() AS event_count,
          uniqExact(user_id) AS unique_user_count
        FROM (
          SELECT ${touchKeyExpression} AS breakdown_key, user_id
          FROM promotion_touch_events
          WHERE project_id = {projectId:String}
            AND ${filterColumn} = {filterValue:String}
            ${segmentTouchFilter}

          UNION ALL

          SELECT ${bookingKeyExpression} AS breakdown_key, user_id
          FROM booking_outcome_events
          WHERE project_id = {projectId:String}
            AND ifNull(${filterColumn}, '') = {filterValue:String}
            ${segmentBookingFilter}
        )
        WHERE breakdown_key IS NOT NULL
        GROUP BY breakdown_key
        ORDER BY event_count DESC, breakdown_key ASC
        LIMIT 20
      `,
      format: "JSONEachRow",
      query_params: { filterValue, projectId, segmentId: segmentId ?? "" }
    });
    const rows = await result.json<RealtimeBreakdownRow>();

    return rows
      .filter((row) => row.breakdown_key)
      .map((row) => ({
        key: row.breakdown_key ?? "",
        label: `${labelPrefix}:${row.breakdown_key ?? ""}`,
        event_count: countValue(row.event_count),
        unique_user_count: countValue(row.unique_user_count)
      }));
  }

  private async countFunnelStepEvents(
    projectId: string,
    steps: IListActiveFunnelStepsByFunnelIdResult[]
  ): Promise<Map<string, number>> {
    const eventNames = [...new Set(steps.map((step) => step.eventName))];
    if (eventNames.length === 0) {
      return new Map();
    }

    const result = await this.clickhouse.query({
      query: `
        SELECT
          event_name,
          count() AS event_count
        FROM funnel_step_events
        WHERE project_id = {projectId:String}
          AND event_name IN {eventNames:Array(String)}
        GROUP BY event_name
      `,
      format: "JSONEachRow",
      query_params: { eventNames, projectId }
    });
    const rows = await result.json<FunnelStepMetricRow>();

    return new Map(rows.map((row) => [row.event_name, countValue(row.event_count)]));
  }
}

function toFunnel(
  funnel: IGetActiveFunnelByIdResult | IInsertFunnelDefinitionResult | IListActiveFunnelsResult,
  steps: Array<IInsertFunnelStepResult | IListActiveFunnelStepsResult>
): DashboardFunnel {
  return {
    funnel_id: funnel.funnelId,
    funnel_name: funnel.funnelName,
    domain_type: funnel.domainType,
    status: funnel.status,
    steps: steps
      .filter((step) => step.funnelId === funnel.funnelId)
      .map((step) => ({
        step_order: step.stepOrder,
        step_name: step.stepName,
        event_name: DashboardFunnelEventNameSchema.parse(step.eventName)
      })),
    created_at: funnel.createdAt.toISOString(),
    updated_at: funnel.updatedAt.toISOString()
  };
}

function countValue(value: number | string | null): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function totalEventCount(events: DashboardRealtimeEvent[]): number {
  return events.reduce((sum, event) => sum + event.event_count, 0);
}

function toDeliveryStatus(
  row: DeliveryStatusRow,
  events: DashboardRealtimeEvent[]
): DashboardDeliveryStatus {
  return {
    scheduled_count: countValue(row.scheduledCount),
    sent_count: countValue(row.sentCount),
    delivered_count: countValue(row.deliveredCount),
    opened_count: countValue(row.openedCount),
    clicked_count: eventCount(events, "campaign_redirect_click"),
    bounced_count: countValue(row.bouncedCount),
    failed_count: countValue(row.failedCount)
  };
}

function toBannerResponse(events: DashboardRealtimeEvent[]): DashboardBannerResponse {
  const impressionCount = eventCount(events, "promotion_impression");
  const clickCount = eventCount(events, "promotion_click");

  return {
    promotion_impression_count: impressionCount,
    promotion_click_count: clickCount,
    promotion_click_rate: impressionCount > 0 ? clickCount / impressionCount : 0,
    banner_position: null,
    hotel_search_count: eventCount(events, "hotel_search"),
    hotel_detail_view_count: eventCount(events, "hotel_detail_view"),
    booking_complete_count: eventCount(events, "booking_complete")
  };
}

function eventCount(events: DashboardRealtimeEvent[], eventName: string): number {
  return events.find((event) => event.event_name === eventName)?.event_count ?? 0;
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
