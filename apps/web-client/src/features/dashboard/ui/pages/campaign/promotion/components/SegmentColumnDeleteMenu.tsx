import { Button } from "@loopad/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@loopad/ui/shadcn/dropdown-menu";
import { Ellipsis } from "lucide-react";

export type SegmentColumnDeleteMenuItem<Value> = {
  id: string;
  label: string;
  value: Value;
};

export function SegmentColumnDeleteMenu<Value>({
  ariaLabel,
  disabled,
  emptyLabel,
  items,
  label,
  onDelete
}: {
  ariaLabel: string;
  disabled: boolean;
  emptyLabel: string;
  items: SegmentColumnDeleteMenuItem<Value>[];
  label: string;
  onDelete: (value: Value) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={ariaLabel}
          className="ml-auto"
          disabled={disabled}
          size="icon-sm"
          title={ariaLabel}
          type="button"
          variant="ghost"
        >
          <Ellipsis aria-hidden="true" data-icon="inline-start" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {items.length > 0 ? (
            items.map((item) => (
              <DropdownMenuItem key={item.id} onSelect={() => onDelete(item.value)}>
                <span className="truncate">{item.label}</span>
                <span className="ml-auto shrink-0 text-destructive">삭제</span>
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>{emptyLabel}</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
