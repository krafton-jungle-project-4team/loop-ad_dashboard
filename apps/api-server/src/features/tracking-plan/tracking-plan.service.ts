import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type {
  SdkConnection,
  SdkPublishedSchema,
  TrackingPlanCreateRequest,
  TrackingPlanEventInput,
  TrackingPlanEventUpdate,
  TrackingPlanValidation
} from "@loopad/shared";
import { TrackingPlanObservedEventReader } from "./tracking-plan-observed-event-reader.js";
import { TrackingPlanRepository } from "./tracking-plan.repository.js";

const COLLECTOR_URL = "https://event.api.dev.loop-ad.org/events";
const PUBLIC_API_BASE_URL = "https://dashboard.api.dev.loop-ad.org/api/public/v1/sdk/connections";
const CACHE_TTL_SECONDS = 60;
const DEMO_SITE_ORIGIN = "https://demo-shoppingmall.dev.loop-ad.org";

@Injectable()
export class TrackingPlanService {
  constructor(
    @Inject(TrackingPlanRepository) private readonly repository: TrackingPlanRepository,
    @Inject(TrackingPlanObservedEventReader)
    private readonly observedEventReader: TrackingPlanObservedEventReader
  ) {}

  get(projectId: string) {
    return this.repository.get(projectId);
  }
  create(projectId: string, request: TrackingPlanCreateRequest) {
    return this.repository.create(projectId, request.name, request.allowedOrigins);
  }
  async createFromObservedEvents(projectId: string) {
    const events = await this.observedEventReader.inferEvents(projectId);
    if (events.length === 0) {
      throw new BadRequestException("최근 30일 동안 수집된 이벤트가 없습니다.");
    }
    return this.repository.create(projectId, "Demo Site Tracking Plan", [DEMO_SITE_ORIGIN], events);
  }
  addEvent(projectId: string, event: TrackingPlanEventInput) {
    return this.repository.addEvent(projectId, event);
  }
  updateEvent(projectId: string, eventName: string, event: TrackingPlanEventUpdate) {
    return this.repository.updateEvent(projectId, eventName, event);
  }
  deleteEvent(projectId: string, eventName: string) {
    return this.repository.deleteEvent(projectId, eventName);
  }
  updateOrigins(projectId: string, origins: string[]) {
    return this.repository.updateOrigins(projectId, origins);
  }
  publish(projectId: string, createdBy?: string) {
    return this.repository.publish(projectId, createdBy);
  }

  async validate(projectId: string): Promise<TrackingPlanValidation> {
    const plan = await this.repository.get(projectId);
    const issues: string[] = [];
    if (plan.allowedOrigins.length === 0) issues.push("At least one allowed Origin is required.");
    if (plan.events.length === 0) issues.push("At least one event is required.");
    const names = new Set<string>();
    for (const event of plan.events) {
      if (names.has(event.eventName)) issues.push(`Duplicate event name: ${event.eventName}`);
      names.add(event.eventName);
    }
    return { valid: issues.length === 0, issues };
  }

  async connection(sdkKey: string, origin: string | undefined): Promise<SdkConnection> {
    const published = await this.authorizePublicConnection(sdkKey, origin);
    return {
      projectId: published.projectId,
      writeKey: published.writeKey,
      collectorUrl: COLLECTOR_URL,
      schemaVersion: published.schema.schemaVersion,
      schemaUrl: `${PUBLIC_API_BASE_URL}/${encodeURIComponent(sdkKey)}/schema`,
      revision: published.schema.revision,
      cacheTtlSeconds: CACHE_TTL_SECONDS,
      events: published.schema.events
    };
  }

  async schema(sdkKey: string, origin: string | undefined): Promise<SdkPublishedSchema> {
    return (await this.authorizePublicConnection(sdkKey, origin)).schema;
  }

  private async authorizePublicConnection(sdkKey: string, origin: string | undefined) {
    const published = await this.repository.getPublicConnection(sdkKey);
    if (!origin || !published.allowedOrigins.includes(origin)) {
      throw new ForbiddenException(
        "Origin is required and is not allowed for this SDK connection."
      );
    }
    return published;
  }
}
