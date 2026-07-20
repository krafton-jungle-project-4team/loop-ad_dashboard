import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  SdkConnection,
  SdkPublishedSchema,
  TrackingPlan,
  TrackingPlanCreateRequest,
  TrackingPlanEventInput,
  TrackingPlanEventUpdate,
  TrackingPlanValidation
} from "@loopad/shared";
import { LogContextScope, durationMs, log } from "../../infra/logger/index.js";
import { TrackingPlanObservedEventReader } from "./tracking-plan-observed-event-reader.js";
import { TrackingPlanRepository } from "./tracking-plan.repository.js";

const COLLECTOR_URL = "https://event.api.dev.loop-ad.org/events";
const PUBLIC_API_BASE_URL = "https://dashboard.api.dev.loop-ad.org/api/public/v1/sdk/connections";
const CACHE_TTL_SECONDS = 60;
const DEMO_SITE_ORIGIN = "https://demo-shoppingmall.dev.loop-ad.org";
const DASHBOARD_API_ORIGIN = "https://dashboard.api.dev.loop-ad.org";

interface PublicSdkRequestContext {
  origin?: string;
  referer?: string;
  secFetchSite?: string;
}

@Injectable()
export class TrackingPlanService {
  constructor(
    @Inject(TrackingPlanRepository) private readonly repository: TrackingPlanRepository,
    @Inject(TrackingPlanObservedEventReader)
    private readonly observedEventReader: TrackingPlanObservedEventReader
  ) {}

