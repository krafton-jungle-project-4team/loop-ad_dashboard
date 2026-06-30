import {
  DashboardAiAnalysisSchema,
  DashboardAiGenerationSchema,
  DashboardAiRecommendationSchema,
  DashboardMainSchema,
  DashboardPurchaseConversionSchema,
  type DashboardAiAnalysis,
  type DashboardAiGeneration,
  type DashboardAiRecommendation,
  type DashboardCustomerDetail,
  type DashboardCustomerSegment,
  type DashboardMain,
  type DashboardPurchaseConversion,
  type DashboardRecommendationAction
} from "@loopad/shared";

export const fixtureCustomers: DashboardCustomerSegment[] = [
  {
    age_group: "25-34",
    category: "밀키트",
    channel: "Paid Social",
    conversion_rate: 0.021,
    customer_group_id: "cg-low-mobile",
    customer_group_name: "모바일 첫구매 대기군",
    device: "Mobile",
    expected_revenue: 82000000,
    gender: "여성",
    major_drop_off_stage: "상품 조회 -> 장바구니",
    region: "서울"
  },
  {
    age_group: "35-44",
    category: "프리미엄 정육",
    channel: "Search",
    conversion_rate: 0.036,
    customer_group_id: "cg-cart-leaver",
    customer_group_name: "장바구니 고가 이탈군",
    device: "Desktop",
    expected_revenue: 124000000,
    gender: "남성",
    major_drop_off_stage: "장바구니 -> 결제 시작",
    region: "경기"
  },
  {
    age_group: "18-24",
    category: "디저트",
    channel: "Influencer",
    conversion_rate: 0.047,
    customer_group_id: "cg-video-browse",
    customer_group_name: "숏폼 탐색 고객군",
    device: "Mobile",
    expected_revenue: 57000000,
    gender: "여성",
    major_drop_off_stage: "세션 시작 -> 상품 조회",
    region: "부산"
  },
  {
    age_group: "45-54",
    category: "건강식",
    channel: "CRM",
    conversion_rate: 0.112,
    customer_group_id: "cg-loyal-crm",
    customer_group_name: "충성 재구매 고객군",
    device: "Tablet",
    expected_revenue: 176000000,
    gender: "여성",
    major_drop_off_stage: "결제 시작 -> 구매",
    region: "대구"
  },
  {
    age_group: "35-44",
    category: "간편식",
    channel: "Retargeting",
    conversion_rate: 0.139,
    customer_group_id: "cg-retarget-high",
    customer_group_name: "리타겟 고전환 고객군",
    device: "Mobile",
    expected_revenue: 221000000,
    gender: "남성",
    major_drop_off_stage: "상품 조회 -> 장바구니",
    region: "서울"
  },
  {
    age_group: "55+",
    category: "선물세트",
    channel: "Display",
    conversion_rate: 0.086,
    customer_group_id: "cg-gift-planner",
    customer_group_name: "선물 기획 고객군",
    device: "Desktop",
    expected_revenue: 149000000,
    gender: "여성",
    major_drop_off_stage: "장바구니 -> 결제 시작",
    region: "인천"
  }
];

