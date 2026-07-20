import { createHash } from "node:crypto";
import {
  CreativeArtifactSchema,
  type DashboardContentCandidate,
  type DashboardUpdateContentCandidateCopyRequest
} from "@loopad/shared";
import escapeHtml from "escape-html";
import sanitizeHtml from "sanitize-html";

const HTML_CONTENT_TYPE = "text/html; charset=utf-8";
const MAX_REVISED_HTML_BYTES = 2_000_000;

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

export function sanitizeCreativeHtmlRevision({
  copy,
  revisedHtml,
  sourceHtml
}: {
  copy: ContentCandidateCopy;
  revisedHtml: string;
  sourceHtml: string;
}) {
  if (
    !revisedHtml.trim() ||
    Buffer.byteLength(revisedHtml) > MAX_REVISED_HTML_BYTES ||
    DANGEROUS_HTML_PATTERN.test(revisedHtml) ||
    DANGEROUS_CSS_PATTERN.test(revisedHtml)
  ) {
    throw new Error("Creative revision contains unsafe or oversized HTML.");
  }

  const sanitized = sanitizeHtml(revisedHtml, CREATIVE_SANITIZE_OPTIONS).trim();
  if (!sanitized || Buffer.byteLength(sanitized) > MAX_REVISED_HTML_BYTES) {
    throw new Error("Creative revision could not be sanitized.");
  }

  assertSamePlaceholders(sourceHtml, sanitized);
  assertNoNewResourceUrls(sourceHtml, sanitized);
  assertCopyVisible(sanitized, copy);
  return sanitized;
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

function assertSamePlaceholders(sourceHtml: string, revisedHtml: string) {
  const source = placeholdersIn(sourceHtml).sort();
  const revised = placeholdersIn(revisedHtml).sort();
  if (source.length !== revised.length || source.some((value, index) => value !== revised[index])) {
    throw new Error("Creative revision changed a required dispatch placeholder.");
  }
}

function assertNoNewResourceUrls(sourceHtml: string, revisedHtml: string) {
  const sanitizedSource = sanitizeHtml(sourceHtml, CREATIVE_SANITIZE_OPTIONS);
  const sourceUrls = new Set(resourceUrlsIn(sanitizedSource));
  const added = resourceUrlsIn(revisedHtml).filter(
    (url) => !url.startsWith("#") && !sourceUrls.has(url)
  );
  if (added.length > 0) {
    throw new Error("Creative revision added an external resource URL.");
  }
}

function assertCopyVisible(html: string, copy: ContentCandidateCopy) {
  for (const value of Object.values(copy)) {
    const variants = copyHtmlVariants(value);
    if (!variants.some((variant) => variant && html.includes(variant))) {
      throw new Error("Creative revision copy does not match its HTML.");
    }
  }
}

function copyHtmlVariants(value: string) {
  const escaped = escapeHtml(value);
  const variants = new Set([value, escaped]);
  for (const lineBreak of ["<br>", "<br />"] as const) {
    variants.add(value.replaceAll("\n", lineBreak));
    variants.add(escaped.replaceAll("\n", lineBreak));
  }
  return [...variants];
}

function placeholdersIn(html: string) {
  return [...html.matchAll(/\{\{[a-zA-Z0-9_]+\}\}/g)].map((match) => match[0]);
}

function resourceUrlsIn(html: string) {
  const urls: string[] = [];
  for (const match of html.matchAll(
    /\b(?:href|src|srcset|poster|background)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
  )) {
    const value = (match[1] ?? match[2] ?? "").trim();
    if (value) {
      urls.push(value);
    }
  }
  for (const match of html.matchAll(/\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (value) {
      urls.push(value);
    }
  }
  return urls;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const DANGEROUS_HTML_PATTERN =
  /<(?:script|iframe|object|embed|form|input|textarea|select|option|base)\b|\son[a-z0-9_-]+\s*=|\bsrcdoc\s*=|<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i;
const DANGEROUS_CSS_PATTERN =
  /(?:javascript|vbscript)\s*:|expression\s*\(|@import\b|-moz-binding\s*:|behavior\s*:|data\s*:\s*text\/html/i;

const CREATIVE_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "html",
    "head",
    "meta",
    "title",
    "link",
    "style",
    "body",
    "main",
    "header",
    "footer",
    "section",
    "article",
    "div",
    "span",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "a",
    "img",
    "picture",
    "source",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "caption",
    "colgroup",
    "col",
    "ul",
    "ol",
    "li",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "small",
    "sup",
    "sub",
    "figure",
    "figcaption",
    "center"
  ],
  allowedAttributes: {
    "*": [
      "class",
      "id",
      "style",
      "title",
      "role",
      "dir",
      "lang",
      "align",
      "valign",
      "width",
      "height",
      "aria-*",
      "data-*"
    ],
    a: ["href", "target", "rel", "name"],
    img: ["src", "alt", "border", "loading"],
    source: ["src", "srcset", "media", "type"],
    link: ["href", "rel", "media", "type"],
    meta: ["charset", "name", "content"],
    table: ["cellpadding", "cellspacing", "border", "bgcolor"],
    td: ["colspan", "rowspan", "bgcolor"],
    th: ["colspan", "rowspan", "scope", "bgcolor"],
    col: ["span"],
    colgroup: ["span"]
  },
  allowedSchemes: ["http", "https", "mailto", "tel", "cid", "data"],
  allowedSchemesByTag: {
    img: ["http", "https", "cid", "data"],
    source: ["http", "https", "cid", "data"]
  },
  allowProtocolRelative: false,
  allowVulnerableTags: true,
  enforceHtmlBoundary: true,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === "_blank" ? { ...attribs, rel: "noopener noreferrer" } : attribs
    })
  }
};
