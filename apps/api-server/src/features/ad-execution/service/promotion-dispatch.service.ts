import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { DispatchJobSummary, PromotionRunDispatchResponse } from "@loopad/shared";
import { z } from "zod";
import { env } from "../../../infra/env/env.js";
import { adExecutionErrors } from "../ad-execution-errors.js";
import { AssignmentDispatcher } from "../dispatch/assignment-dispatcher.js";
import {
  AdExecutionDomain,
  type ActiveAdServingAssignmentEntity,
  type DispatchAttemptSnapshot,
  type DispatchChannel,
  type DispatchJobStatus,
  type PromotionRunEntity
} from "../domain/index.js";
import { AdExecutionReader, AdExecutionWriter } from "../repository/index.js";

const LOCAL_DASHBOARD_PUBLIC_BASE_URL = "http://localhost:8080";
const DEV_DASHBOARD_PUBLIC_BASE_URL = "https://dashboard.api.dev.loop-ad.org";
const requiredContentTextSchema = z.string().min(1);

interface DispatchContext {
  promotionRun: PromotionRunEntity;
  channel: DispatchChannel;
}

/** 프로모션 외부 발행 요청을 저장된 assignment 기반으로 처리합니다. */
@Injectable()
export class PromotionDispatchService {
  constructor(
    @Inject(AdExecutionReader)
    private readonly reader: AdExecutionReader,
    @Inject(AdExecutionWriter)
    private readonly writer: AdExecutionWriter,
    @Inject(AssignmentDispatcher)
    private readonly assignmentDispatcher: AssignmentDispatcher
  ) {}

  /** promotion_run_id 기준으로 Email/SMS 발송을 실행합니다. */
  async dispatchPromotionRun(promotionRunId: string): Promise<PromotionRunDispatchResponse> {
    const context = await this.requireDispatchContext(promotionRunId);
    const assignments = await this.requireDispatchAssignments(context);
    const jobs = await this.dispatchAssignments(context, assignments);

    return AdExecutionDomain.toDispatchResponse(promotionRunId, context.channel, jobs);
  }

  private async requireDispatchContext(promotionRunId: string): Promise<DispatchContext> {
    const promotionRun = await this.reader.findPromotionRun(promotionRunId);

    if (!promotionRun) {
      throw adExecutionErrors.promotionRunNotFound(promotionRunId);
    }

    const promotion = await this.reader.findPromotion(promotionRun.promotionId);

    if (!promotion) {
      throw adExecutionErrors.inconsistentAssignment(
        `promotion_run_id '${promotionRun.promotionRunId}' references missing promotion_id '${promotionRun.promotionId}'.`
      );
    }

    const channel = promotion.channel;

    if (!AdExecutionDomain.isDispatchChannel(channel)) {
      throw adExecutionErrors.unsupportedDispatchChannel(promotionRunId, channel);
    }

    return {
      promotionRun,
      channel
    };
  }

  private async requireDispatchAssignments(
    context: DispatchContext
  ): Promise<ActiveAdServingAssignmentEntity[]> {
    const assignments = await this.reader.listDispatchAssignments(
      context.promotionRun.promotionRunId
    );

    this.assertDispatchAssignments(context, assignments);

    return assignments;
  }

  private async dispatchAssignments(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): Promise<DispatchJobSummary[]> {
    const jobs: DispatchJobSummary[] = [];

    for (const group of AdExecutionDomain.groupAssignmentsByAdExperiment(assignments)) {
      jobs.push(await this.dispatchAdExperimentGroup(context, group));
    }

    return jobs;
  }

  private async dispatchAdExperimentGroup(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): Promise<DispatchJobSummary> {
    const dispatchJobId = await this.createDispatchJob(context, assignments);
    const attempts = await this.dispatchGroup(context.channel, assignments);
    const summary = AdExecutionDomain.toDispatchJobSummary(
      dispatchJobId,
      context.channel,
      assignments,
      attempts
    );

    await this.finishDispatchJob(dispatchJobId, summary, attempts);

    return summary;
  }

