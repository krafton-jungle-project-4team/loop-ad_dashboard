import type { DashboardSegmentAssistantSourceSuggestion } from "@loopad/shared";
import { createContext, useContext, type ReactNode } from "react";

export type DashboardAssistantContextValue = {
  createdSegmentAnalysisId: string | null;
  createdSegmentId: string | null;
  openSegmentCandidateAssistant: (
    sourceSuggestion?: DashboardSegmentAssistantSourceSuggestion
  ) => void;
  recordCreatedSegmentConfirmation: (segmentId: string, analysisId: string) => void;
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
