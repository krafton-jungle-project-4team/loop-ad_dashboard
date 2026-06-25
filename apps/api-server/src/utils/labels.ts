import type { SegmentStats } from "../models/events.js";

export function categoryLabel(value: string) {
  return (
    new Map([
      ["fresh_food", "신선식품"],
      ["milk_kit", "밀키트"],
      ["dessert", "디저트"],
      ["butcher", "정육"],
      ["health_food", "건강식품"]
    ]).get(value) ?? value
  );
}

export function genderLabel(value: string) {
  return (
    new Map([
      ["male", "남성"],
      ["female", "여성"]
    ]).get(value) ?? value
  );
}

export function segmentName(
  segment: Pick<SegmentStats, "category" | "channel" | "ageGroup" | "gender" | "device">
) {
  return `${categoryLabel(segment.category)} ${segment.channel} ${segment.ageGroup} ${genderLabel(segment.gender)} ${segment.device}`;
}
