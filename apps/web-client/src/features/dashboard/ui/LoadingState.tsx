import { DevProfiler } from "../../../app/DevProfiler.js";
import { Card, Skeleton } from "../../../components/ui/primitives.js";
import type { DashboardTab } from "../model/dashboard-types.js";

export function LoadingState({ tab }: { tab: DashboardTab }) {
  return (
    <DevProfiler id="LoadingSkeleton">
      {tab === "main" ? <MainSkeleton /> : null}
      {tab === "purchaseConversion" ? <PurchaseSkeleton /> : null}
      {tab === "aiAnalysis" || tab === "aiRecommendation" ? <InsightSkeleton /> : null}
      {tab === "aiGeneration" ? <GenerationSkeleton /> : null}
    </DevProfiler>
  );
}

function MainSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card className="h-[8.5rem] p-5" key={index}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-9 w-32" />
            <Skeleton className="mt-4 h-3 w-full" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card className="h-80 p-5" key={index}>
            <Skeleton className="h-5 w-52" />
            <Skeleton className="mt-6 h-56 w-full" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card className="h-[14.5rem] p-5" key={index}>
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 4 }, (_, itemIndex) => (
              <Skeleton className="mt-4 h-6 w-full" key={itemIndex} />
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

function PurchaseSkeleton() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Skeleton className="h-5 w-36" />
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton className="h-36 w-full" key={index} />
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-5 h-72 w-full" />
      </Card>
      <Card className="p-5">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="mt-5 h-72 w-full" />
      </Card>
    </div>
  );
}

function InsightSkeleton() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-5 h-80 w-full" />
      </Card>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="h-[21.5rem] p-5">
          <Skeleton className="h-5 w-52" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton className="h-24" key={index} />
            ))}
          </div>
        </Card>
        <Card className="h-[21.5rem] p-5">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton className="mt-4 h-5 w-full" key={index} />
          ))}
        </Card>
      </div>
    </div>
  );
}

function GenerationSkeleton() {
  return (
    <div className="space-y-5">
      <Card className="h-[8.5rem] p-5">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-4 h-4 w-2/3" />
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card className="h-80 p-5" key={index}>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-4 h-36 w-full" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </Card>
        ))}
      </div>
    </div>
  );
}
