import { Badge } from "@loopad/ui/shadcn/badge";
import { ButtonGroup, ButtonGroupSeparator } from "@loopad/ui/shadcn/button-group";
import { Button } from "@loopad/ui/shadcn/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@loopad/ui/shadcn/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@loopad/ui/shadcn/dropdown-menu";
import { cn } from "@loopad/ui/shadcn/utils";
import { ArrowRight, Check, Ellipsis, Plus } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import type {
  CampaignWorkspaceAddAction,
  CampaignWorkspaceEntityAction,
  CampaignWorkspaceEntityCard,
  CampaignWorkspaceEntityKind
} from "./campaign-workspace-types.js";

const ENTITY_KIND_LABEL: Record<CampaignWorkspaceEntityKind, string> = {
  campaign: "캠페인",
  promotion: "프로모션",
  segment: "세그먼트"
};

const ENTRY_ACTION_VARIANT = {
  manage: "segment-soft",
  performance: "outline-neutral",
  workspace: "promotion-soft"
} as const;

export type EntityCardGridProps<Entity extends CampaignWorkspaceEntityCard> = {
  actions?: (entity: Entity) => ReadonlyArray<CampaignWorkspaceEntityAction<Entity>>;
  addAction?: CampaignWorkspaceAddAction;
  ariaLabel: string;
  className?: string;
  emptyState?: ReactNode;
  entryActions?: (entity: Entity) => ReadonlyArray<CampaignWorkspaceEntityAction<Entity>>;
  items: ReadonlyArray<Entity>;
  onSelect?: (entity: Entity) => void;
  selectedId?: string;
};

export function EntityCardGrid<Entity extends CampaignWorkspaceEntityCard>({
  actions,
  addAction,
  ariaLabel,
  className,
  emptyState,
  entryActions,
  items,
  onSelect,
  selectedId
}: EntityCardGridProps<Entity>) {
  if (items.length === 0 && !addAction) {
    return emptyState ?? null;
  }

  return (
    <ul
      aria-label={ariaLabel}
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}
      role="list"
    >
      {items.map((item) => (
        <li key={`${item.kind}:${item.id}`}>
          <EntityCard
            actions={actions?.(item) ?? []}
            entity={item}
            entryActions={entryActions?.(item) ?? []}
            isSelected={item.id === selectedId}
            onSelect={onSelect}
          />
        </li>
      ))}
      {addAction ? (
        <li>
          <EntityAddCard action={addAction} />
        </li>
      ) : null}
    </ul>
  );
}

function EntityCard<Entity extends CampaignWorkspaceEntityCard>({
  actions,
  entity,
  entryActions,
  isSelected,
  onSelect
}: {
  actions: ReadonlyArray<CampaignWorkspaceEntityAction<Entity>>;
  entity: Entity;
  entryActions: ReadonlyArray<CampaignWorkspaceEntityAction<Entity>>;
  isSelected: boolean;
  onSelect?: (entity: Entity) => void;
}) {
  const entityKindLabel = ENTITY_KIND_LABEL[entity.kind];

  return (
    <Card
      className={cn(
        "h-full min-h-56 shadow-none transition-[border-color,box-shadow]",
        isSelected && "border-primary/40 ring-2 ring-primary/15"
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{entityKindLabel}</Badge>
          {entity.status ? (
            <Badge variant={entity.status.variant ?? "outline"}>{entity.status.label}</Badge>
          ) : null}
        </div>
        <CardTitle className="line-clamp-2 text-lg font-semibold tracking-tight">
          {entity.title}
        </CardTitle>
        {entity.description ? (
          <CardDescription className="line-clamp-2 leading-6">{entity.description}</CardDescription>
        ) : null}
        {actions.length > 0 ? (
          <CardAction>
            <EntityActionsMenu
              actions={actions}
              entity={entity}
              entityKindLabel={entityKindLabel}
            />
          </CardAction>
        ) : null}
      </CardHeader>

      {entity.metrics && entity.metrics.length > 0 ? (
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {entity.metrics.map((metric) => (
              <div className="flex min-w-0 flex-col gap-1" key={metric.id}>
                <dt className="truncate text-xs text-muted-foreground">{metric.label}</dt>
                <dd className="truncate text-sm font-semibold tabular-nums text-foreground">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      ) : null}

      {entryActions.length > 0 || onSelect ? (
        <CardFooter className="mt-auto border-t-0 bg-transparent">
          {entryActions.length > 0 ? (
            <ButtonGroup aria-label={`${entity.title} 빠른 이동`} className="w-full">
              {entryActions.map((action, index) => {
                const variant =
                  ENTRY_ACTION_VARIANT[action.id as keyof typeof ENTRY_ACTION_VARIANT];

                return (
                  <Fragment key={action.id}>
                    {index > 0 ? <ButtonGroupSeparator /> : null}
                    <Button
                      className="h-auto min-h-9 min-w-0 flex-1 whitespace-normal px-2 py-2 text-xs"
                      disabled={action.disabled}
                      onClick={() => action.onSelect(entity)}
                      type="button"
                      variant={variant ?? "outline-neutral"}
                    >
                      {action.label}
                    </Button>
                  </Fragment>
                );
              })}
            </ButtonGroup>
          ) : onSelect ? (
            <Button
              aria-pressed={isSelected}
              className="w-full"
              onClick={() => onSelect(entity)}
              type="button"
              variant={isSelected ? "secondary" : "outline"}
            >
              {isSelected ? (
                <>
                  <Check data-icon="inline-start" />
                  선택됨
                </>
              ) : (
                <>
                  {entityKindLabel} 열기
                  <ArrowRight data-icon="inline-end" />
                </>
              )}
            </Button>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}

function EntityActionsMenu<Entity extends CampaignWorkspaceEntityCard>({
  actions,
  entity,
  entityKindLabel
}: {
  actions: ReadonlyArray<CampaignWorkspaceEntityAction<Entity>>;
  entity: Entity;
  entityKindLabel: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`${entity.title} ${entityKindLabel} 작업`}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Ellipsis data-icon="inline-start" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{entityKindLabel} 작업</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {actions.map((action) => (
            <DropdownMenuItem
              disabled={action.disabled}
              key={action.id}
              onSelect={() => action.onSelect(entity)}
              variant={action.tone ?? "default"}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EntityAddCard({ action }: { action: CampaignWorkspaceAddAction }) {
  return (
    <Button
      className="h-full min-h-56 w-full flex-col gap-3 rounded-[18px] border-dashed px-6 whitespace-normal"
      disabled={action.disabled}
      onClick={action.onSelect}
      type="button"
      variant="outline"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground">
        <Plus aria-hidden="true" data-icon="inline-start" />
      </span>
      <span className="flex flex-col items-center gap-1 text-center">
        <span className="font-semibold">{action.label}</span>
        {action.description ? (
          <span className="max-w-64 text-xs leading-5 text-muted-foreground">
            {action.description}
          </span>
        ) : null}
      </span>
    </Button>
  );
}
