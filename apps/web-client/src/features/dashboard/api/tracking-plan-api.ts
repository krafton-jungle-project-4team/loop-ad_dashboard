import {
  apiFailureResponseSchema,
  TrackingPlanSchema,
  type TrackingPlanCreateRequest,
  type TrackingPlanEventInput,
  type TrackingPlanEventUpdate
} from "@loopad/shared";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiRequest
} from "../../../shared/api/http-client.js";

function basePath(projectId: string) {
  return `/dashboard/v1/projects/${encodeURIComponent(projectId)}`;
}

export function getTrackingPlan(projectId: string) {
  return apiGet(`${basePath(projectId)}/tracking-plan`, TrackingPlanSchema);
}

export function createTrackingPlan(projectId: string, request: TrackingPlanCreateRequest) {
  return apiPost(`${basePath(projectId)}/tracking-plan`, TrackingPlanSchema, request);
}

export function createTrackingPlanFromObservedEvents(projectId: string) {
  return apiRequest(
    `${basePath(projectId)}/tracking-plan/from-observed-events`,
    TrackingPlanSchema,
    {
      errorMessage: trackingPlanCreationError,
      method: "POST"
    }
  );
}

export function addTrackingPlanEvent(projectId: string, event: TrackingPlanEventInput) {
  return apiPost(`${basePath(projectId)}/tracking-plan/events`, TrackingPlanSchema, event);
}

export function updateTrackingPlanEvent(
  projectId: string,
  eventName: string,
  event: TrackingPlanEventUpdate
) {
  return apiPatch(
    `${basePath(projectId)}/tracking-plan/events/${encodeURIComponent(eventName)}`,
    TrackingPlanSchema,
    event
  );
}

export function deleteTrackingPlanEvent(projectId: string, eventName: string) {
  return apiDelete(
    `${basePath(projectId)}/tracking-plan/events/${encodeURIComponent(eventName)}`,
    TrackingPlanSchema
  );
}

export function publishTrackingPlan(projectId: string) {
  return apiPost(`${basePath(projectId)}/tracking-plan/publish`, TrackingPlanSchema, {});
}

async function trackingPlanCreationError(response: Response): Promise<string> {
  try {
    const parsed = apiFailureResponseSchema.safeParse(await response.json());
    if (parsed.success) return parsed.data.error.message;
  } catch {
    // Fall through to the user-facing fallback.
  }
  return `이벤트 형식을 불러오지 못했어요. 잠시 후 다시 시도해 주세요. (${response.status})`;
}
