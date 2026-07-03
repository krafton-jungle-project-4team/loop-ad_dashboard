import { createClient } from "@clickhouse/client";
import pg from "pg";

const PROJECT_ID = "demo-shop";
const WRITE_KEY = "wk_demo_shop";
const CAMPAIGN_ID = "camp_demo_summer";
const PROMOTION_ID = "promo_demo_weekend";
const ANALYSIS_ID = "analysis_demo_weekend";
const GENERATION_ID = "gen_demo_weekend";
const PROMOTION_RUN_ID = "run_demo_weekend_001";
const FUNNEL_ID = "funnel_demo_booking";

const SEGMENTS = [
  {
    segmentId: "seg_family_weekend",
    vectorId: "vec_family_weekend",
    experimentId: "exp_family_weekend",
    contentId: "content_family_weekend",
    contentOptionId: "option_family_a",
    name: "Family weekend planners",
    channel: "email",
    sampleSize: 1240
  },
  {
    segmentId: "seg_mobile_last_minute",
    vectorId: "vec_mobile_last_minute",
    experimentId: "exp_mobile_last_minute",
    contentId: "content_mobile_last_minute",
    contentOptionId: "option_mobile_a",
    name: "Mobile last-minute bookers",
    channel: "sms",
    sampleSize: 860
  }
];

const USERS = ["user_demo_001", "user_demo_002", "user_demo_003", "user_demo_004"];
const EVENT_NAMES = [
  "hotel_search",
  "hotel_detail_view",
  "promotion_impression",
  "promotion_click",
  "booking_complete"
];

const postgresConfig = {
  host: requiredEnv("LOOPAD_AURORA_HOST"),
  port: Number.parseInt(requiredEnv("LOOPAD_AURORA_PORT"), 10),
  database: requiredEnv("LOOPAD_AURORA_DATABASE"),
  user: requiredEnv("LOOPAD_AURORA_USERNAME"),
  password: requiredEnv("LOOPAD_AURORA_PASSWORD")
};

const clickhouse = createClient({
  url: requiredEnv("LOOPAD_CLICKHOUSE_URL"),
  database: requiredEnv("LOOPAD_CLICKHOUSE_DATABASE"),
  username: requiredEnv("LOOPAD_CLICKHOUSE_USERNAME"),
  password: requiredEnv("LOOPAD_CLICKHOUSE_PASSWORD")
});

const postgres = new pg.Client(postgresConfig);

try {
  await seedPostgres();
  const clickHouseCounts = await seedClickHouse();

  console.log(
    JSON.stringify(
      {
        project_id: PROJECT_ID,
        postgres_seeded: true,
        clickhouse_counts: clickHouseCounts
      },
      null,
      2
    )
  );
} finally {
  await postgres.end().catch(() => undefined);
  await clickhouse.close();
}

