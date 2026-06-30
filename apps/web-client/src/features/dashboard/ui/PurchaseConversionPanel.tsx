import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { DevProfiler } from "../../../app/DevProfiler.js";
import { DataTable, type ColumnDef } from "@loopad/ui/shadcn/data-table";
import { Badge, Card, EmptyState, Progress } from "@loopad/ui/shadcn/primitives";
import {
  CustomerTableToolbar,
  type CustomerTableControlProps
} from "./CustomerTableToolbar.js";
import type {
  CustomerBehaviorRowViewModel,
  DeviceConversionRowViewModel,
  PurchaseConversionViewModel
} from "../vm/dashboard-view-model.js";

const deviceColumns: ColumnDef<DeviceConversionRowViewModel>[] = [
  { accessorKey: "device", header: "기기", cell: ({ row }) => <strong>{row.original.device}</strong> },
  { accessorKey: "sessionStart", header: "세션 시작" },
  { accessorKey: "productView", header: "제품 보기" },
  { accessorKey: "addToCart", header: "장바구니" },
  { accessorKey: "checkoutStart", header: "결제 시작" },
  { accessorKey: "purchase", header: "구매" },
  { accessorKey: "viewToCartRate", header: "조회→장바구니" },
  { accessorKey: "cartToPurchaseRate", header: "장바구니→구매" },
  { accessorKey: "viewToPurchaseRate", header: "조회→구매" }
];

const customerColumns: ColumnDef<CustomerBehaviorRowViewModel>[] = [
  { accessorKey: "name", header: "사용자군", cell: ({ row }) => <strong>{row.original.name}</strong> },
  { accessorKey: "conversionRate", header: "구매 전환율" },
  { accessorKey: "majorDropOffRate", header: "주요 이탈률" },
  { accessorKey: "expectedRevenue", header: "예상 매출" },
  {
    accessorKey: "observedSignal",
    header: "관찰 신호",
    cell: ({ row }) => <Badge tone="sky">{row.original.observedSignal}</Badge>
  }
];

export function PurchaseConversionPanel({
  controls,
  viewModel
}: {
  controls: CustomerTableControlProps;
  viewModel: PurchaseConversionViewModel;
}) {
  return (
    <DevProfiler id="PurchaseConversionPanel">
      <div className="space-y-5">
        {viewModel.isEmpty ? (
          <EmptyState message="조회 조건에 맞는 구매 전환 데이터가 없습니다." title="데이터 없음" />
        ) : null}

        <Card className="p-5">
          <div className="mb-5 flex flex-col gap-1">
            <h2 className="text-base font-semibold text-slate-950">개방형 유입경로</h2>
            <p className="text-sm text-slate-500">단계별 잔존율과 이탈률을 같은 높이에서 비교합니다.</p>
          </div>
          {viewModel.funnelSteps.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-5">
              {viewModel.funnelSteps.map((step) => (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={step.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">단계 {step.stage}</span>
                    <Badge tone={step.stage === 5 ? "emerald" : "slate"}>{step.rateLabel}</Badge>
                  </div>
                  <h3 className="mt-3 min-h-10 text-sm font-semibold text-slate-950">{step.label}</h3>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{step.countLabel}</p>
                  <Progress className="mt-3" value={step.width} />
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>이탈률</span>
                    <strong className="text-slate-700">{step.dropOffLabel}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="유입경로 데이터가 없습니다." />
          )}
        </Card>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="h-86 p-5">
            <h2 className="text-base font-semibold text-slate-950">기기별 구매 완료</h2>
            <p className="text-sm text-slate-500">구매 수량 기준 기기 카테고리 비교</p>
            <div className="mt-5 h-64">
              {viewModel.deviceRows.length > 0 ? (
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={viewModel.deviceRows} margin={{ left: 0, right: 16, top: 8 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="device" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} width={40} />
                    <Bar dataKey="purchaseValue" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="기기별 차트 데이터가 없습니다." />
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-950">기기 카테고리별 전환</h2>
              <p className="text-sm text-slate-500">단계별 볼륨과 주요 전환율</p>
            </div>
            <DataTable
              columns={deviceColumns}
              data={viewModel.deviceRows}
              emptyMessage="기기별 전환 데이터가 없습니다."
            />
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">사용자군별 전환 행동</h2>
              <p className="text-sm text-slate-500">채널, 연령, 성별, 지역, 기기, 카테고리 조합</p>
            </div>
            <CustomerTableToolbar {...controls} />
          </div>
          <DataTable
            columns={customerColumns}
            data={viewModel.customerRows}
            emptyMessage="사용자군별 전환 행동 데이터가 없습니다."
          />
        </Card>
      </div>
    </DevProfiler>
  );
}
