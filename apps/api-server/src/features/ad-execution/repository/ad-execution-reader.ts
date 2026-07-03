import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/index.js";
import type {
  ActiveAdServingAssignmentEntity,
  AdExecutionChannel,
  AdExperimentEntity,
  JsonObject,
  PromotionEntity,
  PromotionRunEntity,
  RedirectLinkEntity
} from "../domain/index.js";
import {
  findActiveBannerAssignment,
  findAdExperiment,
  findPromotion,
  findPromotionRun,
  findRedirectLinkByToken,
  listActiveAdServingAssignments,
  type IFindActiveBannerAssignmentResult,
  type IFindAdExperimentResult,
  type IFindPromotionResult,
  type IFindPromotionRunResult,
  type IFindRedirectLinkByTokenResult,
  type IListActiveAdServingAssignmentsResult
} from "../database/__generated__/ad-execution.queries.js";

@Injectable()
export class AdExecutionReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async findPromotionRun(promotionRunId: string): Promise<PromotionRunEntity | null> {
    const row = await this.db.query(findPromotionRun, { promotionRunId }).singleOrNull();

    return row ? toPromotionRun(row) : null;
  }

  async findPromotion(promotionId: string): Promise<PromotionEntity | null> {
    const row = await this.db.query(findPromotion, { promotionId }).singleOrNull();

    return row ? toPromotion(row) : null;
  }

  async findAdExperiment(adExperimentId: string): Promise<AdExperimentEntity | null> {
    const row = await this.db.query(findAdExperiment, { adExperimentId }).singleOrNull();

    return row ? toAdExperiment(row) : null;
  }

  async listDispatchAssignments(
    promotionRunId: string
  ): Promise<ActiveAdServingAssignmentEntity[]> {
    const rows = await this.db
      .query(listActiveAdServingAssignments, { promotionRunId })
      .multiple();

    return rows.map(toActiveAdServingAssignment);
  }

  async findBannerAssignment(params: {
    projectId: string;
    promotionRunId: string;
    userId: string;
  }): Promise<ActiveAdServingAssignmentEntity | null> {
    const row = await this.db
      .query(findActiveBannerAssignment, {
        projectId: params.projectId,
        promotionRunId: params.promotionRunId,
        userId: params.userId
      })
      .singleOrNull();

    return row ? toActiveAdServingAssignment(row) : null;
  }

  async findRedirectLink(redirectId: string): Promise<RedirectLinkEntity | null> {
    const row = await this.db.query(findRedirectLinkByToken, { redirectId }).singleOrNull();

    return row ? toRedirectLink(row) : null;
  }
}

function toPromotionRun(row: IFindPromotionRunResult): PromotionRunEntity {
  return {
    promotionRunId: requiredString(row.promotionRunId, "promotionRunId"),
    projectId: requiredString(row.projectId, "projectId"),
    campaignId: requiredString(row.campaignId, "campaignId"),
    promotionId: requiredString(row.promotionId, "promotionId"),
    analysisId: requiredString(row.analysisId, "analysisId"),
    generationId: requiredString(row.generationId, "generationId"),
    previousPromotionRunId: row.previousPromotionRunId ?? null,
    loopCount: requiredNumber(row.loopCount, "loopCount"),
    operatorInstruction: row.operatorInstruction ?? null,
    status: requiredString(row.status, "status"),
    summaryJson: requiredJsonObject(row.summaryJson, "summaryJson"),
    startedAt: toOptionalDate(row.startedAt),
    endedAt: toOptionalDate(row.endedAt),
    createdAt: toDate(row.createdAt, "createdAt"),
    updatedAt: toDate(row.updatedAt, "updatedAt")
  };
}

function toPromotion(row: IFindPromotionResult): PromotionEntity {
  return {
    promotionId: requiredString(row.promotionId, "promotionId"),
    projectId: requiredString(row.projectId, "projectId"),
    campaignId: requiredString(row.campaignId, "campaignId"),
    name: requiredString(row.name, "name"),
    channel: toAdExecutionChannel(row.channel),
    targetAudience: requiredString(row.targetAudience, "targetAudience"),
    goalMetric: requiredString(row.goalMetric, "goalMetric"),
    targetValue: requiredString(row.targetValue, "targetValue"),
    goalBasis: requiredString(row.goalBasis, "goalBasis"),
    status: requiredString(row.status, "status"),
    metadataJson: requiredJsonObject(row.metadataJson, "metadataJson"),
    createdAt: toDate(row.createdAt, "createdAt"),
    updatedAt: toDate(row.updatedAt, "updatedAt")
  };
}

