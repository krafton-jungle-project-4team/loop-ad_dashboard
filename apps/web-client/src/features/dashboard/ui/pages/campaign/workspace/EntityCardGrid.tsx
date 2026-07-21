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
import { ArrowRight, Check, Clock3, Ellipsis, Plus } from "lucide-react";
import { Fragment, type ComponentProps, type ReactNode } from "react";
import type {
  CampaignWorkspaceAddAction,
  CampaignWorkspaceEntityAction,
  CampaignWorkspaceEntityCard,
  CampaignWorkspaceEntityKind,
  CampaignWorkspaceStatusTone
} from "./campaign-workspace-types.js";

const ENTITY_KIND_LABEL: Record<CampaignWorkspaceEntityKind, string> = {
  campaign: "캠페인",
  promotion: "프로모션",
  segment: "고객군"
};

const STATUS_VISUAL_TONE: Record<
  CampaignWorkspaceStatusTone,
  { badgeVariant: ComponentProps<typeof Badge>["variant"]; icon: string }
> = {
  danger: {
    badgeVariant: "status-danger",
    icon: "border-status-danger/30 bg-status-danger-soft text-status-danger-foreground"
  },
  info: {
    badgeVariant: "status-info",
    icon: "border-status-info/30 bg-status-info-soft text-status-info-foreground"
  },
  neutral: {
    badgeVariant: "secondary",
    icon: "border-border bg-muted text-muted-foreground"
  },
  success: {
    badgeVariant: "status-success",
    icon: "border-status-success/30 bg-status-success-soft text-status-success-foreground"
  },
  warning: {
    badgeVariant: "status-warning",
    icon: "border-status-warning/30 bg-status-warning-soft text-status-warning-foreground"
  }
};

const GRID_DENSITY_CLASS = {
  compact: "grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
  default: "grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
} as const;

const HORIZONTAL_GRID_DENSITY_CLASS = {
  compact:
    "grid-flow-col auto-cols-[clamp(16rem,23.5%,20rem)] gap-3 overflow-x-auto overscroll-x-contain pb-2 snap-x snap-mandatory [scrollbar-width:thin]",
  default:
    "grid-flow-col auto-cols-[clamp(18rem,32%,24rem)] gap-4 overflow-x-auto overscroll-x-contain pb-2 snap-x snap-mandatory [scrollbar-width:thin]"
} as const;

type EntityCardGridDensity = keyof typeof GRID_DENSITY_CLASS;
type EntityCardGridLayout = "grid" | "horizontal";

export type EntityCardGridProps<Entity extends CampaignWorkspaceEntityCard> = {
  actions?: (entity: Entity) => ReadonlyArray<CampaignWorkspaceEntityAction<Entity>>;
  addAction?: CampaignWorkspaceAddAction;
  ariaLabel: string;
  className?: string;
  density?: EntityCardGridDensity;
  emptyState?: ReactNode;
  entryActions?: (entity: Entity) => ReadonlyArray<CampaignWorkspaceEntityAction<Entity>>;
  items: ReadonlyArray<Entity>;
  layout?: EntityCardGridLayout;
  onSelect?: (entity: Entity) => void;
  selectedId?: string;
  showBadges?: boolean;
};

