export interface AdsProjectRow {
  projectDbId: string;
  projectId: string;
}

export interface AdsSegmentRow {
  segmentDbId: string;
}

export interface AdServingCandidateRow {
  mappingId: string;
  priority: number;
  trafficWeight: number;
  experimentId: string;
  variantId: string;
  creativeId: string;
  contentType: string;
  title: string;
  body: string;
  ctaLabel: string;
  imageUrl: string;
  landingUrl: string;
  actionId: string;
}
