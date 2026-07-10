import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@loopad/ui/shadcn/dialog";
import type { ReactNode } from "react";

export function DashboardFormDialog({
  children,
  description,
  onOpenChange,
  open,
  title,
  width = "campaign"
}: {
  children: ReactNode;
  description: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
  width?: "campaign" | "promotion" | "segment";
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={
          width === "promotion"
            ? "h-[calc(100svh-1rem)] max-h-[calc(100svh-1rem)] w-[calc(100%-1rem)] overflow-y-auto p-0 sm:h-auto sm:max-h-[90svh] sm:max-w-[880px] [&_[data-slot=dialog-footer]]:sticky [&_[data-slot=dialog-footer]]:bottom-0 [&_[data-slot=dialog-footer]]:z-10"
            : width === "segment"
              ? "h-[calc(100svh-1rem)] max-h-[calc(100svh-1rem)] w-[calc(100%-1rem)] overflow-y-auto p-0 sm:h-auto sm:max-h-[90svh] sm:max-w-[760px] [&_[data-slot=dialog-footer]]:sticky [&_[data-slot=dialog-footer]]:bottom-0 [&_[data-slot=dialog-footer]]:z-10"
              : "h-[calc(100svh-1rem)] max-h-[calc(100svh-1rem)] w-[calc(100%-1rem)] overflow-y-auto p-0 sm:h-auto sm:max-h-[90svh] sm:max-w-[720px] [&_[data-slot=dialog-footer]]:sticky [&_[data-slot=dialog-footer]]:bottom-0 [&_[data-slot=dialog-footer]]:z-10"
        }
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="sticky top-0 z-10 border-b bg-background px-5 py-5 sm:px-8 sm:py-6">
          <DialogTitle className="text-2xl font-semibold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
