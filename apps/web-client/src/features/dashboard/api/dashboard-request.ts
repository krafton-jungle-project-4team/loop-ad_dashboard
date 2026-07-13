import { apiFailureResponseSchema } from "@loopad/shared";
import type { DashboardQuery } from "../model/dashboard-types.js";

export function projectSearchParams(projectId: string) {
  return new URLSearchParams({ project_id: projectId });
}

export function dashboardQuerySearchParams(
  query: DashboardQuery,
  extraSearchParams?: Record<string, string | undefined>
) {
  const searchParams = new URLSearchParams({
    project_id: query.projectId,
    dateRange: query.dateRange,
    excludeInternalTraffic: String(query.excludeInternalTraffic),
    excludeBotTraffic: String(query.excludeBotTraffic),
    userScope: query.userScope,
    conversionEvent: query.conversionEvent,
    selectedCustomerId: query.selectedCustomerId,
    selectedCampaignId: query.selectedCampaignId,
    selectedPromotionId: query.selectedPromotionId,
    selectedSegmentId: query.selectedSegmentId,
    sort: query.sort
  });

  if (query.filter) {
    searchParams.set("filter", query.filter);
  }
  for (const [key, value] of Object.entries(extraSearchParams ?? {})) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}

export async function readDashboardApiErrorMessage(response: Response) {
  const fallbackMessage = `요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요. (${response.status})`;

  try {
    const body: unknown = await response.clone().json();
    const parsed = apiFailureResponseSchema.safeParse(body);
    if (!parsed.success) {
      return fallbackMessage;
    }

    return dashboardApiErrorMessage(parsed.data.error.code, parsed.data.error.message);
  } catch {
    return fallbackMessage;
  }
}

function dashboardApiErrorMessage(code: string, message: string) {
  switch (code) {
    case "ACTIVE_ASSIGNMENT_NOT_FOUND":
      return "광고를 보여 줄 대상이 아직 없어요. 광고 소재를 선택한 뒤 다시 시도해 주세요.";
    case "PROMOTION_RUN_NOT_FOUND":
      return "실행할 광고 실험을 찾지 못했어요. 광고 소재를 선택한 뒤 다시 시도해 주세요.";
    case "UNSUPPORTED_DISPATCH_CHANNEL":
      return "지금은 이메일과 문자 광고만 보낼 수 있어요.";
    default:
      return message;
  }
}
