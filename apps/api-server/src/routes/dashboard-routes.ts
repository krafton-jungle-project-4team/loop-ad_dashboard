import { Router } from "express";
import {
  CreativeReportSchema,
  ConversionReportSchema,
  DashboardOverviewSchema,
  InsightReportSchema,
  RecommendationReportSchema
} from "@loopad/shared";
import {
  conversion,
  creatives,
  insights,
  overview,
  recommendations
} from "../analytics/reports.js";
import { env } from "../config/env.js";
import { projectId, success } from "../utils/http.js";

export function dashboardRoutes() {
  const router = Router();

  router.get("/health", (_request, response) => response.json(success({ status: "ok" })));
  router.get("/dashboard/overview", async (request, response, next) => {
    try {
      response.json(
        success(DashboardOverviewSchema.parse(await overview(projectId(request, env.projectId))))
      );
    } catch (error) {
      next(error);
    }
  });
  router.get("/dashboard/conversion", async (request, response, next) => {
    try {
      response.json(
        success(ConversionReportSchema.parse(await conversion(projectId(request, env.projectId))))
      );
    } catch (error) {
      next(error);
    }
  });
  router.get("/dashboard/ai-insights", async (request, response, next) => {
    try {
      response.json(
        success(InsightReportSchema.parse(await insights(projectId(request, env.projectId))))
      );
    } catch (error) {
      next(error);
    }
  });
  router.get("/dashboard/ai-recommendations", async (request, response, next) => {
    try {
      response.json(
        success(
          RecommendationReportSchema.parse(await recommendations(projectId(request, env.projectId)))
        )
      );
    } catch (error) {
      next(error);
    }
  });
  router.get("/creatives/generated", async (request, response, next) => {
    try {
      response.json(
        success(CreativeReportSchema.parse(await creatives(projectId(request, env.projectId))))
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
