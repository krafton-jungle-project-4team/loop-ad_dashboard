import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query
} from "@nestjs/common";
import {
  AiJobAcceptedSchema,
  AiJobRequestSchema,
  AiJobResultSchema,
  ConversionReportSchema,
  DashboardOverviewSchema
} from "@loopad/shared";
import { success } from "../../../infra/http/api-response.js";
import { DashboardService } from "../service/dashboard.service.js";

@Controller()
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get("dashboard/overview")
  async overview(@Query("projectId") projectId?: string) {
    return success(DashboardOverviewSchema.parse(await this.dashboardService.overview(projectId)));
  }

  @Get("dashboard/conversion")
  async conversion(@Query("projectId") projectId?: string) {
    return success(ConversionReportSchema.parse(await this.dashboardService.conversion(projectId)));
  }

  @Post("dashboard/ai-jobs")
  async createAiJob(@Body() body: unknown) {
    const request = AiJobRequestSchema.parse(body);
    return success(AiJobAcceptedSchema.parse(await this.dashboardService.createAiJob(request)));
  }

  @Get("dashboard/ai-results/:resultId")
  async aiResult(@Param("resultId") resultId: string) {
    const result = await this.dashboardService.getAiResult(resultId);
    if (!result) {
      throw new NotFoundException("AI result not found.");
    }
    return success(AiJobResultSchema.parse(result));
  }
}
