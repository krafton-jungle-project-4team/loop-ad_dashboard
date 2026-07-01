import type { DashboardAiGeneration } from "@loopad/shared";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useMemo, useState } from "react";
import { dashboardEmptyStateMessages } from "../model/dashboard-empty-state.js";
import { formatPercent } from "../model/dashboard-format.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

const CUSTOMER_PAGE_SIZE = 10;

export function AiGenerationPanel({
  data,
  onSelectedCustomerIdChange,
  selectedCustomerId
}: {
  data: DashboardAiGeneration;
  onSelectedCustomerIdChange: (selectedCustomerId: string) => void;
  selectedCustomerId: string;
}) {
  const activeCustomerId = data.selected_customer?.customer_group_id ?? selectedCustomerId;
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
      <Section title="고객군 선택">
        {data.customers.length > 0 ? (
          <div className="grid gap-4">
            <Table className="min-w-[840px]">
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

      <Section
        action={
          data.selected_customer ? (
            <Badge variant="secondary">{data.selected_customer.channel}</Badge>
          ) : null
        }
        title="선택 고객군"
      >
        {data.selected_customer ? (
          <div className="grid gap-2">
            <h2 className="text-xl font-semibold">{data.selected_customer.customer_group_name}</h2>
            <p className="text-sm text-muted-foreground">
              {data.selected_customer.age_group} ·{" "}
              {data.selected_customer.gender} · {data.selected_customer.category} ·{" "}
              {data.selected_customer.region} · {data.selected_customer.device}
            </p>
          </div>
        ) : (
          <EmptyState message={dashboardEmptyStateMessages.aiSelectedCustomerMissing} />
        )}
      </Section>

      <Section
        action={<Badge variant="outline">{data.generated_items.length}개</Badge>}
        title="생성 콘텐츠"
      >
        {data.generated_items.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {data.generated_items.map((item) => (
              <article
                className="grid min-w-0 gap-4 rounded-lg border p-4"
                key={item.action.action_id}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{item.action.title}</h3>
                  <Badge variant="secondary">
                    {item.content?.status ??
                      dashboardEmptyStateMessages.aiGenerationItemContentMissing}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.action.description}</p>
                {item.content ? (
                  <div className="grid gap-4">
                    <Badge className="w-fit" variant="outline">
                      {item.content.content_type}
                    </Badge>
                    {item.content.message ? (
                      <p className="text-sm">{item.content.message}</p>
                    ) : null}
                    {item.content.content_url ? (
                      item.content.content_type === "image" ? (
                        <img
                          alt={item.content.title}
                          className="aspect-video w-full rounded-md border object-cover"
                          src={item.content.content_url}
                        />
                      ) : (
                        <a
                          className="truncate text-sm text-primary underline-offset-4 hover:underline"
                          href={item.content.content_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {item.content.content_url}
                        </a>
                      )
                    ) : (
                      <Badge className="w-fit" variant="secondary">
                        content_url 없음
                      </Badge>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    message={dashboardEmptyStateMessages.aiGenerationItemContentMissing}
                  />
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState message={dashboardEmptyStateMessages.aiGenerationContentMissing} />
        )}
      </Section>
    </div>
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
