import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/index.js";
import {
  activeAdServingAssignmentEntitySchema,
  adExperimentEntitySchema,
  promotionEntitySchema,
  promotionRunEntitySchema,
  redirectLinkEntitySchema,
  storedDispatchJobEntitySchema,
  type ActiveAdServingAssignmentEntity,
  type AdExperimentEntity,
  type PromotionEntity,
  type PromotionRunEntity,
  type RedirectLinkEntity,
  type StoredDispatchJobEntity
} from "../domain/index.js";
import {
  findActiveBannerAssignment,
  findAdExperiment,
  findDispatchJobById,
  findPromotion,
  findPromotionRun,
  findRedirectLinkByToken,
  listActiveAdServingAssignments
} from "../database/__generated__/ad-execution.queries.js";

/** 광고 실행 hot path에서 필요한 저장 데이터를 조회합니다. */
@Injectable()
export class AdExecutionReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  /** promotion_run 단일 엔티티를 조회합니다. */
  async findPromotionRun(promotionRunId: string): Promise<PromotionRunEntity | null> {
    const row = await this.db.query(findPromotionRun, { promotionRunId }).singleOrNull();

    return row ? promotionRunEntitySchema.parse(row) : null;
  }

  /** promotion 단일 엔티티를 조회합니다. */
  async findPromotion(promotionId: string): Promise<PromotionEntity | null> {
    const row = await this.db.query(findPromotion, { promotionId }).singleOrNull();

    return row ? promotionEntitySchema.parse(row) : null;
  }

  /** ad_experiment 단일 엔티티를 조회합니다. */
  async findAdExperiment(adExperimentId: string): Promise<AdExperimentEntity | null> {
    const row = await this.db.query(findAdExperiment, { adExperimentId }).singleOrNull();

    return row ? adExperimentEntitySchema.parse(row) : null;
  }

  /** 동일 실행 범위의 dispatch job 상태를 조회합니다. */
  async findDispatchJob(dispatchJobId: string): Promise<StoredDispatchJobEntity | null> {
    const row = await this.db.query(findDispatchJobById, { dispatchJobId }).singleOrNull();

    return row ? storedDispatchJobEntitySchema.parse(row) : null;
  }

  /** 발송 대상 active assignment 목록을 조회합니다. */
  async listDispatchAssignments(
    promotionRunId: string
  ): Promise<ActiveAdServingAssignmentEntity[]> {
    const rows = await this.db.query(listActiveAdServingAssignments, { promotionRunId }).multiple();

    return activeAdServingAssignmentEntitySchema.array().parse(rows);
  }

  /** 사용자에게 배정된 onsite banner assignment를 조회합니다. */
  async findBannerAssignment(params: {
    projectId: string;
    promotionRunId: string;
    userId: string;
  }): Promise<ActiveAdServingAssignmentEntity | null> {
    const row = await this.db
      .query(findActiveBannerAssignment, {
        projectId: params.projectId,
        promotionRunId: params.promotionRunId,
        userId: params.userId
      })
      .singleOrNull();

    return row ? activeAdServingAssignmentEntitySchema.parse(row) : null;
  }

  /** 공개 redirect token으로 redirect link를 조회합니다. */
  async findRedirectLink(redirectId: string): Promise<RedirectLinkEntity | null> {
    const row = await this.db.query(findRedirectLinkByToken, { redirectId }).singleOrNull();

    return row ? redirectLinkEntitySchema.parse(row) : null;
  }
}
