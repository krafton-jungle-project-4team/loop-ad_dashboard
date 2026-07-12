import {
  TrackingPlanSchema,
  TrackingPlanValidationSchema,
  type SdkSettingsUpdate,
  type TrackingPlanCreateRequest,
  type TrackingPlanEventInput,
  type TrackingPlanEventUpdate
} from "@loopad/shared";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../shared/api/http-client.js";

function basePath(projectId: string) {
  return `/dashboard/v1/projects/${encodeURIComponent(projectId)}`;
}

export function getTrackingPlan(projectId: string) {
  return apiGet(`${basePath(projectId)}/tracking-plan`, TrackingPlanSchema);
}

export function createTrackingPlan(projectId: string, request: TrackingPlanCreateRequest) {
  return apiPost(`${basePath(projectId)}/tracking-plan`, TrackingPlanSchema, request);
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

export function updateSdkSettings(projectId: string, request: SdkSettingsUpdate) {
  return apiPatch(`${basePath(projectId)}/sdk-settings`, TrackingPlanSchema, request);
}

export function validateTrackingPlan(projectId: string) {
  return apiPost(`${basePath(projectId)}/tracking-plan/validate`, TrackingPlanValidationSchema, {});
}

export function publishTrackingPlan(projectId: string) {
  return apiPost(`${basePath(projectId)}/tracking-plan/publish`, TrackingPlanSchema, {});
}
