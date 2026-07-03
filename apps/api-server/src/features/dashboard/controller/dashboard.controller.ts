import { Controller, Get, Inject, Query } from "@nestjs/common";
import { DashboardMainSchema } from "@loopad/shared";
import { dashboardErrors } from "../dashboard-errors.js";
import { DashboardQueryService } from "../service/index.js";

@Controller()
export class DashboardController {
  constructor(
    @Inject(DashboardQueryService)
    private readonly dashboardQuery: DashboardQueryService
  ) {}

  @Get("api/dashboard/v1/main")
  async main(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardMainSchema.parse(await this.dashboardQuery.main(requiredProjectId));
  }
}

function requireProjectId(projectId: string | undefined): string {
  if (!projectId) {
    throw dashboardErrors.projectIdRequired();
  }
  return projectId;
}
