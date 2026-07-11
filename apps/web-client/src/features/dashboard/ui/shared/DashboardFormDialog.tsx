import {
  Dialog,
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

type DashboardFormDialogContextValue = {
  requestClose: () => void;
  setDirty: (dirty: boolean) => void;
};

const DashboardFormDialogContext = createContext<DashboardFormDialogContextValue | null>(null);

export function DashboardFormDialog({
  children,
  description,
  dirty,
  onOpenChange,
  open,
  title,
  width = "campaign"
}: {
  children: ReactNode;
  description: ReactNode;
  dirty?: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
  width?: "campaign" | "promotion" | "segment";
}) {
  const isDirtyRef = useRef(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const setDirty = useCallback((nextDirty: boolean) => {
    isDirtyRef.current = nextDirty;
  }, []);
  const requestClose = useCallback(() => {
    if (isDirtyRef.current) {
      setIsDiscardDialogOpen(true);
      return;
    }
    onOpenChange(false);
  }, [onOpenChange]);
  const contextValue = useMemo(() => ({ requestClose, setDirty }), [requestClose, setDirty]);

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
      <AlertDialog onOpenChange={setIsDiscardDialogOpen} open={isDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>작성 중인 변경사항을 버릴까요?</AlertDialogTitle>
            <AlertDialogDescription>
              저장하지 않은 입력 내용은 복구할 수 없습니다.
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
