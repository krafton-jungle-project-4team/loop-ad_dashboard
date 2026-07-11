import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@loopad/ui/shadcn/breadcrumb";
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
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-x-auto py-1">
        <BreadcrumbItem className="shrink-0">
          {items.length === 0 ? (
            <BreadcrumbPage>{rootLabel}</BreadcrumbPage>
          ) : onRootSelect ? (
            <BreadcrumbLink asChild>
              <button
                className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={onRootSelect}
                type="button"
              >
                {rootLabel}
              </button>
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
                    <button
                      className="max-w-48 truncate rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onItemSelect(item, index)}
                      type="button"
                    >
                      {item.label}
                    </button>
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
