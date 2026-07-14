import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

const DashboardHeaderSlotContext = createContext<HTMLElement | null>(null);

export function DashboardHeaderSlotProvider({
  children,
  value
}: {
  children: ReactNode;
  value: HTMLElement | null;
}) {
  return (
    <DashboardHeaderSlotContext.Provider value={value}>
      {children}
    </DashboardHeaderSlotContext.Provider>
  );
}

export function DashboardHeaderPortal({ children }: { children: ReactNode }) {
  const container = useContext(DashboardHeaderSlotContext);

  return container ? createPortal(children, container) : null;
}
