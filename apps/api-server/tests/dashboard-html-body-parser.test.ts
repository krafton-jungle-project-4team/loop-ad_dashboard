import assert from "node:assert/strict";
import test from "node:test";
import {
  DASHBOARD_HTML_EDITOR_JSON_WIRE_LIMIT_BYTES,
  isDashboardHtmlEditorJsonRequest,
  isDefaultJsonRequest
} from "../src/infra/http/dashboard-html-body-parser.js";

test("dashboard HTML editor alone receives the larger JSON wire limit", () => {
  const preview = request(
    "POST",
    "/api/dashboard/v1/promotions/promotion-a/segments/segment-a/content-candidates/content-a/html/preview?project_id=project-a"
  );
  const save = request(
    "PUT",
    "/api/dashboard/v1/promotions/promotion-a/segments/segment-a/content-candidates/content-a/html/source"
  );
  const unrelated = request("POST", "/api/dashboard/v1/projects");

  assert.equal(isDashboardHtmlEditorJsonRequest(preview), true);
  assert.equal(isDashboardHtmlEditorJsonRequest(save), true);
  assert.equal(isDefaultJsonRequest(preview), false);
  assert.equal(isDefaultJsonRequest(save), false);
  assert.equal(isDashboardHtmlEditorJsonRequest(unrelated), false);
  assert.equal(isDefaultJsonRequest(unrelated), true);
});

test("dashboard HTML editor wire limit carries a fully escaped 2 MB JSON string", () => {
  const worstCaseHtml = "\u0000".repeat(2_000_000);
  const bodyBytes = Buffer.byteLength(JSON.stringify({ html: worstCaseHtml }));

  assert.ok(bodyBytes < DASHBOARD_HTML_EDITOR_JSON_WIRE_LIMIT_BYTES);
});

function request(method: string, url: string) {
  return {
    headers: { "content-type": "application/json; charset=utf-8" },
    method,
    url
  } as never;
}