async function seedPostgres() {
  await postgres.connect();
  await postgres.query("BEGIN");

  try {
    await deletePostgresDemoRows();
    await insertPostgresDemoRows();
    await postgres.query("COMMIT");
  } catch (error) {
    await postgres.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

async function deletePostgresDemoRows() {
  const projectParam = [PROJECT_ID];

  await postgres.query("DELETE FROM user_segment_assignments WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM ad_experiments WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM content_candidates WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM promotion_target_segments WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM segment_vectors WHERE project_id = $1", projectParam);
  await postgres.query(
    [
      "DELETE FROM funnel_steps",
      "USING funnel_definitions",
      "WHERE funnel_steps.funnel_id = funnel_definitions.funnel_id",
      "AND funnel_definitions.project_id = $1"
    ].join(" "),
    projectParam
  );
  await postgres.query("DELETE FROM funnel_definitions WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM promotion_runs WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM generation_runs WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM promotion_analyses WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM promotions WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM segment_definitions WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM segment_query_previews WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM campaigns WHERE project_id = $1", projectParam);
  await postgres.query("DELETE FROM projects WHERE project_id = $1", projectParam);
}

async function insertPostgresDemoRows() {
  await postgres.query(
    [
      "INSERT INTO projects",
      "(project_id, project_name, domain, write_key, industry, status)",
      "VALUES ($1, $2, $3, $4, $5, $6)"
    ].join(" "),
    [PROJECT_ID, "LoopAd Demo Hotel", "demo.loop-ad.local", WRITE_KEY, "hotel_booking", "active"]
  );

  await postgres.query(
    [
      "INSERT INTO campaigns",
      "(campaign_id, project_id, name, objective, target_audience, start_date, end_date, primary_metric, status)",
      "VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9)"
    ].join(" "),
    [
      CAMPAIGN_ID,
      PROJECT_ID,
      "Summer booking lift",
      "Increase hotel booking conversion for warm returning users.",
      "existing_users",
      "2026-06-01",
      "2026-08-31",
      "booking_conversion_rate",
      "active"
    ]
  );

  for (const segment of SEGMENTS) {
    await postgres.query(
      [
        "INSERT INTO segment_query_previews",
        "(",
        "query_preview_id, project_id, created_by, natural_language_query, generated_sql,",
        "query_params_json, sample_size, total_eligible_user_count, sample_ratio, sample_size_status,",
        "result_columns_json, result_preview_json, status",
        ")",
        "VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13)"
      ].join(" "),
      [
        `preview_${segment.segmentId}`,
        PROJECT_ID,
        "data-explorer-seed",
        `Find ${segment.name.toLowerCase()}.`,
        "SELECT user_id FROM user_behavior_vectors WHERE project_id = :project_id LIMIT 500",
        json({ project_id: PROJECT_ID }),
        segment.sampleSize,
        2400,
        Number((segment.sampleSize / 2400).toFixed(3)),
        "valid",
        json(["user_id", "segment_score"]),
        json([{ user_id: "user_demo_001", segment_score: 0.91 }]),
        "previewed"
      ]
    );

    await postgres.query(
      [
        "INSERT INTO segment_definitions",
        "(",
        "segment_id, project_id, segment_name, source, query_preview_id, natural_language_query,",
        "generated_sql, rule_json, profile_json, sample_size, total_eligible_user_count, sample_ratio, status",
        ")",
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13)"
      ].join(" "),
      [
        segment.segmentId,
        PROJECT_ID,
        segment.name,
        "custom_chatkit",
        `preview_${segment.segmentId}`,
        `Find ${segment.name.toLowerCase()}.`,
        "SELECT user_id FROM user_behavior_vectors WHERE project_id = :project_id LIMIT 500",
        json({ channel: segment.channel, hotel_market: "seoul" }),
        json({ persona: segment.name, expected_channel: segment.channel }),
        segment.sampleSize,
        2400,
        Number((segment.sampleSize / 2400).toFixed(3)),
        "active"
      ]
    );
  }

  await postgres.query(
    [
      "INSERT INTO promotions",
      "(",
      "promotion_id, project_id, campaign_id, channel, marketing_theme, target_audience,",
      "goal_metric, goal_target_value, goal_basis, message_brief, offer_type, landing_url,",
      "landing_type, budget_json, metadata_json, status",
      ")",
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16)"
    ].join(" "),
    [
      PROMOTION_ID,
      PROJECT_ID,
      CAMPAIGN_ID,
      "email",
      "summer_sale",
      "existing_users",
      "booking_conversion_rate",
      0.12,
      "promotion_average",
      "Promote weekend hotel inventory with family-friendly perks.",
      "late_checkout",
      "https://demo.loop-ad.local/hotels/summer-weekend",
      "hotel_detail_page",
      json({ daily_budget_krw: 500000 }),
      json({ seed: true, owner: "data-explorer" }),
      "running"
    ]
  );

  await postgres.query(
    [
      "INSERT INTO promotion_analyses",
      "(",
      "analysis_id, project_id, campaign_id, promotion_id, focus_segment_ids_json, operator_instruction,",
      "input_snapshot_json, profile_summary_json, output_json, status",
      ")",
      "VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10)"
    ].join(" "),
    [
      ANALYSIS_ID,
      PROJECT_ID,
      CAMPAIGN_ID,
      PROMOTION_ID,
      json(SEGMENTS.map((segment) => segment.segmentId)),
      "Create a read-only demo analysis for Data Explorer.",
      json({ window: "last_14_days" }),
      json({ key_segments: SEGMENTS.map((segment) => segment.name) }),
      json({ recommendation: "Use channel-specific urgency and family perks." }),
      "completed"
    ]
  );

  await postgres.query(
    [
      "INSERT INTO generation_runs",
      "(",
      "generation_id, analysis_id, project_id, campaign_id, promotion_id, content_option_count,",
      "operator_instruction, input_json, output_json, generation_report_json, status",
      ")",
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11)"
    ].join(" "),
    [
      GENERATION_ID,
      ANALYSIS_ID,
      PROJECT_ID,
      CAMPAIGN_ID,
      PROMOTION_ID,
      2,
      "Generate copy candidates for demo segments.",
      json({ segments: SEGMENTS.map((segment) => segment.segmentId) }),
      json({ content_ids: SEGMENTS.map((segment) => segment.contentId) }),
      json({ generated_by: "seed-data-explorer-demo" }),
      "completed"
    ]
  );

  await postgres.query(
    [
      "INSERT INTO promotion_runs",
      "(",
      "promotion_run_id, project_id, campaign_id, promotion_id, analysis_id, generation_id,",
      "loop_count, status, goal_snapshot_json",
      ")",
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)"
    ].join(" "),
    [
      PROMOTION_RUN_ID,
      PROJECT_ID,
      CAMPAIGN_ID,
      PROMOTION_ID,
      ANALYSIS_ID,
      GENERATION_ID,
      1,
      "running",
      json({ seeded_at: new Date().toISOString() })
    ]
  );

  for (const [index, segment] of SEGMENTS.entries()) {
    await insertSegmentVector(segment, index);
    await insertPromotionTargetSegment(segment, index);
    await insertContentCandidate(segment, index);
    await insertAdExperiment(segment, index);
  }

  await insertAssignments();
  await insertFunnel();
}

