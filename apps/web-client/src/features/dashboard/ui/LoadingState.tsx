import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Card, CardContent, CardHeader } from "@loopad/ui/shadcn/card";
import { Skeleton } from "@loopad/ui/shadcn/skeleton";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import type { DashboardTab } from "../model/dashboard-types.js";

export function LoadingState({ tab }: { tab: DashboardTab }) {
  let skeleton = <MainSkeleton />;

  if (tab === "dataExplorer") {
    skeleton = <DataExplorerSkeleton />;
  }

  return (
    <div aria-busy="true" className="grid gap-6">
      <Alert aria-live="polite" role="status">
        <Spinner aria-hidden="true" className="size-5" />
        <AlertTitle>페이지를 불러오고 있어요</AlertTitle>
        <AlertDescription>잠시만 기다려 주세요.</AlertDescription>
      </Alert>
      {skeleton}
    </div>
  );
}

function MainSkeleton() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <MetricSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[260px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-10 w-60" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SectionSkeleton key={index} rows={4} />
        ))}
      </div>
    </div>
  );
}

function DataExplorerSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="grid gap-6">
        <SectionSkeleton rows={3} />
        <SectionSkeleton rows={6} />
        <SectionSkeleton rows={5} />
      </div>
      <div className="grid content-start gap-6">
        <SectionSkeleton rows={8} />
        <SectionSkeleton rows={4} />
      </div>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <Card className="w-full min-w-0">
      <CardContent className="w-full min-w-0">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-9 w-32" />
        <Skeleton className="mt-3 h-4 w-48" />
      </CardContent>
    </Card>
  );
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="grid w-full min-w-0 gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton className="h-10 w-full" key={index} />
        ))}
      </CardContent>
    </Card>
  );
}
