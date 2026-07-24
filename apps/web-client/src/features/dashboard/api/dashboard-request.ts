import { apiFailureResponseSchema } from "@loopad/shared";
import type { DashboardQuery } from "../model/dashboard-types.js";

export const noActiveSegmentCandidatesErrorMessage =
  "현재 프로모션 조건에 맞는 고객군 후보가 없어 결과를 만들지 못했어요. 조건을 조정한 뒤 다시 시도해 주세요.";

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
    case "DASHBOARD_CONTENT_CANDIDATE_NOT_EDITABLE":
      return "임시 저장 상태의 광고만 수정할 수 있어요. 최신 광고 상태를 다시 불러와 주세요.";
    case "DASHBOARD_CONTENT_CANDIDATE_HTML_UNAVAILABLE":
      return "편집할 HTML을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
    case "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_FAILED":
      return "AI 디자인 수정을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.";
    case "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_INVALID":
      return "HTML 안전성 검증을 통과하지 못했어요. script, 외부 자원, 이벤트 핸들러 등을 확인해 주세요.";
    case "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_CONFLICT":
      return "다른 수정으로 새 버전이 먼저 저장됐어요. 창을 닫고 최신 HTML을 다시 불러와 주세요.";
    case "DASHBOARD_OFFER_SET_GENERATION_CHANNEL_UNSUPPORTED":
      return "추가 할인 광고 소재는 이메일 프로모션에서만 만들 수 있어요.";
    case "DASHBOARD_OFFER_SET_GENERATION_IDEMPOTENCY_KEY_REQUIRED":
      return "광고 소재 생성 요청을 식별하지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.";
    case "UNSUPPORTED_DISPATCH_CHANNEL":
      return "지금은 이메일과 문자 광고만 보낼 수 있어요.";
    case "segment_audience_source_batch_mismatch":
      return "서로 다른 추천 회차의 후보가 섞였어요. 최신 후보를 다시 불러와 주세요.";
    case "segment_audience_source_already_confirmed":
      return "이미 확정된 추천 후보예요. 고객군 목록을 새로 불러와 주세요.";
    case "segment_audience_segment_already_confirmed":
      return "이미 이 프로모션에서 사용 중인 고객군이에요.";
    case "segment_audience_allocation_empty":
      return "배정 가능한 사용자가 0명이에요. 다른 후보를 선택해 주세요.";
    case "segment_audience_exclusion_conflict":
      return "동시에 다른 고객군이 확정됐어요. 최신 후보를 불러온 뒤 다시 시도해 주세요.";
    case "promotion_offer_catalog_not_found":
      return "프로모션에 사용할 숙소 목록이 아직 준비되지 않았어요.";
    case "promotion_offer_catalog_unavailable":
      return "숙소 목록을 불러올 수 없어요. 잠시 후 다시 시도해 주세요.";
    case "DASHBOARD_DECISION_REQUEST_FAILED":
      return message.includes("no active segment candidates matched analysis request")
        ? noActiveSegmentCandidatesErrorMessage
        : message;
    default:
      return message;
  }
}
