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
  DashboardFunnelMetricStep,
  DashboardFunnelMetrics,
  DashboardFunnelPreview,
  DashboardFunnelPreviewRequest,
  DashboardFunnelSummary,
  DashboardUpdateFunnelRequest,
  DashboardPromotionRealtimeMetrics,
  DashboardRealtimeBreakdownItem,
  DashboardRealtimeEvent,
  DashboardRealtimeMetrics,
  DashboardRealtimeTimeBucket,
  DashboardSegmentRealtimeSummary,
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
  listActiveFunnelStepsByFunnelId,
  updateFunnelDefinition,
  listDashboardPromotionSegmentDeliverySummaries,
  type IGetActiveFunnelByIdResult,
  type IGetDashboardCampaignDeliveryStatusResult,
  type IGetDashboardPromotionDeliveryStatusResult,
  type IGetDashboardSegmentDeliveryStatusResult,
  type IInsertFunnelDefinitionResult,
  type IInsertFunnelStepResult,
  type IListActiveFunnelsResult,
  type IListActiveFunnelStepsResult,
  type IUpdateFunnelDefinitionResult
} from "../database/__generated__/dashboard.queries.js";

type EventCatalogRow = {
  event_name: string;
  event_count: number | string;
};

type FunnelStepMetricRow = {
  step_order: number | string;
  event_count: number | string;
};

