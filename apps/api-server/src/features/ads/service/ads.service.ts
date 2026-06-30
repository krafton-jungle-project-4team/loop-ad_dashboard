import { Inject, Injectable } from "@nestjs/common";
import type { AdsServeRequest, AdsServeResponse } from "@loopad/shared";
import { AdsServeResponseSchema } from "@loopad/shared";
import { adsErrors } from "../ads-errors.js";
import { AdServingDomain } from "../domain/index.js";
import { AdsReader } from "../repository/index.js";

@Injectable()
export class AdsService {
  constructor(
    @Inject(AdsReader)
    private readonly adsReader: AdsReader
  ) {}

  async serve(request: AdsServeRequest): Promise<AdsServeResponse> {
    const project = await this.adsReader.findProject(request.projectId);

    if (!project) {
      throw adsErrors.projectNotFound(request.projectId);
    }

    const segment = await this.findSegment(project.projectDbId, request.userId);

    if (!segment) {
      return AdServingDomain.toEmptyResponse(request.placementKey);
    }

    const candidates = await this.adsReader.listServingCandidates(
      project.projectDbId,
      segment.segmentDbId,
      request.placementKey
    );
    const selected = AdServingDomain.pickCandidate(candidates, request);

    if (!selected) {
      return AdServingDomain.toEmptyResponse(request.placementKey);
    }

    return AdsServeResponseSchema.parse(AdServingDomain.toFilledResponse(request, selected));
  }

  private async findSegment(projectDbId: string, userId: string) {
    return (
      (await this.adsReader.findLatestPrimarySegment(projectDbId, userId)) ??
      (await this.adsReader.findDefaultSegment(projectDbId))
    );
  }
}
