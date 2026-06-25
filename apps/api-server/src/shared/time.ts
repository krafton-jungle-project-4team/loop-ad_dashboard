export function toClickHouseDateTime(date: Date) {
  return date.toISOString().replace("T", " ").replace("Z", "");
}
