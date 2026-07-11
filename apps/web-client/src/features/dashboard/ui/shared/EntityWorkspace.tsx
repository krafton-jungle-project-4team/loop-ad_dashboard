import { Button } from "@loopad/ui/shadcn/button";
import { Plus, X } from "lucide-react";
import type { ReactNode } from "react";

export type EntityWorkspaceTabItem = {
  id: string;
  label: string;
};

export type EntityWorkspaceGuideCard = {
  icon: ReactNode;
  title: string;
  value: string;
};

export function EntityWorkspaceShell({
  children,
  chrome
}: {
  children: ReactNode;
  chrome?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-black/10 bg-white">
      {chrome}
      <div className="grid gap-6 px-6 py-6">{children}</div>
    </section>
  );
}

export function EntityWorkspaceTabs<Item extends EntityWorkspaceTabItem>({
  addLabel,
  getItemLabel = (item) => item.label,
  items,
  onAdd,
  onClose,
  onSelect,
  selectedItemId
}: {
  addLabel: string;
  getItemLabel?: (item: Item) => string;
  items: Item[];
  onAdd: () => void;
  onClose?: (item: Item) => void;
  onSelect: (item: Item) => void;
  selectedItemId: string;
}) {
  return (
    <div className="flex min-h-14 items-end gap-1 border-b bg-[#f5f5f7] px-5 pt-3">
      <Button
        aria-label={addLabel}
        className="mb-0 h-11 w-14 rounded-b-none rounded-t-md border-b-0 bg-white text-[#1d1d1f] shadow-none hover:bg-white"
        onClick={onAdd}
        size="icon"
        type="button"
        variant="outline"
      >
        <Plus className="size-4" />
      </Button>
      {items.map((item) => {
        const isSelected = item.id === selectedItemId;

        return (
          <button
            className={`mb-0 flex h-11 max-w-[260px] items-center gap-2 rounded-b-none rounded-t-md border px-3 text-left text-sm ${
              isSelected
                ? "border-b-white bg-white font-semibold text-primary"
                : "border-transparent bg-transparent text-muted-foreground hover:bg-white/60"
            }`}
            key={item.id}
            onClick={() => onSelect(item)}
            type="button"
          >
            <span className="truncate">{getItemLabel(item)}</span>
            {onClose ? (
              <span
                className="grid size-5 place-items-center rounded-sm text-muted-foreground hover:bg-muted"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(item);
                }}
                role="button"
                tabIndex={0}
              >
                <X className="size-3.5" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function EntityWorkspaceEmptyState({
  actionLabel,
  description,
  guideCards,
  onAction,
  title
}: {
  actionLabel: string;
  description: string;
  guideCards: EntityWorkspaceGuideCard[];
  onAction: () => void;
  title: string;
}) {
  return (
    <section className="grid min-h-[620px] content-between gap-8">
      <div className="grid place-items-center gap-6 pt-14 text-center">
        <div className="grid max-w-xl gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button className="gap-2 px-8" onClick={onAction} type="button">
            <Plus className="size-4" />
            {actionLabel}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {guideCards.map((card) => (
          <div className="grid gap-4 rounded-lg border bg-[#fafafc] p-6" key={card.title}>
            <div className="text-primary">{card.icon}</div>
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function EntityWorkspaceMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[#f5f5f7] p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
