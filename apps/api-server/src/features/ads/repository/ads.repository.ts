import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import {
  getAdProject,
  getDefaultSegment,
  getLatestPrimarySegment,
  listAdServingCandidates,
  type IListAdServingCandidatesResult
} from "../database/__generated__/ads.queries.js";
import type { AdsProjectRow, AdsSegmentRow, AdServingCandidateRow } from "./read-models.js";

@Injectable()
export class AdsRepository {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async findProject(projectId: string): Promise<AdsProjectRow | null> {
    return this.db.query(getAdProject, { projectId }).singleOrNull();
  }

  async findLatestPrimarySegment(
    projectDbId: string,
    userId: string
  ): Promise<AdsSegmentRow | null> {
    return this.db.query(getLatestPrimarySegment, { projectDbId, userId }).singleOrNull();
  }

  async findDefaultSegment(projectDbId: string): Promise<AdsSegmentRow | null> {
    return this.db.query(getDefaultSegment, { projectDbId }).singleOrNull();
  }

  async listServingCandidates(
    projectDbId: string,
    segmentDbId: string,
    placementKey: string
  ): Promise<AdServingCandidateRow[]> {
    const rows = await this.db
      .query(listAdServingCandidates, { projectDbId, segmentDbId, placementKey })
      .multiple();

    return rows.map(toServingCandidate);
  }
}

function toServingCandidate(row: IListAdServingCandidatesResult): AdServingCandidateRow {
  return {
    mappingId: requiredString(row.mappingId, "mappingId"),
    placementKey: requiredString(row.placementKey, "placementKey"),
    priority: numberValue(row.priority),
    trafficWeight: numberValue(row.trafficWeight),
    experimentId: row.experimentId ?? "",
    variantId: row.variantId ?? "",
    creativeId: requiredString(row.creativeId, "creativeId"),
    contentType: requiredString(row.contentType, "contentType"),
    title: requiredString(row.title, "title"),
    body: row.body ?? "",
    ctaLabel: row.ctaLabel ?? "",
    imageUrl: row.imageUrl ?? "",
    landingUrl: row.landingUrl ?? "",
    actionId: row.actionId ?? ""
  };
}

function requiredString(value: string | null, field: string): string {
  if (!value) {
    throw new Error(`Ad serving candidate is missing ${field}.`);
  }

  return value;
}

function numberValue(value: number | string): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}
