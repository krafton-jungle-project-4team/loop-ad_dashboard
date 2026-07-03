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
  request: unknown;
}

export interface FinishDispatchJobInput {
  dispatchJobId: string;
  status: Extract<DispatchJobStatus, "completed" | "failed">;
  dispatchedCount: number;
  failedCount: number;
  result: unknown;
}

export interface InsertRedirectLinkInput {
  redirectLinkId: string;
  redirectToken: string;
  projectId: string;
  campaignId: string;
  promotionId: string;
  promotionRunId: string;
  adExperimentId: string;
  segmentId: string;
  userId: string;
  contentId: string;
  contentOptionId: string;
  destinationUrl: string;
  metadata: unknown;
  expiresAt: Date;
}

/** 광고 실행 중 생성되는 job과 redirect link를 저장합니다. */
@Injectable()
export class AdExecutionWriter {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  /** ad_experiment 그룹 단위 dispatch job을 생성합니다. */
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
        targetCount: input.targetCount,
        requestJson: JSON.stringify({
          provider: input.provider,
          ...toJsonObject(input.request)
        })
      })
      .single();

    return row.dispatchJobId;
  }

  /** dispatch job 결과와 성공/실패 수를 저장합니다. */
  async finishDispatchJob(input: FinishDispatchJobInput): Promise<void> {
    await this.db
      .query(updateDispatchJobResult, {
        dispatchJobId: input.dispatchJobId,
        status: input.status,
        dispatchedCount: input.dispatchedCount,
        failedCount: input.failedCount,
        resultJson: JSON.stringify(input.result)
      })
      .single();
  }

  /** 사용자별 redirect link를 생성합니다. */
  async insertRedirectLink(input: InsertRedirectLinkInput): Promise<string> {
    const row = await this.db
      .query(insertRedirectLink, {
        redirectLinkId: input.redirectLinkId,
        projectId: input.projectId,
        campaignId: input.campaignId,
        promotionId: input.promotionId,
        promotionRunId: input.promotionRunId,
        adExperimentId: input.adExperimentId,
        segmentId: input.segmentId,
        userId: input.userId,
        contentId: input.contentId,
        contentOptionId: input.contentOptionId,
        redirectToken: input.redirectToken,
        destinationUrl: input.destinationUrl,
        metadataJson: JSON.stringify(input.metadata),
        expiresAt: input.expiresAt.toISOString()
      })
      .single();

    return row.redirectId;
  }
}

function toJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
