import type { DashboardAiGeneration } from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import type { KeyboardEvent } from "react";
import { formatPercent } from "../model/dashboard-format.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

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

  return (
    <div className="grid gap-6">
      <Section title="고객군 선택">
        {data.customers.length > 0 ? (
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
              {data.customers.map((customer) => (
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
        ) : (
          <EmptyState message="고객군 데이터가 없습니다." />
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
          <EmptyState message="선택된 고객군이 없습니다." />
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
                  <Badge variant="secondary">{item.content?.status ?? "콘텐츠 미생성"}</Badge>
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
                  <EmptyState message="콘텐츠 미생성" />
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState message="저장된 생성 콘텐츠가 없습니다." />
        )}
      </Section>
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
