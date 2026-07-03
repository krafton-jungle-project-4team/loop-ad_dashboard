import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/index.js";
import {
  activeAdServingAssignmentEntitySchema,
  adExperimentEntitySchema,
  promotionEntitySchema,
  promotionRunEntitySchema,
  redirectLinkEntitySchema,
  type ActiveAdServingAssignmentEntity,
  type AdExperimentEntity,
  type PromotionEntity,
  type PromotionRunEntity,
  type RedirectLinkEntity
} from "../domain/index.js";
import {
  findActiveBannerAssignment,
  findAdExperiment,
  findPromotion,
  findPromotionRun,
  findRedirectLinkByToken,
  listActiveAdServingAssignments
} from "../database/__generated__/ad-execution.queries.js";

@Injectable()
export class AdExecutionReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async findPromotionRun(promotionRunId: string): Promise<PromotionRunEntity | null> {
    const row = await this.db.query(findPromotionRun, { promotionRunId }).singleOrNull();

    return row ? promotionRunEntitySchema.parse(row) : null;
  }

  async findPromotion(promotionId: string): Promise<PromotionEntity | null> {
    const row = await this.db.query(findPromotion, { promotionId }).singleOrNull();

    return row ? promotionEntitySchema.parse(row) : null;
  }

  async findAdExperiment(adExperimentId: string): Promise<AdExperimentEntity | null> {
    const row = await this.db.query(findAdExperiment, { adExperimentId }).singleOrNull();

    return row ? adExperimentEntitySchema.parse(row) : null;
  }

  async listDispatchAssignments(
    promotionRunId: string
  ): Promise<ActiveAdServingAssignmentEntity[]> {
    const rows = await this.db
      .query(listActiveAdServingAssignments, { promotionRunId })
      .multiple();

    return activeAdServingAssignmentEntitySchema.array().parse(rows);
  }

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

  async findRedirectLink(redirectId: string): Promise<RedirectLinkEntity | null> {
    const row = await this.db.query(findRedirectLinkByToken, { redirectId }).singleOrNull();

    return row ? redirectLinkEntitySchema.parse(row) : null;
  }
}
