import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Button } from "@loopad/ui/shadcn/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export function RouteErrorFallback({
  error,
  onRetry,
  title = "대시보드 API 요청 실패"
}: {
  error: unknown;
  onRetry: () => void;
  title?: string;
}) {
  const message = error instanceof Error ? error.message : "데이터 요청 실패";

  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      <div className="mt-3">
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw />
          다시 시도
        </Button>
      </div>
    </Alert>
  );
}
