import { EmptyState as BaseEmptyState } from "../../../components/ui/primitives.js";

export function EmptyState({ message }: { message: string }) {
  return <BaseEmptyState message={message} />;
}
