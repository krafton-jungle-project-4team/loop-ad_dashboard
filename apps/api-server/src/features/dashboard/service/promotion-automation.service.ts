import { hostname } from "node:os";
import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PromotionDispatchService } from "../../ad-execution/service/index.js";
import { LogContextScope, durationMs, log } from "../../../infra/logger/index.js";
import {
  DashboardPromotionAutomationRepository,
  type PromotionAutomationJob
} from "../repository/index.js";
import { DashboardQueryService } from "./dashboard-query.service.js";

const AUTOMATION_POLL_INTERVAL_MS = 5_000;
const AUTOMATION_LEASE_SECONDS = 120;
const AUTOMATION_CLAIM_LIMIT = 5;
const CAMPAIGN_COMPLETION_LIMIT = 20;

@Injectable()
export class PromotionAutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly workerId = `${hostname()}:${process.pid}`;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(DashboardPromotionAutomationRepository)
    private readonly repository: DashboardPromotionAutomationRepository,
    @Inject(DashboardQueryService)
    private readonly dashboardQuery: DashboardQueryService,
    @Inject(PromotionDispatchService)
    private readonly promotionDispatch: PromotionDispatchService
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.runOnce(), AUTOMATION_POLL_INTERVAL_MS);
    this.timer.unref();
    void this.runOnce();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  @LogContextScope()
  async runOnce() {
    log.assignContext({ workerId: this.workerId });
    if (this.running) {
      log.info("promotion_automation_poll_skipped", { reason: "poll_already_running" });
      return;
    }
    this.running = true;
    const startedAt = Date.now();
    try {
      const completedCampaigns =
        await this.repository.completeExpiredCampaigns(CAMPAIGN_COMPLETION_LIMIT);
      for (const campaign of completedCampaigns) {
        log.info("campaign_schedule_completed", {
          cancelledAutomationJobCount: campaign.cancelledAutomationJobCount,
          cancelledDispatchJobCount: campaign.cancelledDispatchJobCount,
          campaignId: campaign.campaignId,
          failedGenerationRunCount: campaign.failedGenerationRunCount,
          projectId: campaign.projectId,
          stoppedExperimentCount: campaign.stoppedExperimentCount,
          stoppedPromotionCount: campaign.stoppedPromotionCount,
          stoppedPromotionRunCount: campaign.stoppedPromotionRunCount,
          stoppedSegmentCount: campaign.stoppedSegmentCount
        });
      }
      const jobs = await this.repository.claimDueJobs({
        claimLimit: AUTOMATION_CLAIM_LIMIT,
        leaseSeconds: AUTOMATION_LEASE_SECONDS,
        workerId: this.workerId
      });
      if (jobs.length > 0) {
        log.info("promotion_automation_jobs_claimed", {
          durationMs: durationMs(startedAt),
          jobCount: jobs.length
        });
      }
      for (const job of jobs) {
        await this.processClaimedJob(job);
      }
    } catch (err) {
      log.error("promotion_automation_poll_failed", {
        durationMs: durationMs(startedAt),
        err
      });
    } finally {
      this.running = false;
    }
  }

  @LogContextScope()
  private async processClaimedJob(job: PromotionAutomationJob) {
    const startedAt = Date.now();
    log.assignContext({
      campaignId: job.campaignId,
      jobId: job.jobId,
      projectId: job.projectId,
      promotionId: job.promotionId,
      promotionRunId: job.promotionRunId
    });
    log.info("promotion_automation_job_started", {
      attemptCount: job.attemptCount,
      jobType: job.jobType,
      loopCount: job.loopCount
    });
    try {
      if (automationWindowClosed(job)) {
        log.info("promotion_automation_job_skipped", {
          reason: "promotion_window_closed"
        });
      } else if (job.jobType === "launch_run") {
        await this.launchRun(job);
      } else if (job.executionMode === "automatic") {
        await this.dashboardQuery.evaluatePromotionRun(job.projectId, job.promotionRunId);
      } else {
        log.info("promotion_automation_job_skipped", {
          reason: "execution_mode_changed_to_manual"
        });
      }

      await this.repository.completeJob(job);
      log.info("promotion_automation_job_completed", {
        durationMs: durationMs(startedAt),
        jobType: job.jobType
      });
    } catch (err) {
      const failure = await this.repository.failJob(job, err);
      log.error("promotion_automation_job_failed", {
        attemptCount: job.attemptCount,
        durationMs: durationMs(startedAt),
        err,
        jobType: job.jobType,
        nextStatus: failure?.status ?? "lease_lost"
      });
    }
  }

  private async launchRun(job: PromotionAutomationJob) {
    const experiments = await this.repository.listRunLaunchExperiments(
      job.projectId,
      job.promotionRunId
    );
    if (experiments.length === 0) {
      throw new Error("Automation launch found no assigned experiments.");
    }

    for (const experiment of experiments) {
      if (experiment.status === "running") {
        continue;
      }
      if (experiment.status !== "planned" && experiment.status !== "approved") {
        throw new Error(
          `Automation cannot launch experiment '${experiment.adExperimentId}' from '${experiment.status}'.`
        );
      }
      await this.dashboardQuery.startAdExperiment(
        job.projectId,
        experiment.promotionId,
        experiment.adExperimentId
      );
    }

    if (
      experiments.some(
        (experiment) => experiment.channel === "email" || experiment.channel === "sms"
      )
    ) {
      await this.promotionDispatch.dispatchPromotionRun(job.promotionRunId);
    }
    if (job.executionMode === "automatic") {
      await this.repository.scheduleRunEvaluation(job.promotionRunId);
    }
  }
}

function automationWindowClosed(job: PromotionAutomationJob) {
  return (
    job.promotionStatus === "stopped" ||
    Boolean(job.scheduledEndAt && Date.parse(job.scheduledEndAt) <= Date.now())
  );
}