type FunnelMetricInputStep = {
  eventName: string;
  stepName: string;
  stepOrder: number;
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

type RealtimeWindowCountRow = {
  recent_5m_event_count: number | string;
  recent_1h_event_count: number | string;
};

type RealtimePeakTimeRow = {
  peak_time: string | null;
};

type SegmentRealtimeSummaryRow = {
  segment_id: string;
  segment_user_count: number | string;
  reach_count: number | string;
  promotion_impression_count: number | string;
  promotion_click_count: number | string;
  campaign_redirect_click_count: number | string;
  campaign_landing_count: number | string;
  booking_start_count: number | string;
  booking_complete_count: number | string;
};

type RealtimeMetricScope = {
  filterColumn?: "campaign_id" | "promotion_id";
  filterValue?: string;
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

type RealtimeWindowMetrics = {
  recent_5m_event_count: number;
  recent_1h_event_count: number;
  peak_time: string | null;
};

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

  async listFunnels(projectId: string): Promise<DashboardFunnelSummary[]> {
    const funnels = await this.db.query(listActiveFunnels, { projectId }).multiple();

    return funnels.map(toFunnelSummary);
  }

  async getFunnel(projectId: string, funnelId: string): Promise<DashboardFunnel> {
    const [funnel, steps] = await Promise.all([
      this.db.query(getActiveFunnelById, { funnelId, projectId }).single(),
      this.db.query(listActiveFunnelStepsByFunnelId, { funnelId, projectId }).multiple()
    ]);

    return toFunnel(funnel, steps);
  }

  async getFunnelMetrics(projectId: string, funnelId: string): Promise<DashboardFunnelMetrics> {
    const [funnel, steps] = await Promise.all([
      this.db.query(getActiveFunnelById, { funnelId, projectId }).single(),
      this.db.query(listActiveFunnelStepsByFunnelId, { funnelId, projectId }).multiple()
    ]);
    const metricSteps = await this.buildFunnelMetricSteps(
      projectId,
      steps.map((step) => ({
        eventName: step.eventName,
        stepName: step.stepName,
        stepOrder: step.stepOrder
      }))
    );

    return {
      funnel_id: funnel.funnelId,
      funnel_name: funnel.funnelName,
      steps: metricSteps
    };
  }

  async previewFunnelMetrics(
    projectId: string,
    request: DashboardFunnelPreviewRequest
  ): Promise<DashboardFunnelPreview> {
    return {
      steps: await this.buildFunnelMetricSteps(
        projectId,
        request.steps.map((step, index) => ({
          eventName: step.event_name,
          stepName: step.step_name,
          stepOrder: index + 1
        }))
      )
    };
  }

  async getProjectRealtimeMetrics(projectId: string): Promise<DashboardRealtimeMetrics> {
    const scope = { projectId } as const;
    const [events, breakdowns, windowMetrics] = await Promise.all([
      this.countRealtimeEvents(scope),
      this.countRealtimeBreakdowns(scope),
      this.countRealtimeWindowMetrics(scope)
    ]);

    return {
      total_event_count: totalEventCount(events),
      ...windowMetrics,
      events,
      ...breakdowns,
      delivery_status: emptyDeliveryStatus(events),
      banner_response: toBannerResponse(events)
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
    const [events, breakdowns, windowMetrics] = await Promise.all([
      this.countRealtimeEvents(scope),
      this.countRealtimeBreakdowns(scope),
      this.countRealtimeWindowMetrics(scope)
    ]);
    const deliveryStatus = await this.getCampaignDeliveryStatus(projectId, campaignId, events);

    return {
      campaign_id: campaignId,
      total_event_count: totalEventCount(events),
      ...windowMetrics,
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
    const [events, breakdowns, windowMetrics] = await Promise.all([
      this.countRealtimeEvents(scope),
      this.countRealtimeBreakdowns(scope),
      this.countRealtimeWindowMetrics(scope)
    ]);
    const deliveryStatus = await this.getPromotionDeliveryStatus(projectId, promotionId, events);

    return {
      promotion_id: promotionId,
      total_event_count: totalEventCount(events),
      ...windowMetrics,
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
    const [events, breakdowns, windowMetrics] = await Promise.all([
      this.countRealtimeEvents(scope),
      this.countRealtimeBreakdowns(scope),
      this.countRealtimeWindowMetrics(scope)
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
      ...windowMetrics,
      events,
      ...breakdowns,
      delivery_status: deliveryStatus,
      banner_response: toBannerResponse(events)
    };
  }

  async getPromotionSegmentRealtimeSummaries(
    projectId: string,
    promotionId: string
  ): Promise<DashboardSegmentRealtimeSummary[]> {
    const [eventRows, deliveryRows] = await Promise.all([
      this.countPromotionSegmentRealtimeEvents(projectId, promotionId),
      this.db
        .query(listDashboardPromotionSegmentDeliverySummaries, { projectId, promotionId })
        .multiple()
    ]);
    const deliveryBySegment = new Map(deliveryRows.map((row) => [row.segmentId, row]));
    const eventBySegment = new Map(eventRows.map((row) => [row.segment_id, row]));
    const segmentIds = [...new Set([...eventBySegment.keys(), ...deliveryBySegment.keys()])];

    return segmentIds.map((segmentId) => {
      const row = eventBySegment.get(segmentId);
      const delivery = deliveryBySegment.get(segmentId);
      return {
        promotion_id: promotionId,
        segment_id: segmentId,
        segment_user_count: countValue(row?.segment_user_count ?? delivery?.scheduledCount ?? 0),
        delivery_count: countValue(delivery?.deliveredCount ?? 0),
        reach_count: countValue(row?.reach_count ?? 0),
        promotion_impression_count: countValue(row?.promotion_impression_count ?? 0),
        promotion_click_count: countValue(row?.promotion_click_count ?? 0),
        campaign_redirect_click_count: countValue(row?.campaign_redirect_click_count ?? 0),
        campaign_landing_count: countValue(row?.campaign_landing_count ?? 0),
        booking_start_count: countValue(row?.booking_start_count ?? 0),
        booking_complete_count: countValue(row?.booking_complete_count ?? 0)
      };
    });
  }

  private async countPromotionSegmentRealtimeEvents(
    projectId: string,
    promotionId: string
  ): Promise<SegmentRealtimeSummaryRow[]> {
    const result = await this.clickhouse.query({
      query: `
        SELECT
          segment_id,
          uniqExact(user_id) AS segment_user_count,
          uniqExactIf(user_id, event_name IN ('campaign_redirect_click', 'promotion_click', 'promotion_impression')) AS reach_count,
          countIf(event_name = 'promotion_impression') AS promotion_impression_count,
          countIf(event_name = 'promotion_click') AS promotion_click_count,
          countIf(event_name = 'campaign_redirect_click') AS campaign_redirect_click_count,
          countIf(event_name = 'campaign_landing') AS campaign_landing_count,
          countIf(event_name = 'booking_start') AS booking_start_count,
          countIf(event_name = 'booking_complete') AS booking_complete_count
        FROM (
          SELECT segment_id, user_id, event_name
          FROM promotion_touch_events
          WHERE project_id = {projectId:String}
            AND promotion_id = {promotionId:String}
            AND segment_id != ''

          UNION ALL

          SELECT ifNull(segment_id, '') AS segment_id, user_id, event_name
          FROM booking_outcome_events
          WHERE project_id = {projectId:String}
            AND ifNull(promotion_id, '') = {promotionId:String}
            AND ifNull(segment_id, '') != ''
        )
        GROUP BY segment_id
        ORDER BY booking_complete_count DESC, promotion_click_count DESC, segment_id ASC
      `,
      format: "JSONEachRow",
      query_params: { projectId, promotionId }
    });

    return result.json<SegmentRealtimeSummaryRow>();
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

  async updateFunnel(
    projectId: string,
    funnelId: string,
    request: DashboardUpdateFunnelRequest
  ): Promise<DashboardFunnel> {
    const funnel = await this.db
      .query(updateFunnelDefinition, {
        funnelId,
        projectId,
        funnelName: request.funnel_name
      })
      .single();
    await this.db.query(deleteFunnelSteps, { funnelId, projectId }).multiple();

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

  async deleteFunnel(projectId: string, funnelId: string): Promise<DashboardDeleteFunnelResult> {
    await this.db.query(deleteFunnelSteps, { funnelId, projectId }).multiple();
    const deleted = await this.db.query(deleteFunnelDefinition, { funnelId, projectId }).single();

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
    if (!filterColumn && !segmentId) {
      const result = await this.clickhouse.query({
        query: `
          SELECT
            event_name,
            count() AS event_count,
            uniqExact(user_id) AS unique_user_count
          FROM funnel_step_events
          WHERE project_id = {projectId:String}
          GROUP BY event_name
          ORDER BY event_count DESC, event_name ASC
        `,
        format: "JSONEachRow",
        query_params: { projectId }
      });
      const rows = await result.json<SegmentRealtimeMetricRow>();

      return rows.map((row) => ({
        event_name: row.event_name,
        event_count: countValue(row.event_count),
        unique_user_count: countValue(row.unique_user_count)
      }));
    }

    const touchScopeFilter = filterColumn ? `AND ${filterColumn} = {filterValue:String}` : "";
    const bookingScopeFilter = filterColumn
      ? `AND ifNull(${filterColumn}, '') = {filterValue:String}`
      : "";
    const segmentTouchFilter = segmentId ? "AND segment_id = {segmentId:String}" : "";
    const segmentBookingFilter = segmentId ? "AND ifNull(segment_id, '') = {segmentId:String}" : "";
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
            ${touchScopeFilter}
            ${segmentTouchFilter}

          UNION ALL

          SELECT event_name, user_id
          FROM booking_outcome_events
          WHERE project_id = {projectId:String}
            ${bookingScopeFilter}
            ${segmentBookingFilter}
        )
        GROUP BY event_name
        ORDER BY event_count DESC, event_name ASC
      `,
      format: "JSONEachRow",
      query_params: { filterValue: filterValue ?? "", projectId, segmentId: segmentId ?? "" }
    });
    const rows = await result.json<SegmentRealtimeMetricRow>();

    return rows.map((row) => ({
      event_name: row.event_name,
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

  private async countRealtimeWindowMetrics(
    scope: RealtimeMetricScope
  ): Promise<RealtimeWindowMetrics> {
    const [windowCounts, peakTime] = await Promise.all([
      this.countRecentRealtimeEvents(scope),
      this.findRealtimePeakTime(scope)
    ]);

    return {
      ...windowCounts,
      peak_time: peakTime
    };
  }

  private async countRecentRealtimeEvents({
    filterColumn,
    filterValue,
    projectId,
    segmentId
  }: RealtimeMetricScope): Promise<Omit<RealtimeWindowMetrics, "peak_time">> {
    if (!filterColumn && !segmentId) {
      const result = await this.clickhouse.query({
        query: `
          SELECT
            countIf(event_time >= now() - INTERVAL 5 MINUTE) AS recent_5m_event_count,
            countIf(event_time >= now() - INTERVAL 1 HOUR) AS recent_1h_event_count
          FROM funnel_step_events
          WHERE project_id = {projectId:String}
        `,
        format: "JSONEachRow",
        query_params: { projectId }
      });
      const [row] = await result.json<RealtimeWindowCountRow>();

      return {
        recent_5m_event_count: countValue(row?.recent_5m_event_count ?? 0),
        recent_1h_event_count: countValue(row?.recent_1h_event_count ?? 0)
      };
    }

    const touchScopeFilter = filterColumn ? `AND ${filterColumn} = {filterValue:String}` : "";
    const bookingScopeFilter = filterColumn
      ? `AND ifNull(${filterColumn}, '') = {filterValue:String}`
      : "";
    const segmentTouchFilter = segmentId ? "AND segment_id = {segmentId:String}" : "";
    const segmentBookingFilter = segmentId ? "AND ifNull(segment_id, '') = {segmentId:String}" : "";
    const result = await this.clickhouse.query({
      query: `
        SELECT
          countIf(event_time >= now() - INTERVAL 5 MINUTE) AS recent_5m_event_count,
          countIf(event_time >= now() - INTERVAL 1 HOUR) AS recent_1h_event_count
        FROM (
          SELECT event_time
          FROM promotion_touch_events
          WHERE project_id = {projectId:String}
            ${touchScopeFilter}
            ${segmentTouchFilter}

          UNION ALL

          SELECT event_time
          FROM booking_outcome_events
          WHERE project_id = {projectId:String}
            ${bookingScopeFilter}
            ${segmentBookingFilter}
        )
      `,
      format: "JSONEachRow",
      query_params: { filterValue: filterValue ?? "", projectId, segmentId: segmentId ?? "" }
    });
    const [row] = await result.json<RealtimeWindowCountRow>();

    return {
      recent_5m_event_count: countValue(row?.recent_5m_event_count ?? 0),
      recent_1h_event_count: countValue(row?.recent_1h_event_count ?? 0)
    };
  }

  private async findRealtimePeakTime({
    filterColumn,
    filterValue,
    projectId,
    segmentId
  }: RealtimeMetricScope): Promise<string | null> {
    if (!filterColumn && !segmentId) {
      const result = await this.clickhouse.query({
        query: `
          SELECT toString(time_bucket) AS peak_time
          FROM (
            SELECT
              toStartOfHour(event_time) AS time_bucket,
              count() AS event_count
            FROM funnel_step_events
            WHERE project_id = {projectId:String}
            GROUP BY time_bucket
            ORDER BY event_count DESC, time_bucket DESC
            LIMIT 1
          )
        `,
        format: "JSONEachRow",
        query_params: { projectId }
      });
      const [row] = await result.json<RealtimePeakTimeRow>();

      return row?.peak_time ?? null;
    }

    const touchScopeFilter = filterColumn ? `AND ${filterColumn} = {filterValue:String}` : "";
    const bookingScopeFilter = filterColumn
      ? `AND ifNull(${filterColumn}, '') = {filterValue:String}`
      : "";
    const segmentTouchFilter = segmentId ? "AND segment_id = {segmentId:String}" : "";
    const segmentBookingFilter = segmentId ? "AND ifNull(segment_id, '') = {segmentId:String}" : "";
    const result = await this.clickhouse.query({
      query: `
        SELECT toString(time_bucket) AS peak_time
        FROM (
          SELECT
            toStartOfHour(event_time) AS time_bucket,
            count() AS event_count
          FROM (
            SELECT event_time
            FROM promotion_touch_events
            WHERE project_id = {projectId:String}
              ${touchScopeFilter}
              ${segmentTouchFilter}

            UNION ALL

            SELECT event_time
            FROM booking_outcome_events
            WHERE project_id = {projectId:String}
              ${bookingScopeFilter}
              ${segmentBookingFilter}
          )
          GROUP BY time_bucket
          ORDER BY event_count DESC, time_bucket DESC
          LIMIT 1
        )
      `,
      format: "JSONEachRow",
      query_params: { filterValue: filterValue ?? "", projectId, segmentId: segmentId ?? "" }
    });
    const [row] = await result.json<RealtimePeakTimeRow>();

    return row?.peak_time ?? null;
  }

  private async countRealtimeBreakdowns(scope: RealtimeMetricScope): Promise<RealtimeBreakdowns> {
    const [timeBuckets, channelBreakdown, landingTypeBreakdown, hotelClusterBreakdown] =
      await Promise.all([
        this.countRealtimeTimeBuckets(scope),
        this.countRealtimeBreakdown(scope, {
          bookingKeyExpression:
            "nullIf(JSONExtractString(properties_json, 'promotion_channel'), '')",
          labelPrefix: "channel",
          projectKeyExpression:
            "ifNull(nullIf(JSONExtractString(properties_json, 'promotion_channel'), ''), nullIf(JSONExtractString(properties_json, 'channel'), ''))",
          touchKeyExpression: "nullIf(toString(channel), '')"
        }),
        this.countRealtimeBreakdown(scope, {
          bookingKeyExpression: "nullIf(JSONExtractString(properties_json, 'landing_type'), '')",
          labelPrefix: "landing_type",
          projectKeyExpression: "nullIf(JSONExtractString(properties_json, 'landing_type'), '')",
          touchKeyExpression: "nullIf(JSONExtractString(properties_json, 'landing_type'), '')"
        }),
        this.countRealtimeBreakdown(scope, {
          bookingKeyExpression: "nullIf(ifNull(toString(hotel_cluster), ''), '')",
          labelPrefix: "hotel_cluster",
          projectKeyExpression: "nullIf(JSONExtractString(properties_json, 'hotel_cluster'), '')",
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
    if (!filterColumn && !segmentId) {
      const result = await this.clickhouse.query({
        query: `
          SELECT
            toString(time_bucket) AS time_bucket,
            count() AS event_count,
            uniqExact(user_id) AS unique_user_count
          FROM (
            SELECT toStartOfHour(event_time) AS time_bucket, user_id
            FROM funnel_step_events
            WHERE project_id = {projectId:String}
          )
          GROUP BY time_bucket
          ORDER BY time_bucket ASC
        `,
        format: "JSONEachRow",
        query_params: { projectId }
      });
      const rows = await result.json<RealtimeTimeBucketRow>();

      return rows.map((row) => ({
        time_bucket: row.time_bucket,
        event_count: countValue(row.event_count),
        unique_user_count: countValue(row.unique_user_count)
      }));
    }

    const touchScopeFilter = filterColumn ? `AND ${filterColumn} = {filterValue:String}` : "";
    const bookingScopeFilter = filterColumn
      ? `AND ifNull(${filterColumn}, '') = {filterValue:String}`
      : "";
    const segmentTouchFilter = segmentId ? "AND segment_id = {segmentId:String}" : "";
    const segmentBookingFilter = segmentId ? "AND ifNull(segment_id, '') = {segmentId:String}" : "";
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
            ${touchScopeFilter}
            ${segmentTouchFilter}

          UNION ALL

          SELECT toStartOfHour(event_time) AS time_bucket, user_id
          FROM booking_outcome_events
          WHERE project_id = {projectId:String}
            ${bookingScopeFilter}
            ${segmentBookingFilter}
        )
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `,
      format: "JSONEachRow",
      query_params: { filterValue: filterValue ?? "", projectId, segmentId: segmentId ?? "" }
    });
    const rows = await result.json<RealtimeTimeBucketRow>();

    return rows.map((row) => ({
      time_bucket: row.time_bucket,
      event_count: countValue(row.event_count),
      unique_user_count: countValue(row.unique_user_count)
    }));
  }

  private async countRealtimeBreakdown(
    { filterColumn, filterValue, projectId, segmentId }: RealtimeMetricScope,
    {
      bookingKeyExpression,
      labelPrefix,
      projectKeyExpression,
      touchKeyExpression
    }: {
      bookingKeyExpression: string;
      labelPrefix: string;
      projectKeyExpression: string;
      touchKeyExpression: string;
    }
  ): Promise<DashboardRealtimeBreakdownItem[]> {
    if (!filterColumn && !segmentId) {
      const result = await this.clickhouse.query({
        query: `
          SELECT
            breakdown_key,
            count() AS event_count,
            uniqExact(user_id) AS unique_user_count
          FROM (
            SELECT ${projectKeyExpression} AS breakdown_key, user_id
            FROM funnel_step_events
            WHERE project_id = {projectId:String}
          )
          WHERE breakdown_key IS NOT NULL
          GROUP BY breakdown_key
          ORDER BY event_count DESC, breakdown_key ASC
          LIMIT 20
        `,
        format: "JSONEachRow",
        query_params: { projectId }
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

    const touchScopeFilter = filterColumn ? `AND ${filterColumn} = {filterValue:String}` : "";
    const bookingScopeFilter = filterColumn
      ? `AND ifNull(${filterColumn}, '') = {filterValue:String}`
      : "";
    const segmentTouchFilter = segmentId ? "AND segment_id = {segmentId:String}" : "";
    const segmentBookingFilter = segmentId ? "AND ifNull(segment_id, '') = {segmentId:String}" : "";
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
            ${touchScopeFilter}
            ${segmentTouchFilter}

          UNION ALL

          SELECT ${bookingKeyExpression} AS breakdown_key, user_id
          FROM booking_outcome_events
          WHERE project_id = {projectId:String}
            ${bookingScopeFilter}
            ${segmentBookingFilter}
        )
        WHERE breakdown_key IS NOT NULL
        GROUP BY breakdown_key
        ORDER BY event_count DESC, breakdown_key ASC
        LIMIT 20
      `,
      format: "JSONEachRow",
      query_params: { filterValue: filterValue ?? "", projectId, segmentId: segmentId ?? "" }
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

  private async buildFunnelMetricSteps(
    projectId: string,
    steps: FunnelMetricInputStep[]
  ): Promise<DashboardFunnelMetricStep[]> {
    const eventCounts = await this.countSequentialFunnelStepEvents(projectId, steps);

    return steps.map((step) => ({
      step_order: step.stepOrder,
      step_name: step.stepName,
      event_name: DashboardFunnelEventNameSchema.parse(step.eventName),
      event_count: eventCounts.get(step.stepOrder) ?? 0
    }));
  }

  private async countSequentialFunnelStepEvents(
    projectId: string,
    steps: FunnelMetricInputStep[]
  ): Promise<Map<number, number>> {
    if (steps.length === 0) {
      return new Map();
    }

    const queryParams: Record<string, string> = { projectId };
    const stepQueries = steps.map((step, index) => {
      const stepNumber = index + 1;
      const previousStepName = `step_${stepNumber - 1}_users`;
      const currentStepName = `step_${stepNumber}_users`;
      const eventParamName = `stepEvent${stepNumber}`;
      queryParams[eventParamName] = step.eventName;

      if (stepNumber === 1) {
        return `
        ${currentStepName} AS (
          SELECT
            user_id,
            min(event_time) AS reached_at
          FROM funnel_step_events
          WHERE project_id = {projectId:String}
            AND event_name = {${eventParamName}:String}
          GROUP BY user_id
        )`;
      }

      return `
        ${currentStepName} AS (
          SELECT
            fse.user_id,
            min(fse.event_time) AS reached_at
          FROM funnel_step_events fse
          INNER JOIN ${previousStepName} previous
            ON previous.user_id = fse.user_id
          WHERE fse.project_id = {projectId:String}
            AND fse.event_name = {${eventParamName}:String}
            AND fse.event_time >= previous.reached_at
          GROUP BY fse.user_id
        )`;
    });
    const resultQueries = steps.map(
      (step, index) => `
        SELECT
          ${step.stepOrder} AS step_order,
          count() AS event_count
        FROM step_${index + 1}_users`
    );

    const result = await this.clickhouse.query({
      query: `
        WITH
        ${stepQueries.join(",\n")}
        ${resultQueries.join("\n        UNION ALL\n")}
        ORDER BY step_order ASC
      `,
      format: "JSONEachRow",
      query_params: queryParams
    });
    const rows = await result.json<FunnelStepMetricRow>();

    return new Map(rows.map((row) => [countValue(row.step_order), countValue(row.event_count)]));
  }
}

function toFunnel(
  funnel:
    | IGetActiveFunnelByIdResult
    | IInsertFunnelDefinitionResult
    | IListActiveFunnelsResult
    | IUpdateFunnelDefinitionResult,
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

function toFunnelSummary(funnel: IListActiveFunnelsResult): DashboardFunnelSummary {
  return {
    funnel_id: funnel.funnelId,
    funnel_name: funnel.funnelName,
    domain_type: funnel.domainType,
    status: funnel.status,
    step_count: countValue(funnel.stepCount),
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

function emptyDeliveryStatus(events: DashboardRealtimeEvent[]): DashboardDeliveryStatus {
  return {
    scheduled_count: 0,
    sent_count: 0,
    delivered_count: 0,
    opened_count: 0,
    clicked_count: eventCount(events, "campaign_redirect_click"),
    bounced_count: 0,
    failed_count: 0
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
