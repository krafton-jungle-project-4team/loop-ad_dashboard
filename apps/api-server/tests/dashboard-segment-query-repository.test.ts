import assert from "node:assert/strict";
import test from "node:test";
import { serializeJsonDatabaseParameter } from "../src/features/dashboard/repository/dashboard-json-parameter.js";

test("PostgreSQL JSONB 입력은 배열도 JSON 문자열로 직렬화한다", () => {
  assert.equal(
    serializeJsonDatabaseParameter(["user_id", "event_count"]),
    '["user_id","event_count"]'
  );
  assert.equal(
    serializeJsonDatabaseParameter([{ user_id: "user_1", event_count: 3 }]),
    '[{"user_id":"user_1","event_count":3}]'
  );
});

test("구조화 세그먼트 계획은 중첩 JSON 형태를 유지한다", () => {
  assert.equal(
    serializeJsonDatabaseParameter({
      assistant_plan: {
        action: "audience_query",
        conditions: [{ field: "destination_name", operator: "contains", value: "제주" }]
      }
    }),
    '{"assistant_plan":{"action":"audience_query","conditions":[{"field":"destination_name","operator":"contains","value":"제주"}]}}'
  );
});
