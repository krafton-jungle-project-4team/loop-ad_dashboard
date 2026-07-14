import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@loopad/ui/shadcn/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@loopad/ui/shadcn/alert-dialog";
import { Button } from "@loopad/ui/shadcn/button";
import { cn } from "@loopad/ui/shadcn/utils";
import { XIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { ReactNode } from "react";
import { useBeforeUnloadWarning } from "./use-before-unload-warning.js";

type DashboardFormDialogContextValue = {
  requestClose: () => void;
  setDirty: (dirty: boolean) => void;
};

const DashboardFormDialogContext = createContext<DashboardFormDialogContextValue | null>(null);

export function DashboardFormDialog({
  children,
  description,
  dirty,
  footer,
  onOpenChange,
  open,
  title,
  width = "campaign"
}: {
  children: ReactNode;
  description: ReactNode;
  dirty?: boolean;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
  width?: "campaign" | "promotion" | "segment";
}) {
  const isDirtyRef = useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const setDirty = useCallback((nextDirty: boolean) => {
    isDirtyRef.current = nextDirty;
    setHasUnsavedChanges(nextDirty);
  }, []);
  const requestClose = useCallback(() => {
    if (isDirtyRef.current) {
      setIsDiscardDialogOpen(true);
      return;
    }
    onOpenChange(false);
  }, [onOpenChange]);
  const contextValue = useMemo(() => ({ requestClose, setDirty }), [requestClose, setDirty]);
  const hasFixedFooter = footer != null;

  useBeforeUnloadWarning(open && hasUnsavedChanges);

  useEffect(() => {
    if (dirty !== undefined) {
      setDirty(dirty);
    }
  }, [dirty, setDirty]);

  return (
    <DashboardFormDialogContext.Provider value={contextValue}>
      <Dialog
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            onOpenChange(true);
            return;
          }
          requestClose();
        }}
        open={open}
      >
        <DialogContent
          className={cn(
            "h-[calc(100svh-1rem)] max-h-[calc(100svh-1rem)] w-[calc(100%-1rem)] p-0 sm:h-auto sm:max-h-[90svh]",
            width === "promotion"
              ? "sm:max-w-[880px]"
              : width === "segment"
                ? "sm:max-w-[760px]"
                : "sm:max-w-[720px]",
            hasFixedFooter
              ? "flex flex-col overflow-hidden"
              : "overflow-y-auto [&_[data-slot=dialog-footer]]:sticky [&_[data-slot=dialog-footer]]:bottom-0 [&_[data-slot=dialog-footer]]:z-10"
          )}
          onPointerDownOutside={(event) => event.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader className="relative sticky top-0 z-10 border-b bg-background px-5 py-5 pr-14 sm:px-8 sm:py-6 sm:pr-16">
            <DialogTitle className="text-2xl font-semibold">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
            <DialogClose asChild>
              <Button
                aria-label="취소"
                className="absolute right-5 top-5 sm:right-8 sm:top-6"
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <XIcon />
              </Button>
            </DialogClose>
          </DialogHeader>
          {hasFixedFooter ? (
            <div className="min-h-0 flex-auto overflow-y-auto">{children}</div>
          ) : (
            children
          )}
          {footer}
        </DialogContent>
      </Dialog>
      <AlertDialog onOpenChange={setIsDiscardDialogOpen} open={isDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>작성 중인 변경사항을 버릴까요?</AlertDialogTitle>
            <AlertDialogDescription>
              저장하지 않은 내용은 사라지고 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 편집</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDirty(false);
                setIsDiscardDialogOpen(false);
                onOpenChange(false);
              }}
              variant="destructive"
            >
              변경사항 버리기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardFormDialogContext.Provider>
  );
}

export function useDashboardFormDraft(isDirty: boolean) {
  const context = useContext(DashboardFormDialogContext);

  useEffect(() => {
    context?.setDirty(isDirty);
    return () => context?.setDirty(false);
  }, [context, isDirty]);

  return context?.requestClose ?? (() => undefined);
}
