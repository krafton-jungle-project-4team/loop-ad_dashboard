import assert from "node:assert/strict";
import test from "node:test";
import type {
  DashboardContentCandidate,
  DashboardReviseContentCandidateHtmlResult,
  DashboardSaveContentCandidateHtmlResult,
  DashboardSegmentDetail
} from "@loopad/shared";
import { reconcileContentCandidateRevision } from "../src/features/dashboard/ui/pages/campaign/promotion/promotionContentCandidateCache.js";

test("AI revision updates banner copy and preview URL without mutating cached detail", () => {
  const target = contentCandidate("content-a", "onsite_banner");
  const untouched = contentCandidate("content-b", "onsite_banner");
  const current = { content_candidates: [target, untouched] } as DashboardSegmentDetail;

  const revised = reconcileContentCandidateRevision(current, revision());

  assert.ok(revised);
  assert.notEqual(revised, current);
  assert.equal(current.content_candidates[0]?.title, "기존 제목");
  assert.equal(revised.content_candidates[0]?.title, "새 제목");
  assert.equal(revised.content_candidates[0]?.body, "새 본문");
  assert.equal(revised.content_candidates[0]?.cta, "혜택 보기");
  assert.equal(revised.content_candidates[1], untouched);
  const creative = revised.content_candidates[0]?.metadata_json.creative as Record<string, unknown>;
  const artifact = creative.artifact as Record<string, unknown>;
  assert.equal(artifact.public_url, "https://dashboard.api.dev.loop-ad.org/revised.html");
});

test("AI revision updates an email subject while preserving its nullable title", () => {
  const target = contentCandidate("content-a", "email");
  const current = { content_candidates: [target] } as DashboardSegmentDetail;

  const revised = reconcileContentCandidateRevision(current, revision());

  assert.ok(revised);
  assert.equal(revised.content_candidates[0]?.subject, "새 제목");
  assert.equal(revised.content_candidates[0]?.title, target.title);
});

test("AI revision safely updates copy when creative metadata is absent", () => {
  const target = { ...contentCandidate("content-a", "onsite_banner"), metadata_json: {} };
  const current = { content_candidates: [target] } as DashboardSegmentDetail;

  const revised = reconcileContentCandidateRevision(current, revision());

  assert.ok(revised);
  assert.equal(revised.content_candidates[0]?.title, "새 제목");
  assert.deepEqual(revised.content_candidates[0]?.metadata_json, {});
});

test("manual HTML save refreshes the cached preview URL", () => {
  const target = contentCandidate("content-a", "onsite_banner");
  const current = { content_candidates: [target] } as DashboardSegmentDetail;
  const saved: DashboardSaveContentCandidateHtmlResult = {
    body: "기존 본문",
    content_id: "content-a",
    cta: "예약하기",
    headline: "기존 제목",
    html: "<article>수정된 레이아웃</article>",
    html_url: "https://dashboard.api.dev.loop-ad.org/manual.html?revision=abc",
    promotion_id: "promotion-a",
    revision: "a".repeat(64),
    segment_id: "segment-a",
    status: "draft",
    updated_at: "2026-07-21T00:00:00.000Z"
  };

  const revised = reconcileContentCandidateRevision(current, saved);

  assert.ok(revised);
  const creative = revised.content_candidates[0]?.metadata_json.creative as Record<string, unknown>;
  const artifact = creative.artifact as Record<string, unknown>;
  assert.equal(artifact.public_url, saved.html_url);
});

function revision(): DashboardReviseContentCandidateHtmlResult {
  return {
    body: "새 본문",
    change_summary: "색상과 정보 위계를 조정했습니다.",
    content_id: "content-a",
    cta: "혜택 보기",
    headline: "새 제목",
    html_url: "https://dashboard.api.dev.loop-ad.org/revised.html",
    promotion_id: "promotion-a",
    segment_id: "segment-a",
    status: "draft",
    updated_at: "2026-07-21T00:00:00.000Z"
  };
}

function contentCandidate(contentId: string, channel: string): DashboardContentCandidate {
  return {
    analysis_id: "analysis-a",
    body: "기존 본문",
    channel,
    content_id: contentId,
    content_option_id: `option-${contentId}`,
    cta: "예약하기",
    data_evidence_json: {},
    generation_id: "generation-a",
    generation_prompt: null,
    image_prompt: null,
    image_url: null,
    landing_url: "https://example.com",
    message: null,
    message_strategy: null,
    metadata_json: {
      creative: {
        artifact: {
          artifact_status: "published",
          creative_format: channel === "email" ? "email_html" : "banner_html",
          public_url: "https://assets.example.com/original.html"
        }
      }
    },
    next_loop_preparation_id: null,
    preheader: null,
    promotion_id: "promotion-a",
    reason_summary: null,
    segment_id: "segment-a",
    status: "draft",
    subject: channel === "email" ? "기존 제목" : null,
    title: channel === "email" ? null : "기존 제목",
    updated_at: "2026-07-20T00:00:00.000Z"
  };
}
