import { EmptyState as BaseEmptyState } from "@/components/dashboard-ui/primitives";

export function EmptyState({ message }: { message: string }) {
  return <BaseEmptyState message={message} />;
}
