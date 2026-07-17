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
              <div className="flex min-w-0 items-center gap-2 px-1.5 py-1" key={item.id}>
                <span className="truncate">{item.label}</span>
                <DropdownMenuItem
                  aria-label={`${item.label} 삭제`}
                  asChild
                  onSelect={() => onDelete(item.value)}
                  variant="destructive"
                >
                  <Button className="ml-auto" size="xs" type="button" variant="destructive">
                    삭제
                  </Button>
                </DropdownMenuItem>
              </div>
            ))
          ) : (
            <DropdownMenuItem disabled>{emptyLabel}</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
