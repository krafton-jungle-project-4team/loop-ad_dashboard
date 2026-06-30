import { Inject, Injectable } from "@nestjs/common";
import type {
  AdsServeFilledResponse,
  AdsServeRequest,
  AdsServeResponse,
  ServedAdCreative,
  ServedAdTracking
} from "@loopad/shared";
import { AdsServeResponseSchema } from "@loopad/shared";
import { adsErrors } from "../ads-errors.js";
import { AdsRepository, type AdServingCandidateRow } from "../repository/index.js";

@Injectable()
export class AdsService {
  constructor(
    @Inject(AdsRepository)
    private readonly repository: AdsRepository
  ) {}

  async serve(request: AdsServeRequest): Promise<AdsServeResponse> {
    const project = await this.repository.findProject(request.projectId);

    if (!project) {
      throw adsErrors.projectNotFound(request.projectId);
    }

    const segment = await this.findSegment(project.projectDbId, request.userId);

    if (!segment) {
      return emptyResponse(request.placementKey);
    }

    const candidates = await this.repository.listServingCandidates(
      project.projectDbId,
      segment.segmentDbId,
      request.placementKey
    );
    const selected = pickServingCandidate(candidates, request);

    if (!selected) {
      return emptyResponse(request.placementKey);
    }

    return AdsServeResponseSchema.parse(filledResponse(request, selected));
  }

  private async findSegment(projectDbId: string, userId: string) {
    return (
      (await this.repository.findLatestPrimarySegment(projectDbId, userId)) ??
      (await this.repository.findDefaultSegment(projectDbId))
    );
  }
}

export function pickServingCandidate(
  candidates: readonly AdServingCandidateRow[],
  request: Pick<AdsServeRequest, "projectId" | "userId" | "placementKey">
): AdServingCandidateRow | null {
  if (candidates.length === 0) {
    return null;
  }

  const maxPriority = Math.max(...candidates.map((candidate) => candidate.priority));
  const highestPriorityCandidates = candidates.filter(
    (candidate) => candidate.priority === maxPriority
  );

  return pickDeterministicWeightedCandidate(
    highestPriorityCandidates,
    `${request.projectId}:${request.userId}:${request.placementKey}`
  );
}

export function pickDeterministicWeightedCandidate<T extends { trafficWeight: number }>(
  candidates: readonly T[],
  hashInput: string
): T | null {
  if (candidates.length === 0) {
    return null;
  }

  const totalWeight = candidates.reduce(
    (sum, candidate) => sum + Math.max(0, candidate.trafficWeight),
    0
  );

  if (totalWeight <= 0) {
    const index = hashUint32(hashInput) % candidates.length;
    return candidates[index] ?? candidates[0] ?? null;
  }

  const target = hashToUnitInterval(hashInput) * totalWeight;
  let cumulativeWeight = 0;

  for (const candidate of candidates) {
    cumulativeWeight += Math.max(0, candidate.trafficWeight);

    if (target < cumulativeWeight) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1] ?? null;
}

export function hashToUnitInterval(input: string): number {
  return hashUint32(input) / 0x100000000;
}

function hashUint32(input: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

function filledResponse(
  request: Pick<AdsServeRequest, "projectId" | "placementKey">,
  selected: AdServingCandidateRow
): AdsServeFilledResponse {
  return {
    placementKey: request.placementKey,
    status: "filled",
    ad: creative(selected),
    tracking: tracking(request.projectId, selected)
  };
}

function emptyResponse(placementKey: string): AdsServeResponse {
  return {
    placementKey,
    status: "empty",
    ad: null,
    tracking: null
  };
}

function creative(selected: AdServingCandidateRow): ServedAdCreative {
  return {
    creativeId: selected.creativeId,
    contentType: selected.contentType,
    title: selected.title,
    body: selected.body,
    ctaLabel: selected.ctaLabel,
    imageUrl: selected.imageUrl,
    landingUrl: selected.landingUrl
  };
}

function tracking(projectId: string, selected: AdServingCandidateRow): ServedAdTracking {
  return {
    projectId,
    experimentId: selected.experimentId,
    variantId: selected.variantId,
    creativeId: selected.creativeId,
    mappingId: selected.mappingId,
    actionId: selected.actionId
  };
}
