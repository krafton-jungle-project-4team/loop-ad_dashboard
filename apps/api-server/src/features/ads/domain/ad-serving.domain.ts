import type {
  AdsServeFilledResponse,
  AdsServeRequest,
  AdsServeResponse,
  ServedAdCreative,
  ServedAdTracking
} from "@loopad/shared";

export interface AdServingProjectSnapshot {
  projectDbId: string;
  projectId: string;
}

export interface AdServingSegmentSnapshot {
  segmentDbId: string;
}

export interface AdServingCandidateSnapshot {
  mappingId: string;
  priority: number;
  trafficWeight: number;
  experimentId: string;
  variantId: string;
  creativeId: string;
  contentType: string;
  title: string;
  body: string;
  ctaLabel: string;
  imageUrl: string;
  landingUrl: string;
  actionId: string;
}

export const AdServingDomain = {
  pickCandidate(
    candidates: readonly AdServingCandidateSnapshot[],
    request: Pick<AdsServeRequest, "projectId" | "userId" | "placementKey">
  ): AdServingCandidateSnapshot | null {
    if (candidates.length === 0) {
      return null;
    }

    const maxPriority = Math.max(...candidates.map((candidate) => candidate.priority));
    const highestPriorityCandidates = candidates.filter(
      (candidate) => candidate.priority === maxPriority
    );

    return AdServingDomain.pickDeterministicWeightedCandidate(
      highestPriorityCandidates,
      `${request.projectId}:${request.userId}:${request.placementKey}`
    );
  },

  pickDeterministicWeightedCandidate<T extends { trafficWeight: number }>(
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
  },

  toFilledResponse(
    request: Pick<AdsServeRequest, "projectId" | "placementKey">,
    selected: AdServingCandidateSnapshot
  ): AdsServeFilledResponse {
    return {
      placementKey: request.placementKey,
      status: "filled",
      ad: toCreative(selected),
      tracking: toTracking(request.projectId, selected)
    };
  },

  toEmptyResponse(placementKey: string): AdsServeResponse {
    return {
      placementKey,
      status: "empty",
      ad: null,
      tracking: null
    };
  }
};

function hashToUnitInterval(input: string): number {
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

function toCreative(selected: AdServingCandidateSnapshot): ServedAdCreative {
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

function toTracking(projectId: string, selected: AdServingCandidateSnapshot): ServedAdTracking {
  return {
    projectId,
    experimentId: selected.experimentId,
    variantId: selected.variantId,
    creativeId: selected.creativeId,
    mappingId: selected.mappingId,
    actionId: selected.actionId
  };
}
