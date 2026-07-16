import { createHash } from "node:crypto";
import {
  CreativeArtifactSchema,
  type DashboardContentCandidate,
  type DashboardUpdateContentCandidateCopyRequest
} from "@loopad/shared";
import escapeHtml from "escape-html";

const HTML_CONTENT_TYPE = "text/html; charset=utf-8";

type ContentCandidateCopy = DashboardUpdateContentCandidateCopyRequest;

export function contentCandidateCopy(candidate: DashboardContentCandidate): ContentCandidateCopy {
  return {
    headline: candidate.channel === "email" ? (candidate.subject ?? "") : (candidate.title ?? ""),
    body: candidate.body ?? "",
    cta: candidate.cta ?? ""
  };
}

export function editableCreative(candidate: DashboardContentCandidate) {
  const creative = candidate.metadata_json.creative;
  if (!isRecord(creative)) {
    return null;
  }

  const artifactResult = CreativeArtifactSchema.safeParse(creative.artifact);
  if (
    !artifactResult.success ||
    (artifactResult.data.creative_format !== "email_html" &&
      artifactResult.data.creative_format !== "banner_html") ||
    artifactResult.data.artifact_status !== "published" ||
    !artifactResult.data.public_url
  ) {
    return null;
  }

  return {
    artifact: artifactResult.data,
    creative,
    editedHtml: typeof creative.edited_html === "string" ? creative.edited_html : null
  };
}

export function rewriteCreativeHtmlCopy(
  html: string,
  previousCopy: ContentCandidateCopy,
  nextCopy: ContentCandidateCopy
) {
  let nextHtml = html;
  const missingFields: Array<keyof ContentCandidateCopy> = [];

  for (const field of ["headline", "body", "cta"] as const) {
    const previousValue = previousCopy[field];
    const nextValue = nextCopy[field];
    if (previousValue === nextValue) {
      continue;
    }

    const replacement = replaceCopyValue(nextHtml, previousValue, nextValue);
    if (!replacement.replaced) {
      missingFields.push(field);
      continue;
    }
    nextHtml = replacement.html;
  }

  return { html: nextHtml, missingFields };
}

export function editedCreativeMetadata({
  candidate,
  creative,
  html,
  htmlUrl
}: {
  candidate: DashboardContentCandidate;
  creative: NonNullable<ReturnType<typeof editableCreative>>;
  html: string;
  htmlUrl: string;
}) {
  const sha256 = contentCandidateHtmlRevision(html);
  const artifactWithoutStorageKey = { ...creative.artifact };
  delete artifactWithoutStorageKey.storage_key;

  return {
    metadataJson: {
      ...candidate.metadata_json,
      creative: {
        ...creative.creative,
        edited_html: html,
        original_artifact: creative.creative.original_artifact ?? creative.artifact,
        artifact: {
          ...artifactWithoutStorageKey,
          artifact_status: "published",
          bytes: Buffer.byteLength(html),
          content_type: HTML_CONTENT_TYPE,
          public_url: htmlUrl,
          sha256
        }
      }
    },
    revision: sha256
  };
}

export function contentCandidateHtmlRevision(html: string) {
  return createHash("sha256").update(html).digest("hex");
}

export function contentCandidateHtmlUrl({
  contentId,
  origin,
  projectId,
  promotionId,
  revision,
  segmentId
}: {
  contentId: string;
  origin: string;
  projectId: string;
  promotionId: string;
  revision: string;
  segmentId: string;
}) {
  const path = [
    "/api/dashboard/v1/promotions",
    encodeURIComponent(promotionId),
    "segments",
    encodeURIComponent(segmentId),
    "content-candidates",
    encodeURIComponent(contentId),
    "html"
  ].join("/");
  const url = new URL(path, origin);
  url.searchParams.set("project_id", projectId);
  url.searchParams.set("revision", revision);
  return url.toString();
}

function replaceCopyValue(html: string, previousValue: string, nextValue: string) {
  if (!previousValue) {
    return { html, replaced: false };
  }

  const escapedPrevious = escapeHtml(previousValue);
  const escapedNext = escapeHtml(nextValue);
  const lineBreaks = ["<br>", "<br/>", "<br />"] as const;
  const variants = escapedPrevious.includes("\n")
    ? [
        { previous: escapedPrevious, next: escapedNext },
        ...lineBreaks.map((lineBreak) => ({
          previous: escapedPrevious.replaceAll("\n", lineBreak),
          next: escapedNext.replaceAll("\n", lineBreak)
        }))
      ]
    : [{ previous: escapedPrevious, next: escapedNext }];

  let nextHtml = html;
  let replaced = false;
  for (const variant of variants) {
    if (!variant.previous || !nextHtml.includes(variant.previous)) {
      continue;
    }
    nextHtml = nextHtml.replaceAll(variant.previous, variant.next);
    replaced = true;
  }

  return { html: nextHtml, replaced };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