async function insertSegmentVector(segment, index) {
  await postgres.query(
    [
      "INSERT INTO segment_vectors",
      "(",
      "segment_vector_id, project_id, segment_id, promotion_id, promotion_run_id, analysis_id,",
      "vector_dim, vector_values, vector_version, source",
      ")",
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)"
    ].join(" "),
    [
      segment.vectorId,
      PROJECT_ID,
      segment.segmentId,
      PROMOTION_ID,
      PROMOTION_RUN_ID,
      ANALYSIS_ID,
      64,
      json(Array.from({ length: 64 }, (_, vectorIndex) => Number((0.01 * vectorIndex + index).toFixed(4)))),
      "demo-v1",
      "fixture"
    ]
  );
}

async function insertPromotionTargetSegment(segment, index) {
  await postgres.query(
    [
      "INSERT INTO promotion_target_segments",
      "(",
      "analysis_id, project_id, campaign_id, promotion_id, segment_id, segment_name, segment_vector_id,",
      "rule_json, profile_json, content_brief_json, data_evidence_json, estimated_size, priority, status",
      ")",
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14)"
    ].join(" "),
    [
      ANALYSIS_ID,
      PROJECT_ID,
      CAMPAIGN_ID,
      PROMOTION_ID,
      segment.segmentId,
      segment.name,
      segment.vectorId,
      json({ channel: segment.channel, recent_intent: true }),
      json({ persona: segment.name, channel: segment.channel }),
      json({ tone: index === 0 ? "family benefit" : "urgent short copy" }),
      json({ reason: "Demo audience with recent booking intent." }),
      segment.sampleSize,
      index === 0 ? "high" : "medium",
      "running"
    ]
  );
}

