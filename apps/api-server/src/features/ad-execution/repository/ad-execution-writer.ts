import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/index.js";
import type { DispatchChannel, DispatchJobStatus } from "../domain/index.js";
import {
  insertDispatchJob,
  insertRedirectLink,
  updateDispatchJobResult
} from "../database/__generated__/ad-execution.queries.js";

export interface InsertDispatchJobInput {
  dispatchJobId: string;
  projectId: string;
  campaignId: string;
  promotionId: string;
  promotionRunId: string;
  adExperimentId: string;
  channel: DispatchChannel;
  provider: string;
  targetCount: number;
  metadata: unknown;
}

export interface FinishDispatchJobInput {
  dispatchJobId: string;
  status: Extract<DispatchJobStatus, "completed" | "failed">;
  dispatchedCount: number;
  failedCount: number;
  metadata: unknown;
}

export interface InsertRedirectLinkInput {
  redirectId: string;
  projectId: string;
  campaignId: string;
  promotionId: string;
  promotionRunId: string;
  adExperimentId: string;
  segmentId: string;
  userId: string;
  contentId: string;
  contentOptionId: string;
  targetUrl: string;
  expiresAt: Date;
}

@Injectable()
export class AdExecutionWriter {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async insertDispatchJob(input: InsertDispatchJobInput): Promise<string> {
    const row = await this.db
      .query(insertDispatchJob, {
        dispatchJobId: input.dispatchJobId,
        projectId: input.projectId,
        campaignId: input.campaignId,
        promotionId: input.promotionId,
        promotionRunId: input.promotionRunId,
        adExperimentId: input.adExperimentId,
        channel: input.channel,
        provider: input.provider,
        targetCount: input.targetCount,
        metadataJson: JSON.stringify(input.metadata)
      })
      .single();

    return row.dispatchJobId;
  }

  async finishDispatchJob(input: FinishDispatchJobInput): Promise<void> {
    await this.db
      .query(updateDispatchJobResult, {
        dispatchJobId: input.dispatchJobId,
        status: input.status,
        dispatchedCount: input.dispatchedCount,
        failedCount: input.failedCount,
        metadataJson: JSON.stringify(input.metadata)
      })
      .single();
  }

  async insertRedirectLink(input: InsertRedirectLinkInput): Promise<string> {
    const row = await this.db
      .query(insertRedirectLink, {
        redirectId: input.redirectId,
        projectId: input.projectId,
        campaignId: input.campaignId,
        promotionId: input.promotionId,
        promotionRunId: input.promotionRunId,
        adExperimentId: input.adExperimentId,
        segmentId: input.segmentId,
        userId: input.userId,
        contentId: input.contentId,
        contentOptionId: input.contentOptionId,
        targetUrl: input.targetUrl,
        expiresAt: input.expiresAt.toISOString()
      })
      .single();

    return row.redirectId;
  }
}
