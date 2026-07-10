import { cn } from "@loopad/ui/shadcn/utils";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export type WorkspaceViewTab<Value extends string> = {
  label: string;
  value: Value;
};

export function WorkspaceViewTabs<Value extends string>({
  ariaLabel,
  items,
  queryKey,
  value
}: {
  ariaLabel: string;
  items: ReadonlyArray<WorkspaceViewTab<Value>>;
  queryKey: "campaignView" | "promotionView" | "segmentView";
  value: Value;
}) {
  return (
    <nav aria-label={ariaLabel} className="min-w-0 overflow-x-auto border-b">
      <div className="flex min-w-max items-center gap-1">
        {items.map((item) => {
          const isActive = item.value === value;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative inline-flex h-11 items-center justify-center px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive &&
                  "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
              )}
              key={item.value}
              search={(current) => ({ ...current, [queryKey]: item.value })}
              to="."
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function WorkspacePageHeader({
  actions,
  description,
  eyebrow,
  title
}: {
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="grid min-w-0 gap-1.5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </div>
        <h1 className="text-pretty text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        <p className="max-w-3xl text-pretty text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
