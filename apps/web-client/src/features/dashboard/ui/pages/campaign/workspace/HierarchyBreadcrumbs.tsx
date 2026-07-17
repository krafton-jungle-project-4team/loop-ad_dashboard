import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@loopad/ui/shadcn/breadcrumb";
import { Button } from "@loopad/ui/shadcn/button";
import { cn } from "@loopad/ui/shadcn/utils";
import { Fragment } from "react";

export type CampaignHierarchyLevel = "campaign" | "promotion" | "segment" | "experiment";

const CAMPAIGN_HIERARCHY_LEVELS: ReadonlyArray<{
  label: string;
  value: CampaignHierarchyLevel;
}> = [
  { label: "캠페인", value: "campaign" },
  { label: "프로모션", value: "promotion" },
  { label: "고객군", value: "segment" },
  { label: "실험", value: "experiment" }
];

export type HierarchyBreadcrumbsProps = {
  activeLevel: CampaignHierarchyLevel;
  className?: string;
  onLevelSelect?: (level: CampaignHierarchyLevel) => void;
  selectedLabels?: Partial<Record<CampaignHierarchyLevel, string | undefined>>;
};

export function HierarchyBreadcrumbs({
  activeLevel,
  className,
  onLevelSelect,
  selectedLabels
}: HierarchyBreadcrumbsProps) {
  const activeIndex = CAMPAIGN_HIERARCHY_LEVELS.findIndex((level) => level.value === activeLevel);

  return (
    <Breadcrumb aria-label="캠페인 계층" className={className}>
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-clip py-1 text-[15px]">
        {CAMPAIGN_HIERARCHY_LEVELS.map((level, index) => {
          const isCurrent = index === activeIndex;
          const hasList = level.value === "campaign" || level.value === "promotion";
          const canSelect =
            onLevelSelect !== undefined && (index < activeIndex || (isCurrent && hasList));
          const displayLabel = index < activeIndex ? selectedLabels?.[level.value] : level.label;

          return (
            <Fragment key={level.value}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem className="shrink-0">
                {canSelect ? (
                  <BreadcrumbLink asChild>
                    <Button
                      className={cn(
                        "h-auto max-w-16 min-w-0 rounded-none border-0 p-0 text-[15px] focus-visible:border-0 focus-visible:ring-0 focus-visible:underline 2xl:max-w-40",
                        isCurrent ? "font-semibold text-primary" : "text-muted-foreground"
                      )}
                      onClick={() => onLevelSelect(level.value)}
                      size="sm"
                      title={displayLabel ?? level.label}
                      type="button"
                      variant="link"
                    >
                      <span className="truncate">{displayLabel ?? level.label}</span>
                    </Button>
                  </BreadcrumbLink>
                ) : isCurrent ? (
                  <BreadcrumbPage className="font-semibold text-primary">
                    {level.label}
                  </BreadcrumbPage>
                ) : (
                  <span aria-disabled="true" className="text-muted-foreground/45">
                    {level.label}
                  </span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
