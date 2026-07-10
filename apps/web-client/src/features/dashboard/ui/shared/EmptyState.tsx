import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@loopad/ui/shadcn/empty";

export function EmptyState({ message }: { message: string }) {
  return (
    <Empty className="min-h-40 rounded-[18px] border border-dashed border-black/10 bg-[#fafafc]">
      <EmptyHeader>
        <EmptyTitle className="text-[15px] font-semibold tracking-tight text-foreground">
          표시할 데이터가 없습니다
        </EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
