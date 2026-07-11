import type { DashboardCampaignPromotion, DashboardCampaignSegment } from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { formatInteger } from "../../../../../model/dashboard-format.js";
import {
  formatActionLabel,
  formatBasisLabel,
  formatChannelLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../../../../../model/dashboard-labels.js";
import { EmptyState } from "../../../../shared/EmptyState.js";
import { formatGoalValue, statusBadgeVariant } from "../promotionUtils.js";

export function CampaignPromotionTable({
  onSelectPromotion,
  promotions,
  segments,
  selectedPromotionId
}: {
  onSelectPromotion: (promotionId: string) => void;
  promotions: DashboardCampaignPromotion[];
  segments: DashboardCampaignSegment[];
  selectedPromotionId: string;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold text-[#1d1d1f]">프로모션 목록</h3>
          <p className="text-sm text-muted-foreground">
            Promotion → Segment → Ad Experiment 연결 상태를 기준으로 확인합니다.
          </p>
        </div>
      </div>
      {promotions.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>프로모션</TableHead>
                <TableHead>대상 세그먼트</TableHead>
                <TableHead>목표</TableHead>
                <TableHead className="text-right">루프</TableHead>
                <TableHead className="text-right">실험</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>다음 액션</TableHead>
                <TableHead>상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promotion) => {
                const promotionSegments = segments.filter(
                  (segment) => segment.promotion_id === promotion.promotion_id
                );
                return (
                  <TableRow
                    aria-selected={selectedPromotionId === promotion.promotion_id}
                    data-state={
                      selectedPromotionId === promotion.promotion_id ? "selected" : undefined
                    }
                    key={promotion.promotion_id}
                  >
                    <TableCell>
                      <div className="flex min-w-[220px] flex-col gap-1">
                        <span className="font-medium">{promotion.marketing_theme}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatChannelLabel(promotion.channel)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-[240px] flex-wrap gap-1.5">
                        {promotionSegments.slice(0, 3).map((segment) => (
                          <Badge key={segment.segment_id} variant="outline">
                            {segment.segment_name}
                          </Badge>
                        ))}
                        {promotionSegments.length > 3 ? (
                          <Badge variant="secondary">+{promotionSegments.length - 3}</Badge>
                        ) : null}
                        {promotionSegments.length === 0 ? (
                          <span className="text-sm text-muted-foreground">세그먼트 없음</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid min-w-[160px] gap-1">
                        <span className="text-sm">{formatMetricLabel(promotion.goal_metric)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatGoalValue(promotion.goal_target_value)} ·{" "}
                          {formatBasisLabel(promotion.goal_basis)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInteger(promotion.current_loop_count)} /{" "}
                      {formatInteger(promotion.max_loop_count)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInteger(promotion.ad_experiment_count)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(promotion.status)}>
                        {formatStatusLabel(promotion.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatActionLabel(promotion.next_action)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        aria-pressed={selectedPromotionId === promotion.promotion_id}
                        onClick={() => onSelectPromotion(promotion.promotion_id)}
                        size="sm"
                        type="button"
                        variant={
                          selectedPromotionId === promotion.promotion_id ? "default" : "outline"
                        }
                      >
                        {selectedPromotionId === promotion.promotion_id ? "열림" : "상세"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState message="등록된 프로모션이 없습니다." />
      )}
    </section>
  );
}
