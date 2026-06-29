import type { EventName } from "@loopad/shared";

export type DashboardEventRow = {
  event_time: string;
  project_id: string;
  user_id: string;
  session_id: string;
  event_name: EventName;
  segment_id: string | null;
  experiment_id: string | null;
  recommendation_id: string | null;
  action_id: string | null;
  content_id: string | null;
  decision_id: string | null;
  page_url: string | null;
  product_id: string | null;
  category: string | null;
  device: string | null;
};

export type FunnelCounts = {
  product_view_count: number;
  add_to_cart_count: number;
  purchase_count: number;
};

export type SegmentFunnelCounts = FunnelCounts & {
  segment_id: string;
};

export type ExperimentActionCounts = {
  action_id: string;
  impressions: number;
  clicks: number;
  purchases: number;
};
