import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  SdkPublishedSchema,
  TrackingPlan,
  TrackingPlanEvent,
  TrackingPlanEventInput,
  TrackingPlanEventUpdate
} from "@loopad/shared";
import { SdkPublishedSchemaSchema, TrackingPlanPropertiesSchemaSchema } from "@loopad/shared";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { PG_POOL } from "../../infra/database/index.js";

const STANDARD_EVENT_NAMES = [
  "page_view",
  "promotion_impression",
  "promotion_click",
  "campaign_redirect_click",
  "campaign_landing",
  "hotel_search",
  "hotel_click",
  "hotel_detail_view",
  "booking_start",
  "booking_complete",
  "booking_cancel"
] as const;

type PlanRow = QueryResultRow & {
  tracking_plan_id: string;
  project_id: string;
  name: string;
  status: TrackingPlan["status"];
  current_revision: number;
  sdk_key: string;
  allowed_origins_json: unknown;
  published_revision: number | null;
};

type EventRow = QueryResultRow & {
  event_name: string;
  description: string | null;
  status: TrackingPlanEvent["status"];
  properties_schema_json: unknown;
};

type PublicConnectionRow = QueryResultRow & {
  project_id: string;
  sdk_key: string;
  allowed_origins_json: unknown;
  published_revision: number;
  schema_json: unknown;
};