  private async finishDispatchJob(
    dispatchJobId: string,
    summary: DispatchJobSummary,
    attempts: readonly DispatchAttemptSnapshot[]
  ) {
    await this.writer.finishDispatchJob({
      dispatchJobId,
      status: toStoredDispatchJobStatus(summary.status),
      dispatchedCount: summary.dispatched_count,
      failedCount: summary.failed_count,
      result: {
        status: summary.status,
        attempts
      }
    });
  }

  private async createDispatchJob(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ) {
    const first = requireFirstAssignment(assignments);

    return this.writer.insertDispatchJob({
      dispatchJobId: randomUUID(),
      projectId: context.promotionRun.projectId,
      campaignId: context.promotionRun.campaignId,
      promotionId: context.promotionRun.promotionId,
      promotionRunId: context.promotionRun.promotionRunId,
      adExperimentId: first.adExperimentId,
      channel: context.channel,
      provider: this.assignmentDispatcher.providerNameFor(
        context.channel,
        context.promotionRun.promotionRunId
      ),
      targetCount: assignments.length,
      request: {
        segment_id: first.segmentId,
        content_id: first.contentId,
        content_option_id: first.contentOptionId
      }
    });
  }

  private async dispatchGroup(
    channel: DispatchChannel,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): Promise<DispatchAttemptSnapshot[]> {
    const attempts: DispatchAttemptSnapshot[] = [];

    for (const assignment of assignments) {
      attempts.push(await this.dispatchAssignment(channel, assignment));
    }

    return attempts;
  }

  private async dispatchAssignment(
    channel: DispatchChannel,
    assignment: ActiveAdServingAssignmentEntity
  ): Promise<DispatchAttemptSnapshot> {
    const redirectId = await this.createRedirectLink(assignment);
    return this.assignmentDispatcher.dispatch({
      channel,
      assignment,
      redirectId,
      targetUrl: redirectUrl(redirectId)
    });
  }

  private async createRedirectLink(assignment: ActiveAdServingAssignmentEntity): Promise<string> {
    const redirectId = randomUUID();

    return this.writer.insertRedirectLink({
      redirectLinkId: redirectId,
      redirectToken: redirectId,
      projectId: assignment.projectId,
      campaignId: assignment.campaignId,
      promotionId: assignment.promotionId,
      promotionRunId: assignment.promotionRunId,
      adExperimentId: assignment.adExperimentId,
      segmentId: assignment.segmentId,
      userId: assignment.userId,
      contentId: assignment.contentId,
      contentOptionId: assignment.contentOptionId,
      destinationUrl: requiredContentTextSchema.parse(assignment.landingUrl),
      metadata: {},
      expiresAt: daysFromNow(7)
    });
  }

  private assertDispatchAssignments(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ) {
    if (assignments.length === 0) {
      throw adExecutionErrors.activeAssignmentNotFound(context.promotionRun.promotionRunId);
    }

    const channelMismatch = assignments.find(
      (assignment) => assignment.channel !== context.channel
    );

    if (channelMismatch) {
      throw adExecutionErrors.inconsistentAssignment(
        `promotion_run_id '${context.promotionRun.promotionRunId}' has assignment channel '${channelMismatch.channel}' but promotion channel is '${context.channel}'.`
      );
    }

    const conflicts = AdExecutionDomain.findAssignmentConflicts(assignments);

    if (conflicts.length > 0) {
      throw adExecutionErrors.inconsistentAssignment(conflicts.join(" "));
    }
  }
}

function toStoredDispatchJobStatus(
  status: DispatchJobStatus
): Extract<DispatchJobStatus, "completed" | "failed"> {
  return status === "completed" ? "completed" : "failed";
}

function redirectUrl(redirectId: string) {
  return `${dashboardPublicBaseUrl()}/r/${encodeURIComponent(redirectId)}`;
}

function dashboardPublicBaseUrl() {
  return env.env === "dev" ? DEV_DASHBOARD_PUBLIC_BASE_URL : LOCAL_DASHBOARD_PUBLIC_BASE_URL;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function requireFirstAssignment(assignments: readonly ActiveAdServingAssignmentEntity[]) {
  const first = assignments[0];

  if (!first) {
    throw new Error("Dispatch job requires at least one assignment.");
  }

  return first;
}
