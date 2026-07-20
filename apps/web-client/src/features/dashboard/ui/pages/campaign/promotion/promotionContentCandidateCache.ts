import type {
  DashboardCampaignDetail,
  DashboardContentCandidate,
  DashboardReviseContentCandidateHtmlResult,
  DashboardSegmentDetail
} from "@loopad/shared";

type ContentCandidateDetail = DashboardCampaignDetail | DashboardSegmentDetail;

export function reconcileContentCandidateRevision<Detail extends ContentCandidateDetail>(
  detail: Detail | undefined,
  revision: DashboardReviseContentCandidateHtmlResult
): Detail | undefined {
  if (!detail) return detail;

  let found = false;
  const contentCandidates = detail.content_candidates.map((candidate) => {
    if (candidate.content_id !== revision.content_id) return candidate;
    found = true;
    return revisedContentCandidate(candidate, revision);
  });

  return found ? { ...detail, content_candidates: contentCandidates } : detail;
}

function revisedContentCandidate(
  candidate: DashboardContentCandidate,
  revision: DashboardReviseContentCandidateHtmlResult
): DashboardContentCandidate {
  return {
    ...candidate,
    body: revision.body,
    cta: revision.cta,
    metadata_json: revisedCreativeMetadata(candidate.metadata_json, revision.html_url),
    status: revision.status,
    subject: candidate.channel === "email" ? revision.headline : candidate.subject,
    title: candidate.channel === "email" ? candidate.title : revision.headline,
    updated_at: revision.updated_at
  };
}

function revisedCreativeMetadata(
  metadata: DashboardContentCandidate["metadata_json"],
  htmlUrl: string
): DashboardContentCandidate["metadata_json"] {
  const creative = metadata.creative;
  if (!isRecord(creative) || !isRecord(creative.artifact)) return metadata;

  return {
    ...metadata,
    creative: {
      ...creative,
      artifact: {
        ...creative.artifact,
        public_url: htmlUrl
      }
    }
  } as DashboardContentCandidate["metadata_json"];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
