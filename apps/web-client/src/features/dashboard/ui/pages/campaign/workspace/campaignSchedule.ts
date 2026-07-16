export type CampaignScheduleStatus = "in_progress" | "scheduled" | "completed";

export type CampaignScheduleCandidate = {
  campaign_id: string;
  campaign_name: string;
  end_date: string | null;
  start_date: string | null;
};

const CAMPAIGN_SCHEDULE_STATUSES: ReadonlyArray<CampaignScheduleStatus> = [
  "in_progress",
  "scheduled",
  "completed"
];

export function campaignScheduleStatus(
  campaign: Pick<CampaignScheduleCandidate, "end_date" | "start_date">,
  today: string
): CampaignScheduleStatus {
  if (campaign.end_date && campaign.end_date < today) {
    return "completed";
  }
  if (campaign.start_date && campaign.start_date > today) {
    return "scheduled";
  }
  return "in_progress";
}

export function groupCampaignsBySchedule<T extends CampaignScheduleCandidate>(
  campaigns: ReadonlyArray<T>,
  today: string
): Record<CampaignScheduleStatus, T[]> {
  const groups: Record<CampaignScheduleStatus, T[]> = {
    completed: [],
    in_progress: [],
    scheduled: []
  };

  for (const campaign of campaigns) {
    groups[campaignScheduleStatus(campaign, today)].push(campaign);
  }

  for (const status of CAMPAIGN_SCHEDULE_STATUSES) {
    groups[status] = groups[status].toSorted((left, right) =>
      compareCampaignSchedule(left, right, status)
    );
  }

  return groups;
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compareCampaignSchedule(
  left: CampaignScheduleCandidate,
  right: CampaignScheduleCandidate,
  status: CampaignScheduleStatus
): number {
  const dateComparison =
    status === "completed"
      ? compareNullableDates(right.end_date, left.end_date)
      : status === "scheduled"
        ? compareNullableDates(left.start_date, right.start_date)
        : compareNullableDates(left.end_date, right.end_date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  const nameComparison = left.campaign_name.localeCompare(right.campaign_name, "ko");
  return nameComparison || left.campaign_id.localeCompare(right.campaign_id);
}

function compareNullableDates(left: string | null, right: string | null): number {
  if (left === right) {
    return 0;
  }
  if (!left) {
    return 1;
  }
  if (!right) {
    return -1;
  }
  return left.localeCompare(right);
}
