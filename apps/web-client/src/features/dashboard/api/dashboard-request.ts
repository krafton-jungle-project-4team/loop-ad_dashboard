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
    case "segment_audience_source_batch_mismatch":
      return "서로 다른 추천 회차의 후보가 섞였어요. 최신 후보를 다시 불러와 주세요.";
    case "segment_audience_source_already_confirmed":
      return "이미 확정된 추천 후보예요. 고객군 목록을 새로 불러와 주세요.";
    case "segment_audience_segment_already_confirmed":
      return "이미 이 프로모션에서 사용 중인 고객군이에요.";
    case "segment_audience_allocation_empty":
      return "현재 조합에서는 최종 배정 사용자가 없는 고객군이 있어요. 선택을 바꿔 주세요.";
    case "segment_audience_exclusion_conflict":
      return "동시에 다른 고객군이 확정됐어요. 최신 후보를 불러온 뒤 다시 시도해 주세요.";
    default:
      return message;
  }
}
