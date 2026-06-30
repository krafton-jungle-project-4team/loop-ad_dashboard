import { EmptyState as BaseEmptyState } from "@loopad/ui/shadcn/primitives";

export function EmptyState({ message }: { message: string }) {
  return <BaseEmptyState message={message} />;
}