function toAdExperiment(row: IFindAdExperimentResult): AdExperimentEntity {
  return {
    adExperimentId: requiredString(row.adExperimentId, "adExperimentId"),
    projectId: requiredString(row.projectId, "projectId"),
    campaignId: requiredString(row.campaignId, "campaignId"),
    promotionId: requiredString(row.promotionId, "promotionId"),
    promotionRunId: requiredString(row.promotionRunId, "promotionRunId"),
    analysisId: requiredString(row.analysisId, "analysisId"),
    generationId: requiredString(row.generationId, "generationId"),
    segmentId: requiredString(row.segmentId, "segmentId"),
    segmentName: row.segmentName ?? null,
    contentId: requiredString(row.contentId, "contentId"),
    contentOptionId: requiredString(row.contentOptionId, "contentOptionId"),
    channel: toAdExecutionChannel(row.channel),
    loopCount: requiredNumber(row.loopCount, "loopCount"),
    status: requiredString(row.status, "status"),
    goalMetric: requiredString(row.goalMetric, "goalMetric"),
    goalTargetValue: requiredString(row.goalTargetValue, "goalTargetValue"),
    goalBasis: requiredString(row.goalBasis, "goalBasis"),
    startedAt: toOptionalDate(row.startedAt),
    endedAt: toOptionalDate(row.endedAt),
    createdAt: toDate(row.createdAt, "createdAt"),
    updatedAt: toDate(row.updatedAt, "updatedAt")
  };
}

function toActiveAdServingAssignment(
  row: IListActiveAdServingAssignmentsResult | IFindActiveBannerAssignmentResult
): ActiveAdServingAssignmentEntity {
  return {
    promotionRunId: requiredString(row.promotionRunId, "promotionRunId"),
    userId: requiredString(row.userId, "userId"),
    segmentId: requiredString(row.segmentId, "segmentId"),
    adExperimentId: requiredString(row.adExperimentId, "adExperimentId"),
    contentId: requiredString(row.contentId, "contentId"),
    contentOptionId: requiredString(row.contentOptionId, "contentOptionId"),
    fallback: requiredBoolean(row.fallback, "fallback"),
    similarityScore: row.similarityScore ?? null,
    projectId: requiredString(row.projectId, "projectId"),
    campaignId: requiredString(row.campaignId, "campaignId"),
    promotionId: requiredString(row.promotionId, "promotionId"),
    channel: toAdExecutionChannel(row.channel),
    subject: row.subject ?? null,
    preheader: row.preheader ?? null,
    title: row.title ?? null,
    body: row.body ?? null,
    cta: row.cta ?? null,
    message: row.message ?? null,
    imagePrompt: row.imagePrompt ?? null,
    landingUrl: row.landingUrl ?? null,
    contentStatus: requiredString(row.contentStatus, "contentStatus"),
    adExperimentStatus: requiredString(row.adExperimentStatus, "adExperimentStatus")
  };
}

function toRedirectLink(row: IFindRedirectLinkByTokenResult): RedirectLinkEntity {
  return {
    redirectLinkId: requiredString(row.redirectLinkId, "redirectLinkId"),
    projectId: requiredString(row.projectId, "projectId"),
    campaignId: requiredString(row.campaignId, "campaignId"),
    promotionId: requiredString(row.promotionId, "promotionId"),
    promotionRunId: requiredString(row.promotionRunId, "promotionRunId"),
    adExperimentId: row.adExperimentId ?? null,
    segmentId: row.segmentId ?? null,
    userId: row.userId ?? null,
    contentId: row.contentId ?? null,
    contentOptionId: row.contentOptionId ?? null,
    redirectToken: requiredString(row.redirectToken, "redirectToken"),
    destinationUrl: requiredString(row.destinationUrl, "destinationUrl"),
    status: requiredString(row.status, "status"),
    metadataJson: requiredJsonObject(row.metadataJson, "metadataJson"),
    expiresAt: toOptionalDate(row.expiresAt),
    clickedAt: toOptionalDate(row.clickedAt),
    createdAt: toDate(row.createdAt, "createdAt"),
    updatedAt: toDate(row.updatedAt, "updatedAt")
  };
}

function requiredString(value: string | null | undefined, field: string): string {
  if (!value) {
    throw new Error(`Ad execution entity is missing ${field}.`);
  }

  return value;
}

function requiredNumber(value: number | null | undefined, field: string): number {
  if (value === null || value === undefined) {
    throw new Error(`Ad execution entity is missing ${field}.`);
  }

  return value;
}

function requiredBoolean(value: boolean | null | undefined, field: string): boolean {
  if (value === null || value === undefined) {
    throw new Error(`Ad execution entity is missing ${field}.`);
  }

  return value;
}

function toAdExecutionChannel(value: string | null | undefined): AdExecutionChannel {
  if (value === "email" || value === "sms" || value === "onsite_banner") {
    return value;
  }

  throw new Error(`Unsupported ad execution channel '${value ?? ""}'.`);
}

function requiredJsonObject(value: unknown, field: string): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }

  throw new Error(`Ad execution entity is missing ${field}.`);
}

function toDate(value: Date | string | null | undefined, field: string): Date {
  if (!value) {
    throw new Error(`Ad execution entity is missing ${field}.`);
  }

  return value instanceof Date ? value : new Date(value);
}

function toOptionalDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}
