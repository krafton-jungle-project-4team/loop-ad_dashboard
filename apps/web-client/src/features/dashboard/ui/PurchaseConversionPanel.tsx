import type { DashboardPurchaseConversion } from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Progress } from "@loopad/ui/shadcn/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { formatInteger, formatMoney, formatPercent } from "../model/dashboard-format.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function PurchaseConversionPanel({ data }: { data: DashboardPurchaseConversion }) {
  const maxFunnelCount = Math.max(...data.funnel_steps.map((step) => step.count), 1);

  return (
    <div className="grid gap-6">
      <Section
        action={<Badge variant="outline">{data.funnel_steps.length}단계</Badge>}
        contentClassName="grid gap-4 md:grid-cols-5"
        title="개방형 유입경로"
      >
        {data.funnel_steps.length > 0 ? (
          data.funnel_steps.map((step, index) => (
            <div className="grid gap-3 rounded-lg border p-4" key={step.key}>
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">단계 {index + 1}</Badge>
                <span className="font-medium tabular-nums">{formatPercent(step.rate_from_previous)}</span>
              </div>
              <div className="grid gap-1">
                <h3 className="font-medium">{step.label}</h3>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatInteger(step.count)}
                </span>
              </div>
              <Progress value={(step.count / maxFunnelCount) * 100} />
              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>이탈률</span>
                <span className="tabular-nums text-foreground">{formatPercent(step.drop_off_rate)}</span>
              </div>
            </div>
          ))
        ) : (
          <EmptyState message="유입경로 데이터가 없습니다." />
        )}
      </Section>

      <Section title="기기 카테고리별 전환">
        {data.device_rows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>기기</TableHead>
                  <TableHead>세션 시작</TableHead>
                  <TableHead>제품 보기</TableHead>
                  <TableHead>장바구니</TableHead>
                  <TableHead>결제 시작</TableHead>
                  <TableHead>구매</TableHead>
                  <TableHead className="whitespace-normal">조회→장바구니</TableHead>
                  <TableHead className="whitespace-normal">장바구니→구매</TableHead>
                  <TableHead className="whitespace-normal">조회→구매</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.device_rows.map((row) => (
                  <TableRow key={row.device}>
                    <TableCell className="font-medium">{row.device}</TableCell>
                    <TableCell className="tabular-nums">{formatInteger(row.session_start_count)}</TableCell>
                    <TableCell className="tabular-nums">{formatInteger(row.product_view_count)}</TableCell>
                    <TableCell className="tabular-nums">{formatInteger(row.add_to_cart_count)}</TableCell>
                    <TableCell className="tabular-nums">{formatInteger(row.checkout_start_count)}</TableCell>
                    <TableCell className="tabular-nums">{formatInteger(row.purchase_count)}</TableCell>
                    <TableCell className="tabular-nums">{formatPercent(row.view_to_cart_rate)}</TableCell>
                    <TableCell className="tabular-nums">{formatPercent(row.cart_to_purchase_rate)}</TableCell>
                    <TableCell className="tabular-nums">{formatPercent(row.view_to_purchase_rate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState message="기기별 전환 데이터가 없습니다." />
        )}
      </Section>

      <h2 className="text-2xl font-semibold">고객군별 구매 행동</h2>
      <Section title="채널 · 연령 · 성별 · 지역 · 기기 · 카테고리 조합">
        {data.customer_behavior_rows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>고객군</TableHead>
                  <TableHead>구매 전환율</TableHead>
                  <TableHead>주요 이탈률</TableHead>
                  <TableHead>예상 매출</TableHead>
                  <TableHead>관찰 신호</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.customer_behavior_rows.map((row) => (
                  <TableRow key={row.customer_group_id}>
                    <TableCell className="font-medium">{row.customer_group_name}</TableCell>
                    <TableCell className="tabular-nums">{formatPercent(row.conversion_rate)}</TableCell>
                    <TableCell className="tabular-nums">{formatPercent(row.major_drop_off_rate)}</TableCell>
                    <TableCell className="tabular-nums">{formatMoney(row.expected_revenue)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.observed_signal}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState message="고객군별 구매 행동 데이터가 없습니다." />
        )}
      </Section>
    </div>
  );
}
