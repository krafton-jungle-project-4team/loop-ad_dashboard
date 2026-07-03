import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import {
  DashboardCreateFunnelRequestSchema,
  DashboardEventCatalogSchema,
  DashboardFunnelListSchema,
  DashboardFunnelSchema,
  DashboardMainSchema
} from "@loopad/shared";
import { dashboardErrors } from "../dashboard-errors.js";
import { DashboardQueryService } from "../service/index.js";

@Controller("dashboard/v1")
export class DashboardController {
  constructor(
    @Inject(DashboardQueryService)
    private readonly dashboardQuery: DashboardQueryService
  ) {}

  @Get("main")
  async main(@Query("project_id") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardMainSchema.parse(await this.dashboardQuery.main(requiredProjectId));
  }

  @Get("funnels")
  async funnels(@Query("project_id") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardFunnelListSchema.parse(await this.dashboardQuery.funnels(requiredProjectId));
  }

  @Get("event-catalog")
  async eventCatalog(@Query("project_id") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardEventCatalogSchema.parse(
      await this.dashboardQuery.eventCatalog(requiredProjectId)
    );
  }

  @Post("funnels")
  async createFunnel(@Query("project_id") projectId: string | undefined, @Body() body: unknown) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardCreateFunnelRequestSchema.parse(body);
    return DashboardFunnelSchema.parse(
      await this.dashboardQuery.createFunnel(requiredProjectId, request)
    );
  }
}

function requireProjectId(projectId: string | undefined): string {
  if (!projectId) {
    throw dashboardErrors.projectIdRequired();
  }
  return projectId;
}
