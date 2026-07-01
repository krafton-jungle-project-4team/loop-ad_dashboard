import type {
  DashboardAiAnalysis,
  DashboardAiRecommendation,
  DashboardCustomerDetail,
  DashboardMetricValue
} from "@loopad/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis
} from "@loopad/ui/charts";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@loopad/ui/shadcn/chart";
import { Progress } from "@loopad/ui/shadcn/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useMemo, useState } from "react";
import { dashboardEmptyStateMessages } from "../model/dashboard-empty-state.js";
import { formatMoney, formatPercent } from "../model/dashboard-format.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

const CUSTOMER_PAGE_SIZE = 10;

export function AiInsightPanel({
  data,
  mode,
  onSelectedCustomerIdChange,
  selectedCustomerId
}: {
  data: DashboardAiAnalysis | DashboardAiRecommendation;
  mode: "analysis" | "recommendation";
  onSelectedCustomerIdChange: (selectedCustomerId: string) => void;
  selectedCustomerId: string;
}) {
  const activeCustomerId =
    data.selected_customer?.customer_group.customer_group_id ?? selectedCustomerId;
  const [requestedCustomerPage, setRequestedCustomerPage] = useState(() =>
    getCustomerPageForId(data.customers, activeCustomerId)
  );
  const customerPageCount = Math.max(Math.ceil(data.customers.length / CUSTOMER_PAGE_SIZE), 1);
  const customerPage = clampPage(requestedCustomerPage, customerPageCount);
  const visibleCustomers = useMemo(
    () =>
      data.customers.slice(
        (customerPage - 1) * CUSTOMER_PAGE_SIZE,
        customerPage * CUSTOMER_PAGE_SIZE
      ),
    [customerPage, data.customers]
  );
  const customerStart = data.customers.length > 0 ? (customerPage - 1) * CUSTOMER_PAGE_SIZE + 1 : 0;
  const customerEnd = Math.min(customerPage * CUSTOMER_PAGE_SIZE, data.customers.length);

  return (
    <div className="grid gap-6">
      <Section title={`전환율 ${mode === "analysis" ? "" : "상위 "}고객군`}>
        {data.customers.length > 0 ? (
          <div className="grid gap-4">
            <Table className="min-w-[940px]">
              <TableHeader>
                <TableRow>
                  <TableHead>고객군</TableHead>
                  <TableHead>채널</TableHead>
                  <TableHead>연령</TableHead>
                  <TableHead>성별</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>지역</TableHead>
                  <TableHead>기기</TableHead>
                  <TableHead>전환율</TableHead>
                  <TableHead>주요 이탈 단계</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCustomers.map((customer) => (
                  <TableRow
                    className="cursor-pointer"
                    data-state={
                      customer.customer_group_id === activeCustomerId ? "selected" : undefined
                    }
                    key={customer.customer_group_id}
                    onClick={() => onSelectedCustomerIdChange(customer.customer_group_id)}
                    onKeyDown={(event) =>
                      handleCustomerRowKeyDown(
                        event,
                        customer.customer_group_id,
                        onSelectedCustomerIdChange
                      )
                    }
                    role="button"
                    tabIndex={0}
                  >
                    <TableCell className="font-medium">{customer.customer_group_name}</TableCell>
                    <TableCell>{customer.channel}</TableCell>
                    <TableCell>{customer.age_group}</TableCell>
                    <TableCell>{customer.gender}</TableCell>
                    <TableCell>{customer.category}</TableCell>
                    <TableCell>{customer.region}</TableCell>
                    <TableCell>{customer.device}</TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {formatPercent(customer.conversion_rate)}
                    </TableCell>
                    <TableCell className="max-w-[180px] whitespace-normal text-sm text-muted-foreground">
                      {customer.major_drop_off_stage}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <CustomerPagination
              end={customerEnd}
              onNext={() =>
                setRequestedCustomerPage((current) => clampPage(current + 1, customerPageCount))
              }
              onPrevious={() =>
                setRequestedCustomerPage((current) => clampPage(current - 1, customerPageCount))
              }
              page={customerPage}
              pageCount={customerPageCount}
              start={customerStart}
              total={data.customers.length}
            />
          </div>
        ) : (
          <EmptyState message={dashboardEmptyStateMessages.aiCustomersMissing} />
        )}
      </Section>

      {mode === "analysis" && data.selected_customer ? (
        <CustomerDetail detail={data.selected_customer} />
      ) : null}

      {mode === "recommendation" && "recommended_actions" in data ? (
        <div className="grid gap-6">
          {data.recommended_actions.length > 0 || data.recommendation_rationale.length > 0 ? (
            <AnomalyDetectedAlert />
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              action={<Badge variant="outline">{data.recommended_actions.length}개</Badge>}
              title="추천하는 광고 액션"
            >
              {data.recommended_actions.length > 0 ? (
                <div className="grid gap-4">
                  {data.recommended_actions.map((action) => (
                    <div className="grid gap-3 rounded-lg border p-4" key={action.action_id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <span className="font-medium">{action.title}</span>
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        </div>
                        <Badge variant="secondary">{action.status}</Badge>
                      </div>
                      {action.probability !== null ? (
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>예상 반응 확률</span>
                            <span className="tabular-nums text-foreground">
                              {formatPercent(action.probability)}
                            </span>
                          </div>
                          <Progress value={action.probability * 100} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message={dashboardEmptyStateMessages.aiRecommendationActionsMissing} />
              )}
            </Section>

            <Section title="추천 근거">
              {data.recommendation_rationale.length > 0 ? (
                <ul className="grid gap-3">
                  {data.recommendation_rationale.map((item) => (
                    <li className="rounded-lg border px-4 py-3 text-sm" key={item}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message={dashboardEmptyStateMessages.aiRecommendationRationaleMissing} />
              )}
            </Section>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AnomalyDetectedAlert() {
  return (
    <Alert>
      <AlertTitle className="text-red-600">주의가 필요한 고객군입니다</AlertTitle>
      <AlertDescription>이상징후가 감지됐습니다.</AlertDescription>
    </Alert>
  );
}

function CustomerPagination({
  end,
  onNext,
  onPrevious,
  page,
  pageCount,
  start,
  total
}: {
  end: number;
  onNext: () => void;
  onPrevious: () => void;
  page: number;
  pageCount: number;
  start: number;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {start}-{end} / {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          aria-label="이전 고객군 페이지"
          disabled={page <= 1}
          onClick={onPrevious}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-12 text-center tabular-nums">
          {page} / {pageCount}
        </span>
        <Button
          aria-label="다음 고객군 페이지"
          disabled={page >= pageCount}
          onClick={onNext}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

function handleCustomerRowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  customerGroupId: string,
  onSelectedCustomerIdChange: (selectedCustomerId: string) => void
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  onSelectedCustomerIdChange(customerGroupId);
}

function getCustomerPageForId(
  customers: Array<{ customer_group_id: string }>,
  customerGroupId: string
) {
  const index = customers.findIndex((customer) => customer.customer_group_id === customerGroupId);
  return index >= 0 ? Math.floor(index / CUSTOMER_PAGE_SIZE) + 1 : 1;
}

function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(page, 1), pageCount);
}

function CustomerDetail({ detail }: { detail: DashboardCustomerDetail }) {
  const hasAnomalyInsight = detail.case_analysis.length > 0 || detail.rationale.length > 0;

  return (
    <div className="grid gap-6">
      {hasAnomalyInsight ? <AnomalyDetectedAlert /> : null}

      <Section
        action={<Badge variant="secondary">{detail.customer_group.channel}</Badge>}
        title={detail.customer_group.customer_group_name}
      >
        <div className="grid gap-6">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">
              {detail.customer_group.age_group} · {detail.customer_group.gender} ·{" "}
              {detail.customer_group.category} · {detail.customer_group.region} ·{" "}
              {detail.customer_group.device}
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {detail.metrics.map((metric) => (
              <MetricTile key={metric.label} label={metric.label} value={formatMetric(metric)} />
            ))}
          </div>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-3">
        <TextList
          emptyMessage={dashboardEmptyStateMessages.aiCaseAnalysisMissing}
          title="케이스 분석"
          values={detail.case_analysis}
        />
        <Section title="과거 구매이력">
          <div className="grid gap-4">
            {detail.purchase_history.length > 0 ? (
              detail.purchase_history.map((item) => (
                <div className="grid gap-2" key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{item.label}</span>
                    <span className="tabular-nums text-muted-foreground">{formatPercent(item.share)}</span>
                  </div>
                  <Progress value={item.share * 100} />
                </div>
              ))
            ) : (
              <EmptyState message="과거 구매이력이 없습니다." />
            )}
          </div>
        </Section>
        <TextList
          emptyMessage={dashboardEmptyStateMessages.aiRationaleMissing}
          title="판단 근거"
          values={detail.rationale}
        />
      </div>

      <Section title="구매 단계 흐름">
        {detail.stage_flow.length > 0 ? (
          <SimpleStageFlowBarChart
            data={detail.stage_flow.map((stage) => ({
              label: stage.label,
              rate: stage.rate * 100
            }))}
          />
        ) : (
          <EmptyState message="구매 단계 흐름 데이터가 없습니다." />
        )}
      </Section>
    </div>
  );
}

function SimpleStageFlowBarChart({ data }: { data: Array<{ label: string; rate: number }> }) {
  const config = {
    rate: {
      color: "#0066cc",
      label: "전환율"
    }
  };

  return (
    <ChartContainer className="aspect-auto h-[300px] w-full" config={config}>
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ bottom: 8, left: 0, right: 12, top: 12 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis axisLine={false} dataKey="label" tickLine={false} />
        <YAxis
          axisLine={false}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
          tickLine={false}
          width={48}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
        <Bar dataKey="rate" fill="var(--color-rate)" isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}

function TextList({
  title,
  values,
  emptyMessage = dashboardEmptyStateMessages.generic
}: {
  title: string;
  values: string[];
  emptyMessage?: string;
}) {
  return (
    <Section title={title}>
      {values.length > 0 ? (
        <ul className="grid gap-3">
          {values.map((value) => (
            <li className="rounded-lg border px-4 py-3 text-sm" key={value}>
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message={emptyMessage} />
      )}
    </Section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-lg border p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function formatMetric(metric: DashboardMetricValue): string {
  switch (metric.value_type) {
    case "money":
      return formatMoney(metric.value);
    case "rate":
      return formatPercent(metric.value);
    case "delta":
      return `${metric.value >= 0 ? "+" : ""}${formatPercent(metric.value)}`;
  }
}
