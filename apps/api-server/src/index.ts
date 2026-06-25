import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import { createClient } from "@clickhouse/client";
import { Pool } from "pg";
import {
  CreativeReportSchema,
  ConversionReportSchema,
  DashboardOverviewSchema,
  EventNameSchema,
  InsightReportSchema,
  RecommendationReportSchema,
  type CustomerSegment,
  type EventName,
  type FunnelStep,
  type NamedPerformance
} from "@loopad/shared";

type EventRow = {
  project_id: string;
  user_id: string;
  session_id: string;
  event_name: EventName;
  timestamp: string;
  channel: string;
  campaign_id: string;
  product_id: string;
  category: string;
  age_group: string;
  gender: string;
  device: string;
  price: number;
  inventory_status: string;
  properties: string;
};

type EventRecord = Omit<EventRow, "properties"> & {
  properties: { region?: string; signal?: string; page_url?: string; referrer?: string };
};

type SegmentStats = {
  id: string;
  channel: string;
  ageGroup: string;
  gender: string;
  category: string;
  region: string;
  device: string;
  events: EventRecord[];
};

const env = {
  port: Number(process.env.PORT ?? 3000),
  webOrigin: process.env.LOOPAD_WEB_ORIGIN ?? "http://localhost:5173",
  projectId: process.env.LOOPAD_PROJECT_ID ?? "loopad-demo-shop",
  seedDemoData: (process.env.LOOPAD_SEED_DEMO_DATA ?? "true") === "true",
  postgres: {
    host: process.env.LOOPAD_POSTGRES_HOST ?? "localhost",
    port: Number(process.env.LOOPAD_POSTGRES_PORT ?? 5432),
    user: process.env.LOOPAD_POSTGRES_USER ?? "loopad",
    password: process.env.LOOPAD_POSTGRES_PASSWORD ?? "change-me",
    database: process.env.LOOPAD_POSTGRES_DATABASE ?? "loopad"
  },
  clickhouse: {
    url: process.env.LOOPAD_CLICKHOUSE_URL ?? "http://localhost:8123",
    database: process.env.LOOPAD_CLICKHOUSE_DATABASE ?? "loopad",
    username: process.env.LOOPAD_CLICKHOUSE_USER ?? "loopad",
    password: process.env.LOOPAD_CLICKHOUSE_PASSWORD ?? "change-me"
  }
};

const funnelSteps = [
  ["page_view", "페이지 방문"],
  ["product_view", "상품 상세 조회"],
  ["add_to_cart", "장바구니 추가"],
  ["checkout_start", "결제 시작"],
  ["purchase", "구매 완료"]
] as const;

const clickhouse = createClient({
  url: env.clickhouse.url,
  username: env.clickhouse.username,
  password: env.clickhouse.password,
  database: env.clickhouse.database
});

const postgres = new Pool({ ...env.postgres, max: 5 });