  @LogContextScope()
  async get(projectId: string) {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started");
    const response = await this.repository.get(projectId);

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: trackingPlanLogSummary(response)
    });
    return response;
  }

  @LogContextScope()
  async create(projectId: string, request: TrackingPlanCreateRequest) {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", {
      request: { allowedOriginCount: request.allowedOrigins?.length ?? 0, name: request.name }
    });
    const response = await this.repository.create(projectId, request.name, request.allowedOrigins);

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: trackingPlanLogSummary(response)
    });
    return response;
  }

  @LogContextScope()
  async createFromObservedEvents(projectId: string) {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started");
    const events = await this.observedEventReader.inferEvents(projectId);
    log.info("tracking_plan_observed_events_loaded", { eventCount: events.length });
    if (events.length === 0) {
      log.warn("tracking_plan_observed_events_empty");
      throw new BadRequestException("최근 30일 동안 수집된 이벤트가 없습니다.");
    }
    const response = await this.repository.create(
      projectId,
      "Demo Site Tracking Plan",
      [DEMO_SITE_ORIGIN],
      events
    );

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: trackingPlanLogSummary(response)
    });
    return response;
  }

  @LogContextScope()
  async addEvent(projectId: string, event: TrackingPlanEventInput) {
    const startedAt = Date.now();
    log.assignContext({ eventName: event.eventName, projectId });
    log.info("started", { request: event });
    const response = await this.repository.addEvent(projectId, event);

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: trackingPlanLogSummary(response)
    });
    return response;
  }

  @LogContextScope()
  async updateEvent(projectId: string, eventName: string, event: TrackingPlanEventUpdate) {
    const startedAt = Date.now();
    log.assignContext({ eventName, projectId });
    log.info("started", { request: event });
    const response = await this.repository.updateEvent(projectId, eventName, event);

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: trackingPlanLogSummary(response)
    });
    return response;
  }

  @LogContextScope()
  async deleteEvent(projectId: string, eventName: string) {
    const startedAt = Date.now();
    log.assignContext({ eventName, projectId });
    log.info("started");
    const response = await this.repository.deleteEvent(projectId, eventName);

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: trackingPlanLogSummary(response)
    });
    return response;
  }

  @LogContextScope()
  async updateOrigins(projectId: string, origins: string[]) {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { allowedOriginCount: origins.length });
    const response = await this.repository.updateOrigins(projectId, origins);

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: trackingPlanLogSummary(response)
    });
    return response;
  }

  @LogContextScope()
  async publish(projectId: string, createdBy?: string) {
    const startedAt = Date.now();
    log.assignContext({ projectId, userId: createdBy });
    log.info("started");
    const response = await this.repository.publish(projectId, createdBy);

    log.info("tracking_plan_published", trackingPlanLogSummary(response));
    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: trackingPlanLogSummary(response)
    });
    return response;
  }

  @LogContextScope()
  async publishedSchema(projectId: string, revision?: number): Promise<SdkPublishedSchema> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { revision });
    const schema = await this.repository.getPublishedSchema(projectId, revision);
    if (!schema) {
      log.warn("published_schema_not_found", { revision });
      throw new NotFoundException("Published event schema was not found.");
    }

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: publishedSchemaLogSummary(schema)
    });
    return schema;
  }

  @LogContextScope()
  async validate(projectId: string): Promise<TrackingPlanValidation> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started");
    const plan = await this.repository.get(projectId);
    const issues: string[] = [];
    if (plan.allowedOrigins.length === 0) issues.push("At least one allowed Origin is required.");
    if (plan.events.length === 0) issues.push("At least one event is required.");
    const names = new Set<string>();
    for (const event of plan.events) {
      if (names.has(event.eventName)) issues.push(`Duplicate event name: ${event.eventName}`);
      names.add(event.eventName);
    }
    const response = { valid: issues.length === 0, issues };

    log.info("tracking_plan_validated", {
      issueCount: response.issues.length,
      valid: response.valid
    });
    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: { issueCount: response.issues.length, valid: response.valid }
    });
    return response;
  }

  @LogContextScope()
  async connection(sdkKey: string, request: PublicSdkRequestContext): Promise<SdkConnection> {
    const startedAt = Date.now();
    log.info("started", { request: publicSdkRequestLogSummary(request) });
    const published = await this.authorizePublicConnection(sdkKey, request);
    log.assignContext({ projectId: published.projectId });
    const response = {
      projectId: published.projectId,
      writeKey: published.writeKey,
      collectorUrl: COLLECTOR_URL,
      schemaVersion: published.schema.schemaVersion,
      schemaUrl: `${PUBLIC_API_BASE_URL}/${encodeURIComponent(sdkKey)}/schema`,
      revision: published.schema.revision,
      cacheTtlSeconds: CACHE_TTL_SECONDS,
      events: published.schema.events
    };

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: {
        cacheTtlSeconds: response.cacheTtlSeconds,
        eventCount: response.events.length,
        revision: response.revision,
        schemaVersion: response.schemaVersion
      }
    });
    return response;
  }

  @LogContextScope()
  async schema(sdkKey: string, request: PublicSdkRequestContext): Promise<SdkPublishedSchema> {
    const startedAt = Date.now();
    log.info("started", { request: publicSdkRequestLogSummary(request) });
    const published = await this.authorizePublicConnection(sdkKey, request);
    log.assignContext({ projectId: published.projectId });

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: publishedSchemaLogSummary(published.schema)
    });
    return published.schema;
  }

  private async authorizePublicConnection(sdkKey: string, request: PublicSdkRequestContext) {
    const published = await this.repository.getPublicConnection(sdkKey);
    const allowed =
      (request.origin && published.allowedOrigins.includes(request.origin)) ||
      isTrustedPlatformSdkRequest(request);
    if (!allowed) {
      log.assignContext({ projectId: published.projectId });
      log.warn("sdk_connection_forbidden", publicSdkRequestLogSummary(request));
      throw new ForbiddenException(
        "Origin is required and is not allowed for this SDK connection."
      );
    }
    return published;
  }
}

function trackingPlanLogSummary(plan: TrackingPlan) {
  return {
    allowedOriginCount: plan.allowedOrigins.length,
    currentRevision: plan.currentRevision,
    eventCount: plan.events.length,
    status: plan.status,
    trackingPlanId: plan.trackingPlanId
  };
}

function publishedSchemaLogSummary(schema: SdkPublishedSchema) {
  return {
    eventCount: schema.events.length,
    revision: schema.revision,
    schemaVersion: schema.schemaVersion
  };
}

function publicSdkRequestLogSummary(request: PublicSdkRequestContext) {
  return {
    hasOrigin: Boolean(request.origin),
    trustedPlatformRequest: isTrustedPlatformSdkRequest(request)
  };
}

function isTrustedPlatformSdkRequest(request: PublicSdkRequestContext) {
  if (request.origin === DASHBOARD_API_ORIGIN) return true;

  // Browsers omit Origin from same-origin GET requests. Restrict that case to
  // SDK initialization performed by the server-rendered redirect handoff page.
  if (request.origin || request.secFetchSite !== "same-origin" || !request.referer) return false;

  try {
    const referer = new URL(request.referer);
    return referer.origin === DASHBOARD_API_ORIGIN && /^\/r\/[^/]+\/?$/.test(referer.pathname);
  } catch {
    return false;
  }
}