export function EntityCardGrid<Entity extends CampaignWorkspaceEntityCard>({
  actions,
  addAction,
  ariaLabel,
  className,
  density = "default",
  emptyState,
  entryActions,
  items,
  layout = "grid",
  onSelect,
  selectedId,
  showBadges = true
}: EntityCardGridProps<Entity>) {
  if (items.length === 0 && !addAction) {
    return emptyState ?? null;
  }

  return (
    <ul
      aria-label={ariaLabel}
      className={cn(
        "grid",
        layout === "horizontal"
          ? HORIZONTAL_GRID_DENSITY_CLASS[density]
          : GRID_DENSITY_CLASS[density],
        className
      )}
      role="list"
    >
      {items.map((item) => (
        <li
          className={layout === "horizontal" ? "snap-start" : undefined}
          key={`${item.kind}:${item.id}`}
        >
          <EntityCard
            actions={actions?.(item) ?? []}
            entity={item}
            entryActions={entryActions?.(item) ?? []}
            isSelected={item.id === selectedId}
            onSelect={onSelect}
            density={density}
            showBadges={showBadges}
          />
        </li>
      ))}
      {addAction ? (
        <li>
          <EntityAddCard action={addAction} density={density} />
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
  onSelect,
  density,
  showBadges
}: {
  actions: ReadonlyArray<CampaignWorkspaceEntityAction<Entity>>;
  entity: Entity;
  entryActions: ReadonlyArray<CampaignWorkspaceEntityAction<Entity>>;
  isSelected: boolean;
  onSelect?: (entity: Entity) => void;
  density: EntityCardGridDensity;
  showBadges: boolean;
}) {
  const entityKindLabel = ENTITY_KIND_LABEL[entity.kind];
  const isCompact = density === "compact";
  const visualTone = entity.visual ? STATUS_VISUAL_TONE[entity.visual.tone] : null;
  const VisualIcon = entity.visual?.icon;

  return (
    <Card
      className={cn(
        "h-full shadow-none transition-[border-color,box-shadow]",
        isCompact ? "min-h-48" : "min-h-56",
        isSelected && "border-primary/40 ring-2 ring-primary/15"
      )}
      size={isCompact ? "sm" : "default"}
    >
      <CardHeader className={isCompact ? "gap-2" : "gap-3"}>
        {entity.visual && visualTone && VisualIcon ? (
          <div className="flex min-w-0 flex-nowrap items-center gap-2">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md border",
                visualTone.icon
              )}
            >
              <VisualIcon aria-hidden="true" className="size-4" />
            </span>
            <Badge variant={visualTone.badgeVariant}>{entity.visual.label}</Badge>
            {entity.dateRangeLabel ? (
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-foreground/65">
                <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate tabular-nums">{entity.dateRangeLabel}</span>
              </span>
            ) : null}
          </div>
        ) : entity.dateRangeLabel ? (
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate tabular-nums">{entity.dateRangeLabel}</span>
          </div>
        ) : showBadges ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{entityKindLabel}</Badge>
            {entity.status ? (
              <Badge variant={entity.status.variant ?? "outline"}>{entity.status.label}</Badge>
            ) : null}
          </div>
        ) : null}
        <CardTitle
          className={cn(
            "line-clamp-2 font-semibold tracking-tight",
            entity.kind === "campaign" || entity.kind === "promotion"
              ? "min-h-14 text-lg leading-7 group-data-[size=sm]/card:text-lg"
              : isCompact
                ? "text-base"
                : "text-lg"
          )}
          title={entity.title}
        >
          {entity.title}
        </CardTitle>
        {entity.description ? (
          <CardDescription
            className={cn(
              "line-clamp-2",
              isCompact ? "leading-5" : "leading-6",
              (entity.kind === "campaign" || entity.kind === "promotion") &&
                (isCompact ? "min-h-10" : "min-h-12")
            )}
            title={entity.description}
          >
            {entity.description}
          </CardDescription>
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
          <dl
            className={cn(
              "grid grid-cols-2 gap-x-4 rounded-md border border-border/70 bg-muted/35 p-3",
              isCompact ? "gap-y-2" : "gap-y-3"
            )}
          >
            {entity.metrics.map((metric) => (
              <div className="flex min-w-0 flex-col gap-1" key={metric.id}>
                <dt className="truncate text-xs font-medium text-foreground/65">{metric.label}</dt>
                <dd className="truncate text-base font-semibold tabular-nums text-foreground">
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
              {entryActions.map((action, index) => (
                <Fragment key={action.id}>
                  {index > 0 ? <ButtonGroupSeparator /> : null}
                  <Button
                    className={cn(
                      "h-auto min-h-9 min-w-0 flex-1 whitespace-normal px-2 text-xs",
                      isCompact ? "py-1.5" : "py-2"
                    )}
                    disabled={action.disabled}
                    onClick={() => action.onSelect(entity)}
                    type="button"
                    variant="outline-neutral"
                  >
                    {action.label}
                  </Button>
                </Fragment>
              ))}
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

function EntityAddCard({
  action,
  density
}: {
  action: CampaignWorkspaceAddAction;
  density: EntityCardGridDensity;
}) {
  const isCompact = density === "compact";

  return (
    <Button
      className={cn(
        "h-full w-full flex-col rounded-lg border-dashed whitespace-normal",
        isCompact ? "min-h-48 gap-2 px-4" : "min-h-56 gap-3 px-6"
      )}
      disabled={action.disabled}
      onClick={action.onSelect}
      type="button"
      variant="outline"
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-foreground",
          isCompact ? "size-9" : "size-10"
        )}
      >
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
