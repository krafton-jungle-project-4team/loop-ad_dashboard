import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Button } from "@loopad/ui/shadcn/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export function RouteErrorFallback({
  error,
  onRetry,
  title = "페이지를 불러오지 못했어요"
}: {
  error: unknown;
  onRetry: () => void;
  title?: string;
}) {
  const message = error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.";

  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      <div className="mt-3">
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw />
          다시 시도하기
        </Button>
      </div>
    </Alert>
  );
}
