import { createHash } from "node:crypto";
import {
  CreativeArtifactSchema,
  type DashboardContentCandidate,
  type DashboardUpdateContentCandidateCopyRequest
} from "@loopad/shared";
import escapeHtml from "escape-html";
import { parseDocument } from "htmlparser2";
import sanitizeHtml from "sanitize-html";

const HTML_CONTENT_TYPE = "text/html; charset=utf-8";
const MAX_REVISED_HTML_BYTES = 2_000_000;
const MAX_CREATIVE_HTML_PATCH_OPERATIONS = 12;
const MAX_CREATIVE_HTML_PATCH_FRAGMENT_BYTES = 8_000;
const MAX_CREATIVE_HTML_PATCH_BYTES = 32_000;

type ContentCandidateCopy = DashboardUpdateContentCandidateCopyRequest;
type PriceDisplayMode = "all_price_tiers" | "promotion_and_final";

export type CreativeHtmlReplacement = {
  after: string;
  before: string;
};

type CreativeOfferPrice = {
  additionalDiscountRate: number | null;
  hotelName: string;
  offerId: string;
  originalPrice: number | null;
  promotionPrice: number | null;
  salePrice: number;
};

type HtmlNode = {
  attribs?: Record<string, string>;
  children?: HtmlNode[];
  data?: string;
  endIndex: number | null;
  parent?: HtmlNode | null;
  startIndex: number | null;
  type: string;
};

type ProtectedOfferPrice = {
  offer: CreativeOfferPrice;
  placeholder: string;
  renderedHtml: string;
};

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

export function applyCreativeHtmlReplacementPatch(
  sourceHtml: string,
  replacements: CreativeHtmlReplacement[]
) {
  if (replacements.length === 0 || replacements.length > MAX_CREATIVE_HTML_PATCH_OPERATIONS) {
    throw new Error("Creative revision patch has an invalid operation count.");
  }

  let patchBytes = 0;
  const resolved = replacements.map((replacement, index) => {
    const beforeBytes = Buffer.byteLength(replacement.before);
    const afterBytes = Buffer.byteLength(replacement.after);
    patchBytes += beforeBytes + afterBytes;
    if (
      beforeBytes === 0 ||
      beforeBytes > MAX_CREATIVE_HTML_PATCH_FRAGMENT_BYTES ||
      afterBytes > MAX_CREATIVE_HTML_PATCH_FRAGMENT_BYTES ||
      replacement.before === replacement.after
    ) {
      throw new Error(`Creative revision patch operation ${index} is invalid.`);
    }

    const start = sourceHtml.indexOf(replacement.before);
    if (start < 0) {
      throw new Error(`Creative revision patch operation ${index} did not match.`);
    }
    if (sourceHtml.indexOf(replacement.before, start + replacement.before.length) >= 0) {
      throw new Error(`Creative revision patch operation ${index} is ambiguous.`);
    }
    return { ...replacement, end: start + replacement.before.length, start };
  });

  if (patchBytes > MAX_CREATIVE_HTML_PATCH_BYTES) {
    throw new Error("Creative revision patch exceeds the byte limit.");
  }

  const ordered = resolved.toSorted((left, right) => left.start - right.start);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index]!.start < ordered[index - 1]!.end) {
      throw new Error("Creative revision patch operations overlap.");
    }
  }

  let revisedHtml = sourceHtml;
  for (const replacement of ordered.toReversed()) {
    revisedHtml =
      revisedHtml.slice(0, replacement.start) +
      replacement.after +
      revisedHtml.slice(replacement.end);
  }
  return revisedHtml;
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

export function prepareCreativeOfferPriceRevision({
  creative,
  feedback,
  html
}: {
  creative: Record<string, unknown>;
  feedback: string;
  html: string;
}) {
  const offers = creativeOfferPrices(creative);
  if (offers.length === 0) {
    return {
      html,
      priceDisplayMode: null,
      protectedOfferCount: 0,
      restore: (revisedHtml: string) => revisedHtml
    };
  }

  const priceDisplayMode = requestedPriceDisplayMode(creative, feedback, html);
  const document = parseDocument(html, {
    decodeEntities: true,
    withEndIndices: true,
    withStartIndices: true
  }) as unknown as HtmlNode;
  const protectedOffers: ProtectedOfferPrice[] = [];
  const replacements: Array<{ end: number; replacement: string; start: number }> = [];

  for (const [index, offer] of offers.entries()) {
    const region = offerPriceRegion(document, offer);
    if (!region) {
      throw new Error(`Creative offer price block was not found (${offer.offerId}).`);
    }
    const placeholder = `{{loopad_offer_price_block_${index + 1}}}`;
    const renderedHtml = renderCreativeOfferPrice(offer, priceDisplayMode);
    protectedOffers.push({ offer, placeholder, renderedHtml });
    replacements.push({ ...region, replacement: placeholder });
  }

  const ordered = replacements.toSorted((left, right) => left.start - right.start);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index]!.start < ordered[index - 1]!.end) {
      throw new Error("Creative offer price blocks overlap.");
    }
  }

  let protectedHtml = html;
  for (const replacement of ordered.toReversed()) {
    protectedHtml =
      protectedHtml.slice(0, replacement.start) +
      replacement.replacement +
      protectedHtml.slice(replacement.end);
  }

  return {
    html: protectedHtml,
    priceDisplayMode,
    protectedOfferCount: protectedOffers.length,
    restore: (revisedHtml: string) => restoreCreativeOfferPrices(revisedHtml, protectedOffers)
  };
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