export const fixtureMain: DashboardMain = DashboardMainSchema.parse({
  behavior_event_series: [
    { label: "09:00", value: 1280 },
    { label: "10:00", value: 1840 },
    { label: "11:00", value: 2310 },
    { label: "12:00", value: 2780 },
    { label: "13:00", value: 2510 },
    { label: "14:00", value: 3190 },
    { label: "15:00", value: 3740 },
    { label: "16:00", value: 4210 },
    { label: "17:00", value: 3980 },
    { label: "18:00", value: 4560 },
    { label: "19:00", value: 5120 },
    { label: "20:00", value: 4860 }
  ],
  kpis: [
    {
      description: "전일 동시간 대비 +14.2%",
      key: "active_sessions",
      label: "활성 세션",
      value: 128940,
      value_type: "count"
    },
    {
      description: "캠페인 예산 대비 71% 소진",
      key: "gross_revenue",
      label: "예상 매출",
      value: 485000000,
      value_type: "money"
    },
    {
      description: "최근 3시간 구매 전환 기준",
      key: "conversion_rate",
      label: "구매 전환율",
      value: 0.084,
      value_type: "rate"
    },
    {
      description: "자동 액션 후보 7개 포함",
      key: "ai_ready_segments",
      label: "AI 분석 고객군",
      value: 18,
      value_type: "count"
    }
  ],
  purchase_series: [
    { label: "09:00", value: 82 },
    { label: "10:00", value: 116 },
    { label: "11:00", value: 144 },
    { label: "12:00", value: 171 },
    { label: "13:00", value: 162 },
    { label: "14:00", value: 208 },
    { label: "15:00", value: 234 },
    { label: "16:00", value: 261 },
    { label: "17:00", value: 248 },
    { label: "18:00", value: 293 },
    { label: "19:00", value: 318 },
    { label: "20:00", value: 301 }
  ],
  segment_status: [
    {
      items: [
        { label: "Paid Social", share: 0.36, value: 46300 },
        { label: "Search", share: 0.24, value: 30940 },
        { label: "Retargeting", share: 0.19, value: 24500 },
        { label: "CRM", share: 0.14, value: 18080 }
      ],
      key: "channel",
      title: "채널"
    },
    {
      items: [
        { label: "25-34", share: 0.32, value: 41260 },
        { label: "35-44", share: 0.28, value: 36100 },
        { label: "18-24", share: 0.18, value: 23210 },
        { label: "45-54", share: 0.15, value: 19340 }
      ],
      key: "age",
      title: "연령"
    },
    {
      items: [
        { label: "서울", share: 0.41, value: 52860 },
        { label: "경기", share: 0.25, value: 32230 },
        { label: "부산", share: 0.12, value: 15470 },
        { label: "대구", share: 0.08, value: 10320 }
      ],
      key: "region",
      title: "지역"
    },
    {
      items: [
        { label: "밀키트", share: 0.29, value: 37390 },
        { label: "프리미엄 정육", share: 0.21, value: 27080 },
        { label: "간편식", share: 0.2, value: 25780 },
        { label: "선물세트", share: 0.13, value: 16760 }
      ],
      key: "category",
      title: "카테고리"
    }
  ]
});

export const fixturePurchaseConversion: DashboardPurchaseConversion =
  DashboardPurchaseConversionSchema.parse({
    customer_behavior_rows: fixtureCustomers.map((customer) => ({
      conversion_rate: customer.conversion_rate,
      customer_group_id: customer.customer_group_id,
      customer_group_name: customer.customer_group_name,
      expected_revenue: customer.expected_revenue,
      major_drop_off_rate:
        customer.conversion_rate < 0.05 ? 0.62 : customer.conversion_rate > 0.1 ? 0.29 : 0.43,
      observed_signal:
        customer.conversion_rate < 0.05
          ? "가격/혜택 비교"
          : customer.conversion_rate > 0.1
            ? "재방문 후 구매"
            : "구매 의도 보류"
    })),
    device_rows: [
      {
        add_to_cart_count: 14300,
        cart_to_purchase_rate: 0.41,
        checkout_start_count: 7900,
        device: "Mobile",
        product_view_count: 38900,
        purchase_count: 5860,
        session_start_count: 82800,
        view_to_cart_rate: 0.368,
        view_to_purchase_rate: 0.151
      },
      {
        add_to_cart_count: 8420,
        cart_to_purchase_rate: 0.52,
        checkout_start_count: 5120,
        device: "Desktop",
        product_view_count: 20700,
        purchase_count: 4380,
        session_start_count: 34400,
        view_to_cart_rate: 0.407,
        view_to_purchase_rate: 0.212
      },
      {
        add_to_cart_count: 2210,
        cart_to_purchase_rate: 0.46,
        checkout_start_count: 1350,
        device: "Tablet",
        product_view_count: 5900,
        purchase_count: 1016,
        session_start_count: 8900,
        view_to_cart_rate: 0.375,
        view_to_purchase_rate: 0.172
      },
      {
        add_to_cart_count: 410,
        cart_to_purchase_rate: 0.31,
        checkout_start_count: 208,
        device: "TV",
        product_view_count: 1220,
        purchase_count: 127,
        session_start_count: 2840,
        view_to_cart_rate: 0.336,
        view_to_purchase_rate: 0.104
      }
    ],
    funnel_steps: [
      {
        count: 128940,
        drop_off_rate: 0.42,
        key: "session",
        label: "세션 시작",
        rate_from_previous: 1
      },
      {
        count: 74820,
        drop_off_rate: 0.57,
        key: "view",
        label: "상품 조회",
        rate_from_previous: 0.58
      },
      {
        count: 32240,
        drop_off_rate: 0.54,
        key: "cart",
        label: "장바구니",
        rate_from_previous: 0.431
      },
      {
        count: 14920,
        drop_off_rate: 0.24,
        key: "checkout",
        label: "결제 시작",
        rate_from_previous: 0.463
      },
      {
        count: 11383,
        drop_off_rate: 0,
        key: "purchase",
        label: "구매",
        rate_from_previous: 0.763
      }
    ]
  });

