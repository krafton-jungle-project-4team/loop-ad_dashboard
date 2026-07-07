import { Inject, Injectable } from "@nestjs/common";
import type { BannerResolveQuery, BannerResolveResponse } from "@loopad/shared";
import { LogContextScope, log } from "../../../infra/logger/index.js";
import { adExecutionErrors } from "../ad-execution-errors.js";
import { AdExecutionDomain, type ActiveAdServingAssignmentEntity } from "../domain/index.js";
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

    const assignment = await this.requireBannerAssignment(request);
    log.assignContext({
      adExperimentId: assignment.adExperimentId,
      campaignId: assignment.campaignId,
      channel: assignment.channel,
      contentId: assignment.contentId,
      contentOptionId: assignment.contentOptionId,
      promotionId: assignment.promotionId,
      segmentId: assignment.segmentId
    });
    const targetUrl = requirePromotionLandingUrl(assignment);
    const response = {
      ...AdExecutionDomain.toBannerResponse(assignment, request.placement_id),
      target_url: targetUrl
    };

    log.info("completed", { request, assignment, response });

    return response;
  }

  private async requireBannerAssignment(
    request: BannerResolveQuery
  ): Promise<ActiveAdServingAssignmentEntity> {
    const assignment = await this.reader.findBannerAssignment({
      projectId: request.project_id,
      promotionRunId: request.promotion_run_id,
      userId: request.user_id
    });

    if (!assignment) {
      log.warn("banner_assignment_not_found", { request });
      throw adExecutionErrors.bannerAssignmentNotFound(request.promotion_run_id, request.user_id);
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
