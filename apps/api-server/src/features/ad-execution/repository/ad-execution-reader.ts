import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/index.js";
import type {
  ActiveAssignmentSnapshot,
  AdExecutionChannel,
  BannerAssignmentSnapshot,
  PromotionRunExecutionContextSnapshot,
  RedirectLinkSnapshot
} from "../domain/index.js";
import {
  findBannerAssignment,
  findRedirectLink,
  getPromotionRunExecutionContext,
  listDispatchAssignments,
  type IFindBannerAssignmentResult,
  type IFindRedirectLinkResult,
  type IGetPromotionRunExecutionContextResult,
  type IListDispatchAssignmentsResult
} from "../database/__generated__/ad-execution.queries.js";

@Injectable()
export class AdExecutionReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async findPromotionRunContext(
    promotionRunId: string
  ): Promise<PromotionRunExecutionContextSnapshot | null> {
    const row = await this.db
      .query(getPromotionRunExecutionContext, { promotionRunId })
      .singleOrNull();

    return row ? toPromotionRunContext(row) : null;
  }

  async listDispatchAssignments(promotionRunId: string): Promise<ActiveAssignmentSnapshot[]> {
    const rows = await this.db.query(listDispatchAssignments, { promotionRunId }).multiple();

    return rows.map(toActiveAssignment);
  }

  async findBannerAssignment(params: {
    projectId: string;
    promotionRunId: string;
    userId: string;
  }): Promise<BannerAssignmentSnapshot | null> {
    const row = await this.db
      .query(findBannerAssignment, {
        projectId: params.projectId,
        promotionRunId: params.promotionRunId,
        userId: params.userId
      })
      .singleOrNull();

    return row ? toBannerAssignment(row) : null;
  }

  async findRedirectLink(redirectId: string): Promise<RedirectLinkSnapshot | null> {
    const row = await this.db.query(findRedirectLink, { redirectId }).singleOrNull();

    return row ? toRedirectLink(row) : null;
  }
}

function toPromotionRunContext(
  row: IGetPromotionRunExecutionContextResult
): PromotionRunExecutionContextSnapshot {
  return {
    promotionRunId: requiredString(row.promotionRunId, "promotionRunId"),
    projectId: requiredString(row.projectId, "projectId"),
    campaignId: requiredString(row.campaignId, "campaignId"),
    promotionId: requiredString(row.promotionId, "promotionId"),
    promotionRunStatus: requiredString(row.promotionRunStatus, "promotionRunStatus"),
    channel: toAdExecutionChannel(row.channel)
  };
}

function toActiveAssignment(row: IListDispatchAssignmentsResult): ActiveAssignmentSnapshot {
  return {
    promotionRunId: requiredString(row.promotionRunId, "promotionRunId"),
    projectId: requiredString(row.projectId, "projectId"),
    campaignId: requiredString(row.campaignId, "campaignId"),
    promotionId: requiredString(row.promotionId, "promotionId"),
    userId: requiredString(row.userId, "userId"),
    segmentId: requiredString(row.segmentId, "segmentId"),
    adExperimentId: requiredString(row.adExperimentId, "adExperimentId"),
    contentId: requiredString(row.contentId, "contentId"),
    contentOptionId: requiredString(row.contentOptionId, "contentOptionId"),
    channel: toAdExecutionChannel(row.channel),
    subject: row.subject ?? "",
    preheader: row.preheader ?? "",
    title: row.title ?? "",
    body: row.body ?? "",
    cta: row.cta ?? "",
    message: row.message ?? "",
    targetUrl: requiredString(row.targetUrl, "targetUrl")
  };
}

function toBannerAssignment(row: IFindBannerAssignmentResult): BannerAssignmentSnapshot {
  return {
    promotionRunId: requiredString(row.promotionRunId, "promotionRunId"),
    segmentId: requiredString(row.segmentId, "segmentId"),
    adExperimentId: requiredString(row.adExperimentId, "adExperimentId"),
    contentId: requiredString(row.contentId, "contentId"),
    contentOptionId: requiredString(row.contentOptionId, "contentOptionId"),
    title: row.title ?? "",
    body: row.body ?? "",
    cta: row.cta ?? "",
    targetUrl: requiredString(row.targetUrl, "targetUrl")
  };
}

function toRedirectLink(row: IFindRedirectLinkResult): RedirectLinkSnapshot {
  return {
    redirectId: requiredString(row.redirectId, "redirectId"),
    projectId: requiredString(row.projectId, "projectId"),
    campaignId: requiredString(row.campaignId, "campaignId"),
    promotionId: requiredString(row.promotionId, "promotionId"),
    promotionRunId: requiredString(row.promotionRunId, "promotionRunId"),
    adExperimentId: requiredString(row.adExperimentId, "adExperimentId"),
    segmentId: requiredString(row.segmentId, "segmentId"),
    userId: requiredString(row.userId, "userId"),
    contentId: requiredString(row.contentId, "contentId"),
    contentOptionId: requiredString(row.contentOptionId, "contentOptionId"),
    targetUrl: requiredString(row.targetUrl, "targetUrl"),
    expiresAt: toOptionalDate(row.expiresAt),
    promotionChannel: toAdExecutionChannel(row.promotionChannel)
  };
}

function requiredString(value: string | null | undefined, field: string): string {
  if (!value) {
    throw new Error(`Ad execution read model is missing ${field}.`);
  }

  return value;
}

function toAdExecutionChannel(value: string | null | undefined): AdExecutionChannel {
  if (value === "email" || value === "sms" || value === "onsite_banner") {
    return value;
  }

  throw new Error(`Unsupported ad execution channel '${value ?? ""}'.`);
}

function toOptionalDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}
