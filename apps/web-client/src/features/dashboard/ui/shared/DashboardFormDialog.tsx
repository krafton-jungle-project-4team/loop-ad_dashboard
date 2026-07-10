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
  title
}: {
  children: ReactNode;
  description: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-3xl"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle className="text-2xl font-semibold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