const demoEvents = [
  [
    "user_100",
    "session_100",
    "kakao",
    "campaign_fresh_food_01",
    "chicken_breast_001",
    "fresh_food",
    "30s",
    "male",
    "mobile",
    9900,
    "out_of_stock",
    "수도권",
    "닭가슴살 품절",
    ["page_view", "product_view", "add_to_cart", "checkout_start"]
  ],
  [
    "user_101",
    "session_101",
    "kakao",
    "campaign_fresh_food_01",
    "salad_kit_001",
    "fresh_food",
    "30s",
    "female",
    "mobile",
    12900,
    "in_stock",
    "수도권",
    "모바일 재방문",
    ["page_view", "product_view", "add_to_cart", "checkout_start", "purchase"]
  ],
  [
    "user_102",
    "session_102",
    "naver",
    "campaign_milk_kit_01",
    "milk_kit_001",
    "milk_kit",
    "30s",
    "female",
    "mobile",
    24900,
    "in_stock",
    "부산/경남",
    "쿠폰 사용",
    ["page_view", "product_view", "add_to_cart", "checkout_start", "purchase"]
  ],
  [
    "user_103",
    "session_103",
    "instagram",
    "campaign_dessert_01",
    "dessert_box_001",
    "dessert",
    "20s",
    "female",
    "mobile",
    17900,
    "in_stock",
    "대구/경북",
    "가격 민감",
    ["page_view", "product_view", "leave_page"]
  ],
  [
    "user_104",
    "session_104",
    "community",
    "campaign_jeongyuk_01",
    "beef_pack_001",
    "butcher",
    "40s",
    "female",
    "desktop",
    48900,
    "in_stock",
    "충청권",
    "고가 객단가",
    ["page_view", "product_view", "add_to_cart"]
  ],
  [
    "user_105",
    "session_105",
    "app_push",
    "campaign_health_01",
    "protein_001",
    "health_food",
    "40s",
    "female",
    "mobile",
    38900,
    "in_stock",
    "수도권",
    "성과 확장 후보",
    ["page_view", "product_view", "add_to_cart", "checkout_start", "purchase"]
  ],
  [
    "user_106",
    "session_106",
    "app_push",
    "campaign_health_01",
    "protein_001",
    "health_food",
    "40s",
    "female",
    "mobile",
    38900,
    "in_stock",
    "수도권",
    "성과 확장 후보",
    ["page_view", "product_view", "add_to_cart", "checkout_start", "purchase"]
  ],
  [
    "user_107",
    "session_107",
    "naver",
    "campaign_fresh_food_02",
    "fish_001",
    "fresh_food",
    "40s",
    "male",
    "desktop",
    29900,
    "in_stock",
    "강원/제주",
    "결제 정보 입력 이탈",
    ["page_view", "product_view", "add_to_cart", "checkout_start"]
  ],
  [
    "user_108",
    "session_108",
    "kakao",
    "campaign_fresh_food_01",
    "chicken_breast_001",
    "fresh_food",
    "30s",
    "male",
    "mobile",
    9900,
    "out_of_stock",
    "수도권",
    "닭가슴살 품절",
    ["page_view", "product_view", "add_to_cart"]
  ],
  [
    "user_109",
    "session_109",
    "sms",
    "campaign_coupon_01",
    "lunch_box_001",
    "fresh_food",
    "50s",
    "male",
    "tablet",
    15900,
    "in_stock",
    "호남권",
    "메시지 클릭",
    ["page_view", "product_view", "add_to_cart", "checkout_start", "purchase"]
  ]
] as const;

await bootstrap();

async function bootstrap() {
  await ensurePostgres();
  await ensureClickHouse();
  await seedClickHouse();

  const app = express();
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json());

  app.get("/api/health", (_request, response) => response.json(success({ status: "ok" })));
  app.get("/api/dashboard/overview", async (request, response, next) => {
    try {
      response.json(success(DashboardOverviewSchema.parse(await overview(projectId(request)))));
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/dashboard/conversion", async (request, response, next) => {
    try {
      response.json(success(ConversionReportSchema.parse(await conversion(projectId(request)))));
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/dashboard/ai-insights", async (request, response, next) => {
    try {
      response.json(success(InsightReportSchema.parse(await insights(projectId(request)))));
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/dashboard/ai-recommendations", async (request, response, next) => {
    try {
      response.json(
        success(RecommendationReportSchema.parse(await recommendations(projectId(request))))
      );
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/creatives/generated", async (request, response, next) => {
    try {
      response.json(success(CreativeReportSchema.parse(await creatives(projectId(request)))));
    } catch (error) {
      next(error);
    }
  });
  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      next: express.NextFunction
    ) => {
      void next;
      response.status(500).json({
        requestId: crypto.randomUUID(),
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "API request failed."
        }
      });
    }
  );
  app.listen(env.port, () => console.log(`LoopAd API listening on ${env.port}`));
}

