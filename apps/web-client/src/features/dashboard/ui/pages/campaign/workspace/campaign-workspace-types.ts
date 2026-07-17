import type { ReactNode } from "react";

export type CampaignWorkspaceEntityKind = "campaign" | "promotion" | "segment";

export type CampaignWorkspaceBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost";

export type CampaignWorkspaceStatus = {
  label: string;
  variant?: CampaignWorkspaceBadgeVariant;
};

export type CampaignWorkspaceMetric = {
  id: string;
  label: string;
  value: ReactNode;
};

export type CampaignWorkspaceEntityCard = {
  dateRangeLabel?: string;
  description?: string;
  id: string;
  kind: CampaignWorkspaceEntityKind;
  metrics?: ReadonlyArray<CampaignWorkspaceMetric>;
  status?: CampaignWorkspaceStatus;
  title: string;
};

export type CampaignWorkspaceEntityAction<Entity extends CampaignWorkspaceEntityCard> = {
  disabled?: boolean;
  id: string;
  label: string;
  onSelect: (entity: Entity) => void;
  tone?: "default" | "destructive";
};

export type CampaignWorkspaceAddAction = {
  description?: string;
  disabled?: boolean;
  label: string;
  onSelect: () => void;
};

export type CampaignWorkspaceSummaryDetail = {
  id: string;
  label: string;
  value: ReactNode;
};

export type CampaignWorkspaceSelection = {
  description?: string;
  details?: ReadonlyArray<CampaignWorkspaceSummaryDetail>;
  kind: CampaignWorkspaceEntityKind;
  status?: CampaignWorkspaceStatus;
  title: string;
};
