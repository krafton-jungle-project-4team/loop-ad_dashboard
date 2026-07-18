import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardSql = readFileSync(
  new URL("../src/features/dashboard/database/dashboard.sql", import.meta.url),
  "utf8"
);
const adExecutionSql = readFileSync(
  new URL("../src/features/ad-execution/database/ad-execution.sql", import.meta.url),
  "utf8"
);

test("promotion offer links are stored without replacing unrelated metadata", () => {
  const insertPromotionSql = namedQuery(
    dashboardSql,
    "InsertDashboardPromotion",
    "UpdateDashboardPromotion"
  );
  const updatePromotionSql = namedQuery(
    dashboardSql,
    "UpdateDashboardPromotion",
    "StopDashboardPromotion"
  );

  assert.match(insertPromotionSql, /jsonb_build_object\('offer_links', :offerLinksJson::jsonb\)/);
  assert.match(
    updatePromotionSql,
    /jsonb_set\(metadata_json, '\{offer_links\}', :offerLinksJson::jsonb, true\)/
  );
  assert.match(updatePromotionSql, /ELSE metadata_json/);
});

test("redirect lookup uses the destination snapshot stored for each link", () => {
  const findRedirectSql = namedQuery(adExecutionSql, "FindRedirectLinkByToken");

  assert.match(findRedirectSql, /rl\.target_url AS "destinationUrl"/);
  assert.doesNotMatch(findRedirectSql, /JOIN promotions/);
});

function namedQuery(sql: string, name: string, nextName?: string): string {
  const start = sql.indexOf(`/* @name ${name} */`);
  const end = nextName ? sql.indexOf(`/* @name ${nextName} */`, start) : sql.length;

  assert.notEqual(start, -1, `${name} query is missing`);
  assert.notEqual(end, -1, `${nextName ?? "end of file"} is missing`);
  return sql.slice(start, end);
}
