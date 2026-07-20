import { randomUUID } from "node:crypto";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import {
  claimDashboardPromotionAutomationJobs,
  cancelPendingDashboardPromotionRunEvaluation,
  completeExpiredDashboardCampaigns,
  completeDashboardPromotionAutomationJob,
  failDashboardPromotionAutomationJob,
  getDashboardPromotionRunAutomationConfig,
  listDashboardPromotionRunLaunchExperiments,
  scheduleDashboardPromotionRunEvaluation,
  scheduleDashboardPromotionRunLaunch,
  syncPendingDashboardPromotionAutomationJobs,
  type IClaimDashboardPromotionAutomationJobsResult,
  type IGetDashboardPromotionRunAutomationConfigResult
} from "../database/__generated__/promotion-automation.queries.js";

export type PromotionRunActivation = {
  activationStatus: "automatic_start_queued" | "manual_start_required" | "scheduled";
  scheduledStartAt: string | null;
};

export type PromotionAutomationConfig = {
  executionMode: "automatic" | "manual";
  loopCount: number;
  loopIntervalUnit: "day" | "hour";
  loopIntervalValue: number;
  maxLoopCount: number;
  projectId: string;
  promotionId: string;
  promotionRunId: string;
  promotionRunStatus: string;
  promotionStatus: string;
  scheduledEndAt: string | null;
  scheduledStartAt: string | null;
};

export type PromotionAutomationJob = PromotionAutomationConfig & {
  attemptCount: number;
  campaignId: string;
  jobId: string;
  jobType: "evaluate_run" | "launch_run";
  leaseToken: string;
  scheduledAt: string;
};

export type PromotionRunLaunchExperiment = {
  adExperimentId: string;
  channel: string;
  isFallback: boolean;
  promotionId: string;
  segmentId: string;
  status: string;
};

export type CompletedCampaign = {
  campaignId: string;
  projectId: string;
};

@Injectable()
export class DashboardPromotionAutomationRepository {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async scheduleRunLaunch(
    projectId: string,
    promotionRunId: string
  ): Promise<PromotionRunActivation> {
    const row = await this.db
      .query(scheduleDashboardPromotionRunLaunch, {
        jobId: `automation_${randomUUID()}`,
        projectId,
        promotionRunId
      })
      .single();

    if (row.scheduleExpired) {
      throw new Error("프로모션 종료 시간이 지나 실험을 시작할 수 없습니다.");
    }
    if (!row.jobId) {
      return { activationStatus: "manual_start_required", scheduledStartAt: null };
    }

    const scheduledStartAt = row.jobScheduledAt?.toISOString() ?? null;
    const isFuture = Boolean(row.scheduledStartAt && row.scheduledStartAt.getTime() > Date.now());
    return {
      activationStatus: isFuture ? "scheduled" : "automatic_start_queued",
      scheduledStartAt
    };
  }

  async completeExpiredCampaigns(campaignLimit: number): Promise<CompletedCampaign[]> {
    const rows = await this.db
      .query(completeExpiredDashboardCampaigns, { campaignLimit })
      .multiple();
    return rows.map((row) => ({
      campaignId: row.campaignId,
      projectId: row.projectId
    }));
  }

  async scheduleRunEvaluation(promotionRunId: string) {
    const row = await this.db
      .query(scheduleDashboardPromotionRunEvaluation, {
        jobId: `automation_${randomUUID()}`,
        promotionRunId
      })
      .singleOrNull();
    return row ? { jobId: row.jobId, scheduledAt: row.scheduledAt.toISOString() } : null;
  }

  async cancelPendingRunEvaluation(promotionRunId: string) {
    return this.db
      .query(cancelPendingDashboardPromotionRunEvaluation, { promotionRunId })
      .singleOrNull();
  }

  async syncPendingJobs(projectId: string, promotionId: string) {
    return this.db
      .query(syncPendingDashboardPromotionAutomationJobs, { projectId, promotionId })
      .multiple();
  }

