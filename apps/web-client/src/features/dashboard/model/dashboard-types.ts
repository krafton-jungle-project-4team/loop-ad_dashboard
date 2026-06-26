import type { AiJobKind, AiJobResult, ConversionReport, DashboardOverview } from "@loopad/shared";

export type DashboardTab = "overview" | "conversion" | "insights" | "recommendations" | "creatives";
export type DashboardAiTab = Extract<DashboardTab, "insights" | "recommendations" | "creatives">;

export type DashboardResources = {
  overview: DashboardOverview;
  conversion: ConversionReport;
};

export type DashboardResourceState =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: DashboardResources; error?: undefined }
  | { status: "error"; data?: undefined; error: Error };

export type DashboardAiJobState =
  | {
      status: "idle";
      kind?: undefined;
      resultId?: undefined;
      error?: undefined;
      result?: undefined;
    }
  | {
      status: "requesting";
      kind: AiJobKind;
      resultId?: undefined;
      error?: undefined;
      result?: undefined;
    }
  | {
      status: "polling";
      kind: AiJobKind;
      resultId: string;
      error?: undefined;
      result?: undefined;
    }
  | { status: "success"; kind: AiJobKind; resultId: string; result: AiJobResult; error?: undefined }
  | { status: "error"; kind: AiJobKind; resultId?: string; error: Error; result?: undefined };
