import assert from "node:assert/strict";
import { test } from "node:test";
import type { DashboardContentCandidate } from "@loopad/shared";
import {
  applyCreativeHtmlReplacementPatch,
  contentCandidateCopy,
  contentCandidateHtmlRevision,
  contentCandidateHtmlUrl,
  editableCreative,
  editedCreativeMetadata,
  rewriteCreativeHtmlCopy,
  sanitizeCreativeHtmlRevision
} from "../src/features/dashboard/service/content-candidate-copy.js";

test("exact HTML replacements are applied against the original source regardless of order", () => {
  const sourceHtml =
    '<article style="padding:16px"><h1 style="color:#111">기존 제목</h1><a>예약하기</a></article>';
  const revised = applyCreativeHtmlReplacementPatch(sourceHtml, [
    { before: "예약하기", after: "혜택 보기" },
    { before: "padding:16px", after: "padding:28px" },
    { before: "color:#111", after: "color:#7c3aed" }
  ]);

  assert.equal(
    revised,
    '<article style="padding:28px"><h1 style="color:#7c3aed">기존 제목</h1><a>혜택 보기</a></article>'
  );
});

test("exact HTML replacements reject missing, ambiguous, overlapping, and no-op patches", () => {
  assert.throws(
    () =>
      applyCreativeHtmlReplacementPatch("<p>본문</p>", [{ before: "없는 문구", after: "새 문구" }]),
    /did not match/
  );
  assert.throws(
    () =>
      applyCreativeHtmlReplacementPatch("<p>반복</p><p>반복</p>", [
        { before: "반복", after: "변경" }
      ]),
    /ambiguous/
  );
  assert.throws(
    () =>
      applyCreativeHtmlReplacementPatch("abcdef", [
        { before: "abc", after: "ABC" },
        { before: "bc", after: "BC" }
      ]),
    /overlap/
  );
  assert.throws(
    () =>
      applyCreativeHtmlReplacementPatch("<p>그대로</p>", [{ before: "그대로", after: "그대로" }]),
    /invalid/
  );
});

test("exact HTML replacements enforce operation and byte limits", () => {
  const sourceHtml = Array.from({ length: 13 }, (_, index) => `<i>${index}</i>`).join("");
  assert.throws(
    () =>
      applyCreativeHtmlReplacementPatch(
        sourceHtml,
        Array.from({ length: 13 }, (_, index) => ({
          before: `<i>${index}</i>`,
          after: `<b>${index}</b>`
        }))
      ),
    /operation count/
  );
  assert.throws(
    () =>
      applyCreativeHtmlReplacementPatch("<p>본문</p>", [
        { before: "본문", after: "x".repeat(8_001) }
      ]),
    /invalid/
  );
});

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

test("AI HTML revision preserves dispatch placeholders and existing resources", () => {
  const sourceHtml = [
    "<html><head><style>.card{color:#111}</style></head><body>",
    '<article class="card"><h1>기존 제목</h1><p>기존 본문</p>',
    '<a href="{{redirect_url}}">예약하기</a>',
    '<img alt="" src="{{open_pixel_url}}"></article></body></html>'
  ].join("");
  const revised = sanitizeCreativeHtmlRevision({
    copy: { headline: "새 제목", body: "새 본문", cta: "혜택 보기" },
    revisedHtml: [
      "<html><head><style>.card{color:#123456;padding:24px}</style></head><body>",
      '<article class="card"><h1>새 제목</h1><p>새 본문</p>',
      '<a href="{{redirect_url}}">혜택 보기</a>',
      '<img alt="" src="{{open_pixel_url}}"></article></body></html>'
    ].join(""),
    sourceHtml
  });

  assert.match(revised, /padding:24px/);
  assert.equal(revised.match(/\{\{redirect_url\}\}/g)?.length, 1);
  assert.equal(revised.match(/\{\{open_pixel_url\}\}/g)?.length, 1);
});

test("AI HTML revision rejects executable markup and new external resources", () => {
  const sourceHtml =
    '<article><h1>제목</h1><p>본문</p><a href="{{redirect_url}}">예약</a></article>';
  const input = {
    copy: { headline: "제목", body: "본문", cta: "예약" },
    sourceHtml
  };

  assert.throws(
    () =>
      sanitizeCreativeHtmlRevision({
        ...input,
        revisedHtml: `${sourceHtml}<script>alert(1)</script>`
      }),
    /unsafe/
  );
  assert.throws(
    () =>
      sanitizeCreativeHtmlRevision({
        ...input,
        revisedHtml:
          '<article><h1>제목</h1><p>본문</p><a href="{{redirect_url}}">예약</a><img src="https://tracker.example/new"></article>'
      }),
    /resource URL/
  );
});

test("AI HTML revision rejects missing or duplicated dispatch placeholders", () => {
  const sourceHtml =
    '<article><h1>제목</h1><p>본문</p><a href="{{redirect_url}}">예약</a></article>';
  const base = {
    copy: { headline: "제목", body: "본문", cta: "예약" },
    sourceHtml
  };

  assert.throws(
    () =>
      sanitizeCreativeHtmlRevision({
        ...base,
        revisedHtml: "<article><h1>제목</h1><p>본문</p><a>예약</a></article>"
      }),
    /placeholder/
  );
  assert.throws(
    () =>
      sanitizeCreativeHtmlRevision({
        ...base,
        revisedHtml:
          '<article><h1>제목</h1><p>본문</p><a href="{{redirect_url}}">예약</a><a href="{{redirect_url}}">다시</a></article>'
      }),
    /placeholder/
  );
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
