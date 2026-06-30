export type DashboardEventView = {
  event_name: string;
  session_id: string;
  event_time: string;
  channel: string;
  age_group: string;
  gender: string;
  category: string;
  region: string;
  device: string;
  segment_key: string;
  revenue: number;
};

export type FunnelCountsView = {
  session_start_count: number;
  product_view_count: number;
  add_to_cart_count: number;
  checkout_start_count: number;
  purchase_count: number;
};

export type MainMetricCountsView = FunnelCountsView & {
  recent_purchase_count: number;
  revenue: number;
};

export type ChartPointView = {
  label: string;
  value: number;
};

export type SegmentStatusView = {
  label: string;
  value: number;
  share: number;
};

export type DeviceFunnelView = FunnelCountsView & {
  device: string;
};

export type CustomerGroupEventView = FunnelCountsView & {
  customer_group_id: string;
  customer_group_name: string;
  channel: string;
  age_group: string;
  gender: string;
  category: string;
  region: string;
  device: string;
  revenue: number;
  view_to_cart_rate?: number;
  cart_to_checkout_rate?: number;
  checkout_to_purchase_rate?: number;
  view_to_purchase_rate?: number;
};

export type DashboardSegmentMetricView = CustomerGroupEventView & {
  segment_id: string;
  analysis_date: string;
  user_count: number;
  page_view_count: number;
  ad_impression_count: number;
  ad_click_count: number;
};