@Injectable()
export class TrackingPlanRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async get(projectId: string, executor: Pool | PoolClient = this.pool): Promise<TrackingPlan> {
    const plan = await this.findPlanRow(projectId, executor);
    if (!plan) throw new NotFoundException("Tracking Plan was not found.");
    return this.hydratePlan(plan, executor);
  }

  async create(
    projectId: string,
    name: string,
    allowedOrigins: string[] = []
  ): Promise<TrackingPlan> {
    return this.transaction(async (client) => {
      const project = await client.query<{ project_id: string }>(
        "SELECT project_id FROM projects WHERE project_id = $1 AND status = 'active' FOR UPDATE",
        [projectId]
      );
      if (!project.rows[0]) throw new NotFoundException("Project was not found.");

      const existing = await this.findPlanRow(projectId, client);
      if (existing) return this.hydratePlan(existing, client);

      const trackingPlanId = `tracking_plan_${randomUUID()}`;
      await client.query(
        `INSERT INTO tracking_plans (tracking_plan_id, project_id, name, status)
         VALUES ($1, $2, $3, 'draft')`,
        [trackingPlanId, projectId, name]
      );
      if (allowedOrigins.length > 0) {
        await client.query(
          `INSERT INTO project_sdk_settings (project_id, allowed_origins_json, status)
           VALUES ($1, $2::jsonb, 'active')
           ON CONFLICT (project_id) DO UPDATE
           SET allowed_origins_json = EXCLUDED.allowed_origins_json,
               status = 'active', updated_at = now()`,
          [projectId, JSON.stringify(allowedOrigins)]
        );
      } else {
        await client.query(
          `INSERT INTO project_sdk_settings (project_id, allowed_origins_json, status)
           VALUES ($1, '[]'::jsonb, 'active')
           ON CONFLICT (project_id) DO NOTHING`,
          [projectId]
        );
      }
      for (const eventName of STANDARD_EVENT_NAMES) {
        await client.query(
          `INSERT INTO tracking_plan_events
             (tracking_plan_id, event_name, description, status, properties_schema_json)
           VALUES ($1, $2, $3, 'system', $4::jsonb)`,
          [
            trackingPlanId,
            eventName,
            `${eventName} standard event`,
            JSON.stringify({ type: "object", properties: {}, required: [] })
          ]
        );
      }
      return this.get(projectId, client);
    });
  }

  async addEvent(projectId: string, input: TrackingPlanEventInput): Promise<TrackingPlan> {
    const plan = await this.get(projectId);
    try {
      await this.pool.query(
        `INSERT INTO tracking_plan_events
           (tracking_plan_id, event_name, description, status, properties_schema_json)
         VALUES ($1, $2, $3, 'draft', $4::jsonb)`,
        [
          plan.trackingPlanId,
          input.eventName,
          input.description,
          JSON.stringify(input.propertiesSchema)
        ]
      );
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("Event name already exists.");
      throw error;
    }
    await this.markDraft(plan.trackingPlanId);
    return this.get(projectId);
  }

  async updateEvent(
    projectId: string,
    eventName: string,
    input: TrackingPlanEventUpdate
  ): Promise<TrackingPlan> {
    const result = await this.pool.query(
      `UPDATE tracking_plan_events event
       SET description = $3, properties_schema_json = $4::jsonb, updated_at = now()
       FROM tracking_plans plan
       WHERE event.tracking_plan_id = plan.tracking_plan_id
         AND plan.project_id = $1
         AND plan.status <> 'archived'
         AND event.event_name = $2
       RETURNING event.tracking_plan_id`,
      [projectId, eventName, input.description, JSON.stringify(input.propertiesSchema)]
    );
    const trackingPlanId = result.rows[0]?.tracking_plan_id as string | undefined;
    if (!trackingPlanId) throw new NotFoundException("Tracking Plan event was not found.");
    await this.markDraft(trackingPlanId);
    return this.get(projectId);
  }

  async deleteEvent(projectId: string, eventName: string): Promise<TrackingPlan> {
    const event = await this.pool.query<{ tracking_plan_id: string; status: string }>(
      `SELECT event.tracking_plan_id, event.status
       FROM tracking_plan_events event
       JOIN tracking_plans plan ON plan.tracking_plan_id = event.tracking_plan_id
       WHERE plan.project_id = $1 AND plan.status <> 'archived' AND event.event_name = $2`,
      [projectId, eventName]
    );
    const row = event.rows[0];
    if (!row) throw new NotFoundException("Tracking Plan event was not found.");
    if (row.status === "system") throw new BadRequestException("System events cannot be deleted.");
    await this.pool.query(
      "DELETE FROM tracking_plan_events WHERE tracking_plan_id = $1 AND event_name = $2",
      [row.tracking_plan_id, eventName]
    );
    await this.markDraft(row.tracking_plan_id);
    return this.get(projectId);
  }

  async updateOrigins(projectId: string, allowedOrigins: string[]): Promise<TrackingPlan> {
    const plan = await this.get(projectId);
    await this.pool.query(
      `INSERT INTO project_sdk_settings (project_id, allowed_origins_json, status)
       VALUES ($1, $2::jsonb, 'active')
       ON CONFLICT (project_id) DO UPDATE
       SET allowed_origins_json = EXCLUDED.allowed_origins_json,
           status = 'active', updated_at = now()`,
      [projectId, JSON.stringify(allowedOrigins)]
    );
    return { ...plan, allowedOrigins };
  }

  async publish(projectId: string, createdBy?: string): Promise<TrackingPlan> {
    return this.transaction(async (client) => {
      const planResult = await client.query<PlanRow>(
        `SELECT plan.tracking_plan_id, plan.project_id, plan.name, plan.status,
                plan.current_revision, project.write_key AS sdk_key,
                COALESCE(settings.allowed_origins_json, '[]'::jsonb) AS allowed_origins_json,
                settings.published_revision
         FROM tracking_plans plan
         JOIN projects project ON project.project_id = plan.project_id
         LEFT JOIN project_sdk_settings settings ON settings.project_id = plan.project_id
         WHERE plan.project_id = $1 AND plan.status <> 'archived'
         ORDER BY plan.created_at DESC LIMIT 1 FOR UPDATE OF plan`,
        [projectId]
      );
      const plan = planResult.rows[0];
      if (!plan) throw new NotFoundException("Tracking Plan was not found.");
      const allowedOrigins = stringArray(plan.allowed_origins_json);
      if (allowedOrigins.length === 0) {
        throw new BadRequestException("At least one allowed Origin is required before publish.");
      }
      const events = await this.readEvents(plan.tracking_plan_id, client);
      if (events.length === 0)
        throw new BadRequestException("At least one event is required before publish.");

      const revision = Number(plan.current_revision) + 1;
      const snapshot = SdkPublishedSchemaSchema.parse({
        schemaVersion: "hotel_rec_promo.v1",
        revision,
        events: events.map(({ status: _status, ...event }) => event)
      });
      await client.query(
        `INSERT INTO tracking_plan_revisions
           (tracking_plan_id, revision, schema_json, created_by)
         VALUES ($1, $2, $3::jsonb, $4)`,
        [plan.tracking_plan_id, revision, JSON.stringify(snapshot), createdBy ?? null]
      );
      await client.query(
        `UPDATE tracking_plans
         SET current_revision = $2, status = 'published', updated_at = now()
         WHERE tracking_plan_id = $1`,
        [plan.tracking_plan_id, revision]
      );
      await client.query(
        `UPDATE project_sdk_settings
         SET published_tracking_plan_id = $2, published_revision = $3,
             status = 'active', updated_at = now()
         WHERE project_id = $1`,
        [projectId, plan.tracking_plan_id, revision]
      );
      return this.get(projectId, client);
    });
  }

  async getPublicConnection(sdkKey: string): Promise<{
    projectId: string;
    writeKey: string;
    allowedOrigins: string[];
    schema: SdkPublishedSchema;
  }> {
    const result = await this.pool.query<PublicConnectionRow>(
      `SELECT project.project_id, project.write_key AS sdk_key, settings.allowed_origins_json,
              settings.published_revision, revision.schema_json
       FROM projects project
       JOIN project_sdk_settings settings ON settings.project_id = project.project_id
       JOIN tracking_plan_revisions revision
         ON revision.tracking_plan_id = settings.published_tracking_plan_id
        AND revision.revision = settings.published_revision
       WHERE project.write_key = $1 AND project.status = 'active' AND settings.status = 'active'`,
      [sdkKey]
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException("Published SDK connection was not found.");
    return {
      projectId: row.project_id,
      writeKey: row.sdk_key,
      allowedOrigins: stringArray(row.allowed_origins_json),
      schema: SdkPublishedSchemaSchema.parse(row.schema_json)
    };
  }

  private async findPlanRow(
    projectId: string,
    executor: Pool | PoolClient
  ): Promise<PlanRow | undefined> {
    const result = await executor.query<PlanRow>(
      `SELECT plan.tracking_plan_id, plan.project_id, plan.name, plan.status,
              plan.current_revision, project.write_key AS sdk_key,
              COALESCE(settings.allowed_origins_json, '[]'::jsonb) AS allowed_origins_json,
              settings.published_revision
       FROM tracking_plans plan
       JOIN projects project ON project.project_id = plan.project_id
       LEFT JOIN project_sdk_settings settings ON settings.project_id = plan.project_id
       WHERE plan.project_id = $1 AND plan.status <> 'archived'
       ORDER BY plan.created_at DESC LIMIT 1`,
      [projectId]
    );
    return result.rows[0];
  }

  private async hydratePlan(plan: PlanRow, executor: Pool | PoolClient): Promise<TrackingPlan> {
    return {
      trackingPlanId: plan.tracking_plan_id,
      projectId: plan.project_id,
      name: plan.name,
      status: plan.status,
      currentRevision: Number(plan.current_revision),
      publishedRevision: plan.published_revision === null ? null : Number(plan.published_revision),
      sdkKey: plan.sdk_key,
      allowedOrigins: stringArray(plan.allowed_origins_json),
      events: await this.readEvents(plan.tracking_plan_id, executor)
    };
  }

  private async readEvents(
    trackingPlanId: string,
    executor: Pool | PoolClient
  ): Promise<TrackingPlanEvent[]> {
    const result = await executor.query<EventRow>(
      `SELECT event_name, description, status, properties_schema_json
       FROM tracking_plan_events
       WHERE tracking_plan_id = $1 AND status <> 'archived'
       ORDER BY CASE WHEN status = 'system' THEN 0 ELSE 1 END, event_name`,
      [trackingPlanId]
    );
    return result.rows.map((event) => ({
      eventName: event.event_name,
      description: event.description ?? "",
      status: event.status,
      propertiesSchema: TrackingPlanPropertiesSchemaSchema.parse(event.properties_schema_json)
    }));
  }

  private async markDraft(trackingPlanId: string) {
    await this.pool.query(
      `UPDATE tracking_plans SET status = 'draft', updated_at = now()
       WHERE tracking_plan_id = $1 AND status <> 'archived'`,
      [trackingPlanId]
    );
  }

  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function isUniqueViolation(error: unknown): error is { code: "23505" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
