import { Badge, Card, EmptyState } from "@loopad/ui/shadcn/primitives";
import type { GenerationViewModel, GeneratedContentViewModel } from "../vm/dashboard-view-model.js";

export function AiGenerationPanel({ viewModel }: { viewModel: GenerationViewModel }) {
  return (
    <div className="space-y-5">
      {viewModel.isEmpty ? (
        <EmptyState message="조회 조건에 맞는 인사이트 기록이 없습니다." title="데이터 없음" />
      ) : null}

      <Card className="p-5">
        <h2 className="text-base font-semibold text-slate-950">선택 사용자군</h2>
        {viewModel.selectedCustomer ? (
          <div className="mt-3">
            <p className="text-lg font-semibold text-slate-950">{viewModel.selectedCustomer.name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                viewModel.selectedCustomer.channel,
                viewModel.selectedCustomer.ageGroup,
                viewModel.selectedCustomer.gender,
                viewModel.selectedCustomer.category,
                viewModel.selectedCustomer.region,
                viewModel.selectedCustomer.device
              ].map((attribute) => (
                <Badge key={attribute} tone="slate">
                  {attribute}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState message="선택된 사용자군이 없습니다." />
        )}
      </Card>

      <div>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-slate-950">저장된 인사이트</h2>
          <p className="text-sm text-slate-500">선택된 분석 기회에서 저장된 요약과 관찰 메모</p>
        </div>
        {viewModel.cards.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {viewModel.cards.map((card) => (
              <GeneratedContentCard card={card} key={card.id} />
            ))}
          </div>
        ) : (
          <EmptyState message="저장된 인사이트가 없습니다." />
        )}
      </div>
    </div>
  );
}

function GeneratedContentCard({ card }: { card: GeneratedContentViewModel }) {
  return (
    <Card className="min-h-80 overflow-hidden">
      <div className="h-36 bg-[linear-gradient(135deg,#0f172a_0%,#0e7490_55%,#f59e0b_100%)] p-5 text-white">
        <Badge className="border-white/20 bg-white/15 text-white" tone="slate">
          {card.contentType}
        </Badge>
        <p className="mt-8 max-w-[14rem] text-lg font-semibold leading-6">{card.title}</p>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <Badge tone={card.contentStatus === "saved" ? "emerald" : "amber"}>
            {card.contentStatus}
          </Badge>
          {card.createdAt ? <span className="text-xs text-slate-500">{formatDate(card.createdAt)}</span> : null}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {card.message ?? card.actionDescription}
        </p>
      </div>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
