import type { DataExplorerAiChatCurrentResult } from "@loopad/shared";
import { createContext, useContext, type ReactNode } from "react";
import type { DataExplorerChatKitQueryEffect } from "../../data-explorer/components/ChatKitQueryPanel.js";

type DashboardAssistantQueryEffectListener = (effect: DataExplorerChatKitQueryEffect) => void;

export type DashboardAssistantContextValue = {
  publishCurrentResult: (result: DataExplorerAiChatCurrentResult | null) => void;
  subscribeToQueryEffects: (listener: DashboardAssistantQueryEffectListener) => () => void;
};

const DashboardAssistantContext = createContext<DashboardAssistantContextValue | null>(null);

export function DashboardAssistantProvider({
  children,
  value
}: {
  children: ReactNode;
  value: DashboardAssistantContextValue;
}) {
  return (
    <DashboardAssistantContext.Provider value={value}>
      {children}
    </DashboardAssistantContext.Provider>
  );
}

export function useDashboardAssistant() {
  const context = useContext(DashboardAssistantContext);

  if (!context) {
    throw new Error("useDashboardAssistant must be used inside DashboardAssistantProvider");
  }

  return context;
}
