import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@loopad/ui/shadcn/empty";

export function EmptyState({ message }: { message: string }) {
  return (
    <Empty className="min-h-32 border">
      <EmptyHeader>
        <EmptyTitle>표시할 데이터가 없습니다</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
