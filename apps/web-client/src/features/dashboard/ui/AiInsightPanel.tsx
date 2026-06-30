import { DataTable, type ColumnDef } from "@/components/dashboard-ui/data-table";
import { DevProfiler } from "../../../app/DevProfiler.js";
import { Badge, Card, EmptyState, Progress } from "@/components/dashboard-ui/primitives";
import { cn } from "@/components/dashboard-ui/utils";
import {
  CustomerTableToolbar,
  type CustomerTableControlProps
} from "./CustomerTableToolbar.js";
import type {
  CustomerDetailViewModel,
  CustomerRowViewModel,
  InsightViewModel,
  RecommendationActionViewModel
} from "../vm/dashboard-view-model.js";

const customerColumns: ColumnDef<CustomerRowViewModel>[] = [
  { accessorKey: "name", header: "사용자군", cell: ({ row }) => <strong>{row.original.name}</strong> },
  { accessorKey: "channel", header: "채널" },
  { accessorKey: "ageGroup", header: "연령" },
  { accessorKey: "gender", header: "성별" },
  { accessorKey: "category", header: "카테고리" },
  { accessorKey: "region", header: "지역" },
  { accessorKey: "device", header: "기기" },
  {
    accessorKey: "conversionRate",
    header: "전환율",
    cell: ({ row }) => <strong className="text-sky-700">{row.original.conversionRate}</strong>
  },
  { accessorKey: "majorDropOffStage", header: "주요 이탈 단계" }
];

export function AiInsightPanel({
  controls,
  onSelectCustomer,
  viewModel
}: {
  controls: CustomerTableControlProps;
  onSelectCustomer: (customerId: string) => void;
  viewModel: InsightViewModel;
}) {
  const title = viewModel.mode === "analysis" ? "전환율 하위 사용자군" : "상위 참여 사용자군";

  return (
    <DevProfiler id="InsightPanel">
      <div className="space-y-5">
        {viewModel.isEmpty ? (
          <EmptyState message="조회 조건에 맞는 세그먼트 분석 데이터가 없습니다." title="데이터 없음" />
        ) : null}

        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">{title}</h2>
              <p className="text-sm text-slate-500">선택 사용자군 기준으로 단계 흐름과 근거를 비교합니다.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <CustomerTableToolbar {...controls} />
              <Badge tone={viewModel.mode === "analysis" ? "rose" : "emerald"}>
                {viewModel.mode === "analysis" ? "risk scan" : "growth scan"}
              </Badge>
            </div>
          </div>
          <DataTable
            columns={customerColumns}
            data={viewModel.customers}
            emptyMessage="사용자군 데이터가 없습니다."
            getRowClassName={(row) =>
              row.original.isSelected ? "bg-sky-50 ring-1 ring-inset ring-sky-200" : undefined
            }
            onRowClick={(row) => onSelectCustomer(row.id)}
          />
        </Card>

        {viewModel.selectedCustomer ? (
          <CustomerDetailPanel detail={viewModel.selectedCustomer} />
        ) : (
          <EmptyState message="선택된 사용자군이 없습니다." title="사용자군 미선택" />
        )}

        {viewModel.mode === "recommendation" ? (
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <RecommendationPanel actions={viewModel.actions} />
            <RationalePanel rationale={viewModel.rationale} />
          </div>
        ) : null}
      </div>
    </DevProfiler>
  );
}

function CustomerDetailPanel({ detail }: { detail: CustomerDetailViewModel }) {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{detail.name}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.attributes.map((attribute) => (
                <Badge key={attribute} tone="slate">
                  {attribute}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {detail.metrics.map((metric) => (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={metric.id}>
              <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <TextListPanel items={detail.caseAnalysis} title="케이스 분석" />
        <Card className="p-5">
          <h3 className="text-base font-semibold text-slate-950">전환 이력</h3>
          <div className="mt-4 space-y-4">
            {detail.purchaseHistory.length > 0 ? (
              detail.purchaseHistory.map((item) => (
                <div key={item.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                    <p className="text-sm text-slate-500">{item.displayValue}</p>
                  </div>
                  <Progress value={item.share * 100} />
                </div>
              ))
            ) : (
              <EmptyState message="전환 이력이 없습니다." />
            )}
          </div>
        </Card>
        <TextListPanel items={detail.rationale} title="판단 근거" />
      </div>

      <Card className="p-5">
        <h3 className="text-base font-semibold text-slate-950">전환 단계 흐름</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {detail.stageFlow.map((stage) => (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={stage.id}>
              <p className="text-sm font-semibold text-slate-500">{stage.label}</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{stage.rateLabel}</p>
              <Progress className="mt-3" value={stage.rate * 100} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RecommendationPanel({ actions }: { actions: RecommendationActionViewModel[] }) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-slate-950">주요 분석 기회</h2>
      <div className="mt-4 space-y-4">
        {actions.length > 0 ? (
          actions.map((action) => (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={action.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{action.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{action.description}</p>
                </div>
                <Badge tone={action.status === "ready" ? "emerald" : "amber"}>{action.status}</Badge>
              </div>
              <p className="mt-3 text-xs text-slate-500">{action.rationale}</p>
              {action.probabilityValue !== null ? (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span>영향 가능성</span>
                    <strong className="text-slate-700">{action.probabilityLabel}</strong>
                  </div>
                  <Progress value={action.probabilityValue * 100} />
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState message="저장된 분석 기회가 없습니다." />
        )}
      </div>
    </Card>
  );
}

function RationalePanel({ rationale }: { rationale: string[] }) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-slate-950">분석 근거</h2>
      {rationale.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {rationale.map((item, index) => (
            <li className="flex gap-3" key={item}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-950 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-slate-600">{item}</p>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState message="저장된 분석 근거가 없습니다." />
      )}
    </Card>
  );
}

function TextListPanel({ items, title }: { items: string[]; title: string }) {
  return (
    <Card className="p-5">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li className="flex gap-2 text-sm leading-6 text-slate-600" key={item}>
              <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-600")} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="저장된 내용이 없습니다." />
      )}
    </Card>
  );
}
