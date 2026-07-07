const STATUS_LABELS: Record<string, string> = {
  accepted: "확정됨",
  active: "활성",
  analysis_ready: "분석 준비",
  approved: "승인됨",
  archived: "보관됨",
  cancelled: "취소됨",
  completed: "완료",
  confirmed: "확정됨",
  content_ready: "콘텐츠 준비",
  created: "생성됨",
  dismissed: "제외됨",
  draft: "초안",
  empty: "없음",
  evaluated: "평가 완료",
  evaluating: "평가 중",
  failed: "실패",
  goal_met: "목표 달성",
  goal_not_met: "목표 미달",
  hold: "보류",
  inactive: "비활성",
  insufficient_data: "표본 부족",
  near_goal: "목표 근접",
  none: "없음",
  not_evaluated: "미평가",
  partial_failed: "일부 실패",
  partial_goal_met: "일부 목표 달성",
  paused: "일시 중지",
  planned: "계획됨",
  queued: "대기 중",
  ready: "준비됨",
  rejected: "거절됨",
  requested: "요청됨",
  required: "필요",
  running: "실행 중",
  sent: "발송됨",
  stopped: "중지됨",
  succeeded: "성공",
  valid: "정상",
  waiting: "대기"
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "이메일",
  onsite_banner: "온사이트 배너",
  push: "푸시",
  sms: "문자"
};

const METRIC_LABELS: Record<string, string> = {
  booking_complete_count: "예약 완료 수",
  booking_conversion_rate: "예약 전환율",
  conversion_lift: "전환 증분",
  funnel_step_rate: "퍼널 단계 전환율",
  goal_achievement_rate: "목표 달성률",
  inflow_rate: "유입률",
  promotion_click_rate: "프로모션 클릭률"
};

const BASIS_LABELS: Record<string, string> = {
  all_segments: "전체 세그먼트",
  promotion_average: "프로모션 평균"
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "전체 사용자",
  existing_users: "기존 사용자",
  new_users: "신규 사용자",
  returning_users: "재방문 사용자"
};

const ACTION_LABELS: Record<string, string> = {
  analysis: "분석 필요",
  campaign_start: "캠페인 시작",
  complete_plan: "기획 완료",
  content_generation: "콘텐츠 생성",
  evaluate: "성과 평가",
  generate_content: "콘텐츠 생성",
  launch: "실행",
  monitor: "모니터링",
  next_loop: "다음 루프",
  none: "없음",
  review: "검토",
  segment_analysis: "세그먼트 분석",
  start_experiment: "실험 시작"
};

const LANDING_TYPE_LABELS: Record<string, string> = {
  booking_resume: "예약 이어가기",
  product_detail: "상품 상세",
  search_results: "검색 결과"
};

export function formatStatusLabel(value: string | null | undefined): string {
  return formatKnownLabel(value, STATUS_LABELS);
}

export function formatChannelLabel(value: string | null | undefined): string {
  return formatKnownLabel(value, CHANNEL_LABELS);
}

export function formatMetricLabel(value: string | null | undefined): string {
  return formatKnownLabel(value, METRIC_LABELS);
}

export function formatBasisLabel(value: string | null | undefined): string {
  return formatKnownLabel(value, BASIS_LABELS);
}

export function formatAudienceLabel(value: string | null | undefined): string {
  return formatKnownLabel(value, AUDIENCE_LABELS);
}

export function formatActionLabel(value: string | null | undefined): string {
  return formatKnownLabel(value, ACTION_LABELS);
}

export function formatLandingTypeLabel(value: string | null | undefined): string {
  return formatKnownLabel(value, LANDING_TYPE_LABELS);
}

export function formatWorkflowLabel(value: string | null | undefined): string {
  return formatKnownLabel(value, {
    campaign: "캠페인",
    evaluation: "평가",
    loop: "루프",
    promotion: "프로모션",
    segment: "세그먼트"
  });
}

function formatKnownLabel(
  value: string | null | undefined,
  labels: Record<string, string>
): string {
  if (!value) {
    return "-";
  }
  return labels[value] ?? humanizeUnknownLabel(value);
}

function humanizeUnknownLabel(value: string): string {
  return value.replaceAll("_", " ");
}
