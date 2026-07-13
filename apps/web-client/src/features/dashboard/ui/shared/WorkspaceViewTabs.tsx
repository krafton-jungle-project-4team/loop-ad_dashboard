import { Tabs, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
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
    <Tabs className="min-w-0 overflow-x-auto border-b" value={value}>
      <TabsList aria-label={ariaLabel} className="min-w-max" variant="line">
        {items.map((item) => (
          <TabsTrigger asChild key={item.value} value={item.value}>
            <Link
              aria-current={item.value === value ? "page" : undefined}
              search={(current) => ({ ...current, [queryKey]: item.value })}
              to="."
            >
              {item.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
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
