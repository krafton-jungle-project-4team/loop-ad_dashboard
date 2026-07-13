export function confirmedSegmentSelectionId(
  suggestedSegmentIds: string[],
  scopedSegmentIds: string[]
) {
  return suggestedSegmentIds.find(Boolean) ?? scopedSegmentIds.find(Boolean) ?? null;
}
