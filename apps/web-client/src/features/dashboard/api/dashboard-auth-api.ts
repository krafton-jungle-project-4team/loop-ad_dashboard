import {
  createApiSuccessResponseSchema,
  DashboardAuthSessionSchema,
  DashboardLoginRequestSchema,
  DashboardLogoutResultSchema
} from "@loopad/shared";
import type {
  DashboardAuthSession,
  DashboardLoginRequest,
  DashboardLogoutResult
} from "@loopad/shared";
import { apiFetch, apiJson, readApiErrorMessage } from "../../../shared/api/http-client.js";

export async function fetchDashboardAuthSession(
  signal?: AbortSignal
): Promise<DashboardAuthSession | null> {
  const response = await apiFetch("/dashboard/auth/me", {
    headers: { Accept: "application/json" },
    signal
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  return createApiSuccessResponseSchema(DashboardAuthSessionSchema).parse(await response.json())
    .data;
}

export function loginDashboardAdmin(
  requestBody: DashboardLoginRequest
): Promise<DashboardAuthSession> {
  const parsedBody = DashboardLoginRequestSchema.parse(requestBody);

  return apiJson("/dashboard/auth/login", DashboardAuthSessionSchema, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });
}

export function logoutDashboardAdmin(): Promise<DashboardLogoutResult> {
  return apiJson("/dashboard/auth/logout", DashboardLogoutResultSchema, {
    headers: { Accept: "application/json" },
    method: "POST"
  });
}
