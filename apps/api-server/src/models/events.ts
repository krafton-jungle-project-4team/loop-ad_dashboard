import type { EventName } from "@loopad/shared";

export type EventRow = {
  project_id: string;
  user_id: string;
  session_id: string;
  event_name: EventName;
  timestamp: string;
  channel: string;
  campaign_id: string;
  product_id: string;
  category: string;
  age_group: string;
  gender: string;
  device: string;
  price: number;
  inventory_status: string;
  properties: string;
};

export type EventProperties = {
  region?: string;
  signal?: string;
  page_url?: string;
  referrer?: string;
};

export type EventRecord = Omit<EventRow, "properties"> & {
  properties: EventProperties;
};

export type SegmentStats = {
  id: string;
  channel: string;
  ageGroup: string;
  gender: string;
  category: string;
  region: string;
  device: string;
  events: EventRecord[];
};