export const fixtureCustomerDetails: Record<string, DashboardCustomerDetail> = {
  "cg-cart-leaver": createCustomerDetail("cg-cart-leaver", {
    analysis: [
      "고가 상품 탐색 후 배송 혜택 페이지 재방문 비중이 높습니다.",
      "검색 키워드는 브랜드명보다 카테고리/가격 비교 중심입니다."
    ],
    purchaseHistory: [
      { label: "프리미엄 정육", share: 0.44, value: 1180 },
      { label: "선물세트", share: 0.24, value: 640 },
      { label: "밀키트", share: 0.18, value: 482 }
    ],
    rationale: [
      "장바구니 체류 시간이 길고 결제 시작 전 쿠폰 조회가 반복됩니다.",
      "무료배송 임계값 근처에서 이탈하는 세션이 집중됩니다."
    ],
    stage: [1, 0.72, 0.38, 0.2, 0.036]
  }),
  "cg-gift-planner": createCustomerDetail("cg-gift-planner", {
    analysis: [
      "상품 비교 기간은 길지만 구매 단가는 높습니다.",
      "선물 포장/배송일 안내 콘텐츠에 강하게 반응합니다."
    ],
    purchaseHistory: [
      { label: "선물세트", share: 0.48, value: 920 },
      { label: "건강식", share: 0.25, value: 470 },
      { label: "프리미엄 정육", share: 0.17, value: 310 }
    ],
    rationale: [
      "배송일 보장 문구 노출 후 재방문 구매율이 상승합니다.",
      "Desktop에서 옵션 비교 후 Mobile 결제 전환이 발생합니다."
    ],
    stage: [1, 0.61, 0.34, 0.18, 0.086]
  }),
  "cg-loyal-crm": createCustomerDetail("cg-loyal-crm", {
    analysis: [
      "재구매 주기가 짧고 CRM 쿠폰 반응성이 높습니다.",
      "건강식 묶음 구매와 정기배송 옵션 조회가 잦습니다."
    ],
    purchaseHistory: [
      { label: "건강식", share: 0.52, value: 1280 },
      { label: "간편식", share: 0.22, value: 542 },
      { label: "밀키트", share: 0.15, value: 360 }
    ],
    rationale: [
      "최근 30일 내 2회 이상 구매 고객 비중이 큽니다.",
      "혜택 메시지보다 재입고/묶음 구성 메시지가 효율적입니다."
    ],
    stage: [1, 0.78, 0.51, 0.29, 0.112]
  }),
  "cg-low-mobile": createCustomerDetail("cg-low-mobile", {
    analysis: [
      "숏폼 광고 클릭 후 상세 페이지에서 가격 비교 이탈이 반복됩니다.",
      "첫구매 쿠폰 노출 전후 장바구니 추가율 차이가 큽니다."
    ],
    purchaseHistory: [
      { label: "밀키트", share: 0.39, value: 880 },
      { label: "디저트", share: 0.28, value: 630 },
      { label: "간편식", share: 0.18, value: 405 }
    ],
    rationale: [
      "Mobile 상품 이미지 확대한 뒤 뒤로가기 발생률이 높습니다.",
      "광고 유입 대비 장바구니 전환이 캠페인 평균의 절반 수준입니다."
    ],
    stage: [1, 0.55, 0.21, 0.08, 0.021]
  }),
  "cg-retarget-high": createCustomerDetail("cg-retarget-high", {
    analysis: [
      "리타겟 노출 2회 이내 구매 전환이 빠르게 발생합니다.",
      "한정 수량 메시지와 번들 할인에 반응합니다."
    ],
    purchaseHistory: [
      { label: "간편식", share: 0.36, value: 1460 },
      { label: "밀키트", share: 0.3, value: 1210 },
      { label: "프리미엄 정육", share: 0.2, value: 808 }
    ],
    rationale: [
      "재방문 후 상품 조회 없이 바로 장바구니 이동하는 비중이 큽니다.",
      "예상 매출과 전환율이 동시에 상위권입니다."
    ],
    stage: [1, 0.83, 0.59, 0.34, 0.139]
  }),
  "cg-video-browse": createCustomerDetail("cg-video-browse", {
    analysis: [
      "영상 소재 완주율은 높지만 상세 페이지 진입이 약합니다.",
      "디저트 카테고리에서 후기/비주얼 콘텐츠 클릭이 많습니다."
    ],
    purchaseHistory: [
      { label: "디저트", share: 0.45, value: 730 },
      { label: "간편식", share: 0.21, value: 340 },
      { label: "밀키트", share: 0.16, value: 260 }
    ],
    rationale: [
      "Influencer 채널 유입 대비 상품 조회 전환이 낮습니다.",
      "구매 버튼보다 리뷰 영역 체류 시간이 긴 편입니다."
    ],
    stage: [1, 0.49, 0.26, 0.11, 0.047]
  })
};

