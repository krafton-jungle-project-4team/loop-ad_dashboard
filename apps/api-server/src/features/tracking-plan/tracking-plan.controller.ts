import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post
} from "@nestjs/common";
import {
  SdkConnectionSchema,
  SdkPublishedSchemaSchema,
  SdkSettingsUpdateSchema,
  TrackingPlanCreateRequestSchema,
  TrackingPlanEventInputSchema,
  TrackingPlanEventUpdateSchema,
  TrackingPlanSchema,
  TrackingPlanValidationSchema
} from "@loopad/shared";
import { TrackingPlanService } from "./tracking-plan.service.js";

@Controller("dashboard/v1/projects/:projectId")
export class TrackingPlanController {
  constructor(@Inject(TrackingPlanService) private readonly service: TrackingPlanService) {}

  @Get("tracking-plan")
  async get(@Param("projectId") projectId: string) {
    return TrackingPlanSchema.parse(await this.service.get(projectId));
  }

  @Get("tracking-plan/published-schema")
  async publishedSchema(@Param("projectId") projectId: string) {
    return SdkPublishedSchemaSchema.parse(await this.service.publishedSchema(projectId));
  }

  @Get("tracking-plan/published-schema/:revision")
  async publishedSchemaRevision(
    @Param("projectId") projectId: string,
    @Param("revision", ParseIntPipe) revision: number
  ) {
    return SdkPublishedSchemaSchema.parse(await this.service.publishedSchema(projectId, revision));
  }

  @Post("tracking-plan")
  async create(@Param("projectId") projectId: string, @Body() body: unknown) {
    return TrackingPlanSchema.parse(
      await this.service.create(projectId, TrackingPlanCreateRequestSchema.parse(body ?? {}))
    );
  }

  @Post("tracking-plan/from-observed-events")
  async createFromObservedEvents(@Param("projectId") projectId: string) {
    return TrackingPlanSchema.parse(await this.service.createFromObservedEvents(projectId));
  }

  @Post("tracking-plan/events")
  async addEvent(@Param("projectId") projectId: string, @Body() body: unknown) {
    return TrackingPlanSchema.parse(
      await this.service.addEvent(projectId, TrackingPlanEventInputSchema.parse(body))
    );
  }

  @Patch("tracking-plan/events/:eventName")
  async updateEvent(
    @Param("projectId") projectId: string,
    @Param("eventName") eventName: string,
    @Body() body: unknown
  ) {
    return TrackingPlanSchema.parse(
      await this.service.updateEvent(
        projectId,
        eventName,
        TrackingPlanEventUpdateSchema.parse(body)
      )
    );
  }

  @Delete("tracking-plan/events/:eventName")
  async deleteEvent(@Param("projectId") projectId: string, @Param("eventName") eventName: string) {
    return TrackingPlanSchema.parse(await this.service.deleteEvent(projectId, eventName));
  }

  @Patch("sdk-settings")
  async updateSettings(@Param("projectId") projectId: string, @Body() body: unknown) {
    const request = SdkSettingsUpdateSchema.parse(body);
    return TrackingPlanSchema.parse(
      await this.service.updateOrigins(projectId, request.allowedOrigins)
    );
  }

  @Post("tracking-plan/validate")
  async validate(@Param("projectId") projectId: string) {
    return TrackingPlanValidationSchema.parse(await this.service.validate(projectId));
  }

  @Post("tracking-plan/publish")
  async publish(@Param("projectId") projectId: string, @Headers("x-user-id") userId?: string) {
    return TrackingPlanSchema.parse(await this.service.publish(projectId, userId));
  }
}

@Controller("public/v1/sdk/connections")
export class PublicSdkConnectionController {
  constructor(@Inject(TrackingPlanService) private readonly service: TrackingPlanService) {}

  @Get(":sdkKey")
  async connection(
    @Param("sdkKey") sdkKey: string,
    @Headers("origin") origin?: string,
    @Headers("referer") referer?: string,
    @Headers("sec-fetch-site") secFetchSite?: string
  ) {
    return SdkConnectionSchema.parse(
      await this.service.connection(sdkKey, { origin, referer, secFetchSite })
    );
  }

  @Get(":sdkKey/schema")
  async schema(
    @Param("sdkKey") sdkKey: string,
    @Headers("origin") origin?: string,
    @Headers("referer") referer?: string,
    @Headers("sec-fetch-site") secFetchSite?: string
  ) {
    return SdkPublishedSchemaSchema.parse(
      await this.service.schema(sdkKey, { origin, referer, secFetchSite })
    );
  }
}