function creativeOfferPrices(creative: Record<string, unknown>) {
  const offers = [
    ...arrayValue(creative.offers),
    ...arrayValue(creative.featured_offers),
    ...arrayValue(creative.comparison_offers)
  ];
  const canonical = new Map<string, CreativeOfferPrice>();

  for (const rawOffer of offers) {
    if (!isRecord(rawOffer)) {
      continue;
    }
    const offerId = nonEmptyString(rawOffer.offer_id);
    const hotelName = nonEmptyString(rawOffer.hotel_name);
    const salePrice = nonNegativeInteger(rawOffer.sale_price_per_night);
    if (!offerId || !hotelName || salePrice === null) {
      continue;
    }
    canonical.set(offerId, {
      additionalDiscountRate: nonNegativeNumber(rawOffer.additional_discount_rate_percent),
      hotelName,
      offerId,
      originalPrice: nonNegativeInteger(rawOffer.original_price_per_night),
      promotionPrice: nonNegativeInteger(rawOffer.promotion_price_per_night),
      salePrice
    });
  }

  return [...canonical.values()];
}

function requestedPriceDisplayMode(
  creative: Record<string, unknown>,
  feedback: string,
  html: string
): PriceDisplayMode {
  const asksToRemoveOriginal =
    /(?:정상가|원래가|정가|regular\s*price).{0,20}(?:빼|제외|삭제|숨)/i.test(feedback) ||
    /(?:빼|제외|삭제|숨).{0,20}(?:정상가|원래가|정가|regular\s*price)/i.test(feedback);
  if (asksToRemoveOriginal) {
    return "promotion_and_final";
  }

  const asksForOriginal = /정상가|원래가|정가|regular\s*price/i.test(feedback);
  const currentlyShowsOriginal =
    creative.price_display_mode === "all_price_tiers" ||
    /data-loopad-price-display-mode=["']all_price_tiers["']|(?:정상가|원래가|정가)\s*[\d,]+원/i.test(
      html
    );
  return asksForOriginal || currentlyShowsOriginal ? "all_price_tiers" : "promotion_and_final";
}

function offerPriceRegion(root: HtmlNode, offer: CreativeOfferPrice) {
  const marked = findNodes(
    root,
    (node) => node.attribs?.["data-loopad-price-offer-id"] === offer.offerId
  );
  if (marked.length === 1) {
    return nodeRegion(marked[0]!);
  }
  if (marked.length > 1) {
    throw new Error(`Creative offer price block is duplicated (${offer.offerId}).`);
  }

  const hotelNodes = findNodes(
    root,
    (node) => node.type === "text" && normalizeText(node.data ?? "").includes(offer.hotelName)
  );
  if (hotelNodes.length !== 1) {
    return null;
  }

  let ancestor = hotelNodes[0]!.parent ?? null;
  while (ancestor && ancestor.type !== "root") {
    const rows = priceRowNodes(ancestor);
    if (rows.length > 0) {
      const start = Math.min(...rows.map((row) => row.startIndex ?? Number.MAX_SAFE_INTEGER));
      const endInclusive = Math.max(...rows.map((row) => row.endIndex ?? -1));
      if (start !== Number.MAX_SAFE_INTEGER && endInclusive >= start) {
        return { end: endInclusive + 1, start };
      }
    }
    ancestor = ancestor.parent ?? null;
  }
  return null;
}

function priceRowNodes(root: HtmlNode) {
  return findNodes(root, (node) => {
    if (!node.children || node.startIndex === null || node.endIndex === null) {
      return false;
    }
    const text = normalizeText(textContent(node));
    if (!CREATIVE_PRICE_TEXT_PATTERN.test(text)) {
      return false;
    }
    return !node.children.some(
      (child) =>
        Boolean(child.children) &&
        CREATIVE_PRICE_TEXT_PATTERN.test(normalizeText(textContent(child)))
    );
  });
}

function findNodes(root: HtmlNode, predicate: (node: HtmlNode) => boolean) {
  const matches: HtmlNode[] = [];
  const visit = (node: HtmlNode) => {
    if (predicate(node)) {
      matches.push(node);
    }
    for (const child of node.children ?? []) {
      visit(child);
    }
  };
  visit(root);
  return matches;
}

