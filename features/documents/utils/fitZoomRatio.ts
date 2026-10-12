/**
 * The zoom that fits a document page inside a narrow editor (a phone), so the
 * page reflows into view instead of scrolling sideways. Never above 100%, and
 * never so small the text is unreadable. Pure — guarded by fit-zoom-ratio.test.ts.
 */
export const MIN_FIT_ZOOM = 0.45;

export function fitZoomRatio(containerWidth: number, pageWidth: number, gutter = 8): number {
  if (!(containerWidth > 0) || !(pageWidth > 0)) return 1;
  const ratio = (containerWidth - gutter * 2) / pageWidth;
  return Math.min(1, Math.max(MIN_FIT_ZOOM, Math.round(ratio * 100) / 100));
}
