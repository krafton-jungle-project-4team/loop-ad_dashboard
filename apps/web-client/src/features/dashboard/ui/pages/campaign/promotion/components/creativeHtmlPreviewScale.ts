export function calculateCreativeHtmlPreviewScale(containerWidth: number, viewportWidth: number) {
  if (
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(viewportWidth) ||
    containerWidth <= 0 ||
    viewportWidth <= 0
  ) {
    return 1;
  }

  return Math.min(containerWidth / viewportWidth, 1);
}
