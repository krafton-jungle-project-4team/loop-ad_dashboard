import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { log } from "../logger/index.js";

type RequestWithKnownFields = {
  body?: unknown;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
};

const contextFieldNames = {
  ad_experiment_id: "adExperimentId",
  analysis_id: "analysisId",
  campaign_id: "campaignId",
  content_id: "contentId",
  content_option_id: "contentOptionId",
  funnel_id: "funnelId",
  generation_id: "generationId",
  placement_id: "placementId",
  project_id: "projectId",
  promotion_id: "promotionId",
  promotion_run_id: "promotionRunId",
  query_run_id: "queryRunId",
  redirectId: "redirectId",
  redirect_id: "redirectId",
  segment_id: "segmentId",
  thread_id: "threadId",
  user_id: "userId"
} as const;

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithKnownFields>();
    log.assignContext(readRequestContext(request));

    return next.handle();
  }
}

function readRequestContext(request: RequestWithKnownFields) {
  return {
    ...readKnownFields(request.query),
    ...readKnownFields(request.body),
    ...readKnownFields(request.params)
  };
}

function readKnownFields(source: unknown): Record<string, string> {
  if (!isRecord(source)) {
    return {};
  }

  const fields: Record<string, string> = {};

  for (const [sourceName, contextName] of Object.entries(contextFieldNames)) {
    const value = readStringField(source[sourceName]);

    if (value) {
      fields[contextName] = value;
    }
  }

  return fields;
}

function readStringField(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