  async claimDueJobs(input: {
    claimLimit: number;
    leaseSeconds: number;
    workerId: string;
  }): Promise<PromotionAutomationJob[]> {
    const rows = await this.db
      .query(claimDashboardPromotionAutomationJobs, {
        claimLimit: input.claimLimit,
        leaseSeconds: input.leaseSeconds,
        leaseToken: randomUUID(),
        workerId: input.workerId
      })
      .multiple();
    return rows.map(toAutomationJob);
  }

  async completeJob(job: Pick<PromotionAutomationJob, "jobId" | "leaseToken">) {
    return this.db
      .query(completeDashboardPromotionAutomationJob, {
        jobId: job.jobId,
        leaseToken: job.leaseToken
      })
      .singleOrNull();
  }

  async failJob(job: Pick<PromotionAutomationJob, "jobId" | "leaseToken">, error: unknown) {
    const detail = error instanceof Error ? error.message : "unknown automation error";
    const code = error instanceof Error ? error.name : "UnknownError";
    return this.db
      .query(failDashboardPromotionAutomationJob, {
        errorCode: code.slice(0, 100),
        errorDetail: detail.slice(0, 2_000),
        jobId: job.jobId,
        leaseToken: job.leaseToken,
        maxAttempts: 3,
        retryDelaySeconds: 30
      })
      .singleOrNull();
  }

  async listRunLaunchExperiments(
    projectId: string,
    promotionRunId: string
  ): Promise<PromotionRunLaunchExperiment[]> {
    const rows = await this.db
      .query(listDashboardPromotionRunLaunchExperiments, { projectId, promotionRunId })
      .multiple();
    return rows.map((row) => ({
      adExperimentId: row.adExperimentId,
      channel: row.channel,
      isFallback: row.isFallback ?? false,
      promotionId: row.promotionId,
      segmentId: row.segmentId,
      status: row.status
    }));
  }

  async getRunConfig(
    projectId: string,
    promotionRunId: string
  ): Promise<PromotionAutomationConfig> {
    const row = await this.db
      .query(getDashboardPromotionRunAutomationConfig, { projectId, promotionRunId })
      .single();
    return toAutomationConfig(row);
  }
}

function toAutomationJob(row: IClaimDashboardPromotionAutomationJobsResult) {
  if ((row.jobType !== "launch_run" && row.jobType !== "evaluate_run") || !row.leaseToken) {
    throw new Error("Claimed promotion automation job has an invalid contract.");
  }
  return {
    ...toAutomationConfig(row),
    attemptCount: row.attemptCount,
    campaignId: row.campaignId,
    jobId: row.jobId,
    jobType: row.jobType,
    leaseToken: row.leaseToken,
    scheduledAt: row.scheduledAt.toISOString()
  } satisfies PromotionAutomationJob;
}

function toAutomationConfig(
  row:
    | IGetDashboardPromotionRunAutomationConfigResult
    | IClaimDashboardPromotionAutomationJobsResult
): PromotionAutomationConfig {
  if (
    (row.executionMode !== "manual" && row.executionMode !== "automatic") ||
    (row.loopIntervalUnit !== "hour" && row.loopIntervalUnit !== "day") ||
    !row.promotionStatus
  ) {
    throw new Error("Promotion automation configuration has an invalid contract.");
  }
  return {
    executionMode: row.executionMode,
    loopCount: row.loopCount,
    loopIntervalUnit: row.loopIntervalUnit,
    loopIntervalValue: row.loopIntervalValue,
    maxLoopCount: row.maxLoopCount,
    projectId: row.projectId,
    promotionId: row.promotionId,
    promotionRunId: row.promotionRunId,
    promotionRunStatus: row.promotionRunStatus,
    promotionStatus: row.promotionStatus,
    scheduledEndAt: row.scheduledEndAt?.toISOString() ?? null,
    scheduledStartAt: row.scheduledStartAt?.toISOString() ?? null
  };
}