async function ensurePostgres() {
  await postgres.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      display_name text NOT NULL,
      role text NOT NULL DEFAULT 'owner',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS projects (
      id text PRIMARY KEY,
      owner_email text NOT NULL REFERENCES admin_accounts(email),
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await postgres.query(
    `INSERT INTO admin_accounts (email, display_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    ["admin@loopad.local", "LoopAd Admin"]
  );
  await postgres.query(
    `INSERT INTO projects (id, owner_email, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [env.projectId, "admin@loopad.local", "LoopAd Demo Shop"]
  );
}

async function ensureClickHouse() {
  await clickhouse.command({ query: `CREATE DATABASE IF NOT EXISTS ${env.clickhouse.database}` });
  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS events (
        project_id String,
        user_id String,
        session_id String,
        event_name LowCardinality(String),
        timestamp DateTime64(3, 'Asia/Seoul'),
        channel LowCardinality(String),
        campaign_id String,
        product_id String,
        category LowCardinality(String),
        age_group LowCardinality(String),
        gender LowCardinality(String),
        device LowCardinality(String),
        price Float64,
        inventory_status LowCardinality(String),
        properties String
      )
      ENGINE = MergeTree
      ORDER BY (project_id, timestamp, event_name, session_id)
    `
  });
}

async function seedClickHouse() {
  if (!env.seedDemoData) {
    return;
  }
  const result = await clickhouse.query({
    query: "SELECT count() AS count FROM events WHERE project_id = {projectId:String}",
    query_params: { projectId: env.projectId },
    format: "JSONEachRow"
  });
  const existing = await result.json<{ count: string }>();
  if (Number(existing[0]?.count ?? 0) > 0) {
    return;
  }
  const now = Date.now();
  const rows = demoEvents.flatMap((scenario, scenarioIndex) => {
    const [
      userId,
      sessionId,
      channel,
      campaignId,
      productId,
      category,
      ageGroup,
      gender,
      device,
      price,
      inventoryStatus,
      region,
      signal,
      reached
    ] = scenario;
    return reached.map((eventName, eventIndex) => ({
      project_id: env.projectId,
      user_id: userId,
      session_id: sessionId,
      event_name: eventName,
      timestamp: toClickHouseDateTime(
        new Date(now - (demoEvents.length - scenarioIndex) * 60_000 + eventIndex * 10_000)
      ),
      channel,
      campaign_id: campaignId,
      product_id: productId,
      category,
      age_group: ageGroup,
      gender,
      device,
      price,
      inventory_status: inventoryStatus,
      properties: JSON.stringify({
        page_url: `/products/${productId}`,
        referrer: channel,
        region,
        signal
      })
    }));
  });
  await clickhouse.insert({ table: "events", values: rows, format: "JSONEachRow" });
}

async function readEvents(project: string): Promise<EventRecord[]> {
  const result = await clickhouse.query({
    query: `
      SELECT *
      FROM events
      WHERE project_id = {projectId:String}
      ORDER BY timestamp ASC
    `,
    query_params: { projectId: project },
    format: "JSONEachRow"
  });
  const rows = await result.json<EventRow>();
  return rows.map((row) => ({
    ...row,
    event_name: EventNameSchema.parse(row.event_name),
    price: Number(row.price),
    properties: parseProperties(row.properties)
  }));
}

async function overview(project: string) {
  const events = await readEvents(project);
  const funnel = buildFunnel(events);
  const purchases = events.filter((event) => event.event_name === "purchase");
  const recent = recentEvents(events);
  const revenue = sum(purchases);
  const expected = revenue + pipeline(events);
  return {
    metrics: {
      purchaseConversionRate: {
        label: "전체 구매 전환율",
        value: `${purchaseRate(events)}%`,
        description: "페이지 방문 대비 구매 완료"
      },
      checkoutDropOffRate: {
        label: "결제 직전 이탈률",
        value: `${funnel[3]?.dropOffRate ?? 0}%`,
        description: "결제 시작 이후 구매 미완료"
      },
      realtimePurchases: {
        label: "실시간 구매 건수",
        value: fmt(purchases.length),
        description: "ClickHouse 구매 이벤트 기준"
      },
      forecastRevenue: {
        label: "예상 매출",
        value: money(expected),
        description: "구매 완료와 결제 파이프라인 합산"
      },
      recentEventCount: {
        label: "최근 15분 행동 이벤트 수",
        value: fmt(recent.length),
        description: "최근 수집 이벤트"
      },
      recentPurchaseCount: {
        label: "최근 15분 구매 수",
        value: fmt(recent.filter((event) => event.event_name === "purchase").length),
        description: "최근 구매 완료"
      }
    },
    recentBehaviorEvents: series(recent),
    recentPurchases: series(recent.filter((event) => event.event_name === "purchase")),
    forecast: {
      title: `예상 매출은 현재 매출 대비 ${ratio(expected, Math.max(revenue, 1))}% 페이스입니다.`,
      plannedRevenue: projection(expected),
      actualRevenue: projection(revenue)
    },
    segmentPerformance: {
      channels: rank(events, "channel"),
      regions: rank(events, "region"),
      ageGender: rank(events, "ageGender"),
      devices: rank(events, "device"),
      categories: rank(events, "category")
    }
  };
}

async function conversion(project: string) {
  const events = await readEvents(project);
  return {
    funnel: buildFunnel(events),
    deviceComparison: comparison(events, "device"),
    channelComparison: comparison(events, "channel"),
    customerBehaviors: segments(events).map((segment) => ({
      segment: segmentName(segment),
      conversionRate: `${segmentRate(segment)}%`,
      dropOffRate: `${round(100 - segmentRate(segment))}%`,
      forecastRevenue: money(
        sum(segment.events.filter((event) => event.event_name === "purchase")) +
          pipeline(segment.events)
      ),
      observedSignals: signals(segment.events)
    }))
  };
}

async function insights(project: string) {
  const events = await readEvents(project);
  const sorted = segments(events).sort((a, b) => segmentRate(b) - segmentRate(a));
  const selected = sorted[0];
  return {
    topSegments: sorted.slice(0, 5).map(customerSegment),
    bottomSegments: sorted.slice(-5).reverse().map(customerSegment),
    selectedInsight: selected
      ? {
          segment: customerSegment(selected),
          actualConversionRate: `${segmentRate(selected)}%`,
          expectedConversionRate: `${purchaseRate(events)}%`,
          conversionGap: `${round(segmentRate(selected) - purchaseRate(events))}%p`,
          forecastRevenue: money(
            sum(selected.events.filter((event) => event.event_name === "purchase")) +
              pipeline(selected.events)
          ),
          purchaseHistory: rank(selected.events, "category"),
          observedSignals: signals(selected.events),
          summary: `${segmentName(selected)}은 ${majorDropOff(selected.events)} 단계에서 개선 여지가 큽니다. 관찰 신호를 기준으로 메시지와 재고 안내를 조정하는 것이 좋습니다.`,
          purchaseFlow: buildFunnel(selected.events)
        }
      : undefined
  };
}

async function recommendations(project: string) {
  const events = await readEvents(project);
  return {
    actions: segments(events)
      .slice(0, 6)
      .map((segment, index) => ({
        id: `recommendation-${index + 1}`,
        segment: customerSegment(segment),
        action: signals(segment.events).some((signal) => signal.includes("품절"))
          ? "재입고 알림과 대체 상품 쿠폰을 함께 발송"
          : "구매 직전 이탈 고객에게 개인화 쿠폰 메시지 발송",
        rationale: `${segmentName(segment)}에서 ${majorDropOff(segment.events)} 이탈과 ${signals(segment.events).join(", ")} 신호가 관찰되었습니다.`,
        expectedConversionLift: `${Math.max(1, Math.round((100 - segmentRate(segment)) / 10))}%p`,
        forecastRevenue: money(
          sum(segment.events.filter((event) => event.event_name === "purchase")) +
            pipeline(segment.events)
        ),
        priority: index < 2 ? "high" : index < 4 ? "medium" : "low",
        channels: [segment.channel],
        purchaseFlow: buildFunnel(segment.events)
      }))
  };
}

async function creatives(project: string) {
  const events = await readEvents(project);
  return {
    creatives: segments(events)
      .slice(0, 3)
      .map((segment, index) => ({
        id: `creative-${index + 1}`,
        segment: customerSegment(segment),
        copy: {
          headline: `${categoryLabel(segment.category)} 혜택을 이어가세요`,
          body: `${segment.ageGroup} ${genderLabel(segment.gender)} 고객에게 반응이 좋았던 ${categoryLabel(segment.category)} 캠페인 혜택을 다시 제안합니다.`,
          cta: `${categoryLabel(segment.category)} 추천 보기`
        },
        imageAsset: {
          label: `${segment.channel} 소재에 들어갈 ${categoryLabel(segment.category)} 상품 이미지 영역`
        },
        videoAsset: {
          label: `${segment.ageGroup} ${genderLabel(segment.gender)} 고객에게 노출할 6초 영상 소재 영역`
        },
        channels: [segment.channel],
        approvalStatus: "pending",
        abTestStatus: index === 0 ? "running" : "not_started"
      }))
  };
}

function buildFunnel(events: EventRecord[]): FunnelStep[] {
  let previous = 0;
  return funnelSteps.map(([key, label], index) => {
    const count = new Set(
      events.filter((event) => event.event_name === key).map((event) => event.session_id)
    ).size;
    const conversionRate = index === 0 ? 100 : ratio(count, previous);
    previous = count;
    return {
      key,
      label,
      userCount: count,
      displayUserCount: fmt(count),
      conversionRate,
      dropOffRate: index === 0 ? 0 : round(100 - conversionRate)
    };
  });
}

function segments(events: EventRecord[]): SegmentStats[] {
  const map = new Map<string, EventRecord[]>();
  for (const event of events) {
    const key = [
      event.channel,
      event.age_group,
      event.gender,
      event.category,
      event.properties.region ?? "미확인",
      event.device
    ].join("|");
    map.set(key, [...(map.get(key) ?? []), event]);
  }
  return [...map.entries()].map(([id, group]) => {
    const first = group[0]!;
    return {
      id,
      channel: first.channel,
      ageGroup: first.age_group,
      gender: first.gender,
      category: first.category,
      region: first.properties.region ?? "미확인",
      device: first.device,
      events: group
    };
  });
}

function customerSegment(segment: SegmentStats): CustomerSegment {
  return {
    id: segment.id,
    name: segmentName(segment),
    channel: segment.channel,
    ageGroup: segment.ageGroup,
    gender: segment.gender,
    category: categoryLabel(segment.category),
    region: segment.region,
    device: segment.device,
    conversionRate: `${segmentRate(segment)}%`,
    majorDropOffStep: majorDropOff(segment.events)
  };
}

function rank(
  events: EventRecord[],
  key: "channel" | "region" | "ageGender" | "device" | "category"
): NamedPerformance[] {
  const counts = new Map<string, number>();
  for (const event of events.filter((item) => item.event_name === "purchase")) {
    const name =
      key === "region"
        ? (event.properties.region ?? "미확인")
        : key === "ageGender"
          ? `${event.age_group} ${genderLabel(event.gender)}`
          : key === "category"
            ? categoryLabel(event.category)
            : event[key];
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, displayValue: fmt(value) }));
}

function comparison(events: EventRecord[], key: "device" | "channel") {
  return [...new Set(events.map((event) => event[key]))].map((segment) => ({
    segment,
    steps: buildFunnel(events.filter((event) => event[key] === segment))
  }));
}

function series(events: EventRecord[]) {
  const max = Math.max(...events.map((event) => Date.parse(event.timestamp)), Date.now());
  return Array.from({ length: 15 }, (_, index) => {
    const time = max - (14 - index) * 60_000;
    const label = new Date(time).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit"
    });
    const value = events.filter(
      (event) => Math.abs(Date.parse(event.timestamp) - time) < 30_000
    ).length;
    return { label, value, displayValue: fmt(value) };
  });
}

function projection(value: number) {
  return ["Day 1", "Day 2", "Day 3", "Day 4"].map((label, index) => ({
    label,
    value: Math.round((value * (index + 1)) / 4),
    displayValue: money(Math.round((value * (index + 1)) / 4))
  }));
}

function segmentRate(segment: SegmentStats) {
  return ratio(
    new Set(
      segment.events
        .filter((event) => event.event_name === "purchase")
        .map((event) => event.session_id)
    ).size,
    new Set(segment.events.map((event) => event.session_id)).size
  );
}

function purchaseRate(events: EventRecord[]) {
  return ratio(
    new Set(
      events.filter((event) => event.event_name === "purchase").map((event) => event.session_id)
    ).size,
    new Set(
      events.filter((event) => event.event_name === "page_view").map((event) => event.session_id)
    ).size
  );
}

function majorDropOff(events: EventRecord[]) {
  return (
    buildFunnel(events)
      .slice(1)
      .sort((a, b) => b.dropOffRate - a.dropOffRate)[0]?.label ?? "페이지 방문"
  );
}

function recentEvents(events: EventRecord[]) {
  const max = Math.max(...events.map((event) => Date.parse(event.timestamp)), Date.now());
  return events.filter((event) => Date.parse(event.timestamp) >= max - 15 * 60_000);
}

function signals(events: EventRecord[]) {
  return [
    ...new Set(
      events
        .flatMap((event) => [
          event.inventory_status === "out_of_stock" ? "품절" : undefined,
          event.properties.signal
        ])
        .filter((signal): signal is string => Boolean(signal))
    )
  ];
}

function pipeline(events: EventRecord[]) {
  return Math.max(
    sum(events.filter((event) => event.event_name === "checkout_start")) -
      sum(events.filter((event) => event.event_name === "purchase")),
    0
  );
}

function sum(events: EventRecord[]) {
  return events.reduce((total, event) => total + event.price, 0);
}

function ratio(numerator: number, denominator: number) {
  return denominator <= 0 ? 0 : round((numerator / denominator) * 100);
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function fmt(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function money(value: number) {
  if (value >= 100_000_000) return `${round(value / 100_000_000)}억`;
  if (value >= 10_000) return `${round(value / 10_000)}만`;
  return `${fmt(value)}원`;
}

function categoryLabel(value: string) {
  return (
    new Map([
      ["fresh_food", "신선식품"],
      ["milk_kit", "밀키트"],
      ["dessert", "디저트"],
      ["butcher", "정육"],
      ["health_food", "건강식품"]
    ]).get(value) ?? value
  );
}

function genderLabel(value: string) {
  return (
    new Map([
      ["male", "남성"],
      ["female", "여성"]
    ]).get(value) ?? value
  );
}

function segmentName(
  segment: Pick<SegmentStats, "category" | "channel" | "ageGroup" | "gender" | "device">
) {
  return `${categoryLabel(segment.category)} ${segment.channel} ${segment.ageGroup} ${genderLabel(segment.gender)} ${segment.device}`;
}

function parseProperties(value: string) {
  try {
    return JSON.parse(value) as EventRecord["properties"];
  } catch {
    return {};
  }
}

function toClickHouseDateTime(date: Date) {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function projectId(request: express.Request) {
  return typeof request.query.projectId === "string" && request.query.projectId
    ? request.query.projectId
    : env.projectId;
}

function success<T>(data: T) {
  return { requestId: crypto.randomUUID(), data };
}
