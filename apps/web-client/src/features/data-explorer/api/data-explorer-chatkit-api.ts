import type { DataExplorerAiChatCurrentResult } from "@loopad/shared";
import { dashboardConfig } from "../../dashboard/model/dashboard-config.js";

const DATA_EXPLORER_CHATKIT_PATH = "/dashboard/data-explorer/chatkit";

export function dataExplorerChatKitUrl() {
  return new URL(
    `${dashboardConfig.apiBaseUrl}${DATA_EXPLORER_CHATKIT_PATH}`,
    window.location.origin
  ).toString();
}

export function createDataExplorerChatKitFetch(input: {
  currentResult: DataExplorerAiChatCurrentResult | null;
  projectId: string;
}): typeof fetch {
  return async (resource, init) => {
    const body = await readJsonBody(resource, init);
    if (!body) {
      return fetch(resource, init);
    }

    const headers = mergeHeaders(resource, init);
    headers.set("Content-Type", "application/json");

    return fetch(resource, {
      ...init,
      body: JSON.stringify({
        ...body,
        metadata: {
          ...toRecord(body.metadata),
          current_result: input.currentResult ?? undefined,
          project_id: input.projectId
        }
      }),
      headers
    });
  };
}

async function readJsonBody(resource: RequestInfo | URL, init?: RequestInit) {
  const rawBody =
    typeof init?.body === "string"
      ? init.body
      : resource instanceof Request
        ? await resource.clone().text()
        : null;

  if (!rawBody) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawBody);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function mergeHeaders(resource: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(resource instanceof Request ? resource.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return headers;
}

function toRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
