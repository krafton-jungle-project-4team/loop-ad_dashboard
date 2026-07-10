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
  const fallbackMessage = `API 요청 실패: ${response.status}`;

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
      return "광고 실행 대상 배정이 아직 없습니다. 승인된 광고 실험에 대한 세그먼트 매칭/assignment 생성이 먼저 필요합니다.";
    case "PROMOTION_RUN_NOT_FOUND":
      return "광고 실행에 사용할 promotion_run을 찾지 못했습니다. 광고 후보 승인 후 다시 시도해주세요.";
    case "UNSUPPORTED_DISPATCH_CHANNEL":
      return "현재 광고 실행은 Email/SMS 채널만 지원합니다.";
    default:
      return message;
  }
}
