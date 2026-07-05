import { adExecutionErrors } from "../ad-execution-errors.js";
import type { ActiveAdServingAssignmentEntity } from "../domain/index.js";

const blockedLandingHostnames = [
  "example.com",
  "example.net",
  "example.org",
  "placeholder.com",
  "yourhotelbooking.com",
  "yourhotelbookingurl.com"
] as const;

export function requirePromotionLandingUrl(assignment: ActiveAdServingAssignmentEntity): string {
  return requireValidPromotionLandingUrl(assignment.promotionRunId, assignment.landingUrl);
}

export function requireValidPromotionLandingUrl(
  promotionRunId: string,
  rawLandingUrl: string | null
): string {
  const landingUrl = rawLandingUrl?.trim() ?? "";

  if (landingUrl.length === 0) {
    throw adExecutionErrors.dispatchLandingUrlInvalid(promotionRunId, rawLandingUrl);
  }

  const url = parseLandingUrl(promotionRunId, landingUrl);
  const hostname = normalizeHostname(url.hostname);

  if (!["http:", "https:"].includes(url.protocol) || isBlockedLandingHostname(hostname)) {
    throw adExecutionErrors.dispatchLandingUrlInvalid(promotionRunId, landingUrl);
  }

  return url.toString();
}

function isBlockedLandingHostname(hostname: string) {
  return blockedLandingHostnames.some(
    (blockedHostname) => hostname === blockedHostname || hostname.endsWith(`.${blockedHostname}`)
  );
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function parseLandingUrl(promotionRunId: string, landingUrl: string) {
  try {
    return new URL(landingUrl);
  } catch {
    throw adExecutionErrors.dispatchLandingUrlInvalid(promotionRunId, landingUrl);
  }
}
