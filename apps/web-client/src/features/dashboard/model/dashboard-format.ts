const DASHBOARD_TIME_ZONE = "Asia/Seoul";

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function formatPercent(rate: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "percent",
    maximumFractionDigits: 1
  }).format(rate);
}

export function formatMoney(value: number): string {
  if (value >= 100000000) {
    return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value / 100000000)}억`;
  }
  if (value >= 10000) {
    return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value / 10000)}만`;
  }
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DASHBOARD_TIME_ZONE
  }).format(date);
}
