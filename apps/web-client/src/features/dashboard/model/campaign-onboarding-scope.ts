import type { ProjectSetupProgressStorage } from "./project-setup-progress.js";

export const CAMPAIGN_ONBOARDING_SCOPE_STORAGE_KEY_PREFIX =
  "loopad.dashboard.campaign-onboarding.v1";

export type CampaignOnboardingScope = {
  campaignId: string;
  promotionId: string;
  segmentId: string;
};

export function getCampaignOnboardingScopeStorageKey(projectId: string): string {
  return `${CAMPAIGN_ONBOARDING_SCOPE_STORAGE_KEY_PREFIX}:${projectId.trim()}`;
}

export function parseCampaignOnboardingScope(
  serialized: string | null
): CampaignOnboardingScope | null {
  if (serialized === null) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(serialized);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const campaignId = parseId(record.campaignId);
    const promotionId = parseId(record.promotionId);
    const segmentId = parseId(record.segmentId);

    if (
      campaignId === null ||
      campaignId.length === 0 ||
      promotionId === null ||
      segmentId === null
    ) {
      return null;
    }

    return { campaignId, promotionId, segmentId };
  } catch {
    return null;
  }
}

export function readCampaignOnboardingScope(
  projectId: string,
  storage?: ProjectSetupProgressStorage | null
): CampaignOnboardingScope | null {
  const resolvedStorage = resolveStorage(storage);
  if (resolvedStorage === null) {
    return null;
  }

  try {
    return parseCampaignOnboardingScope(
      resolvedStorage.getItem(getCampaignOnboardingScopeStorageKey(projectId))
    );
  } catch {
    return null;
  }
}

export function writeCampaignOnboardingScope(
  projectId: string,
  scope: CampaignOnboardingScope,
  storage?: ProjectSetupProgressStorage | null
): void {
  const resolvedStorage = resolveStorage(storage);
  if (resolvedStorage === null) {
    return;
  }

  try {
    resolvedStorage.setItem(getCampaignOnboardingScopeStorageKey(projectId), JSON.stringify(scope));
  } catch {
    // Browser storage can be unavailable or full. The provider keeps an in-memory copy.
  }
}

export function clearCampaignOnboardingScope(
  projectId: string,
  storage?: ProjectSetupProgressStorage | null
): void {
  const resolvedStorage = resolveStorage(storage);
  if (resolvedStorage === null) {
    return;
  }

  try {
    resolvedStorage.removeItem(getCampaignOnboardingScopeStorageKey(projectId));
  } catch {
    // Browser storage can be unavailable in privacy modes. Clearing remains best-effort.
  }
}

function parseId(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function resolveStorage(
  storage: ProjectSetupProgressStorage | null | undefined
): ProjectSetupProgressStorage | null {
  if (storage !== undefined) {
    return storage;
  }

  try {
    return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
