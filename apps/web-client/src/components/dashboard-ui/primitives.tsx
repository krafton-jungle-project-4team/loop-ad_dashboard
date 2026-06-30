import * as SelectPrimitive from "@radix-ui/react-select";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Check, ChevronDown } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";
import { cn } from "./utils.js";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}
      {...props}
    />
  );
}

export function Button({ className, type = "button", ...props }: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-transparent px-3 text-sm font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "bg-slate-950 text-white hover:bg-slate-800",
        className
      )}
      type={type}
      {...props}
    />
  );
}

export function GhostButton({
  className,
  type = "button",
  ...props
}: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition",
        "hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
        className
      )}
      type={type}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "slate",
  ...props
}: ComponentPropsWithoutRef<"span"> & {
  tone?: "slate" | "sky" | "emerald" | "amber" | "rose" | "violet";
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    sky: "border-sky-200 bg-sky-50 text-sky-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    violet: "border-violet-200 bg-violet-50 text-violet-800"
  };

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none",
        "placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentPropsWithoutRef<"label">) {
  return <label className={cn("text-xs font-semibold text-slate-500", className)} {...props} />;
}

export function Progress({ className, value }: { className?: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className="h-full rounded-full bg-sky-600 transition-[width]"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/80", className)} />;
}

export function EmptyState({ message, title }: { message: string; title?: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      {title ? <p className="text-sm font-semibold text-slate-800">{title}</p> : null}
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  ElementRef<typeof SelectPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ children, className, ...props }, ref) => (
  <SelectPrimitive.Trigger
    className={cn(
      "inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm",
      "focus:outline-none focus:ring-2 focus:ring-sky-100 data-[placeholder]:text-slate-400",
      className
    )}
    ref={ref}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-slate-400" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = forwardRef<
  ElementRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ children, className, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      className={cn(
        "z-50 max-h-72 min-w-[8rem] overflow-hidden rounded-lg border border-slate-200 bg-white p-1 text-slate-900 shadow-lg",
        className
      )}
      ref={ref}
      {...props}
    >
      <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ children, className, ...props }, ref) => (
  <SelectPrimitive.Item
    className={cn(
      "relative flex h-8 cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none",
      "data-[disabled]:pointer-events-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-950 data-[disabled]:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

export function Tooltip({ children, content }: { children: ReactNode; content: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="z-50 rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white shadow"
            sideOffset={6}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-slate-950" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
