import { Inject, Injectable } from "@nestjs/common";
import type { BannerResolveQuery, BannerResolveResponse } from "@loopad/shared";
import { adExecutionErrors } from "../ad-execution-errors.js";
import { AdExecutionDomain, type ActiveAdServingAssignmentEntity } from "../domain/index.js";
import { AdExecutionReader } from "../repository/index.js";

/** onsite banner 조회 요청을 저장된 assignment 기반으로 처리합니다. */
@Injectable()
export class BannerResolveService {
  constructor(
    @Inject(AdExecutionReader)
    private readonly reader: AdExecutionReader
  ) {}

  /** 사용자에게 배정된 banner 콘텐츠를 반환합니다. */
  async resolveBanner(request: BannerResolveQuery): Promise<BannerResolveResponse> {
    const assignment = await this.requireBannerAssignment(request);

    return AdExecutionDomain.toBannerResponse(assignment);
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
      throw adExecutionErrors.bannerAssignmentNotFound(request.promotion_run_id, request.user_id);
    }

    if (assignment.channel !== "onsite_banner") {
      throw adExecutionErrors.unsupportedBannerChannel(
        request.promotion_run_id,
        assignment.channel
      );
    }

    return assignment;
  }
}
