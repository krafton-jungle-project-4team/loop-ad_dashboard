import { Inject, Injectable } from "@nestjs/common";
import type { BannerResolveQuery, BannerResolveResponse } from "@loopad/shared";
import { LogContextScope, log } from "../../../infra/logger/index.js";
import { adExecutionErrors } from "../ad-execution-errors.js";
import {
  AdExecutionDomain,
  creativeArtifact,
  type ActiveAdServingAssignmentEntity
} from "../domain/index.js";
import { AdExecutionReader } from "../repository/index.js";
import { requirePromotionLandingUrl } from "./landing-url.guard.js";

/** onsite banner 조회 요청을 저장된 assignment 기반으로 처리합니다. */
@Injectable()
export class BannerResolveService {
  constructor(
    @Inject(AdExecutionReader)
    private readonly reader: AdExecutionReader
  ) {}

  /** 사용자에게 배정된 banner 콘텐츠를 반환합니다. */
  @LogContextScope()
  async resolveBanner(request: BannerResolveQuery): Promise<BannerResolveResponse> {
    log.assignContext({
      placementId: request.placement_id,
      projectId: request.project_id,
      promotionRunId: request.promotion_run_id,
      userId: request.user_id
    });
    log.info("started", { request });

    const assignment = await this.findBannerAssignment(request);
    if (!assignment) {
      const response: BannerResolveResponse = {
        status: "empty",
        placement_id: request.placement_id,
        reason: "assignment_not_found"
      };
      log.info("completed", { request, response });
      return response;
    }
    log.assignContext({
      adExperimentId: assignment.adExperimentId,
      campaignId: assignment.campaignId,
      channel: assignment.channel,
      contentId: assignment.contentId,
      contentOptionId: assignment.contentOptionId,
      promotionId: assignment.promotionId,
      segmentId: assignment.segmentId
    });
    const emptyReason = bannerEmptyReason(assignment);
    if (emptyReason) {
      const response: BannerResolveResponse = {
        status: "empty",
        placement_id: request.placement_id,
        reason: emptyReason
      };
      log.info("completed", { request, assignment, response });
      return response;
    }
    requirePromotionLandingUrl(assignment);
    const response = AdExecutionDomain.toBannerResponse(assignment, request.placement_id);

    log.info("completed", { request, assignment, response });

    return response;
  }

  private async findBannerAssignment(
    request: BannerResolveQuery
  ): Promise<ActiveAdServingAssignmentEntity | null> {
    const assignment = await this.reader.findBannerAssignment({
      projectId: request.project_id,
      promotionRunId: request.promotion_run_id,
      userId: request.user_id
    });

    if (!assignment) {
      log.warn("banner_assignment_not_found", { request });
      return null;
    }

    if (assignment.channel !== "onsite_banner") {
      log.warn("unsupported_banner_channel", { request, assignment });
      throw adExecutionErrors.unsupportedBannerChannel(
        request.promotion_run_id,
        assignment.channel
      );
    }

    log.info("banner_assignment_loaded", { request, assignment });

    return assignment;
  }
}

function bannerEmptyReason(
  assignment: ActiveAdServingAssignmentEntity
): Extract<BannerResolveResponse, { status: "empty" }>["reason"] | null {
  const artifact = creativeArtifact(assignment);
  if (!artifact || artifact.creative_format !== "banner_html") {
    return "artifact_not_ready";
  }
  if (artifact.artifact_status === "pending") {
    return "artifact_not_ready";
  }
  if (artifact.artifact_status === "failed") {
    return "artifact_failed";
  }
  if (artifact.artifact_status !== "published" || !artifact.public_url) {
    return "artifact_not_ready";
  }
  return null;
}