export const fixtureAnalysis: DashboardAiAnalysis = DashboardAiAnalysisSchema.parse({
  customers: [...fixtureCustomers].sort((a, b) => a.conversion_rate - b.conversion_rate),
  selected_customer: fixtureCustomerDetails["cg-low-mobile"] ?? null,
  sort: "low"
});

export const fixtureRecommendationActions: DashboardRecommendationAction[] = [
  {
    action_id: "act-mobile-coupon",
    action_type: "offer",
    description: "모바일 첫구매 대기군에 첫구매 쿠폰과 배송 임계값 안내를 함께 노출합니다.",
    probability: 0.76,
    rationale: "가격 비교 이탈과 쿠폰 조회 행동이 동시에 관측됩니다.",
    status: "ready",
    title: "첫구매 쿠폰+배송 혜택"
  },
  {
    action_id: "act-cart-threshold",
    action_type: "cart",
    description: "장바구니 고가 이탈군에 무료배송까지 남은 금액과 번들 추천을 표시합니다.",
    probability: 0.68,
    rationale: "무료배송 임계값 근처에서 이탈하는 세션이 집중됩니다.",
    status: "review",
    title: "무료배송 임계값 리마인드"
  },
  {
    action_id: "act-retarget-bundle",
    action_type: "retargeting",
    description: "리타겟 고전환 고객군에는 한정 수량 번들 소재를 우선 집행합니다.",
    probability: 0.84,
    rationale: "재방문 후 즉시 구매 흐름이 강해 고의도 메시지 효율이 높습니다.",
    status: "ready",
    title: "한정 수량 번들 리타겟"
  },
  {
    action_id: "act-video-review",
    action_type: "creative",
    description: "숏폼 탐색 고객군을 후기 중심 랜딩으로 연결하는 영상 소재를 생성합니다.",
    probability: 0.59,
    rationale: "영상 완주율은 높지만 상품 상세 진입률이 낮습니다.",
    status: "draft",
    title: "리뷰형 숏폼 랜딩"
  }
];

