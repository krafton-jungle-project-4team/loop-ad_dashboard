import { Badge } from "@loopad/ui/shadcn/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@loopad/ui/shadcn/card";
import { cn } from "@loopad/ui/shadcn/utils";
import type { ReactNode } from "react";
import type {
  CampaignWorkspaceEntityKind,
  CampaignWorkspaceMetric,
  CampaignWorkspaceSelection
} from "./campaign-workspace-types.js";

const ENTITY_KIND_LABEL: Record<CampaignWorkspaceEntityKind, string> = {
  campaign: "캠페인",
  promotion: "프로모션",
  segment: "고객군"
};

export type SelectionSummaryProps = {
  action?: ReactNode;
  className?: string;
  metrics: ReadonlyArray<CampaignWorkspaceMetric>;
  selection: CampaignWorkspaceSelection;
};

export function SelectionSummary({ action, className, metrics, selection }: SelectionSummaryProps) {
  const entityKindLabel = ENTITY_KIND_LABEL[selection.kind];

  return (
    <section
      aria-label={`${selection.title} ${entityKindLabel} 요약`}
      className={cn("grid min-w-0 gap-4", className)}
    >
      <Card className="shadow-none">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{entityKindLabel}</Badge>
            {selection.status ? (
              <Badge variant={selection.status.variant ?? "outline"}>
                {selection.status.label}
              </Badge>
            ) : null}
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">{selection.title}</CardTitle>
          {selection.description ? (
            <CardDescription className="max-w-3xl leading-6">
              {selection.description}
            </CardDescription>
          ) : null}
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>

        {selection.details && selection.details.length > 0 ? (
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selection.details.map((detail) => (
                <div className="flex min-w-0 flex-col gap-1" key={detail.id}>
                  <dt className="text-xs font-medium text-muted-foreground">{detail.label}</dt>
                  <dd className="min-w-0 text-sm font-medium text-foreground">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        ) : null}
      </Card>

      <KpiCardGrid metrics={metrics} />
    </section>
  );
}

export function KpiCardGrid({
  className,
  metrics
}: {
  className?: string;
  metrics: ReadonlyArray<CampaignWorkspaceMetric>;
}) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)} role="list">
      {metrics.map((metric) => (
        <li key={metric.id}>
          <Card className="h-full min-h-32 shadow-none">
            <CardHeader className="gap-3">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
                {metric.value}
              </CardTitle>
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  );
}