function textContent(node: HtmlNode): string {
  if (node.type === "text") {
    return node.data ?? "";
  }
  return (node.children ?? []).map(textContent).join("");
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function nodeRegion(node: HtmlNode) {
  if (node.startIndex === null || node.endIndex === null) {
    return null;
  }
  return { end: node.endIndex + 1, start: node.startIndex };
}

function renderCreativeOfferPrice(offer: CreativeOfferPrice, mode: PriceDisplayMode) {
  const rows: string[] = [];
  if (mode === "all_price_tiers" && offer.originalPrice !== null) {
    rows.push(priceRow("original", "정상가", offer.originalPrice, false, true));
  }
  if (offer.promotionPrice !== null) {
    rows.push(priceRow("promotion", "프로모션가", offer.promotionPrice, false, true));
    const finalLabel =
      offer.additionalDiscountRate === null
        ? "추가 할인가"
        : `${formatPercentage(offer.additionalDiscountRate)} 추가 할인가`;
    rows.push(priceRow("final", finalLabel, offer.salePrice, true, false));
  } else if (offer.originalPrice !== null) {
    rows.push(priceRow("original", "정상가", offer.originalPrice, false, true));
    rows.push(priceRow("promotion", "프로모션가", offer.salePrice, true, false));
  } else {
    rows.push(priceRow("final", "1박", offer.salePrice, true, false));
  }

  return [
    `<div data-loopad-price-contract="offer-price.v1"`,
    ` data-loopad-price-offer-id="${escapeHtml(offer.offerId)}"`,
    ` data-loopad-price-display-mode="${mode}">`,
    rows.join(""),
    "</div>"
  ].join("");
}

function priceRow(
  tier: "final" | "original" | "promotion",
  label: string,
  amount: number,
  emphasized: boolean,
  struck: boolean
) {
  const decoration = struck ? "text-decoration:line-through;" : "";
  const style = emphasized
    ? "display:block;white-space:nowrap;word-break:keep-all;color:#ef476f;font-size:14px;line-height:22px;font-weight:800;letter-spacing:0;"
    : `display:block;white-space:nowrap;word-break:keep-all;color:#718096;font-size:11px;line-height:17px;letter-spacing:0;${decoration}`;
  const suffix = emphasized ? " / 박" : "";
  return [
    `<span data-loopad-price-tier="${tier}"`,
    ` data-loopad-price-amount="${amount}"`,
    ` style="${style}">`,
    `${escapeHtml(label)} ${formatWon(amount)}${suffix}</span>`
  ].join("");
}

function restoreCreativeOfferPrices(revisedHtml: string, protectedOffers: ProtectedOfferPrice[]) {
  let restoredHtml = revisedHtml;
  for (const protectedOffer of protectedOffers) {
    if (occurrenceCount(restoredHtml, protectedOffer.placeholder) !== 1) {
      throw new Error(
        `Creative revision changed a protected offer price block (${protectedOffer.offer.offerId}).`
      );
    }
    restoredHtml = restoredHtml.replace(protectedOffer.placeholder, protectedOffer.renderedHtml);
  }
  if (/loopad_offer_price_block_\d+/.test(restoredHtml)) {
    throw new Error("Creative revision left an unresolved offer price block.");
  }
  assertCanonicalOfferPrices(restoredHtml, protectedOffers);
  return restoredHtml;
}

function assertCanonicalOfferPrices(html: string, protectedOffers: ProtectedOfferPrice[]) {
  const document = parseDocument(html, {
    decodeEntities: true,
    withEndIndices: true,
    withStartIndices: true
  }) as unknown as HtmlNode;
  for (const protectedOffer of protectedOffers) {
    const offer = protectedOffer.offer;
    const blocks = findNodes(
      document,
      (node) => node.attribs?.["data-loopad-price-offer-id"] === offer.offerId
    );
    if (blocks.length !== 1) {
      throw new Error(`Creative revision produced an invalid price contract (${offer.offerId}).`);
    }
    const allowed = new Set(
      [offer.originalPrice, offer.promotionPrice, offer.salePrice].filter(
        (value): value is number => value !== null
      )
    );
    const cardAmounts = priceAmountsNearOffer(document, offer);
    if (cardAmounts.some((amount) => !allowed.has(amount))) {
      throw new Error(`Creative revision invented an offer price (${offer.offerId}).`);
    }
  }
}

function priceAmountsNearOffer(root: HtmlNode, offer: CreativeOfferPrice) {
  const hotelNode = findNodes(
    root,
    (node) => node.type === "text" && normalizeText(node.data ?? "").includes(offer.hotelName)
  )[0];
  if (!hotelNode) {
    return [];
  }
  let ancestor = hotelNode.parent ?? null;
  while (ancestor && ancestor.type !== "root") {
    const text = normalizeText(textContent(ancestor));
    const amounts = [...text.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/g)].map((match) =>
      Number(match[1]!.replaceAll(",", ""))
    );
    if (amounts.length > 0) {
      return amounts;
    }
    ancestor = ancestor.parent ?? null;
  }
  return [];
}

function occurrenceCount(value: string, search: string) {
  return value.split(search).length - 1;
}

function formatWon(value: number) {
  return `${value.toLocaleString("en-US")}원`;
}

function formatPercentage(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toString()}%`;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function nonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
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
const CREATIVE_PRICE_TEXT_PATTERN =
  /(?:정상가|원래가|정가|프로모션가|추가\s*할인가|최종\s*할인가|(?:\d{1,3}(?:,\d{3})+|\d+)\s*원)/i;

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