async function insertContentCandidate(segment, index) {
  await postgres.query(
    [
      "INSERT INTO content_candidates",
      "(",
      "content_id, content_option_id, generation_id, analysis_id, project_id, campaign_id, promotion_id,",
      "segment_id, channel, subject, preheader, title, body, cta, message, image_prompt, landing_url,",
      "generation_prompt, reason_summary, data_evidence_json, message_strategy, metadata_json, status",
      ")",
      "VALUES (",
      "$1, $2, $3, $4, $5, $6, $7, $8, $9,",
      "$10, $11, $12, $13, $14, $15, $16, $17,",
      "$18, $19, $20::jsonb, $21, $22::jsonb, $23",
      ")"
    ].join(" "),
    [
      segment.contentId,
      segment.contentOptionId,
      GENERATION_ID,
      ANALYSIS_ID,
      PROJECT_ID,
      CAMPAIGN_ID,
      PROMOTION_ID,
      segment.segmentId,
      segment.channel,
      index === 0 ? "This weekend: family rooms with late checkout" : "Tonight only: mobile deal near you",
      "LoopAd demo hotel offer",
      index === 0 ? "Plan the easy family weekend" : "Book the last-minute stay",
      index === 0
        ? "Reserve a family-ready hotel room and keep the room longer on Sunday."
        : "Grab a nearby hotel deal before tonight's inventory closes.",
      index === 0 ? "See family stays" : "Book tonight",
      index === 0
        ? "Late checkout and breakfast perks for returning family travelers."
        : "A short urgency message for mobile users with strong recent intent.",
      "Bright hotel room, warm daylight, clean ecommerce ad composition",
      "https://demo.loop-ad.local/hotels/summer-weekend",
      "Generate concise hotel booking ad copy.",
      "Matches recent search and detail-view behavior.",
      json({ events_7d: 45 + index * 8, clicks_7d: 12 + index * 4 }),
      index === 0 ? "benefit-led" : "urgency-led",
      json({ seed: true }),
      "approved"
    ]
  );
}

async function insertAdExperiment(segment, index) {
  await postgres.query(
    [
      "INSERT INTO ad_experiments",
      "(",
      "ad_experiment_id, project_id, campaign_id, promotion_id, promotion_run_id, analysis_id,",
      "generation_id, segment_id, segment_name, content_id, content_option_id, channel,",
      "loop_count, status, goal_metric, goal_target_value, goal_basis, started_at",
      ")",
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, now() - ($18::int * interval '1 day'))"
    ].join(" "),
    [
      segment.experimentId,
      PROJECT_ID,
      CAMPAIGN_ID,
      PROMOTION_ID,
      PROMOTION_RUN_ID,
      ANALYSIS_ID,
      GENERATION_ID,
      segment.segmentId,
      segment.name,
      segment.contentId,
      segment.contentOptionId,
      segment.channel,
      1,
      "running",
      "booking_conversion_rate",
      index === 0 ? 0.12 : 0.1,
      "promotion_average",
      6
    ]
  );
}

async function insertAssignments() {
  for (const [index, userId] of USERS.entries()) {
    const segment = SEGMENTS[index % SEGMENTS.length];
    await postgres.query(
      [
        "INSERT INTO user_segment_assignments",
        "(",
        "project_id, promotion_run_id, user_id, segment_id, ad_experiment_id, content_id,",
        "content_option_id, similarity_score, fallback, assignment_source, assigned_at, expires_at",
        ")",
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, now() - interval '2 days', now() + interval '5 days')"
      ].join(" "),
      [
        PROJECT_ID,
        PROMOTION_RUN_ID,
        userId,
        segment.segmentId,
        segment.experimentId,
        segment.contentId,
        segment.contentOptionId,
        0.94 - index * 0.04,
        "fixture"
      ]
    );

  }
}