export const fixtureRecommendation: DashboardAiRecommendation = DashboardAiRecommendationSchema.parse({
  customers: [...fixtureCustomers].sort((a, b) => b.conversion_rate - a.conversion_rate),
  recommendation_rationale: [
    "고전환 고객군은 리타겟/CRM에서 구매 직전 신호가 뚜렷합니다.",
    "저전환 고객군은 가격/배송 혜택을 명확히 재노출할 때 개선 여지가 큽니다.",
    "소재 자동 생성은 후기형 영상과 배송 보장 메시지부터 실험하는 것이 안전합니다."
  ],
  recommended_actions: fixtureRecommendationActions,
  selected_customer: fixtureCustomerDetails["cg-retarget-high"] ?? null,
  sort: "high"
});

export const fixtureGeneration: DashboardAiGeneration = DashboardAiGenerationSchema.parse({
  generated_items: [
    {
      action: fixtureRecommendationActions[0],
      content: {
        content_id: "content-coupon-copy",
        content_type: "copy",
        content_url: null,
        created_at: "2026-06-30T07:10:00.000Z",
        message: "첫 주문이라면 오늘만 배송비 부담 없이. 장바구니에서 바로 적용되는 쿠폰을 확인하세요.",
        status: "generated",
        title: "모바일 첫구매 쿠폰 카피"
      }
    },
    {
      action: fixtureRecommendationActions[1],
      content: {
        content_id: "content-threshold-image",
        content_type: "image",
        content_url: null,
        created_at: "2026-06-30T07:18:00.000Z",
        message: "무료배송까지 남은 금액을 명확히 보여주는 장바구니 배너 시안",
        status: "review",
        title: "무료배송 임계값 배너"
      }
    },
    {
      action: fixtureRecommendationActions[3],
      content: null
    }
  ],
  selected_customer: fixtureCustomers.find((customer) => customer.customer_group_id === "cg-low-mobile") ?? null
});

export const emptyMain: DashboardMain = DashboardMainSchema.parse({
  behavior_event_series: [],
  kpis: [],
  purchase_series: [],
  segment_status: []
});

export const emptyPurchaseConversion: DashboardPurchaseConversion =
  DashboardPurchaseConversionSchema.parse({
    customer_behavior_rows: [],
    device_rows: [],
    funnel_steps: []
  });

export const emptyAnalysis: DashboardAiAnalysis = DashboardAiAnalysisSchema.parse({
  customers: [],
  selected_customer: null,
  sort: "low"
});

export const emptyRecommendation: DashboardAiRecommendation = DashboardAiRecommendationSchema.parse({
  customers: [],
  recommendation_rationale: [],
  recommended_actions: [],
  selected_customer: null,
  sort: "high"
});

export const emptyGeneration: DashboardAiGeneration = DashboardAiGenerationSchema.parse({
  generated_items: [],
  selected_customer: null
});

function createCustomerDetail(
  customerId: string,
  config: {
    analysis: string[];
    purchaseHistory: Array<{ label: string; share: number; value: number }>;
    rationale: string[];
    stage: [number, number, number, number, number];
  }
): DashboardCustomerDetail {
  const customer = fixtureCustomers.find((item) => item.customer_group_id === customerId);

  if (!customer) {
    throw new Error(`Unknown fixture customer: ${customerId}`);
  }

  return {
    case_analysis: config.analysis,
    customer_group: customer,
    metrics: [
      {
        label: "예상 매출",
        value: customer.expected_revenue,
        value_type: "money"
      },
      {
        label: "전환율",
        value: customer.conversion_rate,
        value_type: "rate"
      },
      {
        label: "캠페인 평균 대비",
        value: customer.conversion_rate - 0.084,
        value_type: "delta"
      },
      {
        label: "이탈 위험 변화",
        value: customer.conversion_rate < 0.05 ? 0.18 : -0.07,
        value_type: "delta"
      }
    ],
    purchase_history: config.purchaseHistory,
    rationale: config.rationale,
    stage_flow: [
      { key: "session", label: "세션", rate: config.stage[0] },
      { key: "view", label: "조회", rate: config.stage[1] },
      { key: "cart", label: "장바구니", rate: config.stage[2] },
      { key: "checkout", label: "결제 시작", rate: config.stage[3] },
      { key: "purchase", label: "구매", rate: config.stage[4] }
    ]
  };
}
