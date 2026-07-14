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
import type { CampaignWorkspaceHierarchyItem } from "./campaign-workspace-types.js";

export type HierarchyBreadcrumbsProps = {
  ariaLabel?: string;
  className?: string;
  items: ReadonlyArray<CampaignWorkspaceHierarchyItem>;
  onItemSelect?: (item: CampaignWorkspaceHierarchyItem, index: number) => void;
  onRootSelect?: () => void;
  rootLabel?: string;
};

export function HierarchyBreadcrumbs({
  ariaLabel = "캠페인 계층",
  className,
  items,
  onItemSelect,
  onRootSelect,
  rootLabel = "캠페인"
}: HierarchyBreadcrumbsProps) {
  return (
    <Breadcrumb aria-label={ariaLabel} className={className}>
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-x-auto py-1 text-[15px]">
        <BreadcrumbItem className="shrink-0">
          {items.length === 0 ? (
            <BreadcrumbPage>{rootLabel}</BreadcrumbPage>
          ) : onRootSelect ? (
            <BreadcrumbLink asChild>
              <Button
                className="h-auto rounded-none border-0 p-0 text-[15px] text-muted-foreground focus-visible:border-0 focus-visible:ring-0 focus-visible:underline"
                onClick={onRootSelect}
                size="sm"
                type="button"
                variant="link"
              >
                {rootLabel}
              </Button>
            </BreadcrumbLink>
          ) : (
            <span>{rootLabel}</span>
          )}
        </BreadcrumbItem>

        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          const canSelect = !isCurrent && onItemSelect !== undefined;

          return (
            <Fragment key={`${item.kind}:${item.id}`}>
              <BreadcrumbSeparator />
              <BreadcrumbItem className={cn("min-w-0", isCurrent ? "flex-1" : "shrink-0")}>
                {isCurrent ? (
                  <BreadcrumbPage className="block max-w-64 truncate font-medium">
                    {item.label}
                  </BreadcrumbPage>
                ) : canSelect ? (
                  <BreadcrumbLink asChild>
                    <Button
                      className="h-auto max-w-48 truncate rounded-none border-0 p-0 text-[15px] text-muted-foreground focus-visible:border-0 focus-visible:ring-0 focus-visible:underline"
                      onClick={() => onItemSelect(item, index)}
                      size="sm"
                      type="button"
                      variant="link"
                    >
                      {item.label}
                    </Button>
                  </BreadcrumbLink>
                ) : (
                  <span className="block max-w-48 truncate">{item.label}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
