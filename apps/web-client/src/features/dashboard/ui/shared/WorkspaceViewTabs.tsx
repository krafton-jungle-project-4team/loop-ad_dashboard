import { Tabs, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import type { ReactNode } from "react";

export type WorkspaceViewTab<Value extends string> = {
  label: string;
  value: Value;
};

export function WorkspaceViewTabs<Value extends string>({
  ariaLabel,
  items,
  onValueChange,
  value
}: {
  ariaLabel: string;
  items: ReadonlyArray<WorkspaceViewTab<Value>>;
  onValueChange: (value: Value) => void;
  value: Value;
}) {
  return (
    <Tabs onValueChange={(nextValue) => onValueChange(nextValue as Value)} value={value}>
      <div className="min-w-0 overflow-x-auto pb-1">
        <TabsList aria-label={ariaLabel} className="min-w-max justify-start" variant="line">
          {items.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
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
