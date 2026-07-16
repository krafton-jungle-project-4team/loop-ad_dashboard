import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@loopad/ui/shadcn/empty";
import { Spinner } from "@loopad/ui/shadcn/spinner";

export function EmptyState({
  loading = false,
  message,
  title = "아직 표시할 데이터가 없어요"
}: {
  loading?: boolean;
  message: string;
  title?: string;
}) {
  return (
    <Empty
      aria-live={loading ? "polite" : undefined}
      className="min-h-40 rounded-[18px] border border-dashed border-black/10 bg-[#fafafc]"
      role={loading ? "status" : undefined}
    >
      <EmptyHeader>
        {loading ? (
          <EmptyMedia variant="icon">
            <Spinner aria-hidden="true" />
          </EmptyMedia>
        ) : null}
        <EmptyTitle className="text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