async function insertFunnel() {
  await postgres.query(
    [
      "INSERT INTO funnel_definitions",
      "(funnel_id, project_id, campaign_id, promotion_id, funnel_name, domain_type, channel, landing_type, status)",
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
    ].join(" "),
    [
      FUNNEL_ID,
      PROJECT_ID,
      CAMPAIGN_ID,
      PROMOTION_ID,
      "Hotel booking funnel",
      "hotel_booking",
      "email",
      "hotel_detail_page",
      "active"
    ]
  );

  for (const [stepOrder, step] of [
    ["Search", "hotel_search"],
    ["Detail view", "hotel_detail_view"],
    ["Promotion click", "promotion_click"],
    ["Booking complete", "booking_complete"]
  ].entries()) {
    await postgres.query(
      [
        "INSERT INTO funnel_steps",
        "(funnel_id, step_order, step_name, event_name, condition_json)",
        "VALUES ($1, $2, $3, $4, $5::jsonb)"
      ].join(" "),
      [FUNNEL_ID, stepOrder + 1, step[0], step[1], json({ project_id: PROJECT_ID })]
    );
  }
}

async function seedClickHouse() {
  await deleteClickHouseDemoRows();

  const rawEvents = buildRawEvents();
  const vectors = buildUserBehaviorVectors();

  await insertClickHouseRows("raw_events", rawEvents);
  await insertClickHouseRows("user_behavior_vectors", vectors);

  return {
    raw_events: await countClickHouseRows("raw_events"),
    promotion_touch_events: await countClickHouseRows("promotion_touch_events"),
    booking_outcome_events: await countClickHouseRows("booking_outcome_events"),
    user_behavior_vectors: await countClickHouseRows("user_behavior_vectors")
  };
}

async function deleteClickHouseDemoRows() {
  for (const table of [
    "raw_events",
    "promotion_touch_events",
    "booking_outcome_events",
    "user_behavior_vectors"
  ]) {
    await clickhouse.command({
      query: `ALTER TABLE ${table} DELETE WHERE project_id = '${PROJECT_ID}'`,
      clickhouse_settings: {
        mutations_sync: 1
      }
    });
  }
}

async function insertClickHouseRows(table, rows) {
  await clickhouse.insert({
    table,
    values: rows,
    format: "JSONEachRow"
  });
}

async function countClickHouseRows(table) {
  const result = await clickhouse.query({
    query: `SELECT count() AS count FROM ${table} WHERE project_id = {project_id:String}`,
    query_params: {
      project_id: PROJECT_ID
    },
    format: "JSONEachRow"
  });
  const rows = await result.json();
  return Number(rows[0]?.count ?? 0);
}

function buildRawEvents() {
  const rows = [];
  let eventIndex = 0;

  for (let dayOffset = 9; dayOffset >= 0; dayOffset -= 1) {
    for (const [userIndex, userId] of USERS.entries()) {
      for (const eventName of EVENT_NAMES) {
        if (eventName === "booking_complete" && (dayOffset + userIndex) % 3 === 1) {
          continue;
        }

        rows.push({
          project_id: PROJECT_ID,
          write_key: WRITE_KEY,
          schema_version: "1.0",
          event_id: `evt_demo_${eventIndex.toString().padStart(4, "0")}`,
          event_name: eventName,
          event_time: chDate(dayOffset, userIndex, eventIndex),
          source: "data-explorer-seed",
          user_id: userId,
          session_id: `sess_demo_${dayOffset}_${userIndex}`,
          properties_json: json({
            campaign_id: CAMPAIGN_ID,
            promotion_id: PROMOTION_ID,
            hotel_market: userIndex % 2 === 0 ? "seoul" : "busan",
            device: userIndex % 2 === 0 ? "mobile" : "desktop"
          }),
          validation_status: "valid"
        });
        eventIndex += 1;
      }
    }
  }

  return rows;
}

function buildUserBehaviorVectors() {
  return USERS.map((userId, index) => ({
    project_id: PROJECT_ID,
    user_id: userId,
    vector_dim: 4,
    vector_values: [0.1 + index, 0.2 + index, 0.3 + index, 0.4 + index],
    vector_version: "demo-v1",
    source: "data-explorer-seed",
    window_start: chDate(14, index, 0),
    window_end: chDate(0, index, 0)
  }));
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function chDate(dayOffset, hourSeed, secondSeed) {
  const date = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
  date.setUTCHours(3 + hourSeed, secondSeed % 60, 0, 0);
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function json(value) {
  return JSON.stringify(value);
}
