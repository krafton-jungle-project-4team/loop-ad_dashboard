export type MainMetricCounts = {
  session_start_count: number;
  product_view_count: number;
  add_to_cart_count: number;
  checkout_start_count: number;
  purchase_count: number;
  recent_purchase_count: number;
  revenue: number;
};

export type ChartPointRow = {
  label: string;
  value: number;
};

export type SegmentStatusRow = {
  label: string;
  value: number;
  share: number;
};

export type FunnelCounts = {
  session_start_count: number;
  product_view_count: number;
  add_to_cart_count: number;
  checkout_start_count: number;
  purchase_count: number;
};

export type DeviceFunnelCounts = FunnelCounts & {
  device: string;
};

export type CustomerGroupEventRow = FunnelCounts & {
  customer_group_id: string;
  customer_group_name: string;
  channel: string;
  age_group: string;
  gender: string;
  category: string;
  region: string;
  device: string;
  revenue: number;
};
