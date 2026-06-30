import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import type {
  AdServingCandidateSnapshot,
  AdServingProjectSnapshot,
  AdServingSegmentSnapshot
} from "../domain/index.js";
import {
  getAdProject,
  getDefaultSegment,
  getLatestPrimarySegment,
  listAdServingCandidates,
  type IGetAdProjectResult,
  type IGetDefaultSegmentResult,
  type IGetLatestPrimarySegmentResult,
  type IListAdServingCandidatesResult
} from "../database/__generated__/ads.queries.js";

/**
 * 광고 serving에 필요한 Postgres read model을 PgTyped query로 읽는다.
 *
 * public 광고 API가 project, segment, serving 후보를 조회할 때 사용한다.
 * DB row는 repository boundary 안에서 domain snapshot으로 변환한다.
 */
@Injectable()
export class AdsReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async findProject(projectId: string): Promise<AdServingProjectSnapshot | null> {
    const project = await this.db.query(getAdProject, { projectId }).singleOrNull();

    return project ? toProjectSnapshot(project) : null;
  }

  async findLatestPrimarySegment(
    projectDbId: string,
    userId: string
  ): Promise<AdServingSegmentSnapshot | null> {
    const segment = await this.db
      .query(getLatestPrimarySegment, { projectDbId, userId })
      .singleOrNull();

    return segment ? toSegmentSnapshot(segment) : null;
  }

  async findDefaultSegment(projectDbId: string): Promise<AdServingSegmentSnapshot | null> {
    const segment = await this.db.query(getDefaultSegment, { projectDbId }).singleOrNull();

    return segment ? toSegmentSnapshot(segment) : null;
  }

  async listServingCandidates(
    projectDbId: string,
    segmentDbId: string,
    placementKey: string
  ): Promise<AdServingCandidateSnapshot[]> {
    const rows = await this.db
      .query(listAdServingCandidates, { projectDbId, segmentDbId, placementKey })
      .multiple();

    return rows.map(toServingCandidateSnapshot);
  }
}

function toProjectSnapshot(project: IGetAdProjectResult): AdServingProjectSnapshot {
  return {
    projectDbId: project.projectDbId,
    projectId: project.projectId
  };
}

function toSegmentSnapshot(
  segment: IGetLatestPrimarySegmentResult | IGetDefaultSegmentResult
): AdServingSegmentSnapshot {
  return {
    segmentDbId: segment.segmentDbId
  };
}

function toServingCandidateSnapshot(
  row: IListAdServingCandidatesResult
): AdServingCandidateSnapshot {
  return {
    mappingId: requiredString(row.mappingId, "mappingId"),
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
