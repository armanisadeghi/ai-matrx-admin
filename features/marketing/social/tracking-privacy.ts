/**
 * Tracking rows (tracked accounts, posts, goals, outliers) belong to the brand's own organization. A viewer
 * outside it cannot read them, so an empty answer there is "private", never "not tracked". Callers pass the
 * viewer's edit answer (`canEdit`) as the signal and show this line instead of a false empty state.
 */
export function privateTrackingLine(brandName: string | null | undefined): string {
  return brandName ? `Tracking is private to ${brandName}'s team` : "Tracking is private to this brand's team";
}
