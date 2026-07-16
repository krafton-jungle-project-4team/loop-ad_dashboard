import assert from "node:assert/strict";
import { test } from "node:test";
import type { DashboardContentCandidate } from "@loopad/shared";
import {
  contentCandidateCopy,
  contentCandidateHtmlRevision,
  contentCandidateHtmlUrl,
  editableCreative,
  editedCreativeMetadata,
  rewriteCreativeHtmlCopy
} from "../src/features/dashboard/service/content-candidate-copy.js";

test("generated HTML copy is replaced without changing the surrounding design", () => {
  const candidate = contentCandidate();
  const rewritten = rewriteCreativeHtmlCopy(
    "<article><h1>기존 제목</h1><p>첫 줄<br>둘째 줄</p><a>예약하기</a></article>",
    contentCandidateCopy(candidate),
    {
      headline: "새로운 <특가>",
      body: "새 첫 줄\n새 둘째 줄",
      cta: "혜택 보기"
    }
  );

  assert.deepEqual(rewritten.missingFields, []);
  assert.equal(
    rewritten.html,
    "<article><h1>새로운 &lt;특가&gt;</h1><p>새 첫 줄<br>새 둘째 줄</p><a>혜택 보기</a></article>"
  );
});

test("appending to single-line copy replaces the original text only once", () => {
  const rewritten = rewriteCreativeHtmlCopy(
    "<article><p>기존 문구</p></article>",
    { headline: "제목", body: "기존 문구", cta: "버튼" },
    { headline: "제목", body: "기존 문구 추가", cta: "버튼" }
  );

  assert.deepEqual(rewritten.missingFields, []);
  assert.equal(rewritten.html, "<article><p>기존 문구 추가</p></article>");
});

test("edited creative metadata points serving to the dashboard HTML revision", () => {
  const candidate = contentCandidate();
  const creative = editableCreative(candidate);
  assert.ok(creative);
  const html = "<h1>새 제목</h1>";
  const revision = contentCandidateHtmlRevision(html);
  const htmlUrl = contentCandidateHtmlUrl({
    contentId: candidate.content_id,
    origin: "https://dashboard.api.dev.loop-ad.org",
    projectId: "project-a",
    promotionId: candidate.promotion_id,
    revision,
    segmentId: candidate.segment_id
  });
  const edited = editedCreativeMetadata({ candidate, creative, html, htmlUrl });
  const editedCreative = edited.metadataJson.creative as Record<string, unknown>;
  const artifact = editedCreative.artifact as Record<string, unknown>;

  assert.equal(editedCreative.edited_html, html);
  assert.equal(artifact.public_url, htmlUrl);
  assert.equal(artifact.sha256, revision);
  assert.equal("storage_key" in artifact, false);
  assert.match(htmlUrl, /\/content-candidates\/content-a\/html\?/);
});

function contentCandidate(): DashboardContentCandidate {
  return {
    analysis_id: "analysis-a",
    body: "첫 줄\n둘째 줄",
    channel: "onsite_banner",
    content_id: "content-a",
    content_option_id: "option-a",
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
          creative_format: "banner_html",
          public_url: "https://assets.example.com/content-a.html",
          storage_key: "generated/content-a.html"
        }
      }
    },
    preheader: null,
    promotion_id: "promotion-a",
    reason_summary: null,
    segment_id: "segment-a",
    status: "draft",
    subject: null,
    title: "기존 제목",
    updated_at: "2026-07-16T00:00:00.000Z"
  };
}
